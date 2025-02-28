// /**
//  * Updates contract URI with new IPFS hash

import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { coinABI } from "./abi/coinABI";
import { BASE_RPC_URL, TOKEN_ADDRESS } from "./constants";

//  */
export async function updateContractURI(ipfsHash: string): Promise<boolean> {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in environment variables");
    }

    // Add 0x prefix to the hex private key
    const privateKeyHex = `0x${process.env.PRIVATE_KEY}`;

    // Create wallet client
    const account = privateKeyToAccount(privateKeyHex as `0x${string}`);
    console.log("Account address:", account.address);

    const client = createWalletClient({
      account,
      chain: base,
      transport: http(BASE_RPC_URL),
    });

    // Create public client for gas estimation
    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL),
    });

    // Prepare transaction
    const { request } = await publicClient.simulateContract({
      address: TOKEN_ADDRESS,
      abi: coinABI,
      functionName: "setContractURI",
      args: [`ipfs://${ipfsHash}`],
      account,
    });

    // Send transaction
    const hash = await client.writeContract(request);
    console.log("Transaction sent:", hash);

    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed:", receipt.transactionHash);

    return true;
  } catch (error: any) {
    console.error("Error updating contract URI:", error?.message || error);
    return false;
  }
}
