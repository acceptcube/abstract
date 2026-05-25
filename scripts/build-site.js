// Generates site/data.json for the static gallery from the single sources of
// truth: src/prompts.js (+ uri-map.json, winners.json, airdrop-receipts.json,
// onchain-owners.json when present). Also copies generated images into
// site/images as a fallback so the gallery renders even before IPFS pinning.

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";

const pad = (n) => String(n).padStart(3, "0");
const siteDir = path.join(config.root, "site");
const siteImg = path.join(siteDir, "images");
fs.mkdirSync(siteImg, { recursive: true });

const read = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);
const uriMap = read(path.join(config.dirs.metadata, "uri-map.json")) || { items: {} };
const winnersDoc = read(path.join(config.root, "output", "winners", "winners.json"));
const mintState = read(path.join(config.dirs.metadata, "mint-state.json")) || { assets: {} };
const receipts = read(path.join(config.root, "output", "winners", "airdrop-receipts.json")) || [];
const onchain = read(path.join(config.root, "output", "winners", "onchain-owners.json"));

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const toB58 = (b64) => {
  const bytes = Buffer.from(b64, "base64");
  const d = [0];
  for (const x of bytes) {
    let c = x;
    for (let j = 0; j < d.length; j++) { c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0; }
    while (c) { d.push(c % 58); c = (c / 58) | 0; }
  }
  let s = "";
  for (const x of bytes) { if (x === 0) s += "1"; else break; }
  for (let j = d.length - 1; j >= 0; j--) s += B58[d[j]];
  return s;
};

const DEPLOYER = process.env.DEPLOYER_PUBKEY || "";
const winnerByRank = {};
for (const w of winnersDoc?.winners || []) winnerByRank[w.rank] = w.wallet;
const recipientByRank = {};
const sigByRank = {};
for (const r of receipts) {
  recipientByRank[r.rank] = r.to;
  sigByRank[r.rank] = r.sig ? toB58(r.sig) : null;
}
const holderOf = (rank) => {
  if (onchain && onchain.byRank) {
    const o = onchain.byRank[rank];
    return o && o !== DEPLOYER ? o : null;
  }
  return winnerByRank[rank] || null;
};

const GW = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";

const items = PROMPTS.map((p) => {
  const id = pad(p.id);
  const cid = uriMap.items[id]?.imageCid;
  const srcImg = path.join(config.dirs.images, `${id}.png`);
  const localExists = fs.existsSync(srcImg);
  if (localExists) fs.copyFileSync(srcImg, path.join(siteImg, `${id}.png`));
  const holder = holderOf(p.id);
  return {
    id: p.id,
    name: p.title,
    title: p.title,
    form: p.form,
    palette: p.palette,
    composition: p.composition,
    tempo: p.tempo,
    mood: p.mood,
    story: p.story,
    image: cid ? `${GW}/${cid}` : localExists ? `images/${id}.png` : null,
    asset: mintState.assets[id]?.address || null,
    owner: holder,
    tx: holder && recipientByRank[p.id] === holder ? sigByRank[p.id] : null,
  };
});

// Live qualifiers: wallets currently above the threshold with a running clock,
// sourced from the forward monitor's timer map. Empty until the monitor runs.
const monitor = read(path.join(config.root, "output", "winners", "monitor-state.json"));
const nowMs = Date.now();
const qualifiers = monitor && monitor.timers
  ? Object.entries(monitor.timers)
      .filter(([, t]) => t && t.since != null)
      .map(([wallet, t]) => ({
        wallet,
        sinceMs: t.since,
        msHeld: Math.max(0, nowMs - t.since),
      }))
      .filter((q) => !winnerByRank || !Object.values(winnerByRank).includes(q.wallet))
      .sort((a, b) => a.sinceMs - b.sinceMs)
      .slice(0, 20)
  : [];

// Recent airdrops: last 10 receipts, reverse chronological.
const recentAirdrops = receipts
  .slice()
  .reverse()
  .slice(0, 10)
  .map((r) => ({
    rank: r.rank,
    to: r.to,
    tx: r.sig ? toB58(r.sig) : null,
    at: r.at,
  }));

const data = {
  project: {
    name: config.project.name,
    ticker: config.project.ticker,
    artist: config.project.artist,
    ca: process.env.LAUNCH_LIVE === "1" && config.token.mint ? config.token.mint : "TBA",
    x: config.site.xHandle || "",
    domain: config.site.domain || "",
    collection: mintState.collection || null,
    magiceden: mintState.collection
      ? "https://magiceden.io/collections/solana/" + mintState.collection : "",
    tensor: mintState.collection
      ? "https://www.tensor.trade/trade/" + mintState.collection : "",
  },
  story:
    "I am Halden Voss. These one hundred paintings depict nothing. They are " +
    "the only kind of painting I will defend: form that does not pretend to " +
    "be the thing it is not. Look as long as you can bear to. The painting " +
    "is the painting. Nothing is hiding behind it.",
  mechanic:
    "One hundred works. Hold 5,000,000 $ART continuously for 15 minutes after " +
    "the coin migrates. The first 100 wallets to qualify each receive exactly " +
    "one piece, airdropped in qualification order. After all 100 are minted " +
    "out, holders share the fees: pump.fun creator fees and the 5% NFT " +
    "royalty from secondary sales, distributed pro rata across the 100 " +
    "holders.",
  footer:
    "abstract by Halden Voss. One hundred paintings of nothing. The painting " +
    "is the painting. 2026",
  count: items.length,
  painted: items.filter((i) => i.image).length,
  airdropped: items.filter((i) => i.owner).length,
  liveMode: process.env.LAUNCH_LIVE === "1" && !!config.token.mint,
  qualifiers,
  recentAirdrops,
  items,
};

const json = JSON.stringify(data, null, 2);
// Typographic dashes only: hyphen-minus is allowed for technical content
// (ISO timestamps, base58 with no dashes anyway, product names).
if (/[‐‑‒–—―−]/.test(json)) {
  throw new Error("data.json contains a typographic dash; house style forbids em/en/figure/minus dashes in copy");
}
fs.writeFileSync(path.join(siteDir, "data.json"), json);
console.log(
  `Wrote site/data.json (${items.length} items, ${data.airdropped} airdropped, ${data.painted} painted)`
);
