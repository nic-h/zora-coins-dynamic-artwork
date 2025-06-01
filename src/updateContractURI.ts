// src/updateContractURI.ts

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { updateCoinURI } from "@zoralabs/coins-sdk";
import { BASE_RPC_URL, TOKEN_ADDRESS } from "./constants";

/**
 * Given a metadata URI (ipfs://CID), call Zora’s Coin SDK to update the on‐chain coin URI.
 * Returns true if the transaction is sent successfully, false otherwise.
 */
export async function updateContractURI(newURI: string): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC_URL),
    });

    // Cast process.env.PRIVATE_KEY to the template-literal type `0x${string}`:
    const pk = process.env.PRIVATE_KEY as `0x${string}`;

    const walletClient = createWalletClient({
      chain: base,
      transport: http(BASE_RPC_URL),
      account: privateKeyToAccount(pk),
    });

    console.log("🔗 Sending on-chain update to set tokenURI →", newURI);
    const result = await updateCoinURI(
      { coin: TOKEN_ADDRESS, newURI },
      walletClient,
      publicClient
    );
    console.log("✅ setTokenURI tx hash:", result.hash);
    return true;
  } catch (err) {
    console.error("❌ Failed to update tokenURI on-chain:", err);
    return false;
  }
}
