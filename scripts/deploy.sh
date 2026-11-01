#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script for Exam Paper Builder
# Operating System: Ubuntu / Linux on Oracle Cloud VM
# Process Manager: PM2
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'
exec 2>&1

PROJECT_DIR="/home/ubuntu/exam-paper-builder"
LOCK_FILE="/tmp/exam-paper-builder-deploy.lock"
APP_NAME="exam-paper-builder"
HEALTH_CHECK_URL="http://127.0.0.1:3000/api/auth/setup-status"
BACKUP_DIR="$PROJECT_DIR/backups/db"

echo "================================================================================"
echo "🚀 STARTING PRODUCTION DEPLOYMENT: $(date -u +"%Y-%m-%d %H:%M:%SZ")"
echo "================================================================================"

# 1. Concurrency guard (prevent overlapping deployments)
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "⚠️ Another deployment is currently running (lock acquired on $LOCK_FILE)."
  echo "   Exiting gracefully to prevent database or build corruption."
  exit 0
fi

# 2. Verify working directory
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Error: Project directory $PROJECT_DIR does not exist."
  exit 1
fi
cd "$PROJECT_DIR"

# 3. Environment Preflight Checks
echo "🔍 Preflight environment checks..."
echo "   Node: $(node -v 2>/dev/null || echo 'not found')"
echo "   NPM:  $(npm -v 2>/dev/null || echo 'not found')"
echo "   Git:  $(git --version 2>/dev/null || echo 'not found')"
echo "   PM2:  $(pm2 -v 2>/dev/null || echo 'not found')"

# Check available disk space (ensure at least 500MB free)
AVAILABLE_KB=$(df -k . | awk 'NR==2 {print $4}' 2>/dev/null || echo "1000000")
if [ "$AVAILABLE_KB" -lt 512000 ]; then
  echo "⚠️ WARNING: Low disk space (<500MB available). Running npm cache clean..."
  npm cache clean --force 2>/dev/null || true
fi

# 4. Safe Git Synchronization (Standard Fast-Forward Merge)
echo "📥 Checking Git repository status..."
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

# If any tracked files have local unstaged edits, stash them safely rather than deleting
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "⚠️ Working directory contains local modifications. Stashing safely..."
  git stash push -m "deploy-autostash-$(date +%s)" --quiet
fi

git fetch origin main --prune --tags --quiet
TARGET_COMMIT=$(git rev-parse origin/main)

echo "   Current Commit: ${PREV_COMMIT:0:7}"
echo "   Target Commit:  ${TARGET_COMMIT:0:7}"

if [ "$PREV_COMMIT" != "$TARGET_COMMIT" ]; then
  echo "🔄 Applying fast-forward merge from origin/main..."
  if ! git merge --ff-only origin/main; then
    echo "❌ FATAL: Cannot fast-forward local branch to origin/main."
    echo "   Divergent commits detected. Manual resolution required on server."
    exit 1
  fi
  echo "✓ Successfully fast-forwarded to $(git rev-parse --short HEAD)."
else
  echo "✓ Local repository is already up to date with origin/main."
fi

# 5. Dependency Management (Cached / Incremental)
if [ ! -d "node_modules" ] || [ -z "$PREV_COMMIT" ] || git diff --name-only "$PREV_COMMIT" "$TARGET_COMMIT" 2>/dev/null | grep -qE 'package(-lock)?\.json'; then
  echo "📦 Dependencies updated or node_modules missing. Running npm ci..."
  npm ci --no-audit --no-fund --loglevel=error
else
  echo "📦 Dependencies unchanged, skipping npm ci (cached)."
fi

# 6. SQLite Database Backup & Schema Synchronization
mkdir -p "$BACKUP_DIR"
if [ -f "dev.db" ]; then
  BACKUP_FILE="$BACKUP_DIR/dev_$(date +%Y%m%d_%H%M%S).db"
  echo "💾 Backing up SQLite database to $BACKUP_FILE..."
  cp dev.db "$BACKUP_FILE"
  # Retain only last 7 daily backups
  ls -1t "$BACKUP_DIR"/dev_*.db 2>/dev/null | tail -n +8 | xargs -r rm -f --
fi

echo "🗄️ Generating Prisma client and syncing database schema..."
npx prisma generate
npx prisma db push --skip-generate

# 7. Next.js Production Build
echo "⚙️ Building Next.js production bundle..."
NODE_OPTIONS='--max-old-space-size=2048' npm run build

# 8. Zero-Downtime Reload via PM2
echo "🔄 Reloading PM2 process gracefully..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env || pm2 restart "$APP_NAME" --update-env
else
  echo "⚠️ Process '$APP_NAME' not running in PM2, starting initial process..."
  pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save --force >/dev/null 2>&1 || true

# 9. Post-Deployment Health Check
echo "🩺 Performing health check..."
HEALTHY=false
for attempt in $(seq 1 15); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "307" ]; then
    HEALTHY=true
    echo "✓ Health check passed (HTTP $HTTP_CODE) on attempt $attempt."
    break
  fi
  echo "   Waiting for server response (attempt $attempt/15, HTTP $HTTP_CODE)..."
  sleep 2
done

if [ "$HEALTHY" != "true" ]; then
  ROOT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000" 2>/dev/null || echo "000")
  if [ "$ROOT_CODE" = "200" ] || [ "$ROOT_CODE" = "302" ] || [ "$ROOT_CODE" = "307" ] || [ "$ROOT_CODE" = "308" ]; then
    HEALTHY=true
    echo "✓ Root endpoint health check passed (HTTP $ROOT_CODE)."
  fi
fi

if [ "$HEALTHY" = "true" ]; then
  echo "================================================================================"
  echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
  echo "   Active Commit: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%B | head -n 1)"
  echo "   Target URL:    https://exam.sarvodayaschool.co.in"
  echo "   Completed At:  $(date -u +"%Y-%m-%d %H:%M:%SZ")"
  echo "================================================================================"
else
  echo "⚠️ WARNING: Health check did not return HTTP 200 within 30 seconds."
  echo "   Check server logs with: pm2 logs $APP_NAME"
fi
