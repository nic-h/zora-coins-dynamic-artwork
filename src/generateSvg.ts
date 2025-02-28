import SvgGenerator from "./svgGenerator";
import { loadTransactionsFromFile } from "./fetchTransactions";
import { BG_IMAGE } from "./constants";

/**
 * Generate SVG from token transactions
 */
function generateSvgFromTransactions() {
  // Load transactions from file
  const transactions = loadTransactionsFromFile();

  if (transactions.length === 0) {
    console.error("No transactions found. Run the fetch script first.");
    return;
  }

  console.log(`Generating SVG for ${transactions.length} transactions...`);

  // Create SVG generator with configuration
  const generator = new SvgGenerator({
    width: 1000,
    height: 1000,
    symbolSize: 40,
    symbolStrokeWidth: 6,
    backgroundImage: {
      path: BG_IMAGE,
      width: 508,
      height: 758,
    },
  });

  // Generate and save SVG
  const outputPath = generator.saveToFile(transactions, "src/output.svg");
  console.log(`SVG generated and saved to: ${outputPath}`);
}

// Execute if run directly
if (require.main === module) {
  generateSvgFromTransactions();
}
