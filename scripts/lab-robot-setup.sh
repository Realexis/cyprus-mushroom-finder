#!/usr/bin/env bash
# One-off: set up the daily-update robot for Shroomy (branch `lab`). Safe to run again.
#
# Makes ~/Library/Application Support/shroomy-lab-robot/ with
#   repo/     the robot's own copy of the `lab` branch (from GitHub) + the data it needs
#   site/     made on the first run: the site branch (gh-pages) of Realexis/shroomy
# and the timed job ~/Library/LaunchAgents/local.shroomy.lab-daily.plist (06:50, 08:50, 12:50, 18:50).
# The data and map tiles are copied from THIS folder (the one the script is run from); on this
# Mac's disk such a copy takes no extra room until the files change.
# It does not touch Shroomy Lite, its robot or its timed job.
# Turn the timed job off:  launchctl bootout gui/$(id -u)/local.shroomy.lab-daily
set -euo pipefail
export PATH="$HOME/Library/pnpm/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/Library/Application Support/shroomy-lab-robot"
REPO="$HOME_DIR/repo"
LABEL=local.shroomy.lab-daily
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME_DIR"

if [ ! -d "$REPO/.git" ]; then
  git clone -q --single-branch --branch lab "$(git -C "$SRC" remote get-url origin)" "$REPO"
  git -C "$REPO" config user.name "$(git -C "$SRC" config user.name)"
  git -C "$REPO" config user.email "$(git -C "$SRC" config user.email)"
fi
# Data that is not in git: the pipeline's own data and the site's map files.
[ -d "$REPO/data" ] || cp -cR "$SRC/data" "$REPO/data"
mkdir -p "$REPO/web/public"
for d in data tiles vendor; do [ -d "$REPO/web/public/$d" ] || cp -cR "$SRC/web/public/$d" "$REPO/web/public/$d"; done

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL</string>
	<key>ProgramArguments</key>
	<array>
		<string>/bin/bash</string>
		<string>$REPO/scripts/lab-daily.sh</string>
	</array>
	<key>StandardOutPath</key>
	<string>$HOME_DIR/run.log</string>
	<key>StandardErrorPath</key>
	<string>$HOME_DIR/run.log</string>
	<key>StartCalendarInterval</key>
	<array>
		<dict><key>Hour</key><integer>6</integer><key>Minute</key><integer>50</integer></dict>
		<dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>50</integer></dict>
		<dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>50</integer></dict>
		<dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>50</integer></dict>
	</array>
</dict>
</plist>
PL
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "✓ robot ready in $HOME_DIR"
echo "  run it now:  launchctl kickstart gui/$(id -u)/$LABEL"
