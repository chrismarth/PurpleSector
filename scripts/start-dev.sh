#!/bin/bash

# Purple Sector - Development Environment Startup Script
# 
# This script starts the complete development environment including:
# - Kafka cluster (Docker)
# - All telemetry services (PM2)
# - Demo collector for testing
# - Frontend application
#
# Usage: ./scripts/start-dev.sh

set -e

echo "🚀 Starting Purple Sector Development Environment"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Check if Kafka is already running
if docker ps | grep -q purple-sector-kafka; then
  echo -e "${GREEN}✓ Kafka is already running${NC}"
else
  echo -e "${YELLOW}⏳ Starting Kafka cluster...${NC}"
  docker compose -f docker-compose.kafka.yml up -d
  
  echo -e "${YELLOW}⏳ Waiting for Kafka to be ready (30 seconds)...${NC}"
  sleep 30
  echo -e "${GREEN}✓ Kafka cluster started${NC}"
fi

# Setup Kafka topics
echo -e "${YELLOW}⏳ Setting up Kafka topics...${NC}"
npm run kafka:setup
echo -e "${GREEN}✓ Kafka topics created${NC}"

# Check if database is ready
echo -e "${YELLOW}⏳ Checking database...${NC}"
if npm run db:check > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Database is ready${NC}"
else
  echo -e "${YELLOW}⚠ Database check failed. You may need to run: npm run db:push${NC}"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop any existing PM2 processes
echo -e "${YELLOW}⏳ Cleaning up existing PM2 processes...${NC}"
npx pm2 delete all > /dev/null 2>&1 || true

# Start all services with PM2
echo -e "${YELLOW}⏳ Starting services with PM2...${NC}"
npx pm2 start ecosystem.dev.config.js

echo ""
echo -e "${GREEN}✅ Development environment started successfully!${NC}"
echo ""
echo "📊 Service Status:"
npx pm2 status
echo ""
echo "📝 Useful Commands:"
echo "  npx pm2 logs              - View all logs"
echo "  npx pm2 logs kafka-bridge-dev - View bridge logs"
echo "  npx pm2 logs demo-collector-dev - View demo collector logs"
echo "  npx pm2 monit             - Monitor all services"
echo "  npx pm2 restart all       - Restart all services"
echo "  npx pm2 stop all          - Stop all services"
echo "  npx pm2 delete all        - Stop and remove all services"
echo ""
echo "🌐 Access Points:"
echo "  Frontend:    http://localhost:3000"
echo "  Kafka UI:    http://localhost:8090"
echo "  WebSocket:   ws://localhost:8080"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"
