import fs from "fs/promises";
import { getPrices } from "./prices.js";
import { loadHoldings, saveHoldings, applyDailyBuys, computeMetrics } from "./portfolio.js";
import { renderCardPng } from "./renderCard.js";

function toIsoDateNY() {
  const now = new Date();
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return ny.toISOString().slice(0, 10);
}

async function main() {
  const config = JSON.parse(await fs.readFile("data/config.json", "utf8"));
  const isoDate = toIsoDateNY();

  const prices = await getPrices("data/config.json");
  let holdings = await loadHoldings("data/holdings.json");

  holdings = applyDailyBuys({ holdings, config, prices, isoDate }).holdings;
  await saveHoldings(holdings, "data/holdings.json");

  const metrics = computeMetrics({ holdings, config, prices });

  const text =
`${config.tweetTimeLabel}

Here’s what I bought today:
${config.recurringBuysUsd.map(b => `$${b.usd} - ${b.label || b.ticker}`).join("\n")}

Current annual yield: ${(metrics.blendedYield * 100).toFixed(2)}%
Total bought today: $${metrics.totalBoughtToday.toFixed(2)}
Projected weekly payment: $${metrics.weekly.toFixed(2)}
Projected monthly payment: $${metrics.monthly.toFixed(2)}
Total portfolio value: $${metrics.portfolioValue.toFixed(0)}

(Posting disabled for setup test)`;

  console.log(text);

  // -------- Render Image Card --------
  const cardData = {
    title: "Income Engine — Daily Allocation",
    dateLine: isoDate,
    buys: config.recurringBuysUsd.map(b => ({
      ...b,
      price: prices[b.ticker]
    })),
    metrics,
    note: "Synthetic portfolio. Educational transparency."
  };

  const imgPath = await renderCardPng(cardData);
  console.log("Card generated at:", imgPath);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});