// src/fetchTransactions.ts

import fs from "fs";
import path from "path";
import fetch from "node-fetch";                   // use node-fetch for raw HTTP
import { createPublicClient, getEventSelector, http } from "viem";
import { mainnet } from "viem/chains";
import { TokenTransaction } from "./types";

// ─── CONFIG & CONSTANTS ────────────────────────────────────────────────────────
const BASE_RPC_URL   = process.env.BASE_RPC_URL!;
const TOKEN_ADDRESS  = (process.env.TOKEN_ADDRESS as `0x${string}`)!;
const DEPLOY_BLOCK   = BigInt(Number(process.env.DEPLOY_BLOCK!));
const MAX_LOG_WINDOW = 500n; // chunk size in blocks

// Generate the exact Keccak‐256 topic for Transfer(address,address,uint256)
const TRANSFER_TOPIC = getEventSelector("Transfer(address,address,uint256)");

// ─── LAST‐BLOCK PERSISTENCE ────────────────────────────────────────────────────
const LAST_BLOCK_FILE = path.resolve(process.cwd(), "data/lastBlock.txt");

function readLastBlock(): bigint {
  try {
    const txt = fs.readFileSync(LAST_BLOCK_FILE, "utf-8").trim();
    return BigInt(txt);
  } catch {
    // If the file doesn’t exist or is unreadable, start from DEPLOY_BLOCK
    return DEPLOY_BLOCK;
  }
}

function writeLastBlock(block: bigint) {
  fs.mkdirSync(path.dirname(LAST_BLOCK_FILE), { recursive: true });
  fs.writeFileSync(LAST_BLOCK_FILE, block.toString(), "utf-8");
}

// ─── VIEM CLIENT (only for getBlockNumber) ────────────────────────────────────
const publicClient = createPublicClient({
  chain:     mainnet,
  transport: http(BASE_RPC_URL),
});

/**
 * Convert a BigInt block number → hex string "0x..."
 */
function toHex(block: bigint): `0x${string}` {
  return ("0x" + block.toString(16)) as `0x${string}`;
}

/**
 * Send a raw JSON‐RPC POST to BASE_RPC_URL, return the `.result` field.
 */
async function rpcRequest(method: string, params: unknown[]): Promise<any> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id:      1,
    method,
    params,
  });

  const res = await fetch(BASE_RPC_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RPC ${method} failed (status ${res.status}): ${text}`);
  }

  let data: { jsonrpc: string; id: number; result?: any; error?: any };
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`RPC ${method} returned invalid JSON: ${text}`);
  }

  if (data.error) {
    throw new Error(
      `RPC ${method} error (${data.error.code}): ${data.error.message}`
    );
  }
  return data.result;
}

/**
 * Fetch all ERC-20 Transfer logs for TOKEN_ADDRESS from (lastProcessed+1)
 * through the latest block, in ≤500‐block windows. Always returns
 * a TokenTransaction[] (never undefined).
 */
export async function fetchTransactions(): Promise<TokenTransaction[]> {
  // 1) Read the last processed block (or DEPLOY_BLOCK if missing)
  const lastProcessed = readLastBlock();

  // 2) Get the latest block number via Viem
  const latestNum = await publicClient.getBlockNumber();
  const latest    = BigInt(latestNum);

  // 3) If there are no new blocks, return an empty array
  if (lastProcessed + 1n > latest) {
    return [];
  }

  let fromBlock = lastProcessed + 1n;
  const allRawLogs: any[] = [];

  // 4) Loop in ≤500‐block increments
  while (fromBlock <= latest) {
    const windowEnd = fromBlock + MAX_LOG_WINDOW - 1n;
    const toBlock   = windowEnd <= latest ? windowEnd : latest;

    // Build the JSON‐RPC filter exactly as expected
    const filter = {
      address:   TOKEN_ADDRESS,
      topics:    [TRANSFER_TOPIC],
      fromBlock: toHex(fromBlock),
      toBlock:   toHex(toBlock),
    };

    try {
      const partialLogs: any[] = await rpcRequest("eth_getLogs", [filter]);
      allRawLogs.push(...partialLogs);
    } catch (err) {
      console.error(
        `Error fetching logs for blocks [${fromBlock}–${toBlock}]:`,
        err
      );
      throw err;
    }

    fromBlock = toBlock + 1n;
  }

  // 5) Convert each raw log entry → TokenTransaction
  const tokenTxs: TokenTransaction[] = allRawLogs.map((log: any) => {
    // topics[1] = indexed "from", topics[2] = indexed "to", data = amount
    const fromAddr = "0x" + (log.topics[1] as string).slice(26);
    const toAddr   = "0x" + (log.topics[2] as string).slice(26);
    const amount   = BigInt(log.data);

    return {
      hash:        log.transactionHash as string,
      blockNumber: BigInt(log.blockNumber),
      from:        fromAddr,
      to:          toAddr,
      amount,
      isBuy:       true, // or insert your own buy/sell logic
    };
  });

  // 6) Persist the highest block processed
  writeLastBlock(latest);
  return tokenTxs;
}
