// src/convertSvgToPng.ts

import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

/**
 * Reads an SVG file from `svgPath`, launches a headless Chromium via Puppeteer,
 * renders the SVG at exactly 512×512, captures a PNG screenshot of it, writes
 * it to `pngPath`, and returns the PNG Buffer.
 *
 * Requirements:
 *   • npm install puppeteer
 *   • Nothing else (no Cairo, no Sharp, no extra C libraries).
 */
export async function convertSvgToPng(svgPath: string, pngPath: string): Promise<Buffer> {
  // 1) Read the SVG file’s contents
  const svgContent = fs.readFileSync(svgPath, "utf-8");

  // 2) Launch headless Chromium
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // 3) Set viewport to 512×512
  await page.setViewport({ width: 512, height: 512 });

  // 4) Load the SVG content directly via a data URI
  //    (we wrap it in a minimal HTML document so that Chromium will render it)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          /* Ensure no margin/cropping, and SVG fills the viewport */
          body, html { margin: 0; padding: 0; width: 512px; height: 512px; overflow: hidden; }
          svg { width: 512px; height: 512px; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  // 5) Use a data URL so we don’t need to serve a file via HTTP
  const dataUri = `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
  await page.goto(dataUri);

  // 6) Wait until the SVG has rendered
  await page.waitForSelector("svg");

  // 7) Take a PNG screenshot of the viewport (exactly 512×512)
  const pngBuffer = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 512, height: 512 } });

  // 8) Write to disk
  fs.writeFileSync(pngPath, pngBuffer);

  // 9) Clean up
  await browser.close();

  // 10) Return the Buffer
  return pngBuffer as Buffer;
}
