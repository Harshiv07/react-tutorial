/*
 * CarGurus.ca — national aggregator, filtered to the Thunder Bay area.
 *
 * BEST-EFFORT: CarGurus.ca sits behind DataDome anti-bot. A plain fetch will
 * usually get a challenge page, so this source is expected to return nothing
 * unless run from a residential IP / with a scraper API in front of it.
 * Left in place so it "just works" wherever it can.
 */
const { genericScrape } = require("../lib/genericScrape");

const ZIP = "P7B"; // Thunder Bay
const config = {
  key: "cargurus",
  source: "CarGurus.ca",
  location: "Thunder Bay area",
  bestEffort: true,
  urls: [
    `https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&zip=${ZIP}&distance=150`,
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
