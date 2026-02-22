# Design: 배포 아키텍처 - Cloudflare Tunnel + Docker

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Level**: Enterprise

---

## 1. 아키텍처 개요

```
[인터넷 / 사용자]
        │
        ▼
┌───────────────────┐
│  Cloudflare CDN   │  ← SSL/TLS 자동 처리, DDoS 보호, WAF
│  (Zero Trust)     │
└───────┬───────────┘
        │ HTTPS (암호화)
        ▼
┌───────────────────┐
│ Cloudflare Tunnel │  ← cloudflared daemon (온프레미스 설치)
│   (cloudflared)   │  ← 아웃바운드 연결만 (인바운드 포트 불필요)
└───────┬───────────┘
        │ HTTP (내부망)
        ▼
┌───────────────────────────────────────────────────────┐
│              ws-248-247 (온프레미스 Linux)             │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Docker Network (abada-net)          │  │
│  │                                                 │  │
│  │  ┌──────────────┐    ┌──────────────────────┐  │  │
│  │  │   web:3001   │    │      api:3000        │  │  │
│  │  │  (Next.js)   │───▶│    (Fastify DDD)     │  │  │
│  │  └──────────────┘    └──────────┬───────────┘  │  │
│  │                                 │               │  │
│  │                    ┌────────────┴─────────┐     │  │
│  │                    │                      │     │  │
│  │  ┌─────────────┐  ┌┴──────────────┐      │     │  │
│  │  │  redis:6379 │  │postgres:5432  │      │     │  │
│  │  │  (Cache/    │  │  (PostgreSQL  │      │     │  │
│  │  │   BullMQ)   │  │     16)       │      │     │  │
│  │  └─────────────┘  └───────────────┘      │     │  │
│  │                                           │     │  │
│  │  ┌─────────────┐  (dev only)             │     │  │
│  │  │adminer:8080 │◀──────────────────────┘      │  │
│  │  └─────────────┘                               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  Volumes: postgres_data, redis_data                   │
└───────────────────────────────────────────────────────┘
```

### 도메인 라우팅

| 도메인 | 서비스 | 포트 |
|--------|--------|------|
| `shop.abada.kr` | Next.js Web | 3001 |
| `api.shop.abada.kr` | Fastify API | 3000 |

---

## 2. Cloudflare Tunnel 개요

### Zero Trust 아키텍처 장점

| 항목 | 설명 |
|------|------|
| 인바운드 포트 불필요 | 서버에서 Cloudflare로 아웃바운드 연결만 사용 |
| SSL/TLS 자동 관리 | Cloudflare가 인증서 발급/갱신 자동 처리 |
| DDoS 보호 | Cloudflare 네트워크 레벨 보호 |
| WAF | Web Application Firewall 기본 제공 |
| 방화벽 설정 최소화 | 80/443 포트 열 필요 없음 |

### 연결 흐름

```
사용자 브라우저
    │ HTTPS 요청
    ▼
Cloudflare Edge (전 세계 PoP)
    │ 터널을 통한 프록시
    ▼
cloudflared daemon (ws-248-247)
    │ 내부 HTTP 라우팅
    ▼
Docker 컨테이너 (web/api)
```

---

## 3. Cloudflare Tunnel 설정 절차

### 3.1 사전 준비

```bash
# Cloudflare 계정 필요
# Zero Trust 대시보드: https://one.dash.cloudflare.com/

# cloudflared 설치 (Ubuntu/Debian)
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# 또는 Docker 사용 (권장 - compose에 포함)
```

### 3.2 터널 생성 (최초 1회)

```bash
# Cloudflare 로그인
cloudflared tunnel login

# 터널 생성
cloudflared tunnel create abada-shop

# 생성 결과 예시:
# Tunnel credentials written to /root/.cloudflare/abada-shop.json
# Created tunnel abada-shop with id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 터널 ID 메모 (config.yml에 사용)
cloudflared tunnel list
```

### 3.3 DNS 레코드 설정

```bash
# shop.abada.kr → 터널로 라우팅
cloudflared tunnel route dns abada-shop shop.abada.kr

# api.shop.abada.kr → 터널로 라우팅
cloudflared tunnel route dns abada-shop api.shop.abada.kr
```

### 3.4 Credentials 파일 배치

```bash
# 생성된 credentials 파일 복사
cp ~/.cloudflare/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json \
   /Users/saint/01_DEV/01_ABADA/abada-shop/docker/cloudflare/credentials.json

# .gitignore에 반드시 추가!
echo "docker/cloudflare/credentials.json" >> .gitignore
```

---

## 4. 환경 변수 관리

### 환경별 파일 구성

```
abada-shop/
├── .env.example          # 템플릿 (Git 추적)
├── .env                  # 개발용 (Git 제외)
├── .env.production       # 프로덕션 (Git 제외, 서버에만 보관)
└── .gitignore            # .env, .env.* 제외
```

---

## 5. Docker Compose 구성

### 서비스 구성표

| 서비스 | 이미지 | 포트 | 환경 |
|--------|--------|------|------|
| api | Custom (Fastify) | 3000 | dev/prod |
| web | Custom (Next.js) | 3001 | dev/prod |
| postgres | postgres:16-alpine | 5432 | dev/prod |
| redis | redis:7-alpine | 6379 | dev/prod |
| cloudflared | cloudflare/cloudflared | - | prod |
| adminer | adminer | 8080 | dev only |

### 볼륨 전략

| 볼륨 | 용도 | 백업 필요 |
|------|------|----------|
| `postgres_data` | DB 데이터 영구 보관 | Yes (매일) |
| `redis_data` | 캐시/세션 (재시작 복구용) | No |
| `./src/api` | API 소스 (hot-reload) | No |
| `./src/web` | Web 소스 (hot-reload) | No |

---

## 6. 배포 절차 (Deployment Flow)

### 6.1 초기 배포 (최초 1회)

```bash
# 1. 서버에 프로젝트 클론
git clone <repo-url> /opt/abada-shop
cd /opt/abada-shop

# 2. 환경 변수 설정
cp .env.example .env.production
nano .env.production  # 실제 값 입력

# 3. Cloudflare Tunnel credentials 배치
mkdir -p docker/cloudflare
# credentials.json 파일을 서버에 복사 (scp 또는 vault 사용)

# 4. config.yml 터널 ID 업데이트
# docker/cloudflare/config.yml에서 <tunnel-id> 실제 값으로 교체

# 5. 프로덕션 빌드 및 시작
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d --build

# 6. DB 마이그레이션
docker compose exec api npx prisma migrate deploy

# 7. 상태 확인
docker compose ps
docker compose logs --tail=50
```

### 6.2 업데이트 배포

```bash
# 1. 코드 업데이트
git pull origin main

# 2. 재빌드 및 재시작 (무중단)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --build --no-deps api web

# 3. DB 마이그레이션 (스키마 변경 시)
docker compose exec api npx prisma migrate deploy

# 4. 헬스체크
curl https://api.shop.abada.kr/health
```

### 6.3 롤백 절차

```bash
# 이전 이미지로 롤백 (이미지 태그 방식)
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --no-build --no-deps api web

# 또는 Git을 통한 롤백
git log --oneline -10           # 이전 커밋 확인
git checkout <commit-hash>      # 이전 버전으로
docker compose up -d --build    # 재빌드

# DB 롤백 (마이그레이션 되돌리기)
docker compose exec api npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 7. SSL/TLS 구성

### Cloudflare SSL 모드

```
사용자 ←── HTTPS (TLS 1.3) ──→ Cloudflare Edge
                                      │
                               (Cloudflare 인증서)
                                      │
Cloudflare ←── HTTP (내부망) ──→ cloudflared ──→ Docker
```

| 설정 | 값 | 비고 |
|------|-----|------|
| SSL/TLS 암호화 모드 | Full (strict) 권장 | Cloudflare 대시보드 설정 |
| 인증서 발급 | Cloudflare 자동 | Let's Encrypt 불필요 |
| HSTS | Cloudflare에서 활성화 | |
| 최소 TLS 버전 | TLS 1.2+ | Cloudflare 설정 |

### Cloudflare 대시보드 설정

```
SSL/TLS > Overview > Full (strict)
SSL/TLS > Edge Certificates > Always Use HTTPS: ON
SSL/TLS > Edge Certificates > HSTS: Enable
Security > Settings > Security Level: Medium
```

---

## 8. 백업 전략

### PostgreSQL 일일 백업

```bash
# 백업 스크립트: /opt/scripts/backup-postgres.sh
#!/bin/bash

BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="abada-shop-postgres-1"
DB_NAME="abada_shop"
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"

# 백업 디렉토리 생성
mkdir -p $BACKUP_DIR

# pg_dump 실행
docker exec $CONTAINER pg_dump -U postgres $DB_NAME | gzip > $BACKUP_FILE

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

```bash
# crontab 설정 (매일 새벽 2시)
crontab -e
# 추가:
0 2 * * * /opt/scripts/backup-postgres.sh >> /var/log/abada-backup.log 2>&1
```

### 백업 복원

```bash
# 백업 파일 복원
gunzip -c /opt/backups/postgres/backup_20260222_020000.sql.gz | \
  docker exec -i abada-shop-postgres-1 psql -U postgres abada_shop
```

---

## 9. 모니터링

### 기본 헬스체크

```bash
# 서비스 상태 확인
docker compose ps

# API 헬스체크
curl https://api.shop.abada.kr/health

# 로그 실시간 확인
docker compose logs -f api
docker compose logs -f web

# 리소스 사용량 확인
docker stats
```

### Cloudflare 모니터링

```
Zero Trust 대시보드 > Networks > Tunnels > abada-shop
- 연결 상태 확인
- 트래픽 통계
- 에러 로그
```

---

## 10. 보안 설정

### 서버 방화벽 (ufw)

```bash
# 기본: 모든 인바운드 차단
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH만 허용
sudo ufw allow 22/tcp

# Cloudflare Tunnel 사용으로 80/443 불필요
# Docker 내부 포트만 사용 (외부 노출 안 됨)

sudo ufw enable
```

### .gitignore 필수 항목

```
# 환경 변수 (절대 커밋 금지)
.env
.env.*
!.env.example

# Cloudflare credentials
docker/cloudflare/credentials.json

# 백업 파일
*.sql
*.sql.gz
```

---

## 11. 개발 환경 vs 프로덕션 비교

| 항목 | 개발 (docker-compose.yml) | 프로덕션 (prod override) |
|------|--------------------------|------------------------|
| API 실행 | `tsx watch` (hot-reload) | `node dist/index.js` |
| Web 실행 | `next dev` (hot-reload) | `next start` |
| 소스 마운트 | Yes (volume) | No (COPY) |
| Adminer | Yes (port 8080) | No |
| 리소스 제한 | None | CPU/Memory limits |
| 로그 로테이션 | None | 10MB/3 files |
| Cloudflared | No | Yes |
| Restart Policy | `unless-stopped` | `always` |

---

## 12. 관련 파일 목록

| 파일 | 용도 |
|------|------|
| `docker/docker-compose.yml` | 기본/개발 환경 |
| `docker/docker-compose.prod.yml` | 프로덕션 오버라이드 |
| `docker/cloudflare/config.yml` | Cloudflare Tunnel 설정 |
| `.env.example` | 환경 변수 템플릿 |
| `docker/cloudflare/credentials.json` | Tunnel 인증 (Git 제외) |

---

**Design**: infra-deployment | **Updated**: 2026-02-22
