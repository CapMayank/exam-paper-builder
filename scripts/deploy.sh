#!/usr/bin/env bash
set -e
exec 2>&1

echo "🚀 Starting automated deployment on Oracle Cloud VM..."
cd /home/ubuntu/exam-paper-builder

PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥 Pulling latest code from GitHub..."
git fetch --quiet origin main
git reset --hard origin/main

# Only run npm ci if dependencies changed or node_modules is missing
if [ ! -d "node_modules" ] || [ -z "$PREV_COMMIT" ] || git diff --name-only "$PREV_COMMIT" HEAD | grep -qE 'package(-lock)?\.json'; then
  echo "📦 Dependencies updated, running npm ci..."
  npm ci --no-audit --no-fund --loglevel=error
else
  echo "📦 Dependencies unchanged, skipping npm ci (saves ~3 minutes)."
fi

# Only run Prisma generate/sync if schema changed or client is missing
if [ ! -d "node_modules/.prisma/client" ] || [ -z "$PREV_COMMIT" ] || git diff --name-only "$PREV_COMMIT" HEAD | grep -q 'prisma/schema.prisma'; then
  echo "🗄️ Generating Prisma client and syncing schema..."
  npx prisma generate
  npx prisma db push --skip-generate
  echo "🌱 Seeding MPBSE curriculum and blueprint templates..."
  npm run seed:mpbse
else
  echo "🗄️ Database schema unchanged, skipping Prisma regeneration."
fi

echo "⚙️ Building Next.js production bundle..."
NODE_OPTIONS='--max-old-space-size=2048' npm run build

echo "🔄 Restarting application in PM2..."
pm2 restart exam-paper-builder --update-env

echo "✅ Deployment completed successfully! Live on https://exam.sarvodayaschool.co.in"
