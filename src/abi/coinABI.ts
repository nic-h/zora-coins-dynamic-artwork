// src/abi/coinABI.ts

/**
 * Minimal ABI for Zora Coin metadata updates:
 * - owner():        view → address
 * - contractURI():  view → string
 * - setContractURI(newURI): nonpayable
 */
export const coinABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "contractURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "newURI", type: "string" }],
    name: "setContractURI",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
