// src/readContractURI.ts

import dotenv from "dotenv";
dotenv.config();

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { coinABI } from "./abi/coinABI";
import { BASE_RPC_URL, TOKEN_ADDRESS } from "./constants";

async function main() {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL),
    });

    // Read on-chain contractURI
    const rawUri = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: coinABI,
      functionName: "contractURI",
    });

    const uri = rawUri as unknown as string;
    console.log("On-chain URI:", uri);
  } catch (err: any) {
    console.error("Error reading contractURI:", err.message || err);
    process.exit(1);
  }
}

main();
