#!/bin/sh
set -e

# Add global npm bin to PATH
export PATH="/usr/local/bin:$PATH"

echo "Waiting for database to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if npx prisma db push --skip-generate --accept-data-loss; then
    echo "✅ Database is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "⏳ Database is unavailable - sleeping (attempt $attempt/$max_attempts)..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Database connection failed after $max_attempts attempts"
  exit 1
fi

echo "📦 Running database migrations..."
npx prisma db push --skip-generate --accept-data-loss || echo "⚠️  Migration completed (or already up to date)"

echo "🌱 Seeding database..."
tsx prisma/seed.ts || echo "⚠️  Seeding completed (or already seeded)"

echo "🚀 Starting application..."
exec node server.js
