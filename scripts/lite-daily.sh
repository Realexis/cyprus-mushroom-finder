#!/usr/bin/env bash
# Shroomy Lite daily update, run by this Mac (launchd: ~/Library/LaunchAgents/local.shroomy.lite-daily.plist,
# made by scripts/lite-robot-setup.sh).
#
# It runs from the robot's OWN copy of the project, in
#   ~/Library/Application Support/shroomy-lite-robot/repo
# and never from the Desktop: macOS does not let a timed job read the Desktop folder
# ("Operation not permitted"), so a job pointing at the Desktop never started (14-26 Nov 2026).
#
# 0. Take the newest SAVED version of the `lite` branch from GitHub (never half-done edits).
# 1. Fetch today's weather and score the squares (the same engine as V5: pipeline/shroomy/daily.py).
# 2. Build the site.
# 3. Publish ONLY the lite/ folder of the preview site (repo cyprus-mushroom-finder-preview,
#    branch gh-pages). Other folders are never touched. Never a force-push.
#
# Runs at several times a day; once today's update is published, later runs stop at once
# (FORCE=1 publishes again anyway).
# If the weather source is down, nothing is published: the site keeps yesterday's data and shows
# "Data delayed" by itself, and the next run tries again.
# Log: ~/Library/Application Support/shroomy-lite-robot/run.log
set -euo pipefail
export PATH="$HOME/Library/pnpm/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/Library/Application Support/shroomy-lite-robot"
case "$REPO" in "$HOME_DIR"/*) ;; *) echo "Run the robot's own copy ($HOME_DIR/repo/scripts/lite-daily.sh), not $REPO"; exit 1 ;; esac
CLONE="$HOME_DIR/preview"
PREVIEW_URL=https://github.com/Realexis/cyprus-mushroom-finder-preview.git
TODAY=$(TZ=Asia/Nicosia date +%F)
mkdir -p "$HOME_DIR"

say() { echo "$(date '+%F %T') $*"; }
fail() {
  say "✗ $*"
  osascript -e "display notification \"$*\" with title \"Shroomy Lite update failed\"" >/dev/null 2>&1 || true
  exit 1
}

# One run at a time.
LOCK="$HOME_DIR/lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  # A lock older than 3 hours is left over from a crash.
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +180 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK"; else say "another run is busy"; exit 0; fi
fi
trap 'rm -rf "$LOCK"' EXIT

if [ -z "${FORCE:-}" ] && [ "$(cat "$HOME_DIR/last_ok" 2>/dev/null)" = "$TODAY" ]; then say "already published for $TODAY"; exit 0; fi
say "▶ Shroomy Lite daily update for $TODAY"

# 0. Newest saved code. If GitHub cannot be reached, carry on with the code already here.
WAS=$(git -C "$REPO" rev-parse HEAD)
if git -C "$REPO" fetch -q origin lite 2>/dev/null; then
  git -C "$REPO" merge -q --ff-only FETCH_HEAD || fail "the robot's copy has its own changes, cannot take the new code"
  # New code came in: start again so THIS run uses it (bash has already read the old script).
  if [ "$WAS" != "$(git -C "$REPO" rev-parse HEAD)" ] && [ -z "${LITE_RESTARTED:-}" ]; then
    say "new code, starting again with it"
    rm -rf "$LOCK"; trap - EXIT
    LITE_RESTARTED=1 exec /bin/bash "$0" "$@"
  fi
else
  say "could not reach GitHub for new code, using the code already here"
fi
say "code: $(git -C "$REPO" log -1 --format='%h %s')"
LOCKSUM=$(shasum "$REPO/web/package-lock.json" | cut -d' ' -f1)
if [ "$LOCKSUM" != "$(cat "$HOME_DIR/npm_ok" 2>/dev/null)" ] || [ ! -d "$REPO/web/node_modules" ]; then
  (cd "$REPO/web" && npm ci >"$HOME_DIR/npm.log" 2>&1) || fail "could not install the site's building tools"
  echo "$LOCKSUM" > "$HOME_DIR/npm_ok"
fi

# 1. Weather + scores -> web/public/data (today + 7 days, public files only).
(cd "$REPO/pipeline" && uv run python -m shroomy.daily --public) || fail "weather or scoring step failed"
RUN=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['weather_run'])" "$REPO/web/public/data/meta.json")
[ "$RUN" = "$TODAY" ] || fail "scores are for $RUN, not $TODAY"

# 2. Build (the robot's copy only ever holds saved code from GitHub).
(cd "$REPO/web" && VITE_PREVIEW_LABEL="Preview" npm run build >"$HOME_DIR/build.log" 2>&1) || { cat "$HOME_DIR/build.log"; fail "site build failed"; }
DIST="$REPO/web/dist"
if find "$DIST" -iname "*private*" -o -iname "*finds*" | grep -q .; then fail "private files in the build, not publishing"; fi

# 3. Publish lite/ only.
if [ ! -d "$CLONE/.git" ]; then
  rm -rf "$CLONE"
  git clone -q --filter=blob:none --no-checkout --sparse --branch gh-pages "$PREVIEW_URL" "$CLONE"
  git -C "$CLONE" sparse-checkout set lite
  git -C "$CLONE" checkout -q gh-pages
fi
cd "$CLONE"
for try in 1 2 3; do
  git fetch -q origin gh-pages
  git reset -q --hard origin/gh-pages          # local copy only: start from what is online now
  rsync -a --delete "$DIST/" lite/
  git add -A lite
  if git diff --cached --name-only | grep -v '^lite/' | grep -q .; then fail "a change outside lite/, not publishing"; fi
  if git diff --cached --quiet; then say "nothing new to publish"; break; fi
  git -c user.name="$(git -C "$REPO" config user.name)" -c user.email="$(git -C "$REPO" config user.email)" \
    commit -q -m "Shroomy Lite: daily update $TODAY"
  if git push -q origin HEAD:gh-pages; then say "✓ published"; break; fi
  [ "$try" = 3 ] && fail "could not push to the preview site"
  say "push refused (someone else published at the same time), trying again"; sleep 20
done

echo "$TODAY" > "$HOME_DIR/last_ok"
say "✓ done: https://realexis.github.io/cyprus-mushroom-finder-preview/lite/"
