const fs = require('fs');
const path = require('path');

const likesPath = path.join(process.cwd(), 'data', 'likes.json');
const articlesDir = path.join(process.cwd(), 'src', 'articles');

function parseFrontmatter(fp) {
  try {
    const txt = fs.readFileSync(fp, 'utf8');
    const m = txt.match(/^---
([\s\S]*?)
---/);
    if (!m) return {};
    const fm = {};
    for (const line of m[1].split(/?
/)) {
      const i = line.indexOf(':');
      if (i === -1) continue;
      fm[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
    }
    return fm;
  } catch (_) { return {}; }
}

module.exports = function () {
  let likes = {};
  try {
    if (fs.existsSync(likesPath)) likes = JSON.parse(fs.readFileSync(likesPath, 'utf8'));
  } catch (_) {}

  const meta = {};
  try {
    if (fs.existsSync(articlesDir)) {
      for (const f of fs.readdirSync(articlesDir)) {
        if (!f.endsWith('.md')) continue;
        const slug = f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
        const fm = parseFrontmatter(path.join(articlesDir, f));
        meta[slug] = { title: fm.title || slug, date: fm.date || '' };
      }
    }
  } catch (_) {}

  return Object.entries(likes)
    .map(([slug, count]) => ({ slug, likes: Number(count || 0), ...(meta[slug] || { title: slug }) }))
    .filter((x) => x.likes > 0)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);
};
