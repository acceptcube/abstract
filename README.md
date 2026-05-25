# abstract

One hundred non representational paintings by **Halden Voss**, held by holders of **$ART**.

**Site:** https://abstractart.guru
**Contract ($ART):** `ec2f6zt91Zk9swmxTxjDaCzaiqZQyqR8mkFA3hRpump`

## What this is

abstract is four things at once:

1. **An on chain art collection.** One hundred non representational paintings by Halden Voss, minted as a Metaplex Core collection on Solana.
2. **A holder reward system.** Hold 5,000,000 $ART continuously for 15 minutes after the coin migrates and the first 100 wallets to do so each receive one painting. After all 100 are minted out, the 100 holders share $ART creator fees and the 5% NFT royalty pro rata, on chain, by an idempotent distributor.
3. **A commentary on perceived value.** The mechanic uses art as an example of intrinsic value while observing human nature through hold time and perceived value. The painting that someone refuses to let go of is the painting that has been correctly priced, even when the price has not yet caught up.
4. **An open source platform.** Any art collection can fork this stack to reward its holders directly from coin fees and royalties, without an intermediary. The full tech, including the monitor, history aware re qualifier, idempotent airdrop, on chain ownership tracker, and pro rata fee distributor, ships in this repository.

## The thesis

The only honest painting is the painting that depicts nothing. One hundred works survey the full range of abstract instinct: color field, hard edge, grid, gesture, drip, op, lyrical, line, dark and light, where each is unique in form, palette, composition, tempo and mood. Halden Voss is the artist. The work answers to no one.

## The mechanic

1. Hold **5,000,000 $ART** in one wallet.
2. Keep it there **15 minutes, unbroken**, after the coin migrates. Selling below the line resets the clock.
3. The **first 100 wallets** to hold the line each receive **one painting** from the collection.
4. NFT **N** goes to the **Nth** wallet to qualify, sent from the artist wallet. One per holder.
5. After all 100 are minted out, the **holders share the fees**: pump.fun creator fees from $ART and the **5% NFT royalty** from secondary sales, distributed pro rata across the 100 holders by an idempotent on chain distributor.

## Launch runbook

Phase 0 (already scaffolded here)
- Project scaffold, scripts, prompts, site identity, deploy templates.

Phase 1 (artist + on chain identity)
- Generate the 100 images: `npm run generate:all`
- Build metadata: `npm run metadata`
- Pin to IPFS via Pinata: `npm run ipfs`
- Mint mpl-core collection + 100 assets to deployer: `npm run mint`
- Repoint on chain URIs to the canonical https host: `npm run update:uris`

Phase 2 (coin launch)
- User creates the $ART coin on pump.fun and pastes the CA into `.env` as `TOKEN_MINT`.
- After migration to Raydium, start tracking: `npm run monitor` (forward), or rely on the history aware re qualifier below.

Phase 3 (eligibility and airdrop)
- Re derive eligibility from chain at any time: `npm run qualify:history`
- Preview the airdrop: `npm run airdrop:dry`
- Execute (idempotent, retries, signed receipts): `npm run airdrop`
- Verify on chain owners: `npm run owners`
- Rebuild + deploy the gallery showing real holders: `npm run site` + `bash deploy/deploy.sh`

Phase 4 (post mintout, holder revenue)
- `npm run distribute` reads the live on chain holders of all 100 assets, takes the deployer wallet balance (minus an operational reserve), divides by 100, and pays each holder their share. Idempotent. Logs receipts.

## Files

- Default placeholder domain is `haldenvoss.art` (no hyphen, so the dashless house style check on `data.json` passes). Swap to your actual domain in `.env` when you have one.
- `src/prompts.js` is the single source of truth for every piece: title, form family, palette, composition, tempo, mood, seed and image prompt. Metadata, image and on chain identity all derive from it.
- `src/lib/royalty.js` declares the 5% Royalties plugin used at mint and asserted by the proofs.
- `scripts/airdrop.js` is fully idempotent: re running only sends what is missing, every send is receipted with the transaction signature.

