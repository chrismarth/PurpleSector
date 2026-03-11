#!/bin/bash

# Purple Sector - Development Environment Shutdown Script
#
# This script stops the complete development environment:
#   - PM2 services (always)
#   - Docker infrastructure (unless --keep-docker)
#   - Purge all data (with --purge)
#
# Usage:
#   ./scripts/stop-dev.sh               # Stop everything
#   ./scripts/stop-dev.sh --keep-docker  # Stop PM2 only, keep Docker running
#   ./scripts/stop-dev.sh --purge        # Stop everything and purge all data

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
npx pm2 delete all > /dev/null 2>&1 || true
echo -e "${GREEN}✓ PM2 services stopped${NC}"

# Stop Docker infrastructure (default) unless --keep-docker
if [ "$1" == "--keep-docker" ]; then
  echo -e "${YELLOW}ℹ Docker infrastructure still running (--keep-docker)${NC}"
elif [ "$1" == "--purge" ]; then
  echo -e "${YELLOW}⏳ Stopping Docker infrastructure...${NC}"
  docker compose -f docker-compose.dev.yml down
  echo -e "${GREEN}✓ Docker infrastructure stopped${NC}"
  
  echo -e "${YELLOW}⏳ Purging all data...${NC}"
  docker compose -f docker-compose.dev.yml down -v
  echo -e "${GREEN}✓ Docker volumes purged${NC}"
  
  echo -e "${YELLOW}⏳ Deleting WAL files...${NC}"
  find . -name "telemetry-wal.db*" -delete 2>/dev/null || true
  echo -e "${GREEN}✓ WAL files deleted${NC}"
else
  echo -e "${YELLOW}⏳ Stopping Docker infrastructure...${NC}"
  docker compose -f docker-compose.dev.yml down
  echo -e "${GREEN}✓ Docker infrastructure stopped${NC}"
fi

echo ""
echo -e "${GREEN}✅ Development environment stopped${NC}"
echo ""
echo "📝 Useful Commands:"
echo "  ./scripts/start-dev.sh               - Start everything"
echo "  ./scripts/stop-dev.sh --keep-docker   - Stop PM2 only"
echo "  ./scripts/stop-dev.sh --purge         - Stop and purge all data"
echo "  docker compose -f docker-compose.dev.yml down -v  - Stop + remove volumes"
