import fs from "fs";
import path from "path";
import { TokenTransaction } from "./types";

// Configuration interface
interface SvgConfig {
  width: number;
  height: number;
  symbolSize: number;
  symbolStrokeWidth: number;
  animationDelay: number; // Delay between each animation in seconds
  backgroundImage?: {
    path: string;
    width: number;
    height: number;
  };
}

class SvgGenerator {
  private config: SvgConfig;

  constructor(config: Partial<SvgConfig> = {}) {
    // Default configuration
    this.config = {
      width: 1000,
      height: 1000,
      symbolSize: 30,
      symbolStrokeWidth: 4,
      animationDelay: 0.005, // Default to 0.01 seconds between each animation
      ...config,
    };
  }

  /**
   * Generate SVG with symbols based on token transactions
   * @param transactions Array of token transactions
   * @returns SVG content as string
   */
  public generate(transactions: TokenTransaction[]): string {
    const {
      width,
      height,
      symbolSize,
      symbolStrokeWidth,
      backgroundImage,
      animationDelay,
    } = this.config;

    // SVG header with definitions for reusable symbols and animations
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Definitions for reusable symbols and animations -->
  <defs>
    <!-- Plus symbol (Buy) -->
    <g id="p" stroke-width="${symbolStrokeWidth}" stroke="#0DFF00">
      <line x1="${Math.floor(-symbolSize / 2)}" y1="0" x2="${Math.floor(
      symbolSize / 2
    )}" y2="0"/>
      <line x1="0" y1="${Math.floor(-symbolSize / 2)}" x2="0" y2="${Math.floor(
      symbolSize / 2
    )}"/>
    </g>
    <!-- Minus symbol (Sell) -->
    <g id="m" stroke-width="${symbolStrokeWidth}" stroke="#FF0000">
      <line x1="${Math.floor(-symbolSize / 3)}" y1="0" x2="${Math.floor(
      symbolSize / 3
    )}" y2="0"/>
    </g>
`;

    // Close the style tag and defs
    svg += `    </style>
  </defs>
  
  <!-- White background -->
  <rect width="${width}" height="${height}" fill="white"/>
`;

    // Add background image if provided and set up positioning variables
    let bgX = 0;
    let bgY = 0;
    let bgWidth = width;
    let bgHeight = height;

    if (backgroundImage) {
      // Calculate position to center the image
      bgX = (width - backgroundImage.width) / 2;
      bgY = (height - backgroundImage.height) / 2;
      bgWidth = backgroundImage.width;
      bgHeight = backgroundImage.height;

      // Add image element
      svg += `  <image href="${backgroundImage.path}" x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" />
`;
    }

    // Define overflow allowance
    const overflowAllowance = this.config.symbolSize / 4;

    // Start group for symbols to ensure proper nth-child selection
    svg += `  <g id="symbols">
`;

    // Generate symbols based on transaction data
    // Using a deterministic random generator based on transaction hash
    transactions.forEach((tx, index) => {
      // Use transaction hash as seed for deterministic random position
      const hashValue = this.hashToNumber(tx.hash);

      // Get random position within the background image bounds (with overflow allowance)
      const seedX = this.hashToNumber(tx.hash);
      // Use a different portion of the hash for y coordinate
      const seedY = this.hashToNumber(
        tx.hash.slice(20, 28) || tx.hash.slice(10, 18)
      );

      // Get random position within the background image bounds (with overflow allowance)
      const x = Math.floor(
        bgX -
          overflowAllowance +
          this.seededRandom(seedX) * (bgWidth + 2 * overflowAllowance)
      );

      const y = Math.floor(
        bgY -
          overflowAllowance +
          this.seededRandom(seedY) * (bgHeight + 2 * overflowAllowance)
      );

      // Determine symbol type based on transaction type (buy or sell)
      const symbolType = tx.isBuy ? "p" : "m";

      // Add symbol to SVG with animation class
      svg += `    <use href="#${symbolType}" x="${x}" y="${y}" class="symbol" style="mix-blend-mode: multiply" />
`;
    });

    // Close the symbols group
    svg += `  </g>
`;

    // Close the SVG
    svg += `</svg>`;

    return svg;
  }

  /**
   * Convert a transaction hash to a numeric value for seeding
   */
  private hashToNumber(hash: string): number {
    // Take the first 8 characters of the hash and convert to a number
    const truncatedHash = hash.slice(2, 10); // Remove 0x prefix and take 8 chars
    return parseInt(truncatedHash, 16);
  }

  /**
   * Deterministic random number generator based on a seed
   * @param seed Seed value
   * @returns Pseudo-random number between 0 and 1
   */
  private seededRandom(seed: number): number {
    // Simple LCG (Linear Congruential Generator)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    // Calculate next seed value
    const nextSeed = (a * seed + c) % m;

    // Convert to a value between 0 and 1
    return nextSeed / m;
  }

  /**
   * Save the generated SVG to a file
   * @param transactions Array of token transactions
   * @param filePath File path where the SVG will be saved
   * @returns Path to the saved file
   */
  public saveToFile(
    transactions: TokenTransaction[],
    filePath: string = "src/output.svg"
  ): string {
    const svgContent = this.generate(transactions);

    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, svgContent);
    return filePath;
  }
}

export default SvgGenerator;
