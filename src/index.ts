// src/index.ts

import dotenv from "dotenv";
dotenv.config();

import { fetchTransactions } from "./fetchTransactions";
import { SvgGenerator, SimpleTx } from "./svgGenerator";
import { convertSvgToPng } from "./convertSvgToPng";
import { uploadToIPFS } from "./ipfsUploader";
import { updateContractURI } from "./updateContractURI";

async function main() {
  console.log("🔍 Fetching token transfers…");
  const tokenTxs = await fetchTransactions();

  // 1) Generate SVG (always)
  if (tokenTxs.length === 0) {
    console.log("ℹ️  No new transactions—rendering baseline image.");
  } else {
    console.log(`🔀 Found ${tokenTxs.length} new transaction(s) → scrambling image.`);
  }

  // Convert TokenTransaction → SimpleTx { amount: string; isBuy: boolean }
  const simpleTxs: SimpleTx[] = tokenTxs.map((tx) => ({
    amount: tx.amount.toString(),
    isBuy: tx.isBuy,
  }));

  // Generate SVG → src/output.svg
  const generator = new SvgGenerator();
  generator.generateSvg(simpleTxs);
  console.log("✅ SVG written to src/output.svg");

  // Convert SVG → PNG → src/output.png
  const svgPath = "src/output.svg";
  const pngPath = "src/output.png";
  await convertSvgToPng(svgPath, pngPath);
  console.log("✅ PNG written to src/output.png");

  // 2) If there were new transfers, pin the PNG + update on-chain
  if (tokenTxs.length > 0) {
    // Read the new PNG file into a Buffer
    const fs = await import("fs");
    const buffer = fs.readFileSync(pngPath);

    // 2a) Pin to IPFS
    const ipfsUri = await uploadToIPFS(buffer);
    console.log("✅ Pinned PNG to IPFS at", ipfsUri);

    // 2b) Update on-chain tokenURI
    const success = await updateContractURI(ipfsUri);
    if (success) {
      console.log("🎉 On-chain update successful");
    } else {
      console.error("❌ On-chain update failed");
      process.exit(1);
    }
  } else {
    console.log("⬇️  Skipping IPFS pin & on-chain update (no new transfers).");
  }

  console.log("🏁 Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Uncaught error:", err);
  process.exit(1);
});
