#!/bin/bash
# Deploy to ws-248-247 via Cloudflare Tunnel
# Usage: ./scripts/deploy.sh [dev|prod]

set -euo pipefail

ENV="${1:-prod}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"

echo "=== abada-shop Deploy ($ENV) ==="

if [ "$ENV" = "prod" ]; then
  COMPOSE_FILES="-f $DOCKER_DIR/docker-compose.yml -f $DOCKER_DIR/docker-compose.prod.yml"
  ENV_FILE="$PROJECT_DIR/.env.production"
else
  COMPOSE_FILES="-f $DOCKER_DIR/docker-compose.yml"
  ENV_FILE="$PROJECT_DIR/.env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Export env vars for docker compose
set -a
source "$ENV_FILE"
set +a

echo "1. Pulling latest images..."
docker compose $COMPOSE_FILES pull 2>/dev/null || true

echo "2. Building services..."
docker compose $COMPOSE_FILES build --no-cache

echo "3. Running DB migrations..."
docker compose $COMPOSE_FILES run --rm api npx prisma migrate deploy

echo "4. Starting services..."
docker compose $COMPOSE_FILES up -d

echo "5. Health check..."
sleep 5
docker compose $COMPOSE_FILES ps

echo ""
echo "=== Deploy complete ==="
if [ "$ENV" = "prod" ]; then
  echo "Web: https://shop.abada.kr"
  echo "API: https://api.shop.abada.kr"
fi
