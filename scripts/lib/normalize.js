/*
 * normalize.js — turn a messy scraped vehicle record into a CarScore listing.
 *
 * CarScore can only score models that exist in its DB (src/CarScore.js), so the
 * single most important job here is mapping a free-text title like
 * "2019 Toyota RAV4 XLE AWD" onto a canonical DB key like "Toyota RAV4".
 * Anything we can't map is dropped by the orchestrator.
 */

// Order matters only for safety; the patterns are mutually exclusive in practice.
// \b...\b keeps "CX-5" from matching "CX-50"/"CX-30" and "Mazda3" distinct from "CX".
const MODEL_PATTERNS = [
  [/\brav\s?-?4\b/i, "Toyota RAV4"],
  [/\bcx\s?-?5\b/i, "Mazda CX-5"],
  [/\bcr\s?-?v\b/i, "Honda CR-V"],
  [/\bforester\b/i, "Subaru Forester"],
  [/\bcorolla\b/i, "Toyota Corolla"],
  [/\bmazda\s?-?3\b/i, "Mazda3"],
  [/\btucson\b/i, "Hyundai Tucson"],
  [/\bkona\b/i, "Hyundai Kona"],
  [/\belantra\b/i, "Hyundai Elantra"],
];

function mapModel(text) {
  if (!text) return null;
  for (const [re, key] of MODEL_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}

const AWD_RE = /\b(awd|4wd|4x4|4motion|htrac|i-?activ|sh-?awd|all[\s-]?wheel|symmetrical|quattro|xdrive)\b/i;

// Returns "AWD", "FWD", or null (unknown — caller decides how to label).
function detectDrivetrain(text) {
  if (!text) return null;
  if (AWD_RE.test(text)) return "AWD";
  if (/\bfwd\b|\bfront[\s-]?wheel\b|\b2wd\b/i.test(text)) return "FWD";
  return null;
}

function detectCpo(text) {
  if (!text) return false;
  return /\b(certified|cpo|certified pre-?owned)\b/i.test(text);
}

function parseYear(text) {
  if (!text) return null;
  const m = String(text).match(/\b(19[9]\d|20[0-3]\d)\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1995 && y <= 2027 ? y : null;
}

function parsePrice(text) {
  if (text == null) return null;
  if (typeof text === "number") return Math.round(text);
  if (/call|contact|enquire|inquire/i.test(text)) return null;
  const digits = String(text).replace(/[^\d.]/g, "");
  if (!digits) return null;
  const n = Math.round(parseFloat(digits));
  // Strip cents-style or implausible values.
  return n >= 1000 && n <= 200000 ? n : null;
}

function parseKm(text) {
  if (text == null) return null;
  if (typeof text === "number") return Math.round(text);
  const str = String(text);
  // Prefer the number token immediately before "km" (thousands separators allowed,
  // but no spaces so it can't swallow an adjacent price). Scan all and take the
  // first plausible odometer value.
  const re = /(\d{1,3}(?:[,.]\d{3})+|\d{3,6})\s*(?:km\b|kms\b|kilomet)/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    if (n >= 0 && n <= 500000) return n;
  }
  return null;
}

function cleanVin(text) {
  if (!text) return null;
  const m = String(text).toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
  return m ? m[0] : null;
}

/*
 * Assemble a CarScore listing from loosely-typed fields. Returns null when the
 * record can't be scored (no recognized model, no year, or no price).
 * `source` and `location` are supplied by the per-dealer module.
 */
function makeListing(raw, meta) {
  const title = raw.title || raw.name || "";
  const model = mapModel(`${title} ${raw.make || ""} ${raw.model || ""}`);
  if (!model) return null;

  const year = parseYear(raw.year) || parseYear(title);
  const price = parsePrice(raw.price);
  if (!year || !price) return null;

  const km = parseKm(raw.km != null ? raw.km : title) ?? null;
  let drivetrain = detectDrivetrain(`${title} ${raw.drivetrain || ""} ${raw.trim || ""}`);
  const driveUnknown = drivetrain == null;
  // Don't guess FWD — that penalizes the awd score. "Unknown" lets the scorer
  // fall back to the model's default capability; the note flags it for the user.
  if (drivetrain == null) drivetrain = "Unknown";

  const cpo = detectCpo(`${title} ${raw.cpo ? "certified" : ""}`);
  const vin = cleanVin(raw.vin) || null;

  const notes = [];
  if (raw.trim && !/^\W*$/.test(raw.trim)) notes.push(raw.trim);
  if (driveUnknown) notes.push("drivetrain unverified — confirm on listing");
  if (raw.note) notes.push(raw.note);

  return {
    model,
    year,
    price,
    km,
    drivetrain,
    cpo,
    vin,
    source: meta.source,
    location: meta.location || "Thunder Bay",
    trim: raw.trim && !/^\W*$/.test(raw.trim) ? String(raw.trim).trim() : "—",
    note: notes.join(" · ") || "Scraped listing — verify live before acting.",
    url: raw.url || null,
  };
}

module.exports = {
  mapModel,
  detectDrivetrain,
  detectCpo,
  parseYear,
  parsePrice,
  parseKm,
  cleanVin,
  makeListing,
};
