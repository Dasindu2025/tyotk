#!/bin/bash

# Script to run TyoTrack locally using Docker

echo "🐳 Starting TyoTrack with Docker Compose..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
  exit 1
fi

# Use docker compose (v2) if available, otherwise use docker-compose (v1)
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

echo "📦 Building and starting containers..."
$COMPOSE_CMD up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ TyoTrack is starting up!"
echo ""
echo "📊 Container status:"
$COMPOSE_CMD ps

echo ""
echo "🔗 Application will be available at: http://localhost:3000"
echo ""
echo "📝 Default login credentials (after seeding):"
echo "   Super Admin: admin@tyotrack.com / Admin123!"
echo "   Admin: manager@tyotrack.com / Admin123!"
echo "   Employee: employee@tyotrack.com / Employee123!"
echo ""
echo "📋 Useful commands:"
echo "   View logs: $COMPOSE_CMD logs -f app"
echo "   Stop: $COMPOSE_CMD down"
echo "   Restart: $COMPOSE_CMD restart app"
echo "   Database logs: $COMPOSE_CMD logs -f postgres"
echo ""
echo "⏳ The application is initializing the database. This may take a minute..."
echo "   Check logs with: $COMPOSE_CMD logs -f app"
