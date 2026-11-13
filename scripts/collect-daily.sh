#!/bin/bash
# Rain-station archive -> shared shelf. Run by hand (or by any pipeline session); the SCHEDULED job is
# the private collector's own mac/run.sh, because macOS blocks background jobs from the Desktop.
# 1. Pull the private GitHub collector (Realexis/shroomy-collector, clone in
#    ~/Library/Application Support/shroomy-collector) and copy any new days into the shared shelf.
# 2. Save today's PDF from the department directly (a day already saved is not downloaded again).
# 3. Rebuild the table. Everything stays private (no licence stated).
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.cargo/bin:/usr/bin:/bin"
cd "$(dirname "$0")/../pipeline" || exit 1
SHELF="${SHROOMY_SHELF:-$(cd ../.. && pwd)/shroomy-shared}"
REPO="$HOME/Library/Application Support/shroomy-collector"
LOG="$SHELF/files/dom-rain/collect.log"
mkdir -p "$(dirname "$LOG")"
{
  echo "== $(date '+%F %T')"
  ARGS=()
  if [ -d "$REPO/.git" ]; then
    git -C "$REPO" pull -q --ff-only 2>&1 || echo " ! could not pull the GitHub collector (offline?)"
    ARGS=(--import "$REPO/dom-rain/pdf")
  fi
  uv run python -m shroomy.sources.dom_rain ${ARGS[@]+"${ARGS[@]}"} 2>&1 || echo " ! collector failed (exit $?)"
} >> "$LOG"
