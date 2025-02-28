// Token Transaction interface
export interface TokenTransaction {
  hash: string;
  blockNumber: bigint;
  timestamp: number;
  from: string;
  to: string;
  amount: bigint;
  isBuy: boolean; // true for buy, false for sell
}

// ERC20 Transfer event format
export interface ERC20Transfer {
  hash: string;
  blockNumber: bigint;
  from: string;
  to: string;
  value: bigint;
  timestamp?: number; // Optional, may need to be fetched separately
}
