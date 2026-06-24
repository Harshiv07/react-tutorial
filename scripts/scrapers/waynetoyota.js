/* Wayne Toyota — Thunder Bay, ON. Used inventory (all makes on the used lot). */
const { genericScrape } = require("../lib/genericScrape");

const config = {
  key: "waynetoyota",
  source: "Wayne Toyota",
  location: "Thunder Bay",
  urls: [
    "https://www.waynetoyota.com/vehicles/used/",
    "https://www.waynetoyota.com/vehicles/used/?p=2",
    "https://www.waynetoyota.com/vehicles/used/?p=3",
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
