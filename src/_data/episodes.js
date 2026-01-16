const EleventyFetch = require("@11ty/eleventy-fetch");
const { XMLParser } = require("fast-xml-parser");

const FEED_URL = "http://80.209.241.121:8081/shows.xml"; // change if needed

module.exports = async function () {
  let xml;

  try {
    xml = await EleventyFetch(FEED_URL, {
      duration: "10m",
      type: "text"
    });
  } catch (e) {
    // If feed is unreachable during build, fail soft
    return [];
  }

  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);

  const items = doc?.rss?.channel?.item || [];
  const list = Array.isArray(items) ? items : [items];

  return list.map((it) => ({
    title: it.title || "",
    link: it.link || "",
    pubDate: it.pubDate || "",
    // Optional fields depending on your feed
    duration: it["itunes:duration"] || it["duration"] || "",
    // We'll match shows by a simple rule (see filter below)
    raw: it
  }));
};
