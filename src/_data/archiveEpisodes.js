const fs = require("fs");
const path = require("path");
const episodesFeed = require("./episodes");
const site = require("./site.json");

function slugify(str) {
  return String(str || "episode")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function pickAudioUrl(raw = {}) {
  const e = raw.enclosure;
  if (Array.isArray(e)) {
    const first = e.find((x) => x && (x["@_url"] || x.url));
    if (first) return first["@_url"] || first.url;
  }
  if (e && typeof e === "object") return e["@_url"] || e.url || "";
  return "";
}

function parseFrontMatter(content) {
  if (!content.startsWith("---")) return {};
  const end = content.indexOf("\n---", 3);
  if (end === -1) return {};
  const fm = content.slice(3, end).split(/\r?\n/);
  const out = {};
  for (const line of fm) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    v = v.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    out[k] = v;
  }
  return out;
}

function localFallbackEpisodes() {
  const dir = path.join(__dirname, "..", "shows");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const p = path.join(dir, f);
    const txt = fs.readFileSync(p, "utf8");
    const fm = parseFrontMatter(txt);
    const audioUrl = fm.audio_file ? `${site.audioBaseUrl}/${fm.audio_file}` : "";
    return {
      title: fm.title || f.replace(/\.md$/, ""),
      date: fm.date || "",
      duration: fm.duration || "",
      audioUrl,
      link: "",
      description: fm.description || "",
      dj: fm.dj || "",
      show: fm.show || fm.showSlug || "",
    };
  });
}

module.exports = async function () {
  let list = [];
  try {
    list = await episodesFeed();
  } catch (_) {}

  let normalized = (Array.isArray(list) ? list : []).map((it, idx) => {
    const raw = it?.raw || {};
    return {
      title: it?.title || raw?.title || `Episode ${idx + 1}`,
      date: it?.pubDate || raw?.pubDate || "",
      duration: it?.duration || raw?.["itunes:duration"] || "",
      audioUrl: pickAudioUrl(raw),
      link: it?.link || raw?.link || "",
      description: raw?.description || raw?.["content:encoded"] || "",
      dj: raw?.["itunes:author"] || raw?.author || "",
      show: raw?.["itunes:subtitle"] || "",
    };
  });

  if (!normalized.length) normalized = localFallbackEpisodes();

  const seen = new Set();
  return normalized
    .map((ep) => {
      const isoDate = ep.date ? new Date(ep.date) : null;
      const datePrefix = isoDate && !isNaN(isoDate.getTime()) ? isoDate.toISOString().slice(0, 10) + "-" : "";
      const base = `${datePrefix}${slugify(ep.title) || "episode"}`;
      let slug = base;
      let n = 2;
      while (seen.has(slug)) slug = `${base}-${n++}`;
      seen.add(slug);
      return { ...ep, slug };
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
};
