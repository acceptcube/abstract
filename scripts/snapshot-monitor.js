// Rolling 15 minute hold monitor. Polls the holder map every POLL_SECONDS via
// Helius, tracks continuous time at balance >= HOLD_THRESHOLD, and locks the
// first WINNER_COUNT wallets into winners.json in qualification order. State
// persists; safe to restart. Read only.

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { getHolderMap } from "../src/lib/holders.js";
import { loadDeployerKeypair } from "../src/lib/wallet.js";
import { processTick } from "../src/lib/qualify.js";

const MINT = config.token.mint;
if (!MINT) {
  console.error("TOKEN_MINT not set in .env, provide the CA first.");
  process.exit(1);
}
const THRESHOLD = config.token.holdThreshold;
const HOLD_MS = config.token.holdDurationSeconds * 1000;
const WINNERS = config.token.winnerCount;
const POLL_SECONDS = Number(process.env.POLL_SECONDS || 20);

const winDir = path.join(config.root, "output", "winners");
fs.mkdirSync(winDir, { recursive: true });
const statePath = path.join(winDir, "monitor-state.json");
const winnersPath = path.join(winDir, "winners.json");

const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : { started: false, startedAt: null, timers: {}, winners: [], winnerSet: [] };
const winnerSet = new Set(state.winnerSet || state.winners.map((w) => w.wallet));

const excluded = new Set(
  (process.env.EXCLUDED_WALLETS || "")
    .split(",").map((s) => s.trim()).filter(Boolean)
);
if (process.env.DEPLOYER_PUBKEY) {
  excluded.add(process.env.DEPLOYER_PUBKEY.trim());
} else {
  try { excluded.add(loadDeployerKeypair().publicKey.toBase58()); } catch { /* read only ok */ }
}

const save = () => {
  state.winnerSet = [...winnerSet];
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  fs.writeFileSync(
    winnersPath,
    JSON.stringify({ mint: MINT, count: state.winners.length, winners: state.winners }, null, 2)
  );
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tick() {
  const now = Date.now();
  let balances;
  try {
    ({ balances } = await getHolderMap(MINT, excluded));
  } catch (e) {
    console.warn(`poll error: ${e.message}`);
    return;
  }
  if (state.started && balances.size === 0) {
    console.log(`[${new Date().toISOString()}] empty poll skipped (RPC blip)`);
    return;
  }
  const wasStarted = state.started;
  const newlyQualified = processTick(state, balances, now, {
    thresholdUi: THRESHOLD, holdMs: HOLD_MS, winnerLimit: WINNERS,
  });
  if (!wasStarted && state.started) {
    console.log(`[${new Date().toISOString()}] MONITORING STARTED, ${balances.size} holders detected`);
  }
  for (const w of newlyQualified) {
    winnerSet.add(w.wallet);
    console.log(`QUALIFIED #${w.rank}: ${w.wallet} (bal ${w.balance})`);
  }
  save();
  console.log(
    `[${new Date().toISOString()}] holders=${balances.size} qualified=${state.winners.length}/${WINNERS}`
  );
}

async function main() {
  console.log(
    `Monitor: mint=${MINT} threshold=${THRESHOLD} hold=${config.token.holdDurationSeconds}s want=${WINNERS} poll=${POLL_SECONDS}s`
  );
  console.log(`Excluded: ${[...excluded].join(", ") || "(none)"}`);
  while (state.winners.length < WINNERS) {
    await tick();
    if (state.winners.length >= WINNERS) break;
    await sleep(POLL_SECONDS * 1000);
  }
  save();
  console.log(`\nDONE, ${state.winners.length} winners locked in ${winnersPath}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
