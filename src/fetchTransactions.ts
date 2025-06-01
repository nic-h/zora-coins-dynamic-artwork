// src/fetchTransactions.ts

import { createPublicClient, http, parseAbiItem } from "viem";
import { BASE_RPC_URL, TOKEN_ADDRESS } from "./constants";
import { TokenTransaction } from "./types";
import fs from "fs";
import path from "path";

const client = createPublicClient({
  transport: http(BASE_RPC_URL),
});

// Path to persist the last scanned block
const LAST_BLOCK_FILE = path.resolve(process.cwd(), "data", "lastBlock.txt");

/**
 * Reads the last processed block from disk.
 * If missing, returns 0 so initial default is (latestBlock - 10).
 */
function getLastProcessedBlock(): bigint {
  try {
    const txt = fs.readFileSync(LAST_BLOCK_FILE, "utf-8").trim();
    return BigInt(txt);
  } catch {
    return 0n;
  }
}

/**
 * Writes the given block number to disk (creating directories as needed).
 */
function setLastProcessedBlock(block: bigint) {
  fs.mkdirSync(path.dirname(LAST_BLOCK_FILE), { recursive: true });
  fs.writeFileSync(LAST_BLOCK_FILE, block.toString(), "utf-8");
}

/**
 * Fetches any new ERC-20 Transfer logs for TOKEN_ADDRESS from (lastProcessed+1) → latestBlock.
 * Immediately persists latestBlock to disk, then returns a list of TokenTransaction.
 */
export async function fetchTransactions(): Promise<TokenTransaction[]> {
  // 1) Get current chain head
  const latestBlock = await client.getBlockNumber();

  // 2) Read persisted last block; if missing, default to “0” → we’ll do (latestBlock - 10) below
  let lastProcessed = getLastProcessedBlock();
  if (lastProcessed === 0n) {
    lastProcessed = latestBlock - 10n;
    if (lastProcessed < 0n) lastProcessed = 0n;
  }

  const fromBlock = lastProcessed + 1n;
  const toBlock = latestBlock;

  if (fromBlock > toBlock) {
    console.log("📦 No new blocks to scan. Last processed:", lastProcessed.toString());
    setLastProcessedBlock(latestBlock);
    console.log("💾 Persisted lastBlock =", latestBlock.toString());
    return [];
  }

  console.log(`📦 Scanning blocks ${fromBlock} → ${toBlock}`);

  // 3) Query logs for ERC-20 Transfer events
  const logs = await client.getLogs({
    address: TOKEN_ADDRESS,
    event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
    fromBlock,
    toBlock,
  });

  const results: TokenTransaction[] = [];
  for (const log of logs) {
    const args = log.args as any;
    try {
      const from = args.from as string;
      const to = args.to as string;
      const value = args.value as bigint;
      const isBuy = to.toLowerCase() === TOKEN_ADDRESS.toLowerCase();
      results.push({
        hash: log.transactionHash,
        blockNumber: log.blockNumber,
        from,
        to,
        amount: value,
        isBuy,
      });
    } catch (e) {
      console.warn("⚠️ Error parsing log. Skipping:", e);
    }
  }

  // 4) Persist latestBlock so next run doesn’t re-scan same range
  setLastProcessedBlock(latestBlock);
  console.log("💾 Updated lastBlock to", latestBlock.toString());

  return results;
}
