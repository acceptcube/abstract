// Rewrites every Core asset uri (and the collection uri) to the fast https
// metadata on our own host so Solscan, wallets and every explorer render the
// art, not only marketplaces that proxy IPFS. Also normalises each on chain
// name to the canonical middle dot form so nothing on chain carries a dash.
//
// Signed by the deployer (the collection update authority). Resume safe and
// idempotent.

import fs from "node:fs";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import {
  mplCore, fetchCollection, fetchAsset, update, updateCollection,
} from "@metaplex-foundation/mpl-core";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";
import { loadDeployerSecret } from "../src/lib/wallet.js";

const HOST = `https://${config.site.domain}`;
const pad = (n) => String(n).padStart(3, "0");
const nameFor = (p) => `${config.project.name} #${pad(p.id)} · ${p.title}`;
const metaUri = (id) => `${HOST}/meta/${id}.json`;

const mintState = JSON.parse(
  fs.readFileSync(path.join(config.dirs.metadata, "mint-state.json"), "utf8")
);
const statePath = path.join(config.dirs.metadata, "uri-update-state.json");
const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : { collection: null, done: {} };
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

const umi = createUmi(config.solana.rpcUrl()).use(mplCore());
const deployer = umi.eddsa.createKeypairFromSecretKey(loadDeployerSecret());
umi.use(keypairIdentity(deployer));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, label) {
  for (let a = 1; a <= 5; a++) {
    try { return await fn(); } catch (e) {
      console.warn(`  ${label} attempt ${a}/5: ${e.message}`);
      if (a === 5) throw e;
      await sleep(2000 * a);
    }
  }
}

async function main() {
  const collectionAccount = await withRetry(
    () => fetchCollection(umi, publicKey(mintState.collection)),
    "fetchCollection"
  );
  const wantCollUri = `${HOST}/meta/collection.json`;
  if (state.collection !== "done") {
    if (collectionAccount.uri !== wantCollUri || collectionAccount.name !== config.project.name) {
      const sig = await withRetry(
        () =>
          updateCollection(umi, {
            collection: collectionAccount.publicKey,
            name: config.project.name,
            uri: wantCollUri,
          }).sendAndConfirm(umi),
        "updateCollection"
      );
      console.log(`collection -> ${wantCollUri} sig=${Buffer.from(sig.signature).toString("base64").slice(0, 16)}`);
    }
    state.collection = "done";
    save();
  } else {
    console.log("collection already updated");
  }

  for (const p of PROMPTS) {
    const id = pad(p.id);
    if (state.done[id] === "done" || state.done[id] === "already") continue;
    const addr = mintState.assets[id]?.address;
    if (!addr) {
      console.error(`  [${id}] not minted yet`);
      process.exitCode = 1;
      continue;
    }
    const a = await withRetry(() => fetchAsset(umi, publicKey(addr)), `fetchAsset ${id}`);
    const wantUri = metaUri(id);
    const wantName = nameFor(p);
    if (a.uri === wantUri && a.name === wantName) {
      state.done[id] = "already";
      save();
      console.log(`  [${id}] already correct`);
      continue;
    }
    const sig = await withRetry(
      () => update(umi, { asset: a, collection: collectionAccount, name: wantName, uri: wantUri }).sendAndConfirm(umi),
      `update #${id}`
    );
    state.done[id] = Buffer.from(sig.signature).toString("base64");
    save();
    console.log(`  [${id}] -> ${wantUri}`);
  }

  const done = Object.values(state.done).filter(Boolean).length;
  console.log(`\nUpdated ${done}/100 asset URIs.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
