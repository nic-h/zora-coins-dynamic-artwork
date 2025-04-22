// src/constants.ts

export const TOKEN_DEPLOY_BLOCK = 29259918;
export const TOKEN_ADDRESS      = "0x3c5dc85dcf8c48ad44130f10571d27724475b522";
export const MAX_TRANSACTIONS   = 10000;
export const BATCH_SIZE         = 2000;
export const BATCH_DELAY        = 1000;
export const BASE_RPC_URL       = "https://mainnet.base.org";
export const IPFS_BASE_URL      = "https://ipfs.infura.io:5001/api/v0";

// your 512×512 background, placed in src/
export const BG_IMAGE = "background.png";

// grid constants: now 16 px cells → 32×32 grid
export const CANVAS = 512;
export const BLOCK  = 16;
export const N      = CANVAS / BLOCK;  // 32
