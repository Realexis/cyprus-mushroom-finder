#!/usr/bin/env bash
# Build the PUBLIC site and publish it to the gh-pages branch (GitHub Pages).
# The branch is replaced each time (one commit, no history bloat).
# Since 2026-11-12 the 250 m squares are public (user decision). Anything named
# "private" (future finds log, village notes) must never be part of web/dist.
set -euo pipefail
cd "$(dirname "$0")/../web"
npm run build
# Last safety net: refuse to publish anything private.
if find dist -iname "*private*" -o -iname "*finds*" | grep -q .; then
  echo "✗ private files found in dist — refusing to deploy"; exit 1
fi
REMOTE=${DEPLOY_REMOTE:-$(git -C .. remote get-url origin)}
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD/.." config user.name || echo deploy)" \
    -c user.email="$(git -C "$OLDPWD/.." config user.email || echo deploy@localhost)" \
    commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -q -f "$REMOTE" gh-pages
rm -rf "$TMP"
echo "✓ deployed to gh-pages"
