/* Half-Way Motors Mazda — Thunder Bay, ON. Used inventory (mixed makes). */
const { genericScrape } = require("../lib/genericScrape");

const config = {
  key: "halfwaymotorsmazda",
  source: "Half-Way Motors Mazda",
  location: "Thunder Bay",
  urls: [
    "https://www.halfwaymotorsmazda.com/used/",
    "https://www.halfwaymotorsmazda.com/vehicles/used/",
    "https://www.halfwaymotorsmazda.com/used/?p=2",
  ],
};

module.exports = { ...config, scrape: () => genericScrape(config) };
