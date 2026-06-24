/* Superior Hyundai — Thunder Bay, ON. Used inventory (mixed makes). */
const { genericScrape } = require("../lib/genericScrape");

const config = {
  key: "superiorhyundai",
  source: "Superior Hyundai",
  location: "Thunder Bay",
  urls: [
    "https://www.superiorhyundai.ca/vehicles/used/",
    "https://www.superiorhyundai.ca/vehicles/used/?p=2",
    "https://www.superiorhyundai.ca/vehicles/used/?p=3",
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
