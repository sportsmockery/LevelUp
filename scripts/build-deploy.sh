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

# Get the most recent deployment URL
LATEST_URL=$(vercel ls 2>/dev/null | head -1)

if [ -n "$LATEST_URL" ]; then
  while true; do
    INSPECT=$(vercel inspect "$LATEST_URL" 2>&1 || true)
    STATUS=$(echo "$INSPECT" | sed -n 's/.*status[[:space:]]*●[[:space:]]*\([A-Za-z]*\).*/\1/p' | head -1)

    if [ "$STATUS" = "Ready" ] || [ "$STATUS" = "Canceled" ]; then
      break
    fi

    if [ "$STATUS" = "Error" ] || [ "$STATUS" = "Failed" ]; then
      err "Last deployment has $STATUS status. Investigate before re-deploying."
      echo "$INSPECT" | grep -E '(status|url|created)' || true
      exit 1
    fi

    # Still building/queued
    if [ "$WAITED" -ge "$MAX_WAIT" ]; then
      err "Timed out waiting for in-progress deployment to complete (${MAX_WAIT}s)"
      exit 1
    fi

    warn "Deployment in progress (status: ${STATUS:-unknown}). Waiting... (${WAITED}s / ${MAX_WAIT}s)"
    sleep 10
    WAITED=$((WAITED + 10))
  done
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
DEPLOY_OUTPUT=$(vercel --prod 2>&1) || {
  err "Deployment command failed."
  echo "$DEPLOY_OUTPUT"
  exit 1
}
echo "$DEPLOY_OUTPUT"

# Extract the deployment URL from output
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://levelup-[a-z0-9]+-chris-burhans-projects\.vercel\.app' | head -1)
if [ -z "$DEPLOY_URL" ]; then
  warn "Could not extract deployment URL from output. Check Vercel dashboard."
  exit 1
fi

# Step 6: Confirm deployment reached Ready via vercel inspect
log "Verifying deployment status for $DEPLOY_URL ..."
VERIFY_WAIT=0
VERIFY_MAX=180  # 3 minutes

while true; do
  INSPECT=$(vercel inspect "$DEPLOY_URL" 2>&1 || true)
  STATUS=$(echo "$INSPECT" | sed -n 's/.*status[[:space:]]*●[[:space:]]*\([A-Za-z]*\).*/\1/p' | head -1)

  if [ "$STATUS" = "Ready" ]; then
    break
  fi

  if [ "$STATUS" = "Error" ] || [ "$STATUS" = "Failed" ]; then
    err "Deployment failed! Status: $STATUS"
    echo "$INSPECT"
    exit 1
  fi

  if [ "$VERIFY_WAIT" -ge "$VERIFY_MAX" ]; then
    warn "Timed out waiting for Ready status. Check Vercel dashboard."
    exit 1
  fi

  log "Status: ${STATUS:-checking}... waiting (${VERIFY_WAIT}s / ${VERIFY_MAX}s)"
  sleep 10
  VERIFY_WAIT=$((VERIFY_WAIT + 10))
done

log "Deployment confirmed Ready!"
echo "$INSPECT" | grep -E '(status|url|created|Aliases)' || true
echo ""
log "Done."
