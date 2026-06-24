/*
 * fetchPage.js — fetch a URL as a browser would, with retries and a timeout.
 *
 * Uses Node's built-in fetch (Node >= 18). Sends realistic browser headers so
 * the request isn't trivially rejected. This is best-effort: anti-bot systems
 * (e.g. DataDome on CarGurus.ca) may still return a challenge page, in which
 * case extraction simply finds nothing and the source is skipped.
 *
 * Note: when running behind a policy proxy, Node's built-in fetch only honours
 * HTTPS_PROXY if NODE_USE_ENV_PROXY=1 is set (Node >= 22.21). Run locally with
 * unrestricted network for best results.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchPage(url, { timeoutMs = 25000, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-CA,en;q=0.9",
          "Cache-Control": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      clearTimeout(timer);
      if (res.status === 403 || res.status === 429) {
        return { ok: false, status: res.status, html: null, blocked: true };
      }
      if (!res.ok) {
        if (attempt < retries) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        return { ok: false, status: res.status, html: null };
      }
      const html = await res.text();
      return { ok: true, status: res.status, html };
    } catch (e) {
      clearTimeout(timer);
      if (attempt < retries) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return { ok: false, status: 0, html: null, error: e.message };
    }
  }
  return { ok: false, status: 0, html: null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { fetchPage };
