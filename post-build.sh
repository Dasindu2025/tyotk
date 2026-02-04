#!/bin/bash
# Post-build script for Next.js standalone deployment
# This copies static assets to the standalone output directory

set -e

echo "📦 Copying static assets for standalone deployment..."

# Create directories if they don't exist
mkdir -p .next/standalone/.next
mkdir -p .next/standalone

# Copy static files
if [ -d ".next/static" ]; then
  echo "✓ Copying .next/static..."
  cp -r .next/static .next/standalone/.next/static
fi

# Copy public folder
if [ -d "public" ]; then
  echo "✓ Copying public folder..."
  cp -r public .next/standalone/public
fi

echo "✅ Static assets copied successfully!"
