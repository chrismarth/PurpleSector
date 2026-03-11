#!/bin/bash

# Rebuild specific services with fresh code (no cache)
# Usage: ./scripts/rebuild-services.sh [service-name]
# Example: ./scripts/rebuild-services.sh grpc-gateway
# Or: ./scripts/rebuild-services.sh all

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service-name|all>"
  echo ""
  echo "Available services:"
  echo "  grpc-gateway    - Rust gRPC gateway"
  echo "  ws-server       - WebSocket server"
  echo "  all             - Rebuild all services"
  exit 1
fi

rebuild_service() {
  local svc=$1
  echo -e "${YELLOW}⏳ Rebuilding $svc (no cache)...${NC}"
  
  # Remove existing image to force complete rebuild
  docker rmi purplesector-$svc 2>/dev/null || true
  
  # Build without cache
  docker compose -f docker-compose.dev.yml build --no-cache "$svc"
  
  # Stop and remove container
  docker compose -f docker-compose.dev.yml rm -sf "$svc"
  
  # Start fresh container
  docker compose -f docker-compose.dev.yml up -d "$svc"
  
  echo -e "${GREEN}✓ $svc rebuilt and restarted${NC}"
}

if [ "$SERVICE" == "all" ]; then
  rebuild_service grpc-gateway
  rebuild_service ws-server
else
  rebuild_service "$SERVICE"
fi

echo ""
echo -e "${GREEN}✅ Service rebuild complete${NC}"
echo ""
echo "View logs:"
echo "  docker logs ps-$SERVICE -f"
