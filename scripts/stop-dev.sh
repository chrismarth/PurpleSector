#!/bin/bash

# Purple Sector - Development Environment Shutdown Script
# 
# This script stops the complete development environment including:
# - All PM2 services
# - Kafka cluster (optional)
#
# Usage: 
#   ./scripts/stop-dev.sh           # Stop services, keep Kafka running
#   ./scripts/stop-dev.sh --kafka   # Stop services and Kafka

set -e

echo "🛑 Stopping Purple Sector Development Environment"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Stop PM2 services
echo -e "${YELLOW}⏳ Stopping PM2 services...${NC}"
pm2 delete all > /dev/null 2>&1 || true
echo -e "${GREEN}✓ PM2 services stopped${NC}"

# Check if we should stop Kafka
if [ "$1" == "--kafka" ]; then
  echo -e "${YELLOW}⏳ Stopping Kafka cluster...${NC}"
  docker compose -f docker-compose.kafka.yml down
  echo -e "${GREEN}✓ Kafka cluster stopped${NC}"
else
  echo -e "${YELLOW}ℹ Kafka cluster is still running (use --kafka flag to stop it)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Development environment stopped${NC}"
echo ""
echo "📝 Useful Commands:"
echo "  ./scripts/start-dev.sh        - Start development environment"
echo "  ./scripts/stop-dev.sh --kafka - Stop everything including Kafka"
echo "  docker compose -f docker-compose.kafka.yml down - Stop Kafka manually"
