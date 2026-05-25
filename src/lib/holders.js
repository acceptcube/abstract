// Fetches the current token holder map for a mint via Helius RPC.
// Returns Map<ownerPubkey, uiAmountNumber> for eligible (on curve, non excluded)
// wallets only. PDA owned accounts (pump.fun bonding curve, Raydium/AMM LP
// vaults, program escrows) are off curve and excluded.
//
// Token program is resolved from the mint account owner, so this works for
// both legacy SPL Token and Token 2022 mints (pump.fun launches Token 2022).

import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config.js";

const LEGACY_TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

let _conn;
export function conn() {
  if (!_conn) _conn = new Connection(config.solana.rpcUrl(), "confirmed");
  return _conn;
}

let _prog = null;
async function tokenProgramFor(mint) {
  if (_prog) return _prog;
  const info = await conn().getAccountInfo(new PublicKey(mint));
  const owner = info?.owner?.toBase58();
  if (owner !== LEGACY_TOKEN && owner !== TOKEN_2022)
    throw new Error(`mint not owned by a known token program (owner ${owner})`);
  _prog = new PublicKey(owner);
  return _prog;
}

let _decimals = null;
export async function getDecimals(mint) {
  if (_decimals != null) return _decimals;
  const info = await conn().getParsedAccountInfo(new PublicKey(mint));
  _decimals = info.value?.data?.parsed?.info?.decimals;
  if (_decimals == null) throw new Error("Could not read mint decimals");
  return _decimals;
}

export async function getHolderMap(mint, extraExcluded = new Set()) {
  const decimals = await getDecimals(mint);
  const program = await tokenProgramFor(mint);
  let accounts = [];
  for (let a = 1; a <= 4; a++) {
    accounts = await conn().getParsedProgramAccounts(program, {
      filters: [{ memcmp: { offset: 0, bytes: mint } }],
    });
    if (accounts.length > 0) break;
    if (a < 4) await new Promise((r) => setTimeout(r, 1500 * a));
  }

  const balances = new Map();
  for (const { account } of accounts) {
    const info = account.data?.parsed?.info;
    if (!info || info.mint !== mint) continue;
    const owner = info.owner;
    const ui = info.tokenAmount?.uiAmount || 0;
    if (ui <= 0) continue;
    let pk;
    try {
      pk = new PublicKey(owner);
    } catch {
      continue;
    }
    if (!PublicKey.isOnCurve(pk.toBytes())) continue;
    if (extraExcluded.has(owner)) continue;
    balances.set(owner, (balances.get(owner) || 0) + ui);
  }
  return { balances, decimals };
}
