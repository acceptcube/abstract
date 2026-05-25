// Single source of truth for the secondary market royalty. Imported by mint
// (applied on chain) and by the proofs (asserted + read back on chain), so what
// is proven is exactly what ships.

import { ruleSet } from "@metaplex-foundation/mpl-core";

export const ROYALTY_BASIS_POINTS = 500; // 5.00% on every secondary sale

// Core Royalties plugin. ruleSet "None" = not a transfer deny list, so the
// asset stays freely tradeable on Magic Eden, Tensor and OpenSea while the
// 5% is declared on chain and honored by royalty respecting marketplaces.
// After mintout the royalty stream flows to the deployer wallet, which the
// distributor then pays out pro rata to the 100 NFT holders.
export const royaltyPlugin = (creatorPublicKey) => ({
  type: "Royalties",
  basisPoints: ROYALTY_BASIS_POINTS,
  creators: [{ address: creatorPublicKey, percentage: 100 }],
  ruleSet: ruleSet("None"),
});
