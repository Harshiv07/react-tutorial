#!/usr/bin/env node
/*
 * scrape.js — refresh CarScore's listing seed.
 *
 *   npm run scrape
 *
 * Runs every source in scripts/scrapers/, normalizes results to CarScore's
 * listing schema, de-dupes, sorts, and writes src/data/listings.json. The
 * React app loads that file as its leaderboard seed.
 *
 * Design notes:
 *  - Sources are isolated (Promise.allSettled): one broken/blocked site never
 *    sinks the run.
 *  - If the whole run yields zero listings (e.g. every host blocked by a network
 *    policy, or all sites changed their markup), the existing listings.json is
 *    LEFT INTACT rather than wiped — so a failed refresh can't empty the app.
 *  - Run this where outbound network is unrestricted (your local machine).
 *    Best-effort sources (CarGurus.ca, Clutch.ca) need a residential IP or a
 *    scraper API to get past anti-bot and will usually report 0 otherwise.
 */

const fs = require("fs");
const path = require("path");
const sources = require("./scrapers");

const OUT = path.join(__dirname, "..", "src", "data", "listings.json");

function dedupeKey(c) {
  if (c.vin) return `vin:${c.vin}`;
  return `${c.source}|${c.model}|${c.year}|${c.price}|${c.km ?? ""}|${c.trim ?? ""}`;
}

async function main() {
  console.log(`CarScore scrape — ${new Date().toISOString()}`);
  console.log("─".repeat(60));

  const results = await Promise.allSettled(sources.map((s) => s.scrape()));

  const all = [];
  results.forEach((r, i) => {
    const src = sources[i];
    if (r.status === "rejected") {
      console.log(`  ✗ ${src.source.padEnd(24)} error: ${r.reason && r.reason.message}`);
      return;
    }
    const { listings, blocked } = r.value;
    const tag = blocked ? "(blocked / anti-bot)" : "";
    const flag = listings.length ? "✓" : "·";
    console.log(`  ${flag} ${src.source.padEnd(24)} ${String(listings.length).padStart(3)} listings ${tag}`);
    all.push(...listings);
  });

  // De-dupe.
  const seen = new Set();
  const unique = [];
  for (const c of all) {
    const k = dedupeKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(c);
  }
  // Sort newest+cheapest first for a sensible default order.
  unique.sort((a, b) => b.year - a.year || a.price - b.price);

  console.log("─".repeat(60));
  console.log(`  Total unique scoreable listings: ${unique.length}`);

  if (unique.length === 0) {
    console.log("\n  No listings scraped — keeping existing src/data/listings.json intact.");
    console.log("  (Run on an unrestricted network; dealer sites may also have changed markup.)");
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(unique, null, 2) + "\n");
  console.log(`  Wrote ${path.relative(path.join(__dirname, ".."), OUT)}`);
}

main().catch((e) => {
  console.error("Scrape failed:", e);
  process.exit(1);
});
