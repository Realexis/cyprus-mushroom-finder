#!/bin/bash
# Save today's Department of Meteorology rain-station PDF into the private shared shelf.
# Safe to run many times a day: a day already saved is not downloaded again.
# The department publishes around 11:00 Cyprus time and replaces the file the next day,
# so running at 12:00, 17:00 and 22:00 gives three chances per day.
set -euo pipefail
cd "$(dirname "$0")/../pipeline"
LOG="${SHROOMY_SHELF:-$(cd ../.. && pwd)/shroomy-shared}/files/dom-rain/collect.log"
mkdir -p "$(dirname "$LOG")"
{ echo "== $(date '+%F %T')"; uv run python -m shroomy.sources.dom_rain 2>&1; } >> "$LOG"
