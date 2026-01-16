const rssPlugin = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
	eleventyConfig.addPassthroughCopy({ "src/favicon.png": "favicon.png" });

  // RSS plugin
  eleventyConfig.addPlugin(rssPlugin);

  // Copy static assets (CSS, JS) to output
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
	const { DateTime } = require("luxon");

	eleventyConfig.addFilter("readableDT", (iso) => {
	  return DateTime.fromISO(iso, { zone: "America/New_York" }).toFormat("ccc • h:mm a");
	});

  // Date formatting helper
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  });
	eleventyConfig.addCollection("shows", (collectionApi) => {
	  return collectionApi.getFilteredByGlob("./src/shows/*.md");
	});

  // Articles collection (driven by tag "articles" from src/articles/articles.json)
  eleventyConfig.addCollection("articles", (collectionApi) => {
    return collectionApi.getFilteredByTag("articles");
  });

  // Tag list (exclude Eleventy/system tags + our internal "articles" tag)
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
  eleventyConfig.addFilter("filterByShow", (episodes, showSlug) => {
  if (!Array.isArray(episodes)) return [];

  // simple matching strategy:
  // if episode title contains the slug or the show title, it matches
  // you can improve this later if your RSS has a better field.
  const needle = String(showSlug || "").toLowerCase();

  return episodes.filter((e) => {
    const t = String(e.title || "").toLowerCase();
    return needle && t.includes(needle);
  });
});


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
