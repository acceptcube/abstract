#!/usr/bin/env bash
# Lightweight refresh: rebuild site/data.json from the live state files
# (monitor-state.json, airdrop-receipts.json, onchain-owners.json) and ship
# ONLY data.json to the VPS. Designed to run on a 60 second loop so the live
# tracking panels stay current without the cost of a full site tar+reload.

set -euo pipefail
cd "$(dirname "$0")/.."

VPS="${VPS:-root@64.227.102.65}"
KEY="${KEY:-$HOME/.ssh/id_ed25519}"
DEST="/var/www/abstract/data.json"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"

node scripts/build-site.js > /dev/null
$SSH "$VPS" "cat > $DEST.tmp && mv $DEST.tmp $DEST" < site/data.json
echo "[$(date -u +%FT%TZ)] data.json refreshed"
