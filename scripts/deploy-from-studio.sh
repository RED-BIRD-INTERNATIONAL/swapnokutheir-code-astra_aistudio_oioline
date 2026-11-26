#!/bin/bash
# Red Bird International - one-shot deploy prep for Firebase Studio terminal
set -e
W=$(pwd)
[ -f "$W/package.json" ] || { echo "Terminal is not in the project folder."; exit 1; }
cp "$W/.env" /tmp/env.bak 2>/dev/null || true
echo "1/4 - downloading final build..."
curl -L -o /tmp/rb.zip "c6300fdd6_redbird-international-FINAL.zip"
mkdir -p /tmp/rbx && unzip -qo /tmp/rb.zip -d /tmp/rbx
echo "2/4 - replacing files (keeping .env and apphosting.yaml)..."
cd /tmp/rbx/redbird-v7
rsync -a --exclude node_modules --exclude .git --exclude .env --exclude apphosting.yaml --exclude server.log ./ "$W"/
echo "3/4 - installing dependencies..."
cd "$W" && npm install --legacy-peer-deps 2>&1 | tail -1
echo "4/4 - building..."
npm run build 2>&1 | tail -2
echo ""
echo "READY! Now click the blue DEPLOY button."
