# CarScore

A first-car comparison & scoring engine tuned for **Thunder Bay, ON**: a weighted
14-column rubric (reliability, value, winter capability, fuel, resale, …) over a
built-in database of the usual contenders — Toyota RAV4, Mazda CX-5, Honda CR-V,
Subaru Forester, Toyota Corolla, Mazda3, and Hyundai Tucson / Kona / Elantra — with
a hard **$30,000 CAD** budget ceiling.

The leaderboard is seeded from real listings in `src/data/listings.json`, which a
Node scraper can refresh from local dealers and aggregators. State persists in the
browser via `localStorage`, so cars you add by hand survive reloads (and survive a
re-scrape).

## Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### `npm run scrape`
Refreshes `src/data/listings.json` by scraping used-vehicle inventory from:

| Source | Notes |
| --- | --- |
| Wayne Toyota (Thunder Bay) | dealer site |
| Gore Motors Honda (Thunder Bay) | dealer site |
| Half-Way Motors Mazda (Thunder Bay) | dealer site |
| Superior Hyundai (Thunder Bay) | dealer site |
| CarGurus.ca | best-effort — behind DataDome anti-bot |
| Clutch.ca | best-effort — client-rendered |

Each source is parsed with three fallback strategies (schema.org JSON-LD →
embedded state blob → DOM card scan), normalized to CarScore's listing schema,
and filtered to models the scorer knows. Listings that can't be mapped to a model
in the database are dropped.

**Important caveats:**
- Run it on a machine with **unrestricted outbound network**. Behind a corporate
  or policy proxy (and in cloud CI), the dealer hosts return `403` and nothing is
  scraped — in that case the script logs the block and **leaves the existing
  `listings.json` untouched** rather than emptying it.
- **CarGurus.ca / Clutch.ca are best-effort.** Their anti-bot / client-side
  rendering usually returns nothing from a plain fetch; reliable coverage there
  needs a residential proxy or a scraper API (ScrapingBee / Apify) in front.
- Dealer sites change their markup over time, which can break an individual
  parser. Sources are isolated, so one breakage never sinks the whole run. Parser
  configs live in `scripts/scrapers/<source>.js`; shared logic is in `scripts/lib/`.

### `npm run build`
Builds the production bundle to `build/`.

> **Node 17+ note:** react-scripts 3.4.1 uses an older webpack that trips OpenSSL 3.
> If `npm start` / `npm run build` fails with `ERR_OSSL_EVP_UNSUPPORTED`, run with
> `NODE_OPTIONS=--openssl-legacy-provider` (e.g.
> `NODE_OPTIONS=--openssl-legacy-provider npm run build`).

### `npm run deploy`
Builds and publishes `build/` to GitHub Pages.

### `npm test`
Runs the test runner in watch mode.

## Project layout

```
src/
  CarScore.js          # the app: scoring engine, DB, leaderboard UI
  data/listings.json   # leaderboard seed (refreshed by `npm run scrape`)
  App.js               # renders <CarScore/>
scripts/
  scrape.js            # orchestrator: runs all sources, writes listings.json
  scrapers/            # one config module per source (+ index registry)
  lib/                 # fetch, extraction strategies, normalization helpers
```

## How scoring works
Every column scores 1–5 and is multiplied by its weight (the three triple-weighted
columns — reliability, value-per-cost, winter capability — drive the verdict).
Value-per-cost is computed live from the listing's price vs a year- and
km-adjusted market benchmark, so a good deal outscores the same model overpriced.
Open any row on the leaderboard for the full breakdown, market read, and the
model's known-problem notes.
