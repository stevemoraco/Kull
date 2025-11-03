#!/usr/bin/env node

/**
 * Converts an HTML file to Markdown using Turndown.
 * Usage: node html-to-md.js input.html output.md
 */

const fs = require("fs");
const TurndownService = require("turndown");

function main() {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    console.error("Usage: node html-to-md.js <input.html|-> <output.md|->");
    process.exit(1);
  }

  const html =
    inputPath === "-"
      ? fs.readFileSync(0, "utf8")
      : fs.readFileSync(inputPath, "utf8");
  const turndown = new TurndownService({
    codeBlockStyle: "fenced",
    headingStyle: "atx",
  });

  const markdown = turndown.turndown(html);
  if (outputPath === "-") {
    process.stdout.write(markdown);
  } else {
    fs.writeFileSync(outputPath, markdown);
  }
}

main();
