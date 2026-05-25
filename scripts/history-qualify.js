// History aware qualifier. The forward polling monitor only credits time it
// personally observed; this script proves the "5,000,000 for over 15 minutes"
// rule directly from the token account transaction timeline via Helius,
// independent of monitor uptime.
//
// Semantic: must still be holding now. Earliest genuine continuous holders are
// the first qualifiers, capped at WINNER_COUNT. Already paid ranks are frozen
// from output/winners/airdrop-receipts.json.
//
// Read only. Writes output/winners/winners.json and a proof markdown.

import fs from "node:fs";
import path from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../src/config.js";

const MINT = config.token.mint;
if (!MINT) { console.error("TOKEN_MINT not set in .env"); process.exit(1); }
const THRESHOLD = config.token.holdThreshold;
const HOLD_SECONDS = config.token.holdDurationSeconds;
const WINNERS = config.token.winnerCount;
const PRINT = process.argv.includes("--print");

const LEGACY_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const conn = new Connection(config.solana.rpcUrl(), "confirmed");
const excluded = new Set(
  (process.env.EXCLUDED_WALLETS || "").split(",").map((s) => s.trim()).filter(Boolean)
);
if (process.env.DEPLOYER_PUBKEY) excluded.add(process.env.DEPLOYER_PUBKEY.trim());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(label, fn, tries = 5) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(800 * i); }
  }
  throw new Error(`${label}: ${last?.message || last}`);
}

async function tokenProgram() {
  const info = await withRetry("mint owner", () => conn.getAccountInfo(new PublicKey(MINT)));
  const owner = info?.owner?.toBase58();
  if (owner !== LEGACY_TOKEN && owner !== TOKEN_2022)
    throw new Error(`mint not owned by a known token program (owner ${owner})`);
  return new PublicKey(owner);
}

async function currentCandidates(program) {
  let accounts = [];
  for (let a = 1; a <= 5; a++) {
    accounts = await withRetry("getParsedProgramAccounts", () =>
      conn.getParsedProgramAccounts(program, { filters: [{ memcmp: { offset: 0, bytes: MINT } }] })
    );
    if (accounts.length > 0) break;
    await sleep(1500 * a);
  }
  const byOwner = new Map();
  for (const { pubkey, account } of accounts) {
    const info = account.data?.parsed?.info;
    if (!info || info.mint !== MINT) continue;
    const owner = info.owner;
    const ui = info.tokenAmount?.uiAmount || 0;
    let pk;
    try { pk = new PublicKey(owner); } catch { continue; }
    if (!PublicKey.isOnCurve(pk.toBytes())) continue;
    if (excluded.has(owner)) continue;
    const rec = byOwner.get(owner) || { balance: 0, accounts: [] };
    rec.balance += ui;
    rec.accounts.push(pubkey.toBase58());
    byOwner.set(owner, rec);
  }
  const cands = [];
  for (const [owner, rec] of byOwner) {
    if (rec.balance >= THRESHOLD) cands.push({ owner, ...rec });
  }
  return cands;
}

async function allSignatures(addr) {
  const out = []; let before;
  for (;;) {
    const page = await withRetry("getSignaturesForAddress", () =>
      conn.getSignaturesForAddress(new PublicKey(addr), { limit: 1000, before })
    );
    if (!page.length) break;
    out.push(...page);
    if (page.length < 1000) break;
    before = page[page.length - 1].signature;
  }
  return out;
}

async function balanceTimeline(owner, accountSet, sigs) {
  const events = [];
  const sigList = sigs.map((s) => s.signature);
  for (let i = 0; i < sigList.length; i += 50) {
    const chunk = sigList.slice(i, i + 50);
    const txs = await withRetry("getParsedTransactions", () =>
      conn.getParsedTransactions(chunk, { maxSupportedTransactionVersion: 0 })
    );
    for (let k = 0; k < txs.length; k++) {
      const tx = txs[k];
      if (!tx || tx.meta?.err) continue;
      const t = tx.blockTime;
      if (t == null) continue;
      const post = tx.meta?.postTokenBalances || [];
      let bal = 0; let seen = false;
      for (const b of post) {
        if (b.mint !== MINT) continue;
        if (b.owner && b.owner !== owner) continue;
        bal += b.uiTokenAmount?.uiAmount || 0;
        seen = true;
      }
      if (!seen) bal = 0;
      events.push({ t, bal, sig: sigList[i + k] });
    }
  }
  events.sort((a, b) => a.t - b.t || a.bal - b.bal);
  return events;
}

function continuousHoldStart(events) {
  if (!events.length) return null;
  if (events[events.length - 1].bal < THRESHOLD) return null;
  let i = events.length - 1;
  while (i > 0 && events[i - 1].bal >= THRESHOLD) i--;
  return { startT: events[i].t, sig: events[i].sig };
}

async function main() {
  console.log(`History qualify: mint=${MINT} threshold=${THRESHOLD} hold=${HOLD_SECONDS}s want=${WINNERS}`);
  console.log(`Excluded: ${[...excluded].join(", ") || "(none)"}`);
  const program = await tokenProgram();
  const cands = await currentCandidates(program);
  console.log(`Wallets at or above ${THRESHOLD} right now: ${cands.length}`);

  const nowSec = Math.floor(Date.now() / 1000);
  const rows = [];
  let n = 0;
  for (const c of cands) {
    n++;
    let sigs = [];
    for (const acc of c.accounts) sigs = sigs.concat(await allSignatures(acc));
    const seen = new Set();
    sigs = sigs.filter((s) => seen.has(s.signature) ? false : (seen.add(s.signature), true));
    const events = await balanceTimeline(c.owner, new Set(c.accounts), sigs);
    const hs = continuousHoldStart(events);
    const holdSec = hs ? nowSec - hs.startT : 0;
    const qualifies = hs && holdSec >= HOLD_SECONDS;
    rows.push({
      wallet: c.owner, balance: c.balance,
      holdStart: hs ? hs.startT : null,
      holdSeconds: holdSec, evidenceSig: hs ? hs.sig : null,
      qualifies,
    });
    if (PRINT)
      console.log(`[${n}/${cands.length}] ${c.owner} bal=${c.balance} held=${Math.floor(holdSec / 60)}m${holdSec % 60}s ${qualifies ? "QUALIFIES" : "no"}`);
  }

  const winDir = path.join(config.root, "output", "winners");
  fs.mkdirSync(winDir, { recursive: true });
  const winnersPath = path.join(winDir, "winners.json");
  const receiptPath = path.join(winDir, "airdrop-receipts.json");
  const receipts = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, "utf8")) : [];
  const frozen = new Map();
  const paidWallets = new Set();
  for (const r of receipts) {
    frozen.set(r.rank, { rank: r.rank, wallet: r.to, paid: true, paidSig: r.sig, paidAt: r.at });
    paidWallets.add(r.to);
  }

  const liveQualifiers = rows
    .filter((r) => r.qualifies && !paidWallets.has(r.wallet))
    .sort((a, b) => a.holdStart - b.holdStart || a.wallet.localeCompare(b.wallet));

  const qualified = [];
  let qi = 0;
  for (let rank = 1; rank <= WINNERS; rank++) {
    if (frozen.has(rank)) { qualified.push(frozen.get(rank)); continue; }
    if (qi >= liveQualifiers.length) break;
    const r = liveQualifiers[qi++];
    qualified.push({
      rank, wallet: r.wallet, balance: r.balance,
      qualifiedAt: new Date((r.holdStart + HOLD_SECONDS) * 1000).toISOString(),
      holdStartAt: new Date(r.holdStart * 1000).toISOString(),
      holdSeconds: r.holdSeconds, evidenceSig: r.evidenceSig,
    });
  }
  fs.writeFileSync(
    winnersPath,
    JSON.stringify({ mint: MINT, method: "onchain-history", count: qualified.length, winners: qualified }, null, 2)
  );

  const proofDir = path.join(config.root, "output", "proofs");
  fs.mkdirSync(proofDir, { recursive: true });
  const lines = [];
  lines.push("# History Qualification Proof");
  lines.push("");
  lines.push(`Mint: ${MINT}`);
  lines.push(`Threshold: ${THRESHOLD} tokens (UI amount)`);
  lines.push(`Hold duration: ${HOLD_SECONDS} seconds`);
  lines.push(`Computed at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Wallets at or above threshold now: ${rows.length}`);
  lines.push(`Wallets qualifying (held over ${HOLD_SECONDS}s): ${qualified.length}`);
  lines.push("");
  lines.push("| Rank | Wallet | Balance | Hold start (UTC) | Held | Evidence tx |");
  lines.push("|---|---|---|---|---|---|");
  for (const q of qualified) {
    lines.push(`| ${q.rank} | ${q.wallet} | ${q.balance ?? ""} | ${q.holdStartAt || ""} | ${q.holdSeconds != null ? Math.floor(q.holdSeconds / 60) + "m" + (q.holdSeconds % 60) + "s" : "(paid)"} | ${q.evidenceSig || q.paidSig || ""} |`);
  }
  fs.writeFileSync(path.join(proofDir, "HISTORY-QUALIFICATION.md"), lines.join("\n"));

  console.log(`\nQualified now: ${qualified.length}/${WINNERS}`);
  for (const q of qualified.slice(0, 10))
    console.log(`  #${q.rank} ${q.wallet} ${q.holdSeconds != null ? "held " + Math.floor(q.holdSeconds / 60) + "m" : "(paid)"} bal ${q.balance ?? ""}`);
  if (qualified.length > 10) console.log(`  ... ${qualified.length} total`);
  console.log(`\nwinners.json written: ${winnersPath}`);
  console.log(`proof: output/proofs/HISTORY-QUALIFICATION.md`);
}
main().catch((e) => { console.error(e); process.exit(1); });
