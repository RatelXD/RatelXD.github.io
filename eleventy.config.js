import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { posix } from "node:path";

const site = JSON.parse(readFileSync(new URL("./src/_data/site.json", import.meta.url)));

export default function (config) {
  config.addPassthroughCopy("src/assets");
  const versions = new Map();
  config.on("eleventy.before", () => versions.clear());
  config.addFilter("assetUrl", asset => {
    if (!versions.has(asset)) {
      const data = readFileSync(new URL("./src" + asset, import.meta.url));
      versions.set(asset, createHash("sha256").update(data).digest("hex").slice(0, 10));
    }
    return asset + "?v=" + versions.get(asset);
  });
  for (const section of site.sections) {
    config.addCollection(section.id, collection =>
      collection.getFilteredByGlob(`src/${section.id}/*.md`).sort((a, b) =>
        b.date - a.date || a.fileSlug.localeCompare(b.fileSlug, "en")
      )
    );
  }
  config.addCollection("pinnedFiles", collection => {
    const files = collection.getFilteredByGlob("src/{notes,projects,activities}/*.md");
    return site.pinned.map(url => files.find(file => file.url === url)).filter(Boolean);
  });
  config.addCollection("recentFiles", collection =>
    collection.getFilteredByGlob("src/{notes,projects,activities}/*.md")
      .sort((a, b) => b.date - a.date || a.fileSlug.localeCompare(b.fileSlug, "en")).slice(0, 6)
  );
  config.addFilter("isoDay", date => date.toISOString().slice(0, 10));
  config.addFilter("displayDay", date => date.toISOString().slice(0, 10).replaceAll("-", "."));
  config.addFilter("assetPath", (asset, pageUrl) => posix.relative(pageUrl.endsWith("/") ? pageUrl : posix.dirname(pageUrl), asset));
  config.addFilter("sectionById", id => site.sections.find(section => section.id === id));
  config.addFilter("topics", items => [...new Set(items.map(item => item.data.topic).filter(Boolean))]);
  config.addFilter("previewParagraph", html => {
    const paragraph = html.match(/<p>([\s\S]*?)<\/p>/i)?.[1] || "";
    return paragraph.replace(/([.!?…。])\s+(?:<a\b[^>]*>[^<]*<\/a>\s*)+$/i, "$1");
  });
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
