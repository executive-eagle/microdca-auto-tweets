import fs from "fs/promises";

function round(n, d = 8) {
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

export async function loadHoldings(path = "data/holdings.json") {
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}

export async function saveHoldings(data, path = "data/holdings.json") {
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

export function applyDailyBuys({ holdings, config, prices, isoDate }) {
  if (holdings.asOf === isoDate) return { holdings, applied: false };

  for (const buy of config.recurringBuysUsd) {
    const px = prices[buy.ticker];
    if (!px || px <= 0) continue;

    const shares = buy.usd / px;

    if (!holdings.positions[buy.ticker]) {
      holdings.positions[buy.ticker] = { shares: 0, costUsd: 0 };
    }

    holdings.positions[buy.ticker].shares =
      round(holdings.positions[buy.ticker].shares + shares, 10);

    holdings.positions[buy.ticker].costUsd =
      round(holdings.positions[buy.ticker].costUsd + buy.usd, 2);

    holdings.ledger.push({
      date: isoDate,
      ticker: buy.ticker,
      usd: buy.usd,
      price: round(px, 6),
      shares: round(shares, 10)
    });
  }

  holdings.asOf = isoDate;
  return { holdings, applied: true };
}

export function computeMetrics({ holdings, config, prices }) {
  let portfolioValue = 0;
  let annualIncome = 0;

  for (const [ticker, pos] of Object.entries(holdings.positions)) {
    const px = prices[ticker];
    if (!px) continue;

    const value = pos.shares * px;
    portfolioValue += value;

    const y = config.annualYieldAssumptions?.[ticker] ?? 0;
    annualIncome += value * y;
  }

  const blendedYield =
    portfolioValue > 0 ? annualIncome / portfolioValue : 0;

  const weekly = annualIncome / 52;
  const monthly = annualIncome / 12;

  const totalBoughtToday =
    config.recurringBuysUsd.reduce((a, b) => a + (b.usd || 0), 0);

  return {
    portfolioValue,
    annualIncome,
    blendedYield,
    weekly,
    monthly,
    totalBoughtToday
  };
}
