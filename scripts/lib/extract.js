/*
 * extract.js — pull raw vehicle records out of a fetched inventory page.
 *
 * Three strategies, tried in order of reliability:
 *   1. JSON-LD (schema.org Vehicle/Car/Product) — the most stable signal. Most
 *      Canadian dealer platforms (EDealer, Convermax, DealerOn, Dealer.com)
 *      emit per-vehicle JSON-LD or an ItemList of them.
 *   2. Embedded state blobs (__NEXT_DATA__, __INITIAL_STATE__, dataLayer) —
 *      heuristic deep-search for arrays of vehicle-shaped objects.
 *   3. Cheerio card fallback — scan DOM nodes that contain a year + price text.
 *
 * Every function is defensive: it returns [] rather than throwing, so one bad
 * page never sinks a scrape run.
 */

const cheerio = require("cheerio");

// ---- strategy 1: JSON-LD ----------------------------------------------------
function collectVehicles(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectVehicles(n, out));
    return;
  }
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => /^(Car|Vehicle|Motorcycle|Product|IndividualProduct)$/i.test(t || ""))) {
    out.push(node);
  }
  // Recurse into common container keys.
  for (const k of ["itemListElement", "item", "mainEntity", "@graph", "offers", "hasVariant"]) {
    if (node[k]) collectVehicles(node[k], out);
  }
}

function fromJsonLd(node) {
  const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  const price = (offers && (offers.price || offers.lowPrice)) || node.price;
  const odo = node.mileageFromOdometer;
  const km = odo && (odo.value != null ? odo.value : odo);
  const drive = node.driveWheelConfiguration || node.vehicleConfiguration;
  const brand = node.brand && (node.brand.name || node.brand);
  const model = node.model && (node.model.name || node.model);
  return {
    title: [node.vehicleModelDate || node.modelDate || node.productionDate, brand, node.name, model]
      .filter(Boolean)
      .join(" "),
    name: node.name,
    make: brand,
    model,
    year: node.vehicleModelDate || node.modelDate || node.productionDate,
    price,
    km,
    drivetrain: typeof drive === "string" ? drive : drive && drive.name,
    vin: node.vehicleIdentificationNumber || node.sku || node.productID,
    trim: node.vehicleConfiguration || node.trim,
    url: node.url,
  };
}

function extractJsonLd(html) {
  const $ = cheerio.load(html);
  const out = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    try {
      collectVehicles(JSON.parse(txt), out);
    } catch {
      /* malformed block — skip */
    }
  });
  return out.map(fromJsonLd);
}

// ---- strategy 2: embedded state blobs --------------------------------------
function looksLikeVehicle(o) {
  if (!o || typeof o !== "object") return false;
  const keys = Object.keys(o).map((k) => k.toLowerCase());
  const has = (names) => names.some((n) => keys.includes(n));
  return (
    has(["year", "modelyear"]) &&
    has(["price", "internetprice", "sellingprice", "askingprice"]) &&
    has(["model", "modelname", "carmodel"])
  );
}

function deepFindVehicles(node, out, depth) {
  if (depth > 8 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    if (node.length && looksLikeVehicle(node[0])) {
      node.forEach((v) => looksLikeVehicle(v) && out.push(v));
    } else {
      node.forEach((n) => deepFindVehicles(n, out, depth + 1));
    }
    return;
  }
  for (const v of Object.values(node)) deepFindVehicles(v, out, depth + 1);
}

function pick(o, names) {
  for (const n of names) {
    for (const k of Object.keys(o)) {
      if (k.toLowerCase() === n) return o[k];
    }
  }
  return undefined;
}

function extractStateBlob(html) {
  const blobs = [];
  const patterns = [
    // Next.js embeds pure JSON in a script tag, not an assignment.
    /<script[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/,
    /window\.__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
    /dataLayer\s*=\s*(\[[\s\S]*?\])\s*;/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      try {
        blobs.push(JSON.parse(m[1]));
      } catch {
        /* skip */
      }
    }
  }
  const found = [];
  blobs.forEach((b) => deepFindVehicles(b, found, 0));
  return found.map((o) => ({
    title: [pick(o, ["year", "modelyear"]), pick(o, ["make", "makename"]), pick(o, ["model", "modelname", "carmodel"]), pick(o, ["trim", "trimname"])]
      .filter(Boolean)
      .join(" "),
    make: pick(o, ["make", "makename"]),
    model: pick(o, ["model", "modelname", "carmodel"]),
    year: pick(o, ["year", "modelyear"]),
    price: pick(o, ["price", "internetprice", "sellingprice", "askingprice"]),
    km: pick(o, ["km", "kilometers", "kilometres", "odometer", "mileage"]),
    drivetrain: pick(o, ["drivetrain", "drivetype", "drive"]),
    vin: pick(o, ["vin"]),
    trim: pick(o, ["trim", "trimname"]),
    url: pick(o, ["url", "vdpurl", "link"]),
  }));
}

// ---- strategy 3: cheerio card fallback -------------------------------------
function extractCards(html) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  // Candidate containers used across dealer templates.
  const sel = '[class*="vehicle"],[class*="listing"],[class*="inventory"],[class*="result"],[class*="srp"],[class*="vcard"],article';
  $(sel).each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, " ").trim();
    if (!text || text.length > 600) return; // skip page-level wrappers
    if (!/\b(19[9]\d|20[0-3]\d)\b/.test(text)) return;
    if (!/\$\s?\d{1,3}[,\d]{3,}/.test(text)) return;
    const key = text.slice(0, 120);
    if (seen.has(key)) return;
    seen.add(key);
    const priceMatch = text.match(/\$\s?(\d{1,3}(?:[,\s]\d{3})+)/);
    const link = $el.find("a[href]").attr("href");
    out.push({
      title: text.slice(0, 160),
      year: text,
      price: priceMatch ? priceMatch[1] : null,
      km: text,
      drivetrain: text,
      url: link || null,
    });
  });
  return out;
}

/* Run all three strategies and return the first that yields records. */
function extractListings(html) {
  if (!html) return [];
  for (const fn of [extractJsonLd, extractStateBlob, extractCards]) {
    try {
      const rows = fn(html);
      if (rows && rows.length) return rows;
    } catch {
      /* try next strategy */
    }
  }
  return [];
}

module.exports = { extractListings, extractJsonLd, extractStateBlob, extractCards };
