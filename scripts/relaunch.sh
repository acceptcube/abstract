#!/usr/bin/env bash
# Relaunch flow: same deployer, new $ART contract address.
#
# Carries over (intentional): deployer keypair, the on chain Core collection,
# every minted asset, on chain URIs pointing at abstractart.guru, the live
# site, the github repo, and the audit proofs. Most importantly,
# airdrop-state.json + airdrop-receipts.json are preserved so the rank counter
# never resets; previously paid ranks stay paid, new qualifiers fill the next
# unspent NFT id.
#
# Resets: TOKEN_MINT, the live monitor's in-progress timers, the live
# qualifier panel, the cached holder map.
#
# Usage:
#   bash scripts/relaunch.sh <NEW_CONTRACT_ADDRESS>

set -euo pipefail

NEW_CA="${1:-}"
if [ -z "$NEW_CA" ]; then
  echo "usage: bash scripts/relaunch.sh <NEW_CONTRACT_ADDRESS>"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> stop monitor + refresh loop"
powershell.exe -NoProfile -Command "
\$mp = '*snapshot-' + 'monitor.js*';
\$rp = '*refresh-' + 'live*';
Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like \$mp -or \$_.CommandLine -like \$rp } | ForEach-Object { try { Stop-Process -Id \$_.ProcessId -Force -ErrorAction Stop } catch {} };
Start-Sleep -Seconds 3
" 2>/dev/null || true

echo "==> update .env TOKEN_MINT to $NEW_CA"
# In place rewrite, with backup so the prior value is recoverable.
sed -i.bak "s|^TOKEN_MINT=.*|TOKEN_MINT=$NEW_CA|" .env
grep "^TOKEN_MINT=" .env

echo "==> archive previous live state, seed fresh monitor-state from receipts"
mkdir -p output/winners/.pre-relaunch
STAMP=$(date +%s)
[ -f output/winners/monitor-state.json ] && mv output/winners/monitor-state.json output/winners/.pre-relaunch/monitor-state.$STAMP.json || true
[ -f output/winners/winners.json ] && mv output/winners/winners.json output/winners/.pre-relaunch/winners.$STAMP.json || true
node -e "
const fs = require('fs');
const rc = JSON.parse(fs.readFileSync('output/winners/airdrop-receipts.json','utf8'));
const seed = {
  started: false,
  startedAt: null,
  timers: {},
  // Seed the rank counter and the one per wallet set with already paid
  // recipients so the live monitor cannot re-issue an NFT and cannot give a
  // previously paid wallet a second piece.
  winners: rc.map(r => ({ rank: r.rank, wallet: r.to, balance: 0, qualifiedAt: r.at })),
  winnerSet: rc.map(r => r.to),
};
fs.writeFileSync('output/winners/monitor-state.json', JSON.stringify(seed, null, 2));
console.log('seeded monitor-state with ' + seed.winners.length + ' frozen paid winners');
console.log('rank counter resumes at ' + (seed.winners.length + 1));
"

echo "==> update README CA"
sed -i.bak "s|\\*\\*Contract (\\\$ART):\\*\\* \`[^\`]*\`|**Contract (\$ART):** \\\`$NEW_CA\\\`|" README.md
grep -E "Contract \\(\\\$ART\\)" README.md

echo "==> rebuild site + full redeploy"
node scripts/build-site.js
bash deploy/deploy.sh 2>&1 | tail -n 3

echo "==> restart monitor (polls new mint, errors gracefully until it exists)"
nohup bash -c "cd '$(pwd)' && node scripts/snapshot-monitor.js >> output/logs/monitor.log 2>&1; echo '[EXIT \$?]' >> output/logs/monitor.log" > /dev/null 2>&1 & disown
echo "monitor pid $!"

echo "==> restart refresh loop"
nohup bash -c "cd '$(pwd)' && while true; do bash scripts/refresh-live.sh >> output/logs/refresh-live.log 2>&1; sleep 60; done" > /dev/null 2>&1 & disown
echo "refresh loop pid $!"

sleep 5

echo ""
echo "==> verify"
node -e "
const { config } = require('./src/config.js');
const s = require('./output/winners/monitor-state.json');
console.log('TOKEN_MINT:', config.token.mint);
console.log('frozen paid winners in monitor:', (s.winners || []).length);
console.log('timers (should be 0):', Object.keys(s.timers || {}).length);
console.log('started (should be false):', s.started);
" 2>&1 || true
curl -s "https://abstractart.guru/data.json?_=$(date +%s)" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log('LIVE ca:',d.project.ca,'| airdropped:',d.airdropped+'/'+d.count,'| qualifiers:',d.qualifiers.length)})"

echo ""
echo "==> done. Same deployer, new mint. Rank counter resumes; ranks 1..2 stay paid."
