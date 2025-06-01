// src/pngGenerator.ts

import fs from "fs/promises";
import path from "path";
import { SvgGenerator, SimpleTx } from "./svgGenerator";
import { convertSvgToPng } from "./convertSvgToPng";
import type { TokenTransaction } from "./types";

/**
 * Takes your TokenTransaction array,
 * generates an SVG, rasters it to PNG via CairoSVG,
 * then returns the PNG buffer.
 */
export async function generatePng(
  txs: TokenTransaction[]
): Promise<Buffer> {
  // 1) Convert to the simple shape expected by SvgGenerator
  const simpleTxs: SimpleTx[] = txs.map(({ amount, isBuy }) => ({
    amount: amount.toString(),
    isBuy,
  }));

  // 2) Paths for intermediate SVG and final PNG
  const svgPath = path.resolve("src", "output.svg");
  const pngPath = path.resolve("src", "output.png");

  // 3) Write out the SVG
  const gen = new SvgGenerator();
  gen.generateSvg(simpleTxs);

  // 4) Rasterize to PNG
  await convertSvgToPng(svgPath, pngPath);

  // 5) Read PNG into a Buffer and return it
  return fs.readFile(pngPath);
}
