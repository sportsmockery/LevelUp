#!/usr/bin/env bash
set -euo pipefail

# LevelUp Vercel Deployment Safety Script
# Enforces the mandatory deployment protocol from CLAUDE.md

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
err()  { echo -e "${RED}[deploy]${NC} $1" >&2; }

# Step 1: Check for in-progress deployments and wait
log "Checking for in-progress Vercel deployments..."
MAX_WAIT=300  # 5 minutes max wait
WAITED=0

while true; do
  DEPLOYING=$(vercel ls 2>/dev/null | head -20 | grep -c "Building\|Queued\|Initializing" || true)
  if [ "$DEPLOYING" -eq 0 ]; then
    break
  fi

  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    err "Timed out waiting for in-progress deployment to complete (${MAX_WAIT}s)"
    exit 1
  fi

  warn "Deployment in progress. Waiting... (${WAITED}s / ${MAX_WAIT}s)"
  sleep 10
  WAITED=$((WAITED + 10))
done

# Check if last deployment failed
LAST_STATUS=$(vercel ls 2>/dev/null | head -5 | grep -o "Error" || true)
if [ -n "$LAST_STATUS" ]; then
  err "Last deployment has Error status. Investigate before re-deploying."
  vercel ls 2>/dev/null | head -5
  exit 1
fi

log "No in-progress deployments. Proceeding."

# Step 2: Update repository
log "Pulling latest changes..."
git pull --rebase || {
  err "git pull failed. Resolve conflicts before deploying."
  exit 1
}

# Step 3: Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  warn "Uncommitted changes detected:"
  git status --short
  err "Commit or stash changes before deploying."
  exit 1
fi

# Step 4: Run build
log "Running local build to verify..."
npm run build || {
  err "Build failed. Fix errors before deploying."
  exit 1
}
log "Build passed."

# Step 5: Deploy to production
log "Deploying to Vercel production..."
vercel --prod || {
  err "Deployment command failed."
  exit 1
}

# Step 6: Confirm deployment reached Ready
log "Verifying deployment status..."
VERIFY_WAIT=0
VERIFY_MAX=180  # 3 minutes

while true; do
  READY=$(vercel ls 2>/dev/null | head -3 | grep -c "Ready" || true)
  if [ "$READY" -gt 0 ]; then
    break
  fi

  ERRORED=$(vercel ls 2>/dev/null | head -3 | grep -c "Error" || true)
  if [ "$ERRORED" -gt 0 ]; then
    err "Deployment failed! Check Vercel dashboard for details."
    vercel ls 2>/dev/null | head -5
    exit 1
  fi

  if [ "$VERIFY_WAIT" -ge "$VERIFY_MAX" ]; then
    warn "Timed out waiting for Ready status. Check Vercel dashboard."
    exit 1
  fi

  sleep 10
  VERIFY_WAIT=$((VERIFY_WAIT + 10))
done

log "Deployment confirmed Ready!"
vercel ls 2>/dev/null | head -3
echo ""
log "Done."
