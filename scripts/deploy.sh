#!/usr/bin/env bash
set -e

echo "🚀 Starting automated deployment on Oracle Cloud VM..."
cd /home/ubuntu/exam-paper-builder

echo "📥 Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm ci

echo "🗄️ Generating Prisma client and syncing schema..."
npx prisma generate
npx prisma db push

echo "⚙️ Building Next.js production bundle..."
NODE_OPTIONS='--max-old-space-size=2048' npm run build

echo "🔄 Restarting application in PM2..."
pm2 restart exam-paper-builder --update-env

echo "✅ Deployment completed successfully! Live on http://68.233.111.16"
