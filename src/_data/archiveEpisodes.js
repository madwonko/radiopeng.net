const manifest = require("./archive-manifest.json");

function slugify(str) {
  return String(str || "episode")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeAudioUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("/") ? u : `/${u}`;
}

module.exports = async function () {
  const src = Array.isArray(manifest?.episodes) ? manifest.episodes : [];
  const seen = new Set();

  return src
    .map((ep, idx) => {
      const title = ep?.title || `Episode ${idx + 1}`;
      const base = ep?.slug ? slugify(ep.slug) : `${(ep?.date || "").slice(0, 10)}-${slugify(title)}`;
      let slug = base || `episode-${idx + 1}`;
      let n = 2;
      while (seen.has(slug)) slug = `${base}-${n++}`;
      seen.add(slug);

      return {
        title,
        date: ep?.date || "",
        duration: ep?.duration || "",
        audioUrl: normalizeAudioUrl(ep?.audioUrl || ""),
        link: ep?.link || "",
        description: ep?.description || "",
        dj: ep?.dj || "",
        show: ep?.show || "",
        djSlug: ep?.djSlug || "",
        slug,
      };
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
};
