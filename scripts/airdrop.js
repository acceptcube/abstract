// Transfers NFT #N (asset id N) from the deployer to the Nth qualifying wallet
// (sequential assignment). Idempotent + retry safe: per rank tx signatures
// persisted in output/winners/airdrop-state.json, so a re run only sends what
// is missing. Writes a receipt log.
//
//   node scripts/airdrop.js --dry     # preview the full mapping
//   node scripts/airdrop.js           # execute
//
// AIRDROP_REQUIRE_CONFIRM=1 -> typed confirmation gate.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import { mplCore, transfer, fetchCollection } from "@metaplex-foundation/mpl-core";
import { config } from "../src/config.js";
import { loadDeployerSecret } from "../src/lib/wallet.js";

const dry = process.argv.includes("--dry");
const pad = (n) => String(n).padStart(3, "0");
const winDir = path.join(config.root, "output", "winners");
const winnersPath = path.join(winDir, "winners.json");
const mintStatePath = path.join(config.dirs.metadata, "mint-state.json");
const airStatePath = path.join(winDir, "airdrop-state.json");
const receiptPath = path.join(winDir, "airdrop-receipts.json");

for (const [p, n] of [
  [winnersPath, "winners.json (run the monitor or history qualifier)"],
  [mintStatePath, "mint-state.json (run the mint)"],
]) {
  if (!fs.existsSync(p)) { console.error(`Missing ${n}`); process.exit(1); }
}

const { winners } = JSON.parse(fs.readFileSync(winnersPath, "utf8"));
const mintState = JSON.parse(fs.readFileSync(mintStatePath, "utf8"));
const air = fs.existsSync(airStatePath)
  ? JSON.parse(fs.readFileSync(airStatePath, "utf8")) : { sent: {} };
const receipts = fs.existsSync(receiptPath)
  ? JSON.parse(fs.readFileSync(receiptPath, "utf8")) : [];

const plan = winners.slice().sort((a, b) => a.rank - b.rank).map((w) => ({
  rank: w.rank, assetId: pad(w.rank), asset: mintState.assets[pad(w.rank)]?.address, wallet: w.wallet,
}));

console.log(`Network: ${config.solana.network}`);
console.log(`Collection: ${mintState.collection}`);
console.log(`Winners: ${winners.length}  Assets: ${Object.keys(mintState.assets).length}`);
console.log("\nAssignment (NFT #N -> Nth qualifier):");
for (const a of plan.slice(0, 5)) console.log(`  #${a.assetId} ${a.asset || "MISSING"} -> ${a.wallet}`);
console.log(`  … ${plan.length} total`);

const missing = plan.filter((a) => !a.asset);
if (missing.length) {
  console.error(`\n${missing.length} ranks have no minted asset, aborting.`);
  process.exit(1);
}
if (dry) { console.log("\n--dry: no transfers sent."); process.exit(0); }

async function confirmGate() {
  if (process.env.AIRDROP_REQUIRE_CONFIRM !== "1") return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((r) => rl.question(`Type "SEND ${plan.length}" to execute the airdrop: `, r));
  rl.close();
  if (ans.trim() !== `SEND ${plan.length}`) { console.log("Confirmation mismatch, aborting."); process.exit(1); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await confirmGate();
  const umi = createUmi(config.solana.rpcUrl()).use(mplCore());
  const deployer = umi.eddsa.createKeypairFromSecretKey(loadDeployerSecret());
  umi.use(keypairIdentity(deployer));

  const collectionAccount = await fetchCollection(umi, publicKey(mintState.collection));

  let sent = 0;
  for (const a of plan) {
    if (air.sent[a.rank]) continue;
    let lastErr;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const res = await transfer(umi, {
          asset: { publicKey: publicKey(a.asset) },
          collection: collectionAccount,
          newOwner: publicKey(a.wallet),
        }).sendAndConfirm(umi);
        const sig = Buffer.from(res.signature).toString("base64");
        air.sent[a.rank] = sig;
        receipts.push({ rank: a.rank, asset: a.asset, to: a.wallet, sig, at: new Date().toISOString() });
        fs.writeFileSync(airStatePath, JSON.stringify(air, null, 2));
        fs.writeFileSync(receiptPath, JSON.stringify(receipts, null, 2));
        sent++;
        console.log(`  #${a.assetId} -> ${a.wallet} OK`);
        lastErr = null; break;
      } catch (e) {
        lastErr = e;
        console.warn(`  #${a.assetId} attempt ${attempt}/5: ${e.message}`);
        await sleep(2500 * attempt);
      }
    }
    if (lastErr) { console.error(`  #${a.assetId} FAILED: ${lastErr.message}`); process.exitCode = 1; }
  }

  const total = Object.keys(air.sent).length;
  console.log(`\nSent this run: ${sent}. Total transferred: ${total}/${plan.length}.`);
  console.log(`Receipts: ${receiptPath}`);
  if (total !== plan.length) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
