/*
 * genericScrape.js — config-driven scrape used by every source module.
 *
 * A source supplies: { key, source, location, urls[] }. We fetch each URL,
 * run the extraction strategies, normalize to CarScore listings, and drop
 * anything that isn't a model in the DB. Pagination is just "list more URLs".
 */

const { fetchPage } = require("./fetchPage");
const { extractListings } = require("./extract");
const { makeListing } = require("./normalize");

async function genericScrape(config) {
  const meta = { source: config.source, location: config.location };
  const listings = [];
  let blocked = false;

  for (const url of config.urls) {
    const res = await fetchPage(url);
    if (res.blocked) {
      blocked = true;
      continue;
    }
    if (!res.ok || !res.html) continue;

    const rows = extractListings(res.html);
    for (const row of rows) {
      const listing = makeListing(row, meta);
      if (listing) listings.push(listing);
    }
  }

  return { key: config.key, source: config.source, listings, blocked };
}

module.exports = { genericScrape };
