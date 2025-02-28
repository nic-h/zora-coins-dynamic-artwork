// /**
//  * This file is designed to be run as a scheduled task on Render.com
//  * It handles fetching transactions and generating the SVG in a way
//  * that is optimized for cron job execution.
//  */

// import {
//   fetchTokenTransactions,
//   saveTransactionsToFile,
//   loadTransactionsFromFile,
// } from "./fetchTransactions";
// import SvgGenerator from "./svgGenerator";
// import {
//   uploadToIPFS,
//   createAndUploadMetadata,
//   getLastTwoPinnedCIDs,
//   unpinFromIPFS,
// } from "./ipfsUploader";
// import { createWalletClient, http, createPublicClient } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
// import { base } from "viem/chains";
// import { coinABI } from "./abi/coinABI";
// import dotenv from "dotenv";
// import fs from "fs";
// import path from "path";
// import { BASE_RPC_URL } from "./constants";

// // Load environment variables
// dotenv.config();

// const mlBase64 =
//   "data:image/jpeg;base64,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";

// // Constants
// const TOKEN_ADDRESS = "0x5a34646b860485f012435e2486edb375615d1c7b";
// const UPDATE_INTERVAL = 5 * 60 * 1000; // 3 minutes in milliseconds

// // Flag files to track execution state
// const FETCH_IN_PROGRESS_FLAG = "src/data/.fetch_in_progress";
// const GENERATE_IN_PROGRESS_FLAG = "src/data/.generate_in_progress";
// const LAST_UPLOAD_FLAG = "src/data/.last_upload";
// const LAST_FETCH_TIME_FLAG = "src/data/.last_fetch_time";
// const LAST_SUCCESSFUL_FETCH_FLAG = "src/data/.last_successful_fetch";

// /**
//  * Creates a flag file with current timestamp
//  */
// export function createFlagFile(
//   filePath: string,
//   data: string = new Date().toISOString()
// ): void {
//   const dir = path.dirname(filePath);
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
//   fs.writeFileSync(filePath, data);
// }

// /**
//  * Removes a flag file
//  */
// function removeFlagFile(filePath: string): void {
//   if (fs.existsSync(filePath)) {
//     fs.unlinkSync(filePath);
//   }
// }

// /**
//  * Checks if a flag file exists
//  */
// function flagFileExists(filePath: string): boolean {
//   return fs.existsSync(filePath);
// }

// /**
//  * Gets data from a flag file
//  */
// function getFlagFileData(filePath: string): string | null {
//   if (fs.existsSync(filePath)) {
//     return fs.readFileSync(filePath, "utf8");
//   }
//   return null;
// }

// /**
//  * Fetches new transactions (partial if needed) and updates the cache
//  */
// async function fetchAndUpdateTransactions(): Promise<boolean> {
//   try {
//     // Create "in progress" flag
//     createFlagFile(FETCH_IN_PROGRESS_FLAG);
//     createFlagFile(LAST_FETCH_TIME_FLAG);

//     // Load existing transactions if available
//     let existingTransactions = loadTransactionsFromFile();
//     const initialCount = existingTransactions.length;

//     console.log(
//       `Starting transaction fetch. Currently have ${initialCount} cached transactions.`
//     );

//     // Fetch fresh transactions
//     const newTransactions = await fetchTokenTransactions();

//     if (newTransactions.length === 0) {
//       console.error("Failed to fetch new transactions");
//       return false;
//     }

//     console.log(`Fetched ${newTransactions.length} transactions`);

//     // Merge with existing transactions, remove duplicates
//     const combinedTransactions = [...newTransactions];

//     if (existingTransactions.length > 0) {
//       // Get unique transaction hashes from new transactions
//       const newHashes = new Set(newTransactions.map((tx) => tx.hash));

//       // Add existing transactions that aren't in the new set
//       existingTransactions.forEach((tx) => {
//         if (!newHashes.has(tx.hash)) {
//           combinedTransactions.push(tx);
//         }
//       });

//       console.log(
//         `Combined with existing transactions. Total unique: ${combinedTransactions.length}`
//       );
//     }

//     // Sort by timestamp
//     combinedTransactions.sort((a, b) => b.timestamp - a.timestamp);

//     // Save the combined transactions
//     saveTransactionsToFile(combinedTransactions);

//     // Update the successful fetch flag
//     createFlagFile(LAST_SUCCESSFUL_FETCH_FLAG);

//     return true;
//   } catch (error) {
//     console.error("Error in fetchAndUpdateTransactions:", error);
//     return false;
//   } finally {
//     // Always remove the in-progress flag
//     removeFlagFile(FETCH_IN_PROGRESS_FLAG);
//   }
// }

// /**
//  * Generates an SVG from the cached transaction data
//  */
// export async function generateSvg(): Promise<string | null> {
//   try {
//     // Load transactions from the cache
//     const transactions = loadTransactionsFromFile();

//     if (transactions.length === 0) {
//       console.error("No transactions available to generate SVG");
//       return null;
//     }

//     console.log(`Generating SVG for ${transactions.length} transactions`);

//     // Create SVG generator with configuration
//     const generator = new SvgGenerator({
//       width: 1000,
//       height: 1000,
//       symbolSize: 50,
//       symbolStrokeWidth: 6,
//       backgroundImage: {
//         // path: "./ml.jpg",
//         // path: "https://ipfs.io/ipfs/bafkreibymbougefj666xq5yfcahc3wcmmeehycmiaygabm3a7tjr7hnj4q",
//         path: mlBase64,
//         width: 508,
//         height: 758,
//       },
//     });

//     // Generate and save SVG
//     const outputPath = generator.saveToFile(transactions, "src/output.svg");
//     console.log(`SVG generated and saved to: ${outputPath}`);

//     // Create a timestamped copy
//     const timestamp = new Date().toISOString().replace(/:/g, "-");
//     const archivePath = `src/archive/output-${timestamp}.svg`;

//     // Ensure directory exists
//     if (!fs.existsSync(path.dirname(archivePath))) {
//       fs.mkdirSync(path.dirname(archivePath), { recursive: true });
//     }

//     // Copy file
//     fs.copyFileSync(outputPath, archivePath);
//     console.log(`Archived SVG to: ${archivePath}`);

//     return fs.readFileSync(outputPath, "utf8");
//   } catch (error) {
//     console.error("Error generating SVG:", error);
//     return null;
//   }
// }

// /**
//  * Updates contract URI with new IPFS hash
//  */
// export async function updateContractURI(ipfsHash: string): Promise<boolean> {
//   try {
//     if (!process.env.PRIVATE_KEY) {
//       throw new Error("PRIVATE_KEY not found in environment variables");
//     }

//     // Add 0x prefix to the hex private key
//     const privateKeyHex = `0x${process.env.PRIVATE_KEY}`;

//     // Create wallet client
//     const account = privateKeyToAccount(privateKeyHex as `0x${string}`);
//     console.log("Account address:", account.address);

//     const client = createWalletClient({
//       account,
//       chain: base,
//       transport: http(BASE_RPC_URL),
//     });

//     // Create public client for gas estimation
//     const publicClient = createPublicClient({
//       chain: base,
//       transport: http(BASE_RPC_URL),
//     });

//     // Prepare transaction
//     const { request } = await publicClient.simulateContract({
//       address: TOKEN_ADDRESS,
//       abi: coinABI,
//       functionName: "setContractURI",
//       args: [`ipfs://${ipfsHash}`],
//       account,
//     });

//     // Send transaction
//     const hash = await client.writeContract(request);
//     console.log("Transaction sent:", hash);

//     // Wait for transaction
//     const receipt = await publicClient.waitForTransactionReceipt({ hash });
//     console.log("Transaction confirmed:", receipt.transactionHash);

//     return true;
//   } catch (error: any) {
//     console.error("Error updating contract URI:", error?.message || error);
//     return false;
//   }
// }

// /**
//  * Main scheduled task function
//  */
// async function scheduledTask() {
//   try {
//     // Check if a fetch is already in progress
//     if (flagFileExists(FETCH_IN_PROGRESS_FLAG)) {
//       const flagData = getFlagFileData(FETCH_IN_PROGRESS_FLAG);
//       if (flagData) {
//         const startTime = new Date(flagData).getTime();
//         const now = Date.now();
//         if (now - startTime < UPDATE_INTERVAL) {
//           console.log("Previous fetch still in progress, skipping...");
//           return;
//         }
//         // If it's been more than 3 minutes, remove the stale flag
//         removeFlagFile(FETCH_IN_PROGRESS_FLAG);
//       }
//     }

//     // Start fetch process
//     createFlagFile(FETCH_IN_PROGRESS_FLAG);
//     const hasNewTransactions = await fetchAndUpdateTransactions();

//     if (hasNewTransactions) {
//       // Generate new SVG
//       const svgContent = await generateSvg();
//       if (!svgContent) {
//         throw new Error("Failed to generate SVG");
//       }

//       console.log("🔍 Fetching latest pinned CIDs from Infura...");
//       const previousCIDs = await getLastTwoPinnedCIDs();
//       console.log("Previous CIDs:", previousCIDs);

//       // console.log("🔨 Generating PNG from SVG");
//       // const pngBuffer = await convertSVGtoPNG(svgContent);
//       // if (!pngBuffer) {
//       //   throw new Error("Failed to convert SVG to PNG");
//       // }

//       // Upload PNG to IPFS
//       console.log("Uploading SVG to IPFS...");
//       const imageCid = await uploadToIPFS(svgContent);
//       console.log("PNG uploaded to IPFS:", imageCid);

//       // Create and upload metadata
//       console.log("Creating and uploading metadata...");
//       const metadataCid = await createAndUploadMetadata(imageCid);
//       console.log("Metadata uploaded to IPFS:", metadataCid);

//       // Update contract URI with metadata CID
//       console.log("Updating contract URI with metadata CID...");
//       const success = await updateContractURI(metadataCid);
//       if (success) {
//         console.log("Contract URI updated successfully");
//         createFlagFile(
//           LAST_UPLOAD_FLAG,
//           JSON.stringify({
//             imageCid,
//             metadataCid,
//             timestamp: new Date().toISOString(),
//           })
//         );

//         // Unpin old metadata & old image
//         if (previousCIDs.metadata) {
//           console.log(
//             `🔄 Unpinning old metadata CID: ${previousCIDs.metadata}`
//           );
//           await unpinFromIPFS(previousCIDs.metadata);
//         }
//         if (previousCIDs.image) {
//           console.log(`🔄 Unpinning old image CID: ${previousCIDs.image}`);
//           await unpinFromIPFS(previousCIDs.image);
//         }
//       }
//     } else {
//       console.log("No new transactions found");
//     }

//     // Cleanup
//     removeFlagFile(FETCH_IN_PROGRESS_FLAG);
//   } catch (error) {
//     console.error("Error in scheduled task:", error);
//     removeFlagFile(FETCH_IN_PROGRESS_FLAG);
//   }
// }

// /**
//  * Starts the scheduled task
//  */
// function startScheduledTask() {
//   console.log("Starting scheduled task...");
//   scheduledTask().catch(console.error);
//   setInterval(() => {
//     scheduledTask().catch(console.error);
//   }, UPDATE_INTERVAL);
// }

// // Execute if run directly
// if (require.main === module) {
//   startScheduledTask();
// }

// export { scheduledTask, startScheduledTask };
