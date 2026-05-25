import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  root: ROOT,
  project: {
    name: "abstract",
    ticker: "$ART",
    symbol: "ART",
    artist: "Halden Voss",
  },
  dirs: {
    images: path.join(ROOT, "output", "images"),
    metadata: path.join(ROOT, "output", "metadata"),
    logs: path.join(ROOT, "output", "logs"),
  },
  openrouter: {
    apiKey: () => req("OPENROUTER_API_KEY"),
    model: process.env.IMAGE_MODEL || "openai/gpt-5.4-image-2",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  solana: {
    network: process.env.SOLANA_NETWORK || "mainnet",
    heliusKey: () => req("HELIUS_API_KEY"),
    rpcUrl: () =>
      (process.env.SOLANA_NETWORK || "mainnet") === "devnet"
        ? `https://devnet.helius-rpc.com/?api-key=${req("HELIUS_API_KEY")}`
        : `https://mainnet.helius-rpc.com/?api-key=${req("HELIUS_API_KEY")}`,
  },
  token: {
    mint: process.env.TOKEN_MINT || "",
    holdThreshold: Number(process.env.HOLD_THRESHOLD || 5_000_000),
    holdDurationSeconds: Number(process.env.HOLD_DURATION_SECONDS || 900),
    winnerCount: Number(process.env.WINNER_COUNT || 100),
  },
  site: {
    domain: process.env.SITE_DOMAIN || "haldenvoss.art",
    xHandle: process.env.X_HANDLE || "HaldenVoss",
  },
};
