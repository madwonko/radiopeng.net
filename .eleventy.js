const rssPlugin = require("@11ty/eleventy-plugin-rss");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  console.log("[11ty] Loaded Eleventy config");

  // --- Plugins ---
  eleventyConfig.addPlugin(rssPlugin);

  // --- Passthrough copies ---
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });
  eleventyConfig.addPassthroughCopy({ "src/_data/djs.json": "manage-data/djs.json" });
  eleventyConfig.addPassthroughCopy({ "src/_data/shows.json": "manage-data/shows.json" });
  eleventyConfig.addPassthroughCopy({ "src/_data/schedule.json": "manage-data/schedule.json" });
  eleventyConfig.addPassthroughCopy({ "src/audio": "audio" });

  // --- Filters ---

  // Used by articles.njk
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    if (!dateObj) return "";
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "America/New_York",
    }).format(d);
  });

  // Used by schedule/metadata UI (if you use it)
  eleventyConfig.addFilter("readableDT", (iso) => {
    if (!iso) return "";
    return DateTime.fromISO(iso, { zone: "America/New_York" }).toFormat(
      "ccc • h:mm a"
    );
  });

  eleventyConfig.addFilter("findByUrl", (collection, url) => {
    if (!collection || !url) return null;
    return collection.find((p) => p.url === url) || null;
  });

  eleventyConfig.addFilter("pluckByUrl", (collection, urls) => {
    if (!collection || !Array.isArray(urls)) return [];
    return urls.map((u) => collection.find((p) => p.url === u)).filter(Boolean);
  });

  // Used by show.njk
  // Filters a collection of items (episodes/posts) down to ones matching a show id/slug
  eleventyConfig.addFilter("filterByShow", (items, showId) => {
    if (!Array.isArray(items)) return [];
    if (!showId) return items;

    const needle = String(showId).toLowerCase();

    return items.filter((item) => {
      const data = item?.data || item || {};

      // Accept multiple possible front matter keys
      const show =
        data.show ||
        data.showId ||
        data.showSlug ||
        data.series ||
        data.program;

      if (Array.isArray(show)) {
        return show.some((v) => String(v).toLowerCase() === needle);
      }
      if (show != null) {
        return String(show).toLowerCase() === needle;
      }

      // Fallback: allow matching by tag
      if (Array.isArray(data.tags)) {
        return data.tags.some((t) => String(t).toLowerCase() === needle);
      }

      return false;
    });
  });

  // --- Collections ---
  eleventyConfig.addCollection("shows", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./src/shows/*.md");
  });

  eleventyConfig.addCollection("articles", (collectionApi) => {
    return collectionApi.getFilteredByTag("articles");
  });

  eleventyConfig.addCollection("music", (collectionApi) => {
    return collectionApi.getFilteredByTag("music");
  });

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const tags = new Set();

    collectionApi.getAll().forEach((item) => {
      (item.data.tags || []).forEach((tag) => {
        if (["all", "nav", "post", "posts", "articles"].includes(tag)) return;
        tags.add(tag);
      });
    });

    return [...tags].sort((a, b) => a.localeCompare(b));
  });

  // --- Final Eleventy config (ONLY ONE return) ---
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};