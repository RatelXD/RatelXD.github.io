import { readFileSync } from "node:fs";
import { posix } from "node:path";

const site = JSON.parse(readFileSync(new URL("./src/_data/site.json", import.meta.url)));

export default function (config) {
  config.addPassthroughCopy("src/assets");
  for (const section of site.sections) {
    config.addCollection(section.id, collection =>
      collection.getFilteredByGlob(`src/${section.id}/*.md`).sort((a, b) =>
        b.date - a.date || a.fileSlug.localeCompare(b.fileSlug, "en")
      )
    );
  }
  config.addFilter("firstItems", (items, count) => items.slice(0, count));
  config.addFilter("isoDay", date => date.toISOString().slice(0, 10));
  config.addFilter("displayDay", date => date.toISOString().slice(0, 10).replaceAll("-", "."));
  config.addFilter("assetPath", (asset, pageUrl) => posix.relative(pageUrl.endsWith("/") ? pageUrl : posix.dirname(pageUrl), asset));
  config.addFilter("matchSlug", (entries, slug) => entries.find(entry => entry.fileSlug === slug));
  config.addFilter("omitSlug", (entries, slug) => entries.filter(entry => entry.fileSlug !== slug));
  config.addFilter("sectionById", id => site.sections.find(section => section.id === id));
  config.addFilter("topics", items => [...new Set(items.map(item => item.data.topic).filter(Boolean))]);
  config.amendLibrary("md", md => {
    md.core.ruler.push("sectionIds", state => {
      let number = 0;
      for (const token of state.tokens) {
        if (token.type === "heading_open" && token.tag === "h2") token.attrSet("id", `part-${++number}`);
      }
    });
  });
  config.addFilter("sectionLinks", html => [...html.matchAll(/<h2 id="(part-\d+)">([\s\S]*?)<\/h2>/g)]
    .map(match => ({ id: match[1], label: match[2].replace(/<[^>]*>/g, "") })));
  return {
    dir: { input: "src", output: "_site" },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: false
  };
}
