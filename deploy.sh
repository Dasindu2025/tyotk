#!/bin/bash
# TyoTrack Deployment Script for Production

set -e

echo "🚀 Starting TyoTrack deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found! Please create it first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push --accept-data-loss

# Build the application
echo "🏗️  Building application..."
npm run build

echo "✅ Deployment complete!"
echo "🌐 To start the server, run: npm start"
echo "🔧 For PM2 (recommended): pm2 start npm --name tyotrack -- start"
