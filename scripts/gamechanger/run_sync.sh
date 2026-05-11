#!/usr/bin/env bash
# Wrapper that launchd invokes once a day. Jitters 0-30 min so the run isn't
# pinned to the exact same second, then activates the venv and runs sync.py.
set -euo pipefail

REPO="/Users/christopherburhans/Documents/projects/levelup"
LOG_DIR="$REPO/scripts/gamechanger/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/$(date +%Y%m%d).log"

# 0-1800s (0-30 min) jitter
SLEEP=$((RANDOM % 1801))
echo "[$(date -Iseconds)] jitter sleep ${SLEEP}s" >> "$LOG"
sleep "$SLEEP"

cd "$REPO"
# shellcheck disable=SC1091
source scripts/gamechanger/.venv/bin/activate
echo "[$(date -Iseconds)] sync start" >> "$LOG"
python scripts/gamechanger/sync.py >> "$LOG" 2>&1
echo "[$(date -Iseconds)] sync end (exit $?)" >> "$LOG"
