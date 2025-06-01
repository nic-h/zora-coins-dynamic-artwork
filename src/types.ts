// src/types.ts

/**
 * One ERC-20 Transfer event for your Zora Coin.
 */
export interface TokenTransaction {
  hash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  amount: bigint;
  isBuy: boolean; // true if `to === TOKEN_ADDRESS`
}
