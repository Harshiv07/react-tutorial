import React, { useState, useEffect, useMemo, useCallback } from "react";
import LISTINGS from "./data/listings.json";

/* =========================================================================
   CarScore — Thunder Bay first-car comparison & scoring engine
   - 14-column weighted scoring from the playbook
   - Built-in reliability/fuel/resale/maintenance DB auto-fills hard columns
   - Quick mode: enter price, year, model, km, drivetrain (+ optional VIN)
   - Persistent storage (localStorage) so the leaderboard survives sessions
   - Live re-ranking every time a car is added
   - Leaderboard seeds from src/data/listings.json, refreshed by `npm run scrape`
   - Dark / light mode toggle (preference saved to localStorage)
   ========================================================================= */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
`;

const C = {
  base: "#0E1620", panel: "#16212E", panel2: "#1D2A3A", line: "#2A3A4D",
  frost: "#EAF1F7", mute: "#8A9BB0", cyan: "#3FD0E0", cyanDim: "#1B6E78",
  amber: "#E9B949", green: "#5BD89A", red: "#E97171", gold: "#D7B26A",
};

const CL = {
  base: "#F0F4FA", panel: "#FFFFFF", panel2: "#E8EEF6", line: "#C5D3E2",
  frost: "#0E1620", mute: "#5A6E85", cyan: "#3FD0E0", cyanDim: "#1B6E78",
  amber: "#C97A00", green: "#0D8A5A", red: "#C0392B", gold: "#9B6E20",
};

const DB = {
  "Toyota RAV4": {
    body: "Compact SUV", awd: "Optional AWD", awdScore: 4,
    fuelComb: 8.3, fuelCity: 9.2, fuelHwy: 7.1,
    reliability: 5, resale: 5, maint: 5, maintAnnual: 429,
    insure: 5, safety: 5, parts: 5, engine: "2.5L NA I4 203hp / 8-spd auto", engScore: 5,
    cargo: 4,
    problems: "2019 fuel-pump recall; 2019-20 engine-casting porosity recall; roof-rail leaks; early-2019 trans lurch (fixed 2020).",
    problemScore: 4,
    note: "Class benchmark. Verify recalls completed.",
  },
  "Mazda CX-5": {
    body: "Compact SUV", awd: "AWD on GS/GT", awdScore: 4,
    fuelComb: 8.9, fuelCity: 9.8, fuelHwy: 7.9,
    reliability: 5, resale: 4, maint: 5, maintAnnual: 447,
    insure: 4, safety: 5, parts: 4, engine: "2.5L NA I4 187hp / 6-spd auto", engScore: 5,
    cargo: 4,
    problems: "2018-19 non-turbo 2.5L cylinder-head cracking (fixed 2021); infotainment ghost-touch; Soul Red chipping; fuel-pump/PCM recalls.",
    problemScore: 3,
    note: "Best value SUV. Premium interior, i-Activ AWD.",
  },
  "Honda CR-V": {
    body: "Compact SUV", awd: "Real Time AWD", awdScore: 4,
    fuelComb: 8.0, fuelCity: 8.7, fuelHwy: 7.2,
    reliability: 4, resale: 5, maint: 4, maintAnnual: 407,
    insure: 4, safety: 5, parts: 5, engine: "1.5L turbo I4 190hp / CVT", engScore: 3,
    cargo: 5,
    problems: "1.5T oil dilution (worse in cold/short trips — relevant to T-Bay); 2017-19 battery drain; fuel-pump recall; CVT shudder TSB.",
    problemScore: 3,
    note: "Roomiest + most efficient AWD. Remote start helps oil dilution.",
  },
  "Subaru Forester": {
    body: "Compact SUV", awd: "Standard AWD", awdScore: 5,
    fuelComb: 8.2, fuelCity: 9.1, fuelHwy: 7.2,
    reliability: 4, resale: 4, maint: 4, maintAnnual: 632,
    insure: 4, safety: 5, parts: 4, engine: "2.5L NA boxer 182hp / CVT", engScore: 3,
    cargo: 4,
    problems: "Buy 2019+ (FB engine + updated CVT resolved older head-gasket/CVT issues); check oil consumption history; cold-start timing rattle.",
    problemScore: 4,
    note: "Best pure winter capability. Standard symmetrical AWD.",
  },
  "Toyota Corolla": {
    body: "Sedan", awd: "FWD only", awdScore: 2,
    fuelComb: 7.1, fuelCity: 7.9, fuelHwy: 6.1,
    reliability: 5, resale: 5, maint: 5, maintAnnual: 362,
    insure: 5, safety: 5, parts: 5, engine: "1.8L NA I4 139hp / CVT", engScore: 4,
    cargo: 3,
    problems: "Minimal. Bulletproof. Needs winter tires (FWD).",
    problemScore: 5,
    note: "Cheapest to own. Top resale. FWD + winter tires.",
  },
  "Mazda3": {
    body: "Sedan", awd: "Optional i-Activ AWD", awdScore: 4,
    fuelComb: 8.0, fuelCity: 9.2, fuelHwy: 7.0,
    reliability: 5, resale: 4, maint: 5, maintAnnual: 433,
    insure: 4, safety: 5, parts: 4, engine: "2.5L NA I4 186hp / 6-spd auto", engScore: 5,
    cargo: 3,
    problems: "Premature brake wear; glitchy infotainment on early units. Rare AWD in class is a winter plus.",
    problemScore: 4,
    note: "Only AWD sedan here. Upscale, fun to drive.",
  },
  "Hyundai Tucson": {
    body: "Compact SUV", awd: "Optional HTRAC AWD", awdScore: 4,
    fuelComb: 9.6, fuelCity: 10.6, fuelHwy: 8.3,
    reliability: 4, resale: 3, maint: 4, maintAnnual: 426,
    insure: 4, safety: 5, parts: 4, engine: "2.0L/2.4L NA I4 161-181hp / 6-spd auto", engScore: 3,
    cargo: 4,
    problems: "2.4L Theta II (knock-sensor/oil-consumption campaign — verify done); 2.0 Nu base less affected; some 2019-21 ABS/engine-fire recalls. Confirm all recalls completed.",
    problemScore: 3,
    note: "Lower resale = cheaper entry. HTRAC AWD good in winter. Check engine recalls.",
  },
  "Hyundai Kona": {
    body: "Subcompact SUV", awd: "Optional AWD", awdScore: 4,
    fuelComb: 8.0, fuelCity: 8.6, fuelHwy: 7.3,
    reliability: 4, resale: 4, maint: 4, maintAnnual: 420,
    insure: 4, safety: 5, parts: 4, engine: "2.0L NA I4 147hp / 6-spd auto (avoid 1.6T)", engScore: 3,
    cargo: 3,
    problems: "2.0 NA robust; early 1.6T (Sport/Ultimate) less so. Smaller cargo. Check for accident repaint and recall completion.",
    problemScore: 4,
    note: "Smallest here; nimble winter runabout with AWD. Strong value.",
  },
  "Hyundai Elantra": {
    body: "Sedan", awd: "FWD only", awdScore: 2,
    fuelComb: 7.4, fuelCity: 8.1, fuelHwy: 6.4,
    reliability: 4, resale: 3, maint: 4, maintAnnual: 452,
    insure: 5, safety: 5, parts: 4, engine: "2.0L NA I4 147hp / IVT or 6-spd auto", engScore: 3,
    cargo: 3,
    problems: "2.0 Nu generally reliable; verify catalytic-converter/engine recalls. FWD — budget for winter tires.",
    problemScore: 4,
    note: "Cheap, well-equipped, low insurance. FWD + winter tires.",
  },
};

const MODEL_LIST = Object.keys(DB);

const BLANK_FORM = { model: MODEL_LIST[0], year: "", price: "", km: "", drivetrain: "AWD", vin: "", cpo: false, source: "", location: "", warrantyMonths: "" };

const BUDGET = 30000;

const UNDER_BUDGET = {
  "Toyota RAV4": "2018–2020 LE/XLE AWD all fit; even 2020 XLE AWD averages ~$29.5K.",
  "Mazda CX-5": "Every 2018–2021 GS/GT AWD fits comfortably (~$20–26K) — most headroom.",
  "Honda CR-V": "2018–2020 LX/EX AWD fit (~$22–28K); skip loaded 2021 Touring.",
  "Subaru Forester": "2019–2021 base/Touring AWD fit (~$20–27K); avoid Premier/loaded 2022.",
  "Toyota Corolla": "Any 2019–2022 fits with huge room to spare (~$18–22K).",
  "Mazda3": "Any 2019–2021 incl. GT i-Activ AWD fits (~$18–24K).",
  "Hyundai Tucson": "2018–2021 Preferred/Luxury AWD fit easily (~$18–25K); lots of headroom.",
  "Hyundai Kona": "2018–2021 Preferred AWD fit (~$17–23K).",
  "Hyundai Elantra": "Any 2018–2021 fits with huge room (~$14–19K).",
};

const NEWCPO = [
  {
    model: "Toyota RAV4",
    newNote: "All-new 6th-gen for 2026 — HYBRID-ONLY, standard AWD.",
    newRange: "$37,500 – $52,450 MSRP",
    newDetail: "LE AWD $37,500 · XLE $41,300 · XLE Premium $43,800 · Woodland $47,000 · Limited $52,000 · XSE $50,900. 236 hp hybrid, ~5.7 L/100km combined. Built in Ontario.",
    cpoNote: "Toyota Certified (Canada): 6-mo/10,000 km powertrain warranty ($0 deductible) + balance of 5yr/100,000 km factory powertrain, 160-pt inspection, CARFAX, 1yr roadside.",
    cpoRange: "CPO 2021-2023 RAV4 AWD ≈ $30,000 – $38,000",
    worth: "CPO premium typically small vs regular used. Worth it here for first owner.",
  },
  {
    model: "Mazda CX-5",
    newNote: "All-new 3rd-gen for 2026 — standard i-Activ AWD on every trim.",
    newRange: "$36,300 – $42,200 MSRP",
    newDetail: "GX $36,300 · GS $39,200 · GT $42,200. 2.5L NA 187hp, 6-spd auto, standard AWD. On sale Spring 2026. 4.5\" longer than outgoing gen.",
    cpoNote: "Mazda Certified Pre-Owned: 160-pt inspection, CARFAX, 7yr/140,000 km powertrain (from in-service date), 90-day comprehensive, roadside.",
    cpoRange: "CPO 2021-2023 CX-5 AWD ≈ $26,000 – $34,000",
    worth: "Strong CPO powertrain term (7yr). Best value of the three.",
  },
  {
    model: "Honda CR-V",
    newNote: "6th-gen (since 2023). AWD available all trims; hybrid offered.",
    newRange: "$36,975 – $44,000+ MSRP",
    newDetail: "LX 2WD $36,975 · LX AWD $39,775 · Sport AWD higher · hybrids top the range. 1.5T 190hp or hybrid, CVT, ~7.8 L/100km combined.",
    cpoNote: "Honda Certified: 7yr/160,000 km powertrain (from original in-service), 100+ pt inspection, CARFAX, 7-day exchange, roadside.",
    cpoRange: "CPO 2021-2023 CR-V AWD ≈ $30,000 – $38,000",
    worth: "Longest CPO powertrain term. Check 1.5T oil-dilution TSBs done.",
  },
];

const WEIGHTS = {
  reliability: 3, value: 3, winter: 3,
  maint: 2, fuel: 2, resale: 2, insure: 2, safety: 2, awd: 2,
  engine: 1, cargo: 1, problems: 1, parts: 1, warranty: 1,
};
const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0) * 5;

function fuelScore(comb) {
  if (comb == null) return 3;
  if (comb < 7.5) return 5;
  if (comb < 8.5) return 4;
  if (comb < 9.5) return 3;
  if (comb < 11) return 2;
  return 1;
}
function maintScore(annual) {
  if (annual == null) return 3;
  if (annual < 450) return 5;
  if (annual < 550) return 4;
  if (annual < 650) return 3;
  if (annual < 800) return 2;
  return 1;
}

const BENCH = {
  "Toyota RAV4":    { 2018: 23500, 2019: 28400, 2020: 29500 },
  "Mazda CX-5":     { 2018: 20500, 2019: 22000, 2020: 24000 },
  "Honda CR-V":     { 2018: 23000, 2019: 25500, 2020: 27000 },
  "Subaru Forester":{ 2018: 20000, 2019: 22000, 2020: 24600 },
  "Toyota Corolla": { 2018: 17500, 2019: 18800, 2020: 20000 },
  "Mazda3":         { 2018: 17000, 2019: 18300, 2020: 19300 },
  "Hyundai Tucson": { 2018: 18000, 2019: 20000, 2020: 22500 },
  "Hyundai Kona":   { 2018: 17500, 2019: 19000, 2020: 21000 },
  "Hyundai Elantra":{ 2018: 14500, 2019: 16000, 2020: 17500 },
};
function benchPrice(model, year) {
  const m = BENCH[model];
  if (!m) return null;
  if (m[year]) return m[year];
  const yrs = Object.keys(m).map(Number).sort((a, b) => a - b);
  if (year < yrs[0]) return Math.round(m[yrs[0]] * Math.pow(0.92, yrs[0] - year));
  if (year > yrs[yrs.length - 1]) return Math.round(m[yrs[yrs.length - 1]] * Math.pow(1.08, year - yrs[yrs.length - 1]));
  return m[yrs[0]];
}
const CURRENT_YEAR = new Date().getFullYear();
function valueScore(price, model, year, km) {
  const bench = benchPrice(model, year);
  if (!bench || !price) return 3;
  const age = Math.max(1, CURRENT_YEAR - year);
  const expectedKm = age * 18000;
  let kmAdj = 0;
  if (Number.isFinite(km)) kmAdj = ((km - expectedKm) / expectedKm) * 0.15;
  const adjBench = bench * (1 + kmAdj);
  const ratio = price / adjBench;
  if (ratio <= 0.88) return 5;
  if (ratio <= 0.96) return 4;
  if (ratio <= 1.05) return 3;
  if (ratio <= 1.15) return 2;
  return 1;
}
function winterScore(d) {
  let s = d.awdScore;
  if (d.body === "Compact SUV") s = Math.min(5, s + 0.5);
  return Math.round(s);
}

function scoreCar(car) {
  const d = DB[car.model];
  if (!d) return { total: 0, breakdown: {} };
  const b = {
    reliability: d.reliability,
    value: valueScore(car.price, car.model, car.year, car.km),
    winter: winterScore(d),
    maint: maintScore(d.maintAnnual),
    fuel: fuelScore(d.fuelComb),
    resale: d.resale,
    insure: d.insure,
    safety: d.safety,
    awd: car.drivetrain === "AWD" ? d.awdScore : (car.drivetrain === "FWD" ? 2 : d.awdScore),
    engine: d.engScore,
    cargo: d.cargo,
    problems: d.problemScore,
    parts: d.parts,
    warranty: car.cpo ? 5 : (car.warrantyMonths ? Math.min(5, Math.ceil(car.warrantyMonths / 12) + 1) : 1),
  };
  let total = 0;
  Object.keys(WEIGHTS).forEach((k) => { total += (b[k] || 0) * WEIGHTS[k]; });
  const overBudget = car.price > BUDGET;
  return { total, breakdown: b, overBudget };
}
function verdict(total, overBudget) {
  const pct = (total / MAX_SCORE) * 100;
  if (overBudget) return { label: "Over budget", color: C.amber };
  if (pct >= 76) return { label: "Strong buy", color: C.green };
  if (pct >= 64) return { label: "Solid", color: C.cyan };
  return { label: "Walk away", color: C.red };
}

const KEY = "carscore:v1:cars";
const SEED_HASH_KEY = "carscore:v1:seedhash";

function scrapeId(c) {
  const base = c.vin || `${c.source}|${c.model}|${c.year}|${c.price}|${c.km ?? ""}|${c.trim ?? ""}`;
  return "scrape_" + String(base).replace(/[^a-zA-Z0-9]/g, "");
}
function hashListings(list) {
  const s = JSON.stringify(list);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}
function seedEntries() {
  return LISTINGS.map((c) => ({ ...c, id: scrapeId(c) }));
}
function saveCars(cars) {
  try { localStorage.setItem(KEY, JSON.stringify(cars)); } catch (e) { /* noop */ }
}
function loadCars() {
  let stored = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { stored = []; }

  const currentHash = hashListings(LISTINGS);
  let prevHash = null;
  try { prevHash = localStorage.getItem(SEED_HASH_KEY); } catch { /* noop */ }

  if (!stored.length && prevHash == null) {
    const seeded = seedEntries();
    saveCars(seeded);
    try { localStorage.setItem(SEED_HASH_KEY, currentHash); } catch { /* noop */ }
    return seeded;
  }

  if (prevHash !== currentHash) {
    const userAdded = stored.filter((c) => !String(c.id).startsWith("scrape_"));
    const merged = [...seedEntries(), ...userAdded];
    saveCars(merged);
    try { localStorage.setItem(SEED_HASH_KEY, currentHash); } catch { /* noop */ }
    return merged;
  }

  return stored;
}

function Pill({ children, color = C.cyan, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 999,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
      color, background: bg || "rgba(63,208,224,0.10)", border: `1px solid ${color}40`,
      letterSpacing: 0.3, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function ScoreBar({ value, weight, theme = C }) {
  const pct = (value / 5) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: theme.line, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: value >= 4 ? theme.green : value >= 3 ? theme.cyan : theme.amber }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: theme.mute, width: 38 }}>
        {value}×{weight}
      </span>
    </div>
  );
}

const FIELD_LABELS = {
  reliability: "Reliability", value: "Value / cost", winter: "Winter capability",
  maint: "Maint. cost", fuel: "Fuel efficiency", resale: "Resale value",
  insure: "Insurance tier", safety: "Safety", awd: "Drivetrain",
  engine: "Engine", cargo: "Cargo / space", problems: "Known problems",
  parts: "Parts (Canada)", warranty: "Warranty (CPO)",
};

export default function CarScore() {
  const [cars, setCars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("leaderboard");
  const [expanded, setExpanded] = useState(null);
  const [showRef, setShowRef] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { const s = localStorage.getItem("carscore:v1:theme"); return s === "light" ? false : true; }
    catch { return true; }
  });

  const T = darkMode ? C : CL;

  const [form, setForm] = useState(BLANK_FORM);
  const [editId, setEditId] = useState(null);

  const toggleDark = () => setDarkMode((d) => {
    const n = !d;
    try { localStorage.setItem("carscore:v1:theme", n ? "dark" : "light"); } catch { /* noop */ }
    return n;
  });

  useEffect(() => { setCars(loadCars()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveCars(cars); }, [cars, loaded]);

  const ranked = useMemo(() => {
    return cars
      .map((c) => ({ ...c, ...scoreCar(c) }))
      .sort((a, b) => b.total - a.total);
  }, [cars]);

  const submit = useCallback(() => {
    if (!form.year || !form.price) return;
    const entry = {
      ...form,
      id: editId || `car_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      year: parseInt(form.year, 10),
      price: parseInt(String(form.price).replace(/[^\d]/g, ""), 10) || 0,
      km: form.km ? (parseInt(String(form.km).replace(/[^\d]/g, ""), 10) || null) : null,
      warrantyMonths: form.warrantyMonths ? (parseInt(form.warrantyMonths, 10) || null) : null,
    };
    setCars((prev) => editId ? prev.map((c) => c.id === editId ? entry : c) : [...prev, entry]);
    setForm(BLANK_FORM); setEditId(null); setTab("leaderboard");
  }, [form, editId]);

  const remove = (id) => setCars((prev) => prev.filter((c) => c.id !== id));
  const edit = (car) => {
    setForm({
      model: car.model, year: String(car.year), price: String(car.price),
      km: car.km ? String(car.km) : "", drivetrain: car.drivetrain, vin: car.vin || "",
      cpo: !!car.cpo, source: car.source || "", location: car.location || "",
      warrantyMonths: car.warrantyMonths ? String(car.warrantyMonths) : "",
    });
    setEditId(car.id); setTab("add"); setExpanded(null);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
    background: T.panel2, color: T.frost, border: `1px solid ${T.line}`,
    fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 600, color: T.mute,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5,
  };

  return (
    <div style={{ minHeight: "100vh", background: T.base, color: T.frost, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}{`
        * { -webkit-tap-highlight-color: transparent; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 1px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        .cs-row { transition: background 0.15s ease; }
        .cs-row:hover { background: ${T.panel2}; }
        select option { background: ${T.panel}; }
        a { color: ${T.cyan}; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${T.line}`, background: darkMode ? `linear-gradient(180deg, ${T.panel} 0%, ${T.base} 100%)` : T.panel }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "22px 20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 26, letterSpacing: -0.5 }}>
                Car<span style={{ color: T.cyan }}>Score</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.mute, marginTop: 2 }}>
                Thunder Bay first-car engine · 14-column scoring · $30K CAD ceiling
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={toggleDark}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  border: `1px solid ${T.line}`, background: T.panel2, color: T.frost,
                  fontFamily: "'Inter', sans-serif", lineHeight: 1,
                }}
              >
                {darkMode ? "☀ Light" : "☾ Dark"}
              </button>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: T.mute }}>
                  {cars.length} car{cars.length === 1 ? "" : "s"} tracked
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.cyanDim }}>
                  max score {MAX_SCORE}
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
            {[["leaderboard", "Leaderboard"], ["add", editId ? "Edit car" : "Add car"], ["method", "Scoring"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                border: `1px solid ${tab === k ? T.cyan : T.line}`,
                background: tab === k ? "rgba(63,208,224,0.12)" : "transparent",
                color: tab === k ? T.cyan : T.mute, fontFamily: "'Inter', sans-serif",
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px" }}>

        {/* ---------------- LEADERBOARD ---------------- */}
        {tab === "leaderboard" && (
          <>
            {ranked.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", border: `1px dashed ${T.line}`, borderRadius: 12, background: T.panel }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  No cars yet
                </div>
                <div style={{ color: T.mute, fontSize: 14, maxWidth: 440, margin: "0 auto 18px" }}>
                  Run <code style={{ color: T.cyan }}>npm run scrape</code> to pull live listings from the Thunder Bay
                  dealers, or add one yourself.
                </div>
                <button onClick={() => setTab("add")} style={{
                  padding: "11px 20px", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 700,
                  background: T.cyan, color: T.base, border: "none", fontFamily: "'Inter', sans-serif",
                }}>Add first car</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ranked.map((car, i) => {
                  const v = verdict(car.total, car.overBudget);
                  const d = DB[car.model];
                  const bench = benchPrice(car.model, car.year);
                  const isOpen = expanded === car.id;
                  const age = Math.max(1, CURRENT_YEAR - car.year);
                  const kmPerYear = car.km != null ? Math.round(car.km / age) : null;
                  const kmTag = kmPerYear == null ? null
                    : kmPerYear < 12000
                      ? { label: `${kmPerYear.toLocaleString()} km/yr ✓`, color: T.green }
                      : kmPerYear < 18000
                        ? { label: `${kmPerYear.toLocaleString()} km/yr`, color: T.mute }
                        : { label: `${kmPerYear.toLocaleString()} km/yr ↑`, color: T.amber };

                  return (
                    <div key={car.id} className="cs-row" style={{
                      border: `1px solid ${i === 0 ? T.cyan + "66" : T.line}`, borderRadius: 12,
                      background: i === 0 ? `linear-gradient(180deg, rgba(63,208,224,0.06), ${T.panel})` : T.panel,
                      overflow: "hidden",
                    }}>
                      <div onClick={() => setExpanded(isOpen ? null : car.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}>
                        {/* rank */}
                        <div style={{ width: 30, textAlign: "center", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: i === 0 ? T.cyan : T.mute }}>
                            {i + 1}
                          </div>
                        </div>
                        {/* identity */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>
                              {car.year} {car.model}
                            </span>
                            {car.cpo && <Pill color={T.gold} bg="rgba(215,178,106,0.12)">CPO</Pill>}
                            <Pill color={car.drivetrain === "AWD" ? T.cyan : T.mute}>{car.drivetrain}</Pill>
                            {car.overBudget && <Pill color={T.amber} bg="rgba(233,185,73,0.12)">OVER $30K</Pill>}
                            {car.url && (
                              <a
                                href={car.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 11.5, color: T.cyan, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", opacity: 0.85 }}
                                title="Open source listing"
                              >
                                ↗ listing
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12.5, color: T.mute, marginTop: 4, fontFamily: "'JetBrains Mono', monospace", display: "flex", flexWrap: "wrap", gap: "0 6px" }}>
                            <span>${car.price.toLocaleString()}</span>
                            {car.km != null && (
                              <>
                                <span style={{ color: T.line }}>·</span>
                                <span>{car.km.toLocaleString()} km</span>
                              </>
                            )}
                            {kmTag && (
                              <>
                                <span style={{ color: T.line }}>·</span>
                                <span style={{ color: kmTag.color }}>{kmTag.label}</span>
                              </>
                            )}
                            {car.location && (
                              <>
                                <span style={{ color: T.line }}>·</span>
                                <span>{car.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* score */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: v.color, lineHeight: 1 }}>
                            {car.total}
                          </div>
                          <div style={{ fontSize: 10.5, color: v.color, fontWeight: 600, marginTop: 3 }}>{v.label}</div>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop: `1px solid ${T.line}`, padding: "16px", background: T.base }}>
                          {bench && (
                            <div style={{ marginBottom: 14, fontSize: 13, color: T.frost }}>
                              <span style={{ color: T.mute }}>Market benchmark for {car.year} {car.model}: </span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>${bench.toLocaleString()}</span>
                              <span style={{ color: car.price <= bench ? T.green : T.amber, marginLeft: 8, fontWeight: 600 }}>
                                {car.price <= bench ? `↓ $${(bench - car.price).toLocaleString()} below` : `↑ $${(car.price - bench).toLocaleString()} above`}
                              </span>
                            </div>
                          )}
                          <div style={{ marginBottom: 14, fontSize: 13 }}>
                            <span style={{ color: T.mute }}>Budget ($30K): </span>
                            <span style={{ color: car.overBudget ? T.amber : T.green, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                              {car.overBudget
                                ? `$${(car.price - BUDGET).toLocaleString()} over`
                                : `$${(BUDGET - car.price).toLocaleString()} headroom`}
                            </span>
                            <span style={{ color: T.mute }}> · {UNDER_BUDGET[car.model]}</span>
                          </div>
                          {kmTag && (
                            <div style={{ marginBottom: 14, fontSize: 13 }}>
                              <span style={{ color: T.mute }}>Mileage: </span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: T.frost }}>{car.km.toLocaleString()} km total</span>
                              <span style={{ color: T.mute }}> · </span>
                              <span style={{ color: kmTag.color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{kmTag.label}</span>
                              <span style={{ color: T.mute, fontSize: 12 }}>
                                {" "}({kmPerYear < 12000 ? "low — good buy signal" : kmPerYear < 18000 ? "average use" : "high — inspect carefully"})
                              </span>
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 22px" }}>
                            {Object.keys(WEIGHTS).map((k) => (
                              <div key={k}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                  <span style={{ fontSize: 11.5, color: T.frost, fontWeight: WEIGHTS[k] === 3 ? 700 : 500 }}>
                                    {FIELD_LABELS[k]}{WEIGHTS[k] === 3 ? " ◆" : ""}
                                  </span>
                                </div>
                                <ScoreBar value={car.breakdown[k]} weight={WEIGHTS[k]} theme={T} />
                              </div>
                            ))}
                          </div>
                          <div style={{ marginTop: 14, fontSize: 12.5, color: T.mute, lineHeight: 1.6 }}>
                            <div><span style={{ color: T.frost, fontWeight: 600 }}>Engine: </span>{d.engine}</div>
                            <div style={{ marginTop: 4 }}><span style={{ color: T.amber, fontWeight: 600 }}>Watch: </span>{d.problems}</div>
                            {car.note && <div style={{ marginTop: 4 }}><span style={{ color: T.cyan, fontWeight: 600 }}>Listing: </span>{car.trim && car.trim !== "—" ? car.trim + " — " : ""}{car.note}</div>}
                            {car.url && (
                              <div style={{ marginTop: 6 }}>
                                <a href={car.url} target="_blank" rel="noopener noreferrer" style={{ color: T.cyan, fontWeight: 600 }}>
                                  View original listing ↗
                                </a>
                              </div>
                            )}
                            {car.vin && <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}><span style={{ color: T.frost }}>VIN: </span>{car.vin}</div>}
                            {car.source && <div style={{ marginTop: 4 }}><span style={{ color: T.frost }}>Source: </span>{car.source}{car.location ? ` · ${car.location}` : ""}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                            <button onClick={(e) => { e.stopPropagation(); edit(car); }} style={{
                              padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                              background: "transparent", color: T.cyan, border: `1px solid ${T.cyan}55`, fontFamily: "'Inter', sans-serif",
                            }}>Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); remove(car.id); }} style={{
                              padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                              background: "transparent", color: T.red, border: `1px solid ${T.red}44`, fontFamily: "'Inter', sans-serif",
                            }}>Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* NEW / CPO REFERENCE */}
            <div style={{ marginTop: 22 }}>
              <button onClick={() => setShowRef(!showRef)} style={{
                width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                background: T.panel, border: `1px solid ${T.line}`, color: T.frost, fontFamily: "'Inter', sans-serif",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>New / CPO reference — RAV4 · CX-5 · CR-V <span style={{ color: T.mute, fontWeight: 400 }}>(2026 CAD)</span></span>
                <span style={{ color: T.cyan, fontSize: 18 }}>{showRef ? "−" : "+"}</span>
              </button>
              {showRef && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {NEWCPO.map((r) => (
                    <div key={r.model} style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: 16, background: T.panel }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{r.model}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                        <Pill color={T.green} bg="rgba(91,216,154,0.10)">NEW {r.newRange}</Pill>
                        <Pill color={T.gold} bg="rgba(215,178,106,0.10)">{r.cpoRange}</Pill>
                      </div>
                      <div style={{ fontSize: 12.5, color: T.frost, lineHeight: 1.6 }}>
                        <div><span style={{ color: T.green, fontWeight: 600 }}>New: </span>{r.newNote} {r.newDetail}</div>
                        <div style={{ marginTop: 6 }}><span style={{ color: T.gold, fontWeight: 600 }}>CPO: </span>{r.cpoNote}</div>
                        <div style={{ marginTop: 6, color: T.cyan }}><span style={{ fontWeight: 600 }}>Verdict: </span>{r.worth}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11.5, color: T.mute, lineHeight: 1.5, padding: "4px 2px" }}>
                    Note: 2026 RAV4 (hybrid-only) and 2026 CX-5 are full redesigns — new prices sit well above your $20–30K used budget.
                    The value play stays a 2018–2020 used/CPO unit. CPO premiums over regular used are usually small (~2%); take CPO when the gap is under ~$1,500–$2,000.
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------- ADD / EDIT ---------------- */}
        {tab === "add" && (
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 20, background: T.panel }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, marginBottom: 4 }}>
              {editId ? "Edit car" : "Quick-mode entry"}
            </div>
            <div style={{ fontSize: 12.5, color: T.mute, marginBottom: 18 }}>
              Enter the 5 quick fields. Reliability, fuel, resale and maintenance auto-fill from the database and feed the score live.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Model</label>
                <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} style={inputStyle}>
                  {MODEL_LIST.map((m) => <option key={m} value={m}>{m} — {DB[m].body}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <input type="number" inputMode="numeric" placeholder="2019" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (CAD)</label>
                <input type="text" inputMode="numeric" placeholder="24000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Mileage (km)</label>
                <input type="text" inputMode="numeric" placeholder="95000" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Drivetrain</label>
                <select value={form.drivetrain} onChange={(e) => setForm({ ...form, drivetrain: e.target.value })} style={inputStyle}>
                  <option value="AWD">AWD</option>
                  <option value="FWD">FWD</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>VIN <span style={{ textTransform: "none", color: T.cyanDim }}>(optional)</span></label>
                <input type="text" placeholder="JTMBFREVxKD…" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }} />
              </div>
              <div>
                <label style={labelStyle}>Source <span style={{ textTransform: "none", color: T.cyanDim }}>(optional)</span></label>
                <input type="text" placeholder="CarGurus / Clutch / dealer" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location <span style={{ textTransform: "none", color: T.cyanDim }}>(optional)</span></label>
                <input type="text" placeholder="Thunder Bay / Winnipeg" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.cpo} onChange={(e) => setForm({ ...form, cpo: e.target.checked })} style={{ width: 16, height: 16, accentColor: T.cyan }} />
                  Certified Pre-Owned (CPO)
                </label>
                {!form.cpo && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 13.5, color: T.mute }}>Warranty left (months):</label>
                    <input type="number" inputMode="numeric" placeholder="0" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} style={{ ...inputStyle, width: 80, padding: "8px 10px" }} />
                  </div>
                )}
              </div>
            </div>

            {form.year && form.price && (() => {
              const preview = scoreCar({
                model: form.model, year: parseInt(form.year, 10),
                price: parseInt(String(form.price).replace(/[^\d]/g, ""), 10) || 0,
                km: form.km ? parseInt(String(form.km).replace(/[^\d]/g, ""), 10) : null,
                drivetrain: form.drivetrain, cpo: form.cpo,
                warrantyMonths: form.warrantyMonths ? parseInt(form.warrantyMonths, 10) : null,
              });
              const v = verdict(preview.total, preview.overBudget);
              return (
                <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: T.base, border: `1px solid ${v.color}44`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: T.mute }}>Live score preview</div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: v.color }}>{preview.total}</span>
                    <span style={{ color: T.mute, fontSize: 13 }}> / {MAX_SCORE}</span>
                    <span style={{ color: v.color, fontWeight: 600, fontSize: 12, marginLeft: 10 }}>{v.label}</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={submit} disabled={!form.year || !form.price} style={{
                padding: "12px 22px", borderRadius: 9, cursor: form.year && form.price ? "pointer" : "not-allowed",
                fontSize: 14, fontWeight: 700, border: "none", fontFamily: "'Inter', sans-serif",
                background: form.year && form.price ? T.cyan : T.line, color: form.year && form.price ? T.base : T.mute,
              }}>{editId ? "Save changes" : "Add to leaderboard"}</button>
              {editId && (
                <button onClick={() => { setForm(BLANK_FORM); setEditId(null); setTab("leaderboard"); }} style={{
                  padding: "12px 18px", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  background: "transparent", color: T.mute, border: `1px solid ${T.line}`, fontFamily: "'Inter', sans-serif",
                }}>Cancel</button>
              )}
            </div>
          </div>
        )}

        {/* ---------------- METHOD ---------------- */}
        {tab === "method" && (
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 20, background: T.panel }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, marginBottom: 6 }}>
              How the score works
            </div>
            <div style={{ fontSize: 13.5, color: T.mute, lineHeight: 1.65, marginBottom: 18 }}>
              Each column scores 1–5, multiplied by its weight, then summed. Max is {MAX_SCORE}.
              The three triple-weighted columns (◆) drive the decision — tuned for a first car,
              daily commute plus occasional long drives, and Thunder Bay winters.
              <span style={{ color: T.frost }}> Value-per-cost is computed live</span> from your price vs a
              year-and-km market benchmark, so a great deal scores higher than the same model overpriced.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.keys(WEIGHTS).sort((a, b) => WEIGHTS[b] - WEIGHTS[a]).map((k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, background: WEIGHTS[k] === 3 ? "rgba(63,208,224,0.06)" : T.base, border: `1px solid ${WEIGHTS[k] === 3 ? T.cyan + "33" : T.line}` }}>
                  <span style={{ fontSize: 13.5, fontWeight: WEIGHTS[k] === 3 ? 700 : 500 }}>
                    {FIELD_LABELS[k]} {WEIGHTS[k] === 3 && <span style={{ color: T.cyan }}>◆</span>}
                  </span>
                  <Pill color={WEIGHTS[k] === 3 ? T.cyan : T.mute}>×{WEIGHTS[k]}</Pill>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill color={T.green} bg="rgba(91,216,154,0.10)">&ge;76% Strong buy</Pill>
              <Pill color={T.cyan}>64–75% Solid</Pill>
              <Pill color={T.red} bg="rgba(233,113,113,0.10)">&lt;64% Walk away</Pill>
            </div>
            <div style={{ marginTop: 18, fontSize: 12, color: T.mute, lineHeight: 1.6, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
              Database covers the playbook models (RAV4, CX-5, CR-V, Forester, Corolla, Mazda3) plus Hyundai
              (Tucson, Kona, Elantra) in their 2018–2021 used generations. Reliability/maintenance from RepairPal
              &amp; Consumer Reports; fuel from NRCan; resale from Canadian Black Book retention data. Benchmarks are
              CarGurus.ca national averages — individual listings vary, so always confirm against the specific car.
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "8px 20px 30px", fontSize: 11, color: T.cyanDim, textAlign: "center" }}>
        Saved on this device · run <code>npm run scrape</code> to refresh listings from the Thunder Bay dealers
      </div>
    </div>
  );
}
