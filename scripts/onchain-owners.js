// Resolves the CURRENT on chain holder of every minted asset, so the gallery
// shows who actually possesses each piece (including any secondary transfers
// after the airdrop). Reads owner straight from the mpl-core AssetV1 account
// state via one getMultipleAccounts call. Read only.

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";

const ms = JSON.parse(
  fs.readFileSync(path.join(config.dirs.metadata, "mint-state.json"), "utf8")
);
const pad = (n) => String(n).padStart(3, "0");
const ranks = Object.keys(ms.assets).map(Number).sort((a, b) => a - b);
const ids = ranks.map((r) => ms.assets[pad(r)].address);

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const b58 = (buf) => {
  const d = [0];
  for (const x of buf) {
    let c = x;
    for (let j = 0; j < d.length; j++) {
      c += d[j] << 8; d[j] = c % 58; c = (c / 58) | 0;
    }
    while (c) { d.push(c % 58); c = (c / 58) | 0; }
  }
  let s = "";
  for (const x of buf) { if (x === 0) s += "1"; else break; }
  for (let j = d.length - 1; j >= 0; j--) s += B58[d[j]];
  return s;
};

const RPC = config.solana.rpcUrl();
async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return r.json();
}

async function main() {
  const byRank = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    let res;
    for (let a = 1; a <= 6; a++) {
      res = await rpc("getMultipleAccounts", [chunk, { encoding: "base64" }]);
      if (res && res.result) break;
      await new Promise((z) => setTimeout(z, 1500 * a));
    }
    if (!res || !res.result) throw new Error("getMultipleAccounts failed");
    res.result.value.forEach((acc, k) => {
      const rank = ranks[i + k];
      if (!acc || !acc.data) return;
      const buf = Buffer.from(acc.data[0], "base64");
      if (buf[0] !== 1) return;
      byRank[rank] = b58(buf.subarray(1, 33));
    });
  }
  const out = {
    generatedAt: new Date().toISOString(),
    rpc: "mainnet",
    count: Object.keys(byRank).length,
    byRank,
  };
  const dest = path.join(config.root, "output", "winners", "onchain-owners.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`Wrote ${dest} (${out.count} assets resolved)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
