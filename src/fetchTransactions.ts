import { createPublicClient, http, parseAbiItem, Log } from "viem";
import { base } from "viem/chains";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ERC20Transfer, TokenTransaction } from "./types";
import {
  MAX_TRANSACTIONS,
  TOKEN_ADDRESS,
  TOKEN_DEPLOY_BLOCK,
  BATCH_SIZE,
  BATCH_DELAY,
} from "./constants";

// Load environment variables
dotenv.config();

// Create Viem client
const client = createPublicClient({
  chain: base,
  transport: http(`
    https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}
  `),
  batch: {
    multicall: true,
  },
});

// Type for Transfer event args
type TransferEvent = Log<bigint, number, boolean, TransferEventAbi, false> & {
  args: {
    from: string;
    to: string;
    value: bigint;
  };
  blockNumber: bigint;
  transactionHash: string;
};

// ERC20 Transfer event ABI
const transferEventAbiString =
  "event Transfer(address indexed from, address indexed to, uint256 value)" as const;
type TransferEventAbi = ReturnType<
  typeof parseAbiItem<typeof transferEventAbiString>
>;
const transferEventAbi = parseAbiItem(transferEventAbiString);

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches token transfer events in efficient batches
 */
async function fetchTokenTransfers(): Promise<ERC20Transfer[]> {
  console.log(
    `Fetching up to ${MAX_TRANSACTIONS} transfer events for token ${TOKEN_ADDRESS}`
  );

  try {
    // Get the latest block number for reference
    const latestBlock = await client.getBlockNumber();

    // Initialize empty array for all logs
    const allLogs: TransferEvent[] = [];

    // To fetch a large number of transactions, we'll use a batched approach
    // with pagination using fromBlock and toBlock

    // First, let's try to find a good starting point to reduce the search space
    // This is an optimization that helps us avoid scanning the entire blockchain

    // Set initial block range - starting from reasonably recent blocks
    let fromBlock = BigInt(TOKEN_DEPLOY_BLOCK);
    let toBlock = latestBlock;

    // Storage for our final results
    let transferLogs: TransferEvent[] = [];
    let totalFound = 0;

    // Now fetch in batches with a sliding window
    while (totalFound < MAX_TRANSACTIONS && fromBlock <= toBlock) {
      // Calculate the current batch end block
      const currentBatchEnd =
        fromBlock + BigInt(BATCH_SIZE) > toBlock
          ? toBlock
          : fromBlock + BigInt(BATCH_SIZE);

      console.log(
        `Fetching batch from block ${fromBlock} to ${currentBatchEnd}`
      );

      // Get logs for the current batch
      const batchLogs = (await client.getLogs({
        address: TOKEN_ADDRESS,
        event: transferEventAbi,
        fromBlock: fromBlock,
        toBlock: currentBatchEnd,
      })) as TransferEvent[];

      console.log(`Found ${batchLogs.length} logs in current batch`);

      // Add to our collection
      transferLogs = [...transferLogs, ...batchLogs];
      totalFound = transferLogs.length;

      // Move the window forward
      fromBlock = currentBatchEnd + BigInt(1);

      // Save intermediate results to avoid losing progress
      if (transferLogs.length > 0 && transferLogs.length % 5000 === 0) {
        const intermediatePath = `src/data/intermediate_${transferLogs.length}.json`;
        fs.writeFileSync(
          intermediatePath,
          JSON.stringify(
            transferLogs.map((log) => ({
              hash: log.transactionHash,
              blockNumber: log.blockNumber,
              from: log.args.from,
              to: log.args.to,
              value: log.args.value.toString(),
            }))
          )
        );
        console.log(`Saved intermediate results to ${intermediatePath}`);
      }

      // Respect rate limits
      if (fromBlock <= toBlock) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch`);
        await sleep(BATCH_DELAY);
      }
    }

    console.log(`Total logs collected: ${transferLogs.length}`);

    // Filter out any logs without block numbers and sort by block number
    transferLogs = transferLogs
      .filter(
        (log): log is TransferEvent =>
          log.blockNumber !== null &&
          log.transactionHash !== null &&
          log.args?.from !== undefined &&
          log.args?.to !== undefined &&
          log.args?.value !== undefined
      )
      .sort((a, b) => {
        return Number(b.blockNumber - a.blockNumber); // Sort descending (newest first)
      });

    // Limit to the requested number of transactions
    if (transferLogs.length > MAX_TRANSACTIONS) {
      transferLogs = transferLogs.slice(0, MAX_TRANSACTIONS);
    }

    // Map logs to ERC20Transfer objects
    return transferLogs.map((log) => ({
      hash: log.transactionHash,
      blockNumber: log.blockNumber,
      from: log.args.from,
      to: log.args.to,
      value: log.args.value,
    }));
  } catch (error) {
    console.error("Error fetching transfer events:", error);

    // Try to recover from any intermediate files
    const dir = path.join(process.cwd(), "src/data");
    if (fs.existsSync(dir)) {
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.startsWith("intermediate_"))
        .sort((a, b) => {
          const numA = parseInt(a.split("_")[1]);
          const numB = parseInt(b.split("_")[1]);
          return numB - numA; // Sort by largest number (most events) first
        });

      if (files.length > 0) {
        console.log(`Attempting to recover from ${files[0]}`);
        const data = JSON.parse(
          fs.readFileSync(path.join(dir, files[0]), "utf8")
        );
        return data
          .filter((item: any) => item.hash && item.blockNumber && item.value)
          .map((item: any) => ({
            hash: item.hash,
            blockNumber: BigInt(item.blockNumber),
            from: item.from,
            to: item.to,
            value: BigInt(item.value),
          }));
      }
    }

    return [];
  }
}

/**
 * Adds block timestamps to transfer events efficiently with batching
 */
async function addTimestamps(
  transfers: ERC20Transfer[]
): Promise<ERC20Transfer[]> {
  console.log("Adding block timestamps to transfer events...");

  // Group transfers by block number to minimize RPC calls
  const blockMap: Record<string, ERC20Transfer[]> = {};

  transfers.forEach((transfer) => {
    const blockNumberStr = transfer.blockNumber.toString();
    if (!blockMap[blockNumberStr]) {
      blockMap[blockNumberStr] = [];
    }
    blockMap[blockNumberStr].push(transfer);
  });

  const transfersWithTimestamps: ERC20Transfer[] = [];
  const blockNumbers = Object.keys(blockMap);

  // Process in batches to avoid overloading the RPC
  const TIMESTAMP_BATCH_SIZE = 100;

  for (let i = 0; i < blockNumbers.length; i += TIMESTAMP_BATCH_SIZE) {
    const batch = blockNumbers.slice(i, i + TIMESTAMP_BATCH_SIZE);

    console.log(
      `Processing timestamps batch ${i / TIMESTAMP_BATCH_SIZE + 1}/${Math.ceil(
        blockNumbers.length / TIMESTAMP_BATCH_SIZE
      )}`
    );

    // Create an array of promises for the current batch
    const promises = batch.map(async (blockNumberStr) => {
      try {
        const blockNumber = BigInt(blockNumberStr);
        const block = await client.getBlock({ blockNumber });

        // Add timestamp to all transfers from this block
        blockMap[blockNumberStr].forEach((transfer) => {
          transfersWithTimestamps.push({
            ...transfer,
            timestamp: Number(block.timestamp),
          });
        });
      } catch (error) {
        console.error(`Error fetching block ${blockNumberStr}:`, error);
        // Still include transfers without timestamps to avoid data loss
        blockMap[blockNumberStr].forEach((transfer) => {
          transfersWithTimestamps.push(transfer);
        });
      }
    });

    // Execute the batch of promises
    await Promise.all(promises);

    // Respect rate limits between batches
    if (i + TIMESTAMP_BATCH_SIZE < blockNumbers.length) {
      await sleep(1000);
    }
  }

  // Sort by timestamp (or block number if timestamp is missing)
  return transfersWithTimestamps.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp;
    }
    return Number(b.blockNumber - a.blockNumber);
  });
}

/**
 * Identifies buy/sell transactions efficiently
 */
function identifyBuySellTransactions(
  transfers: ERC20Transfer[]
): TokenTransaction[] {
  console.log("Identifying buy/sell transactions...");

  // First, identify potential liquidity pool addresses
  const addressFrequency: Record<string, number> = {};
  const addressVolume: Record<string, bigint> = {};

  // Count occurrences and volumes
  transfers.forEach((transfer) => {
    // Track frequency
    addressFrequency[transfer.from] =
      (addressFrequency[transfer.from] || 0) + 1;
    addressFrequency[transfer.to] = (addressFrequency[transfer.to] || 0) + 1;

    // Track volume
    if (!addressVolume[transfer.from]) addressVolume[transfer.from] = BigInt(0);
    if (!addressVolume[transfer.to]) addressVolume[transfer.to] = BigInt(0);

    addressVolume[transfer.from] += transfer.value;
    addressVolume[transfer.to] += transfer.value;
  });

  // Find addresses with high frequency AND high volume - likely to be liquidity pools
  const potentialLiquidityPools = Object.entries(addressFrequency)
    .filter(([address, count]) => {
      const volume = addressVolume[address] || BigInt(0);
      return count > 10 && volume > BigInt(1000000000000000000); // Count > 10 and volume > 1 ETH equivalent
    })
    .map(([address]) => address);

  console.log(
    `Identified ${potentialLiquidityPools.length} potential liquidity pools`
  );

  // Save liquidity pools for reference
  fs.writeFileSync(
    "src/data/liquidity_pools.json",
    JSON.stringify(potentialLiquidityPools, null, 2)
  );

  // Categorize transactions
  return transfers.map((transfer) => {
    // If recipient is a normal user and sender is a potential pool = BUY
    const isBuy =
      !potentialLiquidityPools.includes(transfer.to) &&
      potentialLiquidityPools.includes(transfer.from);

    // If sender is a normal user and recipient is a potential pool = SELL
    const isSell =
      !potentialLiquidityPools.includes(transfer.from) &&
      potentialLiquidityPools.includes(transfer.to);

    // Default to marking as a buy if we can't determine (neutral option)
    const transactionType = isBuy || (!isBuy && !isSell);

    return {
      hash: transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp || 0,
      from: transfer.from,
      to: transfer.to,
      amount: transfer.value,
      isBuy: transactionType,
    };
  });
}

/**
 * Main function to fetch token transactions with optimizations for large data sets
 */
export async function fetchTokenTransactions(): Promise<TokenTransaction[]> {
  // Check if we have cached transactions
  const cacheFile = "src/data/transactions.json";
  if (fs.existsSync(cacheFile)) {
    try {
      const cachedData = fs.readFileSync(cacheFile, "utf8");
      const transactions = JSON.parse(cachedData, (_, value) => {
        if (
          typeof value === "string" &&
          /^\d+$/.test(value) &&
          value.length > 15
        ) {
          return BigInt(value);
        }
        return value;
      });

      console.log(`Using cached transactions from ${cacheFile}`);
      console.log(`Found ${transactions.length} cached transactions`);

      // If we have enough transactions in cache, use them
      if (transactions.length >= MAX_TRANSACTIONS) {
        return transactions.slice(0, MAX_TRANSACTIONS);
      }

      console.log(
        `Cached transactions (${transactions.length}) are fewer than requested (${MAX_TRANSACTIONS}). Fetching fresh data...`
      );
    } catch (error) {
      console.error("Error reading cached transactions:", error);
    }
  }

  // Step 1: Fetch transfer events with optimized batching
  const transfers = await fetchTokenTransfers();
  if (transfers.length === 0) {
    throw new Error("Failed to fetch any transfer events");
  }

  // Save raw transfers
  saveRawTransfers(transfers);

  // Step 2: Add timestamps with batched requests
  const transfersWithTimestamps = await addTimestamps(transfers);

  // Step 3: Identify buy/sell transactions with improved heuristics
  const transactions = identifyBuySellTransactions(transfersWithTimestamps);

  // Sort by timestamp (most recent first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);

  console.log(`Processed ${transactions.length} transactions`);

  return transactions;
}

/**
 * Save raw transfers to a file (without processing)
 */
function saveRawTransfers(transfers: ERC20Transfer[]): void {
  const filePath = "src/data/raw_transfers.json";
  const dirPath = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      transfers,
      (_, value) => {
        // Convert BigInt to string for JSON serialization
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      },
      2
    )
  );

  console.log(`Saved ${transfers.length} raw transfers to ${filePath}`);
}

/**
 * Save transactions to a JSON file
 */
export function saveTransactionsToFile(
  transactions: TokenTransaction[],
  filePath: string = "src/data/transactions.json"
): void {
  const dirPath = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Write to file
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      transactions,
      (_, value) => {
        // Convert BigInt to string for JSON serialization
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      },
      2
    )
  );

  console.log(`Saved ${transactions.length} transactions to ${filePath}`);
}

/**
 * Load transactions from a JSON file
 */
export function loadTransactionsFromFile(
  filePath: string = "src/data/transactions.json"
): TokenTransaction[] {
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} does not exist`);
    return [];
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    const transactions = JSON.parse(data, (_, value) => {
      // Convert string representation of BigInt back to BigInt
      if (typeof value === "string" && /^\d+$/.test(value)) {
        // Only convert strings that are purely numeric and reasonably large
        if (value.length > 15) {
          return BigInt(value);
        }
      }
      return value;
    });

    console.log(`Loaded ${transactions.length} transactions from ${filePath}`);
    return transactions;
  } catch (error) {
    console.error("Error loading transactions from file:", error);
    return [];
  }
}

// Execute if run directly
if (require.main === module) {
  (async () => {
    try {
      const transactions = await fetchTokenTransactions();
      saveTransactionsToFile(transactions);
    } catch (error) {
      console.error("Error in main execution:", error);
    }
  })();
}
