import fs from "fs/promises";

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "microdca-bot/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "microdca-bot/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseStooqClose(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) throw new Error("Stooq CSV missing data rows");
  const last = lines[lines.length - 1].split(",");
  const close = Number(last[4]);
  if (!Number.isFinite(close) || close <= 0) throw new Error("Invalid close from Stooq");
  return close;
}

export async function getPrices(configPath = "data/config.json") {
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const items = config.recurringBuysUsd;

  const prices = {};

  // Crypto: batch CoinGecko IDs
  const cryptoItems = items.filter(i => i.type === "crypto" && i.coingeckoId);
  if (cryptoItems.length) {
    const ids = [...new Set(cryptoItems.map(i => i.coingeckoId))].join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;
    const data = await fetchJson(url);
    for (const it of cryptoItems) {
      const px = data?.[it.coingeckoId]?.usd;
      if (!px) throw new Error(`Missing CoinGecko price for ${it.coingeckoId}`);
      prices[it.ticker] = Number(px);
    }
  }

  // Equities: Stooq daily close
  const eqItems = items.filter(i => i.type === "equity" && i.stooqSymbol);
  for (const it of eqItems) {
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(it.stooqSymbol)}&i=d`;
    const csv = await fetchText(url);
    prices[it.ticker] = parseStooqClose(csv);
  }

  return prices;
}
