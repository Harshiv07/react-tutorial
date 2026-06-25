/*
 * Clutch.ca — online used-car retailer (ships across Ontario, incl. Thunder Bay).
 *
 * BEST-EFFORT: Clutch renders its catalogue client-side and may gate scraping.
 * A plain fetch often returns nothing; left in place for environments where it
 * works (or where a scraper API is configured upstream).
 */
const { genericScrape } = require("../lib/genericScrape");

const config = {
  key: "clutch",
  source: "Clutch.ca",
  location: "Ontario (ships to Thunder Bay)",
  bestEffort: true,
  urls: [
    "https://www.clutch.ca/buy/toyota-rav4",
    "https://www.clutch.ca/buy/mazda-cx-5",
    "https://www.clutch.ca/buy/honda-cr-v",
    "https://www.clutch.ca/buy/subaru-forester",
    "https://www.clutch.ca/buy/hyundai-tucson",
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
