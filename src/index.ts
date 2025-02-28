import {
  fetchTokenTransactions,
  saveTransactionsToFile,
} from "./fetchTransactions";
import SvgGenerator from "./svgGenerator";
import dotenv from "dotenv";
import {
  createAndUploadMetadata,
  getLastTwoPinnedCIDs,
  unpinFromIPFS,
  uploadToIPFS,
} from "./ipfsUploader";

import { BG_IMAGE } from "./constants";
import { updateContractURI } from "./updateContractURI";

// Load environment variables
dotenv.config();

/**
 * Main application function - Fetches transactions and generates SVG
 */
async function main() {
  try {
    console.log(
      "Starting ERC20 transaction visualization for token: 0xD93dC936e60E9E275CBE6f225e9C065951b9b1d4"
    );

    // Step 1: Fetch token transactions
    console.log("Fetching token transactions...");
    const transactions = await fetchTokenTransactions();

    // Step 2: Save transactions to file for caching
    saveTransactionsToFile(transactions);

    // Step 3: Generate SVG visualization
    console.log("Generating SVG visualization...");
    const generator = new SvgGenerator({
      width: 1000,
      height: 1000,
      symbolSize: 30,
      symbolStrokeWidth: 4,
      backgroundImage: {
        path: BG_IMAGE,
        width: 508,
        height: 758,
      },
    });

    // const svgContent = await generateSvg();
    const svgContent = generator.generate(transactions);
    if (!svgContent) {
      throw new Error("Failed to generate SVG");
    }

    console.log("🔍 Fetching latest pinned CIDs from Infura...");
    const previousCIDs = await getLastTwoPinnedCIDs();
    console.log("Previous CIDs:", previousCIDs);

    // Upload PNG to IPFS
    console.log("Uploading SVG to IPFS...");
    const imageCid = await uploadToIPFS(svgContent);
    console.log("SVG uploaded to IPFS:", imageCid);

    // Create and upload metadata
    console.log("Creating and uploading metadata...");
    const metadataCid = await createAndUploadMetadata(imageCid);
    console.log("Metadata uploaded to IPFS:", metadataCid);

    // Update contract URI with metadata CID
    console.log("Updating contract URI with metadata CID...");
    const success = await updateContractURI(metadataCid);
    if (success) {
      console.log("Contract URI updated successfully");

      // Unpin old metadata & old image
      if (previousCIDs.metadata) {
        console.log(`🔄 Unpinning old metadata CID: ${previousCIDs.metadata}`);
        await unpinFromIPFS(previousCIDs.metadata);
      }
      if (previousCIDs.image) {
        console.log(`🔄 Unpinning old image CID: ${previousCIDs.image}`);
        await unpinFromIPFS(previousCIDs.image);
      }
    }
  } catch (error) {
    console.error("Error in main application:", error);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}
