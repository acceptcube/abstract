// Creates the Metaplex Core collection and pre mints all 100 assets to the
// DEPLOYER wallet, using the pinned metadata URIs from uri-map.json.
// Resume safe: state in output/metadata/mint-state.json.

import fs from "node:fs";
import path from "node:path";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, generateSigner, publicKey } from "@metaplex-foundation/umi";
import { mplCore, createCollection, create, fetchCollection } from "@metaplex-foundation/mpl-core";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";
import { loadDeployerSecret } from "../src/lib/wallet.js";
import { royaltyPlugin } from "../src/lib/royalty.js";

const pad = (n) => String(n).padStart(3, "0");
const mapPath = path.join(config.dirs.metadata, "uri-map.json");
const statePath = path.join(config.dirs.metadata, "mint-state.json");

if (!fs.existsSync(mapPath)) {
  console.error("uri-map.json missing, run ipfs step first.");
  process.exit(1);
}
const uriMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : { network: config.solana.network, collection: null, assets: {} };
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

const umi = createUmi(config.solana.rpcUrl()).use(mplCore());
const secret = loadDeployerSecret();
const deployer = umi.eddsa.createKeypairFromSecretKey(secret);
umi.use(keypairIdentity(deployer));
console.log(`Network: ${config.solana.network}`);
console.log(`Deployer: ${deployer.publicKey}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, label) {
  for (let a = 1; a <= 5; a++) {
    try { return await fn(); } catch (e) {
      console.warn(`  ${label} attempt ${a}/5: ${e.message}`);
      if (a === 5) throw e;
      await sleep(2500 * a);
    }
  }
}

async function main() {
  if (!state.collection) {
    if (!uriMap.collection?.metadataUri)
      throw new Error("collection metadataUri missing in uri-map.json");
    const collectionSigner = generateSigner(umi);
    await withRetry(
      () =>
        createCollection(umi, {
          collection: collectionSigner,
          name: config.project.name,
          uri: uriMap.collection.metadataUri,
          plugins: [royaltyPlugin(deployer.publicKey)],
        }).sendAndConfirm(umi),
      "createCollection"
    );
    state.collection = collectionSigner.publicKey.toString();
    save();
    console.log(`Collection: ${state.collection}`);
  } else {
    console.log(`Collection (existing): ${state.collection}`);
  }

  let collectionAccount;
  for (let i = 0; i < 20; i++) {
    try {
      collectionAccount = await fetchCollection(umi, publicKey(state.collection));
      break;
    } catch (e) {
      if (i === 19) throw e;
      await sleep(2000);
    }
  }

  let minted = 0;
  for (const p of PROMPTS) {
    const id = pad(p.id);
    if (state.assets[id]?.address) continue;
    const item = uriMap.items[id];
    if (!item?.metadataUri) {
      console.error(`  [${id}] no metadataUri, pin to IPFS first`);
      process.exitCode = 1;
      continue;
    }
    const assetSigner = generateSigner(umi);
    const sig = await withRetry(
      () =>
        create(umi, {
          asset: assetSigner,
          collection: collectionAccount,
          name: `${config.project.name} #${id} · ${p.title}`,
          uri: item.metadataUri,
          owner: deployer.publicKey,
        }).sendAndConfirm(umi),
      `mint #${id}`
    );
    state.assets[id] = {
      address: assetSigner.publicKey.toString(),
      sig: Buffer.from(sig.signature).toString("base64"),
    };
    save();
    minted++;
    console.log(`  [${id}] asset ${state.assets[id].address}`);
  }

  const total = Object.keys(state.assets).length;
  console.log(`\nMinted this run: ${minted}. Total assets: ${total}/100.`);
  console.log(`State: ${statePath}`);
  if (total !== 100) process.exitCode = 1;
}
main().catch((e) => { console.error(e); process.exit(1); });
