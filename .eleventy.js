const rssPlugin = require("@11ty/eleventy-plugin-rss");
const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
	console.log("[11ty] Loaded Eleventy config");
  // Copy static assets (CSS, JS, images) to output
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    try {
      const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        timeZone: "America/New_York",
      }).format(d);
    } catch (e) {
      return "";
    }
  });

  // Copy admin folder (includes config.yml)
  eleventyConfig.addPassthroughCopy("src/admin");
  console.log("[11ty] Loaded Eleventy config");
console.log("[11ty] Registering filterByShow");

eleventyConfig.addFilter("filterByShow", (items, showId) => {
  if (!Array.isArray(items)) return [];
  if (!showId) return items;

  const needle = String(showId).toLowerCase();

  return items.filter((item) => {
    const data = item?.data || item || {};
    const show =
      data.show ||
      data.showId ||
      data.showSlug ||
      data.series ||
      data.program;

    if (Array.isArray(show)) {
      return show.some(v => String(v).toLowerCase() === needle);
    }
    if (show == null) return false;

    return String(show).toLowerCase() === needle;
  });
});

  return {
    dir: { input: "src", output: "_site" },
  };

  // Copy the admin config through to output
  eleventyConfig.addPassthroughCopy({ "src/admin/config.yml": "admin/config.yml" });

  // If you already have a return object below, keep it.
  return {
    dir: {
      input: "src",
      output: "_site"
    }
  };
  
  // RSS plugin
  eleventyConfig.addPlugin(rssPlugin);

  // Date/time formatting helpers
  eleventyConfig.addFilter("readableDT", (iso) => {
    return DateTime.fromISO(iso, { zone: "America/New_York" }).toFormat("ccc • h:mm a");
  });

eleventyConfig.addFilter("readableDate", (dateObj) => {
  if (!dateObj) return ""; // don’t explode if missing
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  if (isNaN(d.getTime())) return ""; // invalid date input
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
});


  // Collections
  eleventyConfig.addCollection("shows", (collectionApi) => {
    return collectionApi.getFilteredByGlob("./src/shows/*.md");
  });

  // Articles collection (tag-driven)
  eleventyConfig.addCollection("articles", (collectionApi) => {
    return collectionApi.getFilteredByTag("articles");
  });

  // Music collection (tag-driven)
  eleventyConfig.addCollection("music", (collectionApi) => {
    return collectionApi.getFilteredByTag("music");
  });

  // Tag list (exclude Eleventy/system tags + internal "articles" tag)
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

  // Filters used by the curated music page
  eleventyConfig.addFilter("findByUrl", (collection, url) => {
	  
    if (!collection || !url) return null;
    return collection.find((p) => p.url === url) || null;
  });

  eleventyConfig.addFilter("pluckByUrl", (collection, urls) => {
    if (!collection || !Array.isArray(urls)) return [];
    return urls
      .map((u) => collection.find((p) => p.url === u))
      .filter(Boolean);
  });

  // Episode filtering helper (your original logic, properly closed)
  eleventyConfig.addFilter("filterByShow", (episodes, showSlug) => {
    if (!Array.isArray(episodes)) return [];
    const needle = String(showSlug || "").toLowerCase();

    return episodes.filter((e) => {
      const t = String(e.title || "").toLowerCase();
      return needle && t.includes(needle);
    });
  });
  
  // Filter a list of episodes/posts by show slug/id
eleventyConfig.addFilter("filterByShow", (items, showId) => {
  if (!Array.isArray(items) || !showId) return [];

  const needle = String(showId).toLowerCase();

  return items.filter((item) => {
    // support multiple possible shapes
    const data = item?.data || item || {};
    const show =
      data.show ||
      data.showId ||
      data.showSlug ||
      (Array.isArray(data.tags) ? data.tags.find(t => String(t).toLowerCase() === needle) : null);

    if (!show) return false;
    return String(show).toLowerCase() === needle;
  });
});

  // Eleventy directory + template engine settings
  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
