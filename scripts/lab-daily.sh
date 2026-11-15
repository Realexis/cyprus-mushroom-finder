#!/usr/bin/env bash
# Shroomy (branch `lab`, the key version) daily update, run by this Mac
# (launchd: ~/Library/LaunchAgents/local.shroomy.lab-daily.plist, made by scripts/lab-robot-setup.sh).
#
# It runs from the robot's OWN copy of the project, in
#   ~/Library/Application Support/shroomy-lab-robot/repo
# and never from the Desktop: macOS does not let a timed job read the Desktop folder
# ("Operation not permitted"), so a job that points at a Desktop folder never starts.
#
# 0. Take the newest SAVED version of the `lab` branch from GitHub (never half-done edits).
# 1. Fetch today's weather and score the squares (pipeline/shroomy/daily.py).
# 2. Redraw the 50 m heat map from the new scores (scripts/lab-heat50.py).
# 3. Build the site.
# 4. Publish to the site's own GitHub project (repo Realexis/shroomy, branch gh-pages; since
#    15 Nov 2026, because the shared preview site was near GitHub's 1 GB limit).
#    The whole branch is this one site. Never a force-push.
#
# Runs at several times a day; once today's update is published, later runs stop at once
# (FORCE=1 publishes again anyway).
# If the weather source is down, nothing is published: the site keeps yesterday's data and shows
# "Data delayed" by itself, and the next run tries again.
# Log: ~/Library/Application Support/shroomy-lab-robot/run.log
set -euo pipefail
export PATH="$HOME/Library/pnpm/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

main() {
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/Library/Application Support/shroomy-lab-robot"
CLONE="$HOME_DIR/site"
SITE_REPO=https://github.com/Realexis/shroomy.git
SITE=https://realexis.github.io/shroomy/
TODAY=$(TZ=Asia/Nicosia date +%F)
mkdir -p "$HOME_DIR"

say() { echo "$(date '+%F %T') $*"; }
fail() {
  say "✗ $*"
  osascript -e "display notification \"$*\" with title \"Shroomy update failed\"" >/dev/null 2>&1 || true
  exit 1
}

case "$REPO" in "$HOME_DIR"/*) ;; *) fail "run the robot's own copy ($HOME_DIR/repo), not $REPO" ;; esac

# One run at a time.
LOCK="$HOME_DIR/lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  # A lock older than 3 hours is left over from a crash.
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +180 2>/dev/null)" ]; then rm -rf "$LOCK"; mkdir "$LOCK"; else say "another run is busy"; exit 0; fi
fi
trap 'rm -rf "$LOCK"' EXIT

if [ -z "${FORCE:-}" ] && [ "$(cat "$HOME_DIR/last_ok" 2>/dev/null)" = "$TODAY" ]; then say "already published for $TODAY"; exit 0; fi
say "▶ Shroomy daily update for $TODAY"

# 0. Newest saved code. If GitHub cannot be reached, carry on with the code already here.
if git -C "$REPO" fetch -q origin lab 2>/dev/null; then
  git -C "$REPO" merge -q --ff-only FETCH_HEAD || fail "the robot's copy has its own changes, cannot take the new code"
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

# 2. The 50 m heat map, from the new scores.
(cd "$REPO/pipeline" && uv run python ../scripts/lab-heat50.py) || fail "50 m heat map step failed"
HEAT=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['weather_run'])" "$REPO/web/public/data/heat50.json")
[ "$HEAT" = "$TODAY" ] || fail "the 50 m heat map is for $HEAT, not $TODAY"

# 3. Build. No VITE_PREVIEW_LABEL: this is the key version, so no "Preview" badge.
(cd "$REPO/web" && npm run build >"$HOME_DIR/build.log" 2>&1) || { cat "$HOME_DIR/build.log"; fail "site build failed"; }
DIST="$REPO/web/dist"
if find "$DIST" -iname "*private*" -o -iname "*finds*" -o -iname "static_key*" | grep -q .; then fail "private files in the build, not publishing"; fi

# 4. Publish. README.md and .nojekyll on the site branch are kept as they are.
if [ ! -d "$CLONE/.git" ]; then
  rm -rf "$CLONE"
  git clone -q --filter=blob:none --branch gh-pages "$SITE_REPO" "$CLONE"
fi
cd "$CLONE"
for try in 1 2 3; do
  git fetch -q origin gh-pages
  git reset -q --hard origin/gh-pages          # local copy only: start from what is online now
  rsync -a --delete --exclude=.git --exclude=.nojekyll --exclude=README.md "$DIST/" ./
  git add -A
  if git diff --cached --name-only | grep -i "private\|finds\|static_key" | grep -q .; then fail "private files staged, not publishing"; fi
  if git diff --cached --quiet; then say "nothing new to publish"; break; fi
  git -c user.name="$(git -C "$REPO" config user.name)" -c user.email="$(git -C "$REPO" config user.email)" \
    commit -q -m "Shroomy: daily update $TODAY"
  if git push -q origin HEAD:gh-pages; then say "✓ published"; break; fi
  [ "$try" = 3 ] && fail "could not push to the site"
  say "push refused (someone else published at the same time), trying again"; sleep 20
done

echo "$TODAY" > "$HOME_DIR/last_ok"
say "✓ done: $SITE"
}
main "$@"
