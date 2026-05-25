// Pins all 100 images + collection image to IPFS via Pinata, rewrites every
// metadata file's image/files URIs to the real CIDs, pins the metadata JSON,
// and writes output/metadata/uri-map.json (id -> {imageCid, metadataUri}).
// Resume safe: anything already in uri-map.json is skipped.

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";

const JWT = process.env.PINATA_JWT;
if (!JWT) {
  console.error("PINATA_JWT not set in .env");
  process.exit(1);
}
const pad = (n) => String(n).padStart(3, "0");
const mapPath = path.join(config.dirs.metadata, "uri-map.json");
const map = fs.existsSync(mapPath)
  ? JSON.parse(fs.readFileSync(mapPath, "utf8"))
  : { items: {}, collection: null };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pinFile(filePath, name) {
  const data = fs.readFileSync(filePath);
  const fd = new FormData();
  fd.append("file", new Blob([data]), name);
  fd.append("pinataMetadata", JSON.stringify({ name }));
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`pinFile ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()).IpfsHash;
}

async function pinJSON(obj, name) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name } }),
  });
  if (!res.ok) throw new Error(`pinJSON ${name}: ${res.status} ${await res.text()}`);
  return (await res.json()).IpfsHash;
}

async function withRetry(fn, label) {
  for (let a = 1; a <= 4; a++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`  ${label} attempt ${a}/4: ${e.message}`);
      if (a === 4) throw e;
      await sleep(2000 * a);
    }
  }
}

async function main() {
  const collImg = path.join(config.dirs.images, "collection.png");
  if (fs.existsSync(collImg) && !map.collection) {
    const cid = await withRetry(() => pinFile(collImg, "collection.png"), "collection.png");
    const collMeta = JSON.parse(
      fs.readFileSync(path.join(config.dirs.metadata, "collection.json"), "utf8")
    );
    collMeta.image = `ipfs://${cid}`;
    if (config.site.domain) collMeta.external_url = `https://${config.site.domain}`;
    const mCid = await withRetry(() => pinJSON(collMeta, "collection.json"), "collection.json");
    map.collection = { imageCid: cid, metadataUri: `ipfs://${mCid}` };
    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log(`collection: img=${cid} meta=${mCid}`);
  }

  for (const p of PROMPTS) {
    const id = pad(p.id);
    if (map.items[id]?.metadataUri) {
      console.log(`  [${id}] already pinned, skip`);
      continue;
    }
    const imgPath = path.join(config.dirs.images, `${id}.png`);
    if (!fs.existsSync(imgPath)) {
      console.error(`  [${id}] image missing, generate art first`);
      process.exitCode = 1;
      continue;
    }
    const imgCid = await withRetry(() => pinFile(imgPath, `${id}.png`), `${id}.png`);
    const metaFile = path.join(config.dirs.metadata, `${id}.json`);
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    meta.image = `ipfs://${imgCid}`;
    meta.properties.files = [{ uri: `ipfs://${imgCid}`, type: "image/png" }];
    if (config.site.domain) meta.external_url = `https://${config.site.domain}`;
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    const metaCid = await withRetry(() => pinJSON(meta, `${id}.json`), `${id}.json`);
    map.items[id] = { imageCid: imgCid, metadataUri: `ipfs://${metaCid}` };
    fs.writeFileSync(mapPath, JSON.stringify(map, null, 2));
    console.log(`  [${id}] img=${imgCid} meta=${metaCid}`);
  }

  const done = Object.keys(map.items).length;
  console.log(`\nPinned ${done}/100 items. Map: ${mapPath}`);
  if (done !== 100) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
