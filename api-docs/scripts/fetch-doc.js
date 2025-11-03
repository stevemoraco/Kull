#!/usr/bin/env node

/**
 * Fetches a documentation page with Puppeteer and writes the rendered HTML or text to stdout.
 * Usage: node fetch-doc.js <url>
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: node fetch-doc.js <url>");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 240000,
    });

    if (!response) {
      throw new Error("No response received");
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`HTTP ${status} loading ${url}`);
    }

    // Cloudflare challenge pages often hide the real content; give them a chance to resolve.
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const title = await page.title();
    let html;
    try {
      html = await page.$eval("main", (el) => el.innerHTML);
    } catch {
      html = await page.content();
    }

    process.stderr.write(`Fetched ${url} -> "${title}"\n`);
    process.stdout.write(html);
  } catch (err) {
    console.error(err.stack || err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
