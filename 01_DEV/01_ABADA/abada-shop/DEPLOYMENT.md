# Abada Shop - Deployment Guide

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- Git

## Project Structure

```
docker/
  docker-compose.yml          # Development (default)
  docker-compose.prod.yml     # Production overrides
  cloudflare/                 # Cloudflare Tunnel config (prod)
apps/
  api/                        # Fastify API (port 3000)
  web/                        # Next.js frontend (port 3001)
```

---

## Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env                         # Development
cp .env.production.example .env.production   # Production
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://abada:pass@postgres:5432/abada_shop` |
| `REDIS_URL` | Redis connection string | `redis://:pass@redis:6379` |
| `JWT_SECRET` | JWT signing key (min 64 chars) | Random string |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Random string |
| `TOSS_SECRET_KEY` | TossPayments secret key | `live_sk_xxxx` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | TossPayments client key | `live_ck_xxxx` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://api.shop.abada.kr` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL | `https://shop.abada.kr` |

See `.env.production.example` for the full list.

---

## Local Development

```bash
# Start all services (API, Web, PostgreSQL, Redis, Adminer)
cd docker
docker compose up -d

# View logs
docker compose logs -f api

# Run database migrations
docker compose exec api npx prisma migrate dev

# Seed database
docker compose exec api npx tsx prisma/seed.ts

# Stop all services
docker compose down
```

**Endpoints:**
- API: http://localhost:3000
- Web: http://localhost:3001
- Adminer (DB UI): http://localhost:8080
- Health check: http://localhost:3000/health
- Readiness check: http://localhost:3000/health/ready

---

## Production Deployment

### 1. Prepare Environment

```bash
# Copy and edit production env
cp .env.production.example .env.production
# Edit .env.production with real values
```

### 2. Deploy with Docker Compose

```bash
cd docker

# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Run migrations
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Check health
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
```

### 3. Deploy Script (automated)

```bash
./scripts/deploy.sh
```

---

## Health Check Endpoints

### `GET /health` - Liveness

Returns basic service status. No external dependencies checked.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-22T12:00:00.000Z",
    "version": "1.0.0",
    "uptime": 3600
  }
}
```

### `GET /health/ready` - Readiness

Checks database and Redis connectivity. Returns `503` if any dependency is down.

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "checks": {
      "db": { "status": "ok", "latency": 2 },
      "redis": { "status": "ok", "latency": 1 }
    }
  }
}
```

---

## GitHub Secrets

The following secrets must be configured in GitHub repository settings for CI/CD:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | Production server IP or hostname |
| `DEPLOY_USER` | SSH user for deployment |
| `DEPLOY_KEY` | SSH private key for deployment |
| `DATABASE_URL` | Production database URL |
| `REDIS_URL` | Production Redis URL |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `TOSS_SECRET_KEY` | TossPayments secret key |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | TossPayments client key |
| `NEXT_PUBLIC_API_URL` | Public API URL |
| `NEXT_PUBLIC_SITE_URL` | Public site URL |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |

---

## Rollback

```bash
cd docker

# Roll back to previous image
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build

# Or use a specific image tag
# IMAGE_TAG=v1.0.0 docker compose ... up -d
```

---

## Monitoring

- **Health check**: `GET /health` (liveness probe)
- **Readiness check**: `GET /health/ready` (readiness probe)
- Docker Compose healthcheck is configured with 30s interval
- Container logs: `docker compose logs -f <service>`
