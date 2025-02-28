import axios from "axios";
import { Buffer } from "buffer";
import dotenv from "dotenv";
import FormData from "form-data";
import { IPFS_BASE_URL } from "./constants";

dotenv.config();

// Configure IPFS credentials
const projectId = process.env.INFURA_IPFS_PROJECT_ID;
const projectSecret = process.env.INFURA_IPFS_PROJECT_SECRET;
const auth = Buffer.from(`${projectId}:${projectSecret}`).toString("base64");

/**
 * Fetch the two most recent pinned CIDs (last metadata & image)
 */
export async function getLastTwoPinnedCIDs(): Promise<{
  image?: string;
  metadata?: string;
}> {
  try {
    const response = await axios.get(`${IPFS_BASE_URL}/pin/ls`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    const pinnedCIDs = Object.keys(response.data.Keys);
    if (pinnedCIDs.length < 2) {
      console.log("Not enough pinned CIDs found.");
      return {};
    }

    return {
      metadata: pinnedCIDs[0], // Most recent is metadata
      image: pinnedCIDs[1], // Second most recent is the previous image
    };
  } catch (error: any) {
    console.error("Error fetching pinned CIDs:", error.response?.data || error);
    return {};
  }
}

/**
 * Unpin a CID from Infura
 */
export async function unpinFromIPFS(cid: string) {
  try {
    await axios.post(`${IPFS_BASE_URL}/pin/rm?arg=${cid}`, null, {
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log(`✅ Successfully unpinned CID: ${cid}`);
  } catch (error: any) {
    console.error(
      `❌ Error unpinning CID ${cid}:`,
      error.response?.data || error
    );
  }
}

/**
 * Upload content to IPFS
 */
export async function uploadToIPFS(content: string | Buffer): Promise<string> {
  try {
    const formData = new FormData();
    formData.append(
      "file",
      Buffer.isBuffer(content) ? content : Buffer.from(content)
    );

    const response = await axios.post(`${IPFS_BASE_URL}/add`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Basic ${auth}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data.Hash;
  } catch (error: any) {
    console.error("Error uploading to IPFS:", error?.message || error);
    throw error;
  }
}

/**
 * Create and upload metadata JSON to IPFS
 */
export async function createAndUploadMetadata(
  imageCid: string,
  name: string = "liquidity layer",
  description: string = "each trade leaves a mark",
  symbol: string = "LL"
): Promise<string> {
  const metadata = {
    name,
    description,
    symbol,
    image: `ipfs://${imageCid}`,
    content: {
      uri: `ipfs://${imageCid}`,
      mime: "image/svg+xml",
    },
  };

  console.log(metadata);

  try {
    const metadataString = JSON.stringify(metadata, null, 2);
    return await uploadToIPFS(metadataString);
  } catch (error: any) {
    console.error(
      "Error creating and uploading metadata:",
      error?.message || error
    );
    throw error;
  }
}

// Helper function to get IPFS gateway URL for a CID
export function getIPFSGatewayURL(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}
