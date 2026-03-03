#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const manifestPath = path.join(ROOT, "src", "_data", "archive-manifest.json");
const audioRoot = path.join(ROOT, "src", "audio");

function slugify(str) {
  return String(str || "episode")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[k] = v;
  }
  return out;
}

const args = parseArgs(process.argv);
const required = ["djSlug", "dj", "show", "title", "date", "audio"];
for (const k of required) {
  if (!args[k]) {
    console.error(`Missing --${k}`);
    process.exit(1);
  }
}

const srcAudio = path.resolve(args.audio);
if (!fs.existsSync(srcAudio)) {
  console.error(`Audio file not found: ${srcAudio}`);
  process.exit(1);
}

const djSlug = slugify(args.djSlug);
const titleSlug = slugify(args.title);
const date = args.date.slice(0, 10);
const ext = path.extname(srcAudio) || ".mp3";
const filename = `${date}-${titleSlug}${ext}`;
const targetDir = path.join(audioRoot, djSlug);
const targetPath = path.join(targetDir, filename);

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(srcAudio, targetPath);

const audioUrl = `/audio/${djSlug}/${filename}`;
const slug = `${date}-${titleSlug}`;

let manifest = { episodes: [] };
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}
if (!Array.isArray(manifest.episodes)) manifest.episodes = [];

manifest.episodes.push({
  slug,
  title: args.title,
  date,
  duration: args.duration || "",
  description: args.description || "",
  dj: args.dj,
  show: args.show,
  djSlug,
  audioUrl,
});

manifest.episodes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log("Added episode:", slug);
console.log("Audio copied to:", targetPath);
console.log("Manifest updated:", manifestPath);
