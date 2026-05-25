// Builds one Metaplex Core / Token Metadata compatible JSON file per piece,
// with attributes derived from the SAME structured definition (src/prompts.js)
// used to generate the image. Image URI is the canonical https host so every
// wallet and explorer renders the painting.
//
// Provenance: each file embeds the exact prompt, seed and model so anyone can
// audit that the metadata correlates with how the art was made.

import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { PROMPTS } from "../src/prompts.js";
import { loadDeployerKeypair } from "../src/lib/wallet.js";

fs.mkdirSync(config.dirs.metadata, { recursive: true });
const pad = (n) => String(n).padStart(3, "0");

const COLLECTION_NAME = config.project.name; // "abstract"
const SYMBOL = config.project.symbol;        // "ART"
const ARTIST = config.project.artist;        // "Halden Voss"
const HOST = `https://${config.site.domain}`;
const imgUrl = (id) => `${HOST}/images/${id}.png`;
const ROYALTY_BPS = 500;

// Prefer DEPLOYER_PUBKEY (no secret required) so off chain steps like this
// one can build correct metadata before the signing key is loaded. Fall back
// to deriving from the keypair when present.
let CREATOR = process.env.DEPLOYER_PUBKEY || null;
if (!CREATOR) {
  try {
    CREATOR = loadDeployerKeypair().publicKey.toBase58();
  } catch {
    /* the on chain plugin remains source of truth at mint */
  }
}

const MANIFESTO =
  "I am Halden Voss. These one hundred paintings depict nothing. They are " +
  "the only kind of painting I will defend: form that does not pretend to " +
  "be the thing it is not. Look as long as you can bear to. The painting " +
  "is the painting. Nothing is hiding behind it.";

for (const p of PROMPTS) {
  const meta = {
    name: `${COLLECTION_NAME} #${pad(p.id)} · ${p.title}`,
    symbol: SYMBOL,
    description: p.story,
    image: imgUrl(pad(p.id)),
    external_url: HOST,
    attributes: [
      { trait_type: "Artist", value: ARTIST },
      { trait_type: "Title", value: p.title },
      { trait_type: "Form", value: p.form },
      { trait_type: "Composition", value: p.composition },
      { trait_type: "Tempo", value: p.tempo },
      { trait_type: "Mood", value: p.mood },
      { trait_type: "Palette", value: p.palette },
      { trait_type: "Edition", value: `${p.id} / 100` },
    ],
    seller_fee_basis_points: ROYALTY_BPS,
    properties: {
      category: "image",
      files: [{ uri: imgUrl(pad(p.id)), type: "image/png" }],
      creators: CREATOR ? [{ address: CREATOR, share: 100 }] : [],
      provenance: {
        artist: ARTIST,
        model: config.openrouter.model,
        seed: p.seed,
        prompt: p.prompt,
      },
    },
  };
  fs.writeFileSync(
    path.join(config.dirs.metadata, `${pad(p.id)}.json`),
    JSON.stringify(meta, null, 2)
  );
}

const collection = {
  name: COLLECTION_NAME,
  symbol: SYMBOL,
  description: MANIFESTO,
  image: `${HOST}/images/collection.png`,
  external_url: HOST,
  properties: { category: "image", artist: ARTIST },
};
fs.writeFileSync(
  path.join(config.dirs.metadata, "collection.json"),
  JSON.stringify(collection, null, 2)
);

console.log(
  `Wrote ${PROMPTS.length} metadata files + collection.json to ${config.dirs.metadata}`
);
