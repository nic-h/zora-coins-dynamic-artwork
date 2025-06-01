// src/index.ts

import dotenv from "dotenv";
dotenv.config();

import { fetchTransactions } from "./fetchTransactions";
import { SimpleTx, SvgGenerator } from "./svgGenerator";
import { convertSvgToPng } from "./convertSvgToPng";
import { uploadToIPFS } from "./ipfsUploader";
import { updateContractURI } from "./updateContractURI";
import { TokenTransaction } from "./types";

async function main() {
  try {
    console.log("🔍 Fetching token transfers…");
    let tokenTxs: TokenTransaction[] = await fetchTransactions();

    // ─── TEST MODE: inject a fake Tx if none found ─────────────────────────────
    if (process.env.TEST_MODE === "true" && tokenTxs.length === 0) {
      console.log("ℹ️  TEST MODE: injecting fake transaction");
      tokenTxs = [
        {
          hash:        "0xdeadbeef000000000000000000000000000000000000",
          blockNumber: BigInt(12345678),
          from:        "0x0000000000000000000000000000000000000000",
          to:          (process.env.TOKEN_ADDRESS as string).toLowerCase(),
          amount:      BigInt(1_000_000_000), // example small amount
          isBuy:       true,
        },
      ];
    }

    if (tokenTxs.length === 0) {
      console.log("📦 No new transactions—rendering baseline image.");
    } else {
      console.log(`🔀 Found ${tokenTxs.length} new transaction(s)—scrambling image.`);
    }

    // Convert to SimpleTx[] (for SVG step)
    const simpleTxs: SimpleTx[] = tokenTxs.map((tx: TokenTransaction) => ({
      amount: tx.amount.toString(),
      isBuy:  tx.isBuy,
    }));

    // 1) Generate SVG to src/output.svg
    const svgGen = new SvgGenerator();
    svgGen.generateSvg(simpleTxs);
    console.log("✅ SVG written to src/output.svg");

    // 2) Convert SVG → PNG (writes to src/output.png, returns Buffer)
    const pngBuffer = await convertSvgToPng("src/output.svg", "src/output.png");
    console.log("✅ PNG written to src/output.png");

    // 3) If no new transactions, skip IPFS & on-chain
    if (tokenTxs.length === 0) {
      console.log("⬇️  Skipping IPFS pin & on-chain update (no new transfers).");
      console.log("🏁 Done.");
      return;
    }

    // 4) Pin PNG to IPFS via Pinata
    console.log("📌 Pinning PNG to IPFS via Pinata…");
    const cid = await uploadToIPFS(pngBuffer);
    console.log(`✅ Pinata returned CID: ${cid}`);

    // 5) Send on-chain update to setTokenURI
    console.log("🔗 Sending on-chain update to setTokenURI…");
    const txHash = await updateContractURI(cid);
    console.log(`✅ setTokenURI tx hash: ${txHash}`);

    console.log("🏁 Done.");
  } catch (err) {
    console.error("Error in main application:", err);
    process.exit(1);
  }
}

main();
