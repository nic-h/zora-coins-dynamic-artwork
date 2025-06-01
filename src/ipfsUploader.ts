// src/ipfsUploader.ts

import fs from "fs";
import path from "path";
import PinataSDK from "@pinata/sdk";
import { PINATA_API_KEY, PINATA_API_SECRET } from "./constants";

const pinata = new PinataSDK(PINATA_API_KEY, PINATA_API_SECRET);

/**
 * Given a PNG buffer, writes it temporarily to disk (in /tmp),
 * then uses PinataSDK.pinFileToIPFS() to pin it. Returns "ipfs://CID".
 */
export async function uploadToIPFS(buffer: Buffer): Promise<string> {
  console.log("📌 Pinning PNG buffer to IPFS via Pinata…");

  // 1) Write buffer to a temporary file
  const tmpDir = path.resolve(process.cwd(), "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `zora-${Date.now()}.png`);
  fs.writeFileSync(tmpFile, buffer);

  // 2) Pin that file
  const readable = fs.createReadStream(tmpFile);
  const result = await pinata.pinFileToIPFS(readable, {
    pinataMetadata: { name: `zora-coin-${Date.now()}` },
  });

  console.log("✅ Pinata returned CID:", result.IpfsHash);

  // 3) Clean up temp file
  fs.unlinkSync(tmpFile);

  return `ipfs://${result.IpfsHash}`;
}
