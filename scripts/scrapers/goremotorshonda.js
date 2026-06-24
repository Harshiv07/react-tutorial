/* Gore Motors Honda — Thunder Bay, ON. Used inventory (mixed makes). */
const { genericScrape } = require("../lib/genericScrape");

const config = {
  key: "goremotorshonda",
  source: "Gore Motors Honda",
  location: "Thunder Bay",
  urls: [
    "https://goremotorshonda.com/used-car-inventory-thunder-bay-ontario/",
    "https://goremotorshonda.com/used/",
    "https://goremotorshonda.com/inventory/used/",
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
