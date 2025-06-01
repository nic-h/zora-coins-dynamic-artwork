// src/constants.ts

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// ─── RPC & Wallet ───────────────────────────────────
export const BASE_RPC_URL    = process.env.BASE_RPC_URL!;      
export const PRIVATE_KEY     = process.env.PRIVATE_KEY!;        

// ─── Pinata Credentials ─────────────────────────────
export const PINATA_API_KEY    = process.env.PINATA_API_KEY!;
export const PINATA_API_SECRET = process.env.PINATA_API_SECRET!;

// ─── Token Info ─────────────────────────────────────
export const TOKEN_ADDRESS   = process.env.TOKEN_ADDRESS! as `0x${string}`;
export const DEPLOY_BLOCK    = Number(process.env.DEPLOY_BLOCK!);

// ─── Fetch Settings ─────────────────────────────────
export const FETCH_BATCH_SIZE = Number(process.env.FETCH_BATCH_SIZE!);
export const FETCH_DELAY_MS   = Number(process.env.FETCH_DELAY_MS!);

// ─── Grid & Scramble Settings ───────────────────────
export const CANVAS_SIZE      = Number(process.env.CANVAS_SIZE!);  // e.g. 512
export const BLOCK_SIZE       = Number(process.env.BLOCK_SIZE!);   // e.g. 16
export const N                = CANVAS_SIZE / BLOCK_SIZE;          // e.g. 32
export const SCALE_FACTOR     = Number(process.env.SCALE_FACTOR!);  // e.g. 1e18
export const MIN_SCALE        = Number(process.env.MIN_SCALE!);     // e.g. 1
export const MAX_SCALE        = Number(process.env.MAX_SCALE!);     // e.g. 4
export const ROTATION_ANGLES  = process.env.ROTATION_ANGLES!
  .split(",")
  .map((s) => Number(s));                                          // e.g. [0,90,180,270]
export const TINT_OPACITY     = Number(process.env.TINT_OPACITY!);  // e.g. 0.5

// ─── Aliases for svgGenerator ───────────────────────
export const CANVAS = CANVAS_SIZE;
export const BLOCK  = BLOCK_SIZE;

// ─── Background Blob (strip all newlines) ───────────
// Read the base64 text, remove EVERY \r or \n, then prepend data URI:
const rawBase64WithNewlines = fs
  .readFileSync(path.resolve(process.cwd(), "background.b64"), "utf-8");

// Remove internal newlines so the attribute stays on one line
const rawBase64 = rawBase64WithNewlines.replace(/(\r\n|\n|\r)/gm, "").trim();

export const BACKGROUND_DATA_URL = `data:image/png;base64,${rawBase64}`;

// ─── Color Tints ─────────────────────────────────────
export const BUY_TINT  = "#00ff00";    // green overlay
export const SELL_TINT = "#ff0000";    // red overlay
