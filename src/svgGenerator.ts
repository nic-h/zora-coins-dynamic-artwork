// src/svgGenerator.ts

import fs from "fs";
import {
  CANVAS,
  BLOCK,
  N,
  SCALE_FACTOR,
  MAX_SCALE,
  BACKGROUND_DATA_URL,
} from "./constants";

/**
 * A “SimpleTx” is what we feed into the SVG generator:
 *   • amount: string (big-int as string)
 *   • isBuy:  boolean (we ignore it here, since no tint)
 */
export interface SimpleTx {
  amount: string;
  isBuy: boolean;
}

/**
 * Minimal Linear Congruential Generator (LCG) for deterministic “random”.
 * Seed is (amount mod 2^31−1) + (txIndex * 3 + subIndex), so each sub‐tile is unique.
 */
class LCG {
  private seed: number;
  constructor(seed: number) {
    // modulus = 2^31 - 1
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  nextInt(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed;
  }
  nextFloat(): number {
    return (this.nextInt() - 1) / 2147483646;
  }
  nextRange(max: number): number {
    return Math.floor(this.nextFloat() * max);
  }
}

export class SvgGenerator {
  /**
   * Given an array of SimpleTx, write a well‐formed SVG to "src/output.svg".
   * - No tint rectangles are drawn.
   * - Exactly 3 tiles per tx are moved.
   * - Each moved tile is ≥ 2×BLOCK (so w≥32 px when BLOCK=16).
   * - Rotations are always one of [90,180,270] (never 0).
   */
  generateSvg(txs: SimpleTx[]) {
    const lines: string[] = [];

    // 1) XML declaration + <svg> opening tag with namespaces
    lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    lines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CANVAS}" height="${CANVAS}">`
    );

    // 2) Draw the full‐size background image (unscrambled)
    lines.push(
      `<image xlink:href="${BACKGROUND_DATA_URL}" width="${CANVAS}" height="${CANVAS}"></image>`
    );

    // 3) For each transaction, move exactly 3 tiles
    txs.forEach((tx, i) => {
      // 3a) Compute base “size in blocks” and clamp to at least 2 (bumped min)
      let sizeBase = Math.floor(Number(tx.amount) / SCALE_FACTOR);
      sizeBase = Math.max(2, Math.min(MAX_SCALE, sizeBase)); // ← bump min to 2
      const w = sizeBase * BLOCK; // pixel width = (sizeBase × BLOCK)

      // 3b) Derive a base seed from (amount mod 2^31−1)
      const amtBig = BigInt(tx.amount);
      const baseSeed = Number(amtBig % BigInt(2147483647));

      // 3c) For each of the 3 sub‐tiles:
      for (let k = 0; k < 3; k++) {
        const rng = new LCG(baseSeed + i * 3 + k);

        // 3d) Pick a random grid cell [0..N)
        const col = rng.nextRange(N);
        const row = rng.nextRange(N);

        // 3e) Force rotation to one of [90,180,270]
        const forcedAngles = [90, 180, 270];
        const rot = forcedAngles[rng.nextRange(forcedAngles.length)];

        // 3f) Emit one <g> block on a single line (no tint <rect>)
        lines.push(
          `<g transform="translate(${col * BLOCK + w / 2},${row * BLOCK + w / 2}) rotate(${rot})">` +
            `<clipPath id="c${i}_${k}">` +
              `<rect x="${-w / 2}" y="${-w / 2}" width="${w}" height="${w}"></rect>` +
            `</clipPath>` +
            `<image xlink:href="${BACKGROUND_DATA_URL}" x="${-col * BLOCK - w / 2}" y="${-row * BLOCK - w / 2}" width="${CANVAS}" height="${CANVAS}" clip-path="url(#c${i}_${k})"></image>` +
          `</g>`
        );
      }
    });

    // 4) Close the SVG tag
    lines.push(`</svg>`);

    // 5) Write to disk at src/output.svg
    fs.writeFileSync("src/output.svg", lines.join("\n"), "utf-8");
  }
}
