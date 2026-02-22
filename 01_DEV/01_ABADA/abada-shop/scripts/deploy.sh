#!/bin/bash
# Deploy abada-shop to ws-248-247
# Usage: ./scripts/deploy.sh [dev|prod]

set -euo pipefail

ENV="${1:-prod}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== abada-shop Deploy ($ENV) ==="

if [ "$ENV" = "prod" ]; then
  COMPOSE_FILES="-f $PROJECT_DIR/docker-compose.yml -f $PROJECT_DIR/docker-compose.prod.yml"
  ENV_FILE="$PROJECT_DIR/.env.production"
else
  COMPOSE_FILES="-f $PROJECT_DIR/docker-compose.yml"
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

echo "3. Starting services..."
docker compose $COMPOSE_FILES up -d --remove-orphans

echo "4. Running DB migrations..."
docker exec abada-api npx prisma migrate deploy

echo "5. Cleaning up..."
docker system prune -f

echo "6. Health check..."
sleep 5
docker compose $COMPOSE_FILES ps

echo ""
echo "=== Deploy complete ==="
if [ "$ENV" = "prod" ]; then
  echo "Web: https://shop.abada.kr"
  echo "API: https://shop.abada.kr/api"
fi
