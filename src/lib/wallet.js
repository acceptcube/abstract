// Loads the deployer keypair from DEPLOYER_KEYPAIR, which may be either a path
// to a Solana CLI keypair json (number array) or a raw base58 secret key.

import fs from "node:fs";
import path from "node:path";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { config } from "../config.js";

export function loadDeployerSecret() {
  const v = process.env.DEPLOYER_KEYPAIR;
  if (!v) throw new Error("DEPLOYER_KEYPAIR not set in .env");

  const asPath = path.isAbsolute(v) ? v : path.join(config.root, v);
  let bytes;
  if (fs.existsSync(asPath)) {
    const raw = JSON.parse(fs.readFileSync(asPath, "utf8"));
    bytes = Uint8Array.from(raw);
  } else {
    bytes = bs58.decode(v.trim());
  }
  if (bytes.length !== 64)
    throw new Error(`Deployer secret key must be 64 bytes, got ${bytes.length}`);
  return bytes;
}

export function loadDeployerKeypair() {
  return Keypair.fromSecretKey(loadDeployerSecret());
}
