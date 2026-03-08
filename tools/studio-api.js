#!/usr/bin/env node
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT = process.cwd();
const PORT = process.env.STUDIO_API_PORT || 8787;
const TOKEN = process.env.STUDIO_UPLOAD_TOKEN || '';

const manifestPath = path.join(ROOT, 'src', '_data', 'archive-manifest.json');
const djsPath = path.join(ROOT, 'src', '_data', 'djs.json');
const showsPath = path.join(ROOT, 'src', '_data', 'shows.json');
const schedulePath = path.join(ROOT, 'src', '_data', 'schedule.json');
const audioRoot = path.join(ROOT, 'src', 'audio');
const uploadsRoot = path.join(ROOT, 'src', 'assets', 'uploads');
const articlesRoot = path.join(ROOT, 'src', 'articles');

function slugify(str) {
  return String(str || 'item')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function runBuild(cb) {
  exec('npm run build', { cwd: ROOT }, (err, stdout, stderr) => cb(err, stdout, stderr));
}

function requireToken(req, res, next) {
  if (!TOKEN) return res.status(500).json({ ok: false, error: 'Server token not configured' });
  const token = req.get('x-studio-token') || '';
  if (token !== TOKEN) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 350 * 1024 * 1024 },
});

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/upload-image', requireToken, upload.single('image'), (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ ok: false, error: 'Missing image file' });

    const ext = (path.extname(f.originalname || '').toLowerCase() || '.jpg');
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      return res.status(400).json({ ok: false, error: 'Unsupported image type' });
    }

    const folder = slugify(req.body.folder || 'general');
    const base = slugify(req.body.name || path.basename(f.originalname, ext) || 'image');
    const stamp = Date.now();

    const targetDir = path.join(uploadsRoot, folder);
    fs.mkdirSync(targetDir, { recursive: true });

    const filename = `${base}-${stamp}${ext}`;
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, f.buffer);

    const url = `/assets/uploads/${folder}/${filename}`;
    const rebuild = String(req.body.rebuild || 'true') !== 'false';

    if (!rebuild) return res.json({ ok: true, url });

    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed after image upload', details: stderr || String(err) });
      return res.json({ ok: true, url, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/save-djs', requireToken, (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items must be an array' });
    fs.writeFileSync(djsPath, JSON.stringify({ items }, null, 2) + '\n');
    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed after saving DJs', details: stderr || String(err) });
      return res.json({ ok: true, count: items.length, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/save-shows', requireToken, (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items must be an array' });
    fs.writeFileSync(showsPath, JSON.stringify({ items }, null, 2) + '\n');
    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed after saving shows', details: stderr || String(err) });
      return res.json({ ok: true, count: items.length, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/api/save-schedule', requireToken, (req, res) => {
  try {
    const timezone = String(req.body?.timezone || 'America/New_York');
    const items = req.body?.items;
    if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items must be an array' });
    fs.writeFileSync(schedulePath, JSON.stringify({ timezone, items }, null, 2) + '\n');
    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed after saving schedule', details: stderr || String(err) });
      return res.json({ ok: true, count: items.length, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/upload', requireToken, upload.single('audio'), (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ ok: false, error: 'Missing audio file' });

    const { djSlug, dj, show, title, date, duration, description } = req.body;
    for (const k of ['djSlug', 'dj', 'show', 'title', 'date']) {
      if (!req.body[k]) return res.status(400).json({ ok: false, error: `Missing ${k}` });
    }

    const ext = (path.extname(f.originalname || '').toLowerCase() || '.mp3');
    if (!['.mp3', '.m4a', '.ogg', '.wav'].includes(ext)) {
      return res.status(400).json({ ok: false, error: 'Unsupported file type' });
    }

    const safeDj = slugify(djSlug);
    const safeTitle = slugify(title);
    const safeDate = String(date).slice(0, 10);
    const slug = `${safeDate}-${safeTitle}`;

    const targetDir = path.join(audioRoot, safeDj);
    fs.mkdirSync(targetDir, { recursive: true });

    const filename = `${safeDate}-${safeTitle}${ext}`;
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, f.buffer);

    let manifest = { episodes: [] };
    if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest.episodes)) manifest.episodes = [];

    manifest.episodes = manifest.episodes.filter((e) => e.slug !== slug);
    manifest.episodes.push({
      slug,
      title,
      date: safeDate,
      duration: duration || '',
      description: description || '',
      dj,
      show,
      djSlug: safeDj,
      audioUrl: `/audio/${safeDj}/${filename}`,
    });
    manifest.episodes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed', details: stderr || String(err) });
      return res.json({ ok: true, slug, audioUrl: `/audio/${safeDj}/${filename}`, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/api/save-article', requireToken, (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const date = String(req.body?.date || '').trim();
    const description = String(req.body?.description || '').trim();
    const body = String(req.body?.body || '').trim();
    const image = String(req.body?.image || '').trim();

    if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
    if (!date) return res.status(400).json({ ok: false, error: 'date is required' });
    if (!description) return res.status(400).json({ ok: false, error: 'description is required' });
    if (!body) return res.status(400).json({ ok: false, error: 'body is required' });

    const safeDate = date.slice(0, 10);
    const slug = slugify(title) || 'article';
    const filename = `${safeDate}-${slug}.md`;
    fs.mkdirSync(articlesRoot, { recursive: true });

    const esc = (v) => String(v || '').replace(/"/g, '\\"');
    const lines = [
      '---',
      `title: "${esc(title)}"`,
      `description: "${esc(description)}"`,
      `date: ${safeDate}`,
      'tags: [articles]',
      'layout: layout-article.njk',
    ];
    if (image) lines.push(`image: "${esc(image)}"`);
    lines.push('---', '', body, '');

    const fullPath = path.join(articlesRoot, filename);
    fs.writeFileSync(fullPath, lines.join('\n'));

    runBuild((err, _stdout, stderr) => {
      if (err) return res.status(500).json({ ok: false, error: 'Build failed after saving article', details: stderr || String(err) });
      return res.json({ ok: true, filename, path: `/articles/${slug}/`, build: 'ok' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Studio API listening on http://127.0.0.1:${PORT}`);
});
