import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";

export async function renderCardPng(cardData) {
  const htmlPath = path.resolve("templates/card.html");
  const html = await fs.readFile(htmlPath, "utf8");

  const outPath = path.resolve("data/card.png");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });

  // Inject data into the page
  const payload = `<script>window.__CARD_DATA__ = ${JSON.stringify(cardData)};</script>`;
  const withData = html.replace("</head>", `${payload}</head>`);

  await page.setContent(withData, { waitUntil: "load" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: outPath });
  await browser.close();

  return outPath;
}
