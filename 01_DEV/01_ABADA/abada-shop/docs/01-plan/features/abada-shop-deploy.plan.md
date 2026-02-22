# Plan: abada-shop-deploy

**Feature**: abada-shop-deploy
**Date**: 2026-02-22
**Level**: Enterprise
**Phase**: Phase 3 - Production Deployment

---

## 1. Overview

abada-shop Phase 1+2 개발 완료 (90.6% matchRate) 후 프로덕션 배포 자동화.
Docker Compose 전체 스택 구성, GitHub Actions CI/CD 파이프라인, 실서버(ws-248-247) 배포.

---

## 2. Goals

- [ ] Docker Compose: API + Web + Mobile(Expo) + PostgreSQL + Redis + Nginx
- [ ] GitHub Actions CI/CD: lint → test → build → deploy 파이프라인
- [ ] 실서버 배포: ws-248-247 서버 (shop.abada.kr 도메인)
- [ ] Cloudflare Tunnel 연동
- [ ] 환경변수 관리 (.env.production)
- [ ] 헬스체크 엔드포인트
- [ ] 모니터링 기초 (로그 수집)

---

## 3. Scope

### In Scope
- `docker-compose.yml` (개발용)
- `docker-compose.prod.yml` (프로덕션용)
- `Dockerfile` (API, Web)
- `.github/workflows/deploy.yml` (CI/CD)
- `nginx.conf` (리버스 프록시)
- `.env.production.example` (환경변수 템플릿)
- `scripts/deploy.sh` (배포 스크립트)
- `apps/api/src/health/` (헬스체크 엔드포인트)

### Out of Scope
- Kubernetes (추후 Phase 4)
- Terraform IaC (추후 Phase 4)
- 상품 리뷰/옵션 시스템

---

## 4. Technical Requirements

### 서버 정보
- Host: ws-248-247
- Domain: shop.abada.kr
- OS: Ubuntu 22.04 (예상)
- Docker Engine: 24+

### 포트 구성
| 서비스 | 내부 포트 | 외부 포트 |
|--------|----------|----------|
| API | 3001 | 3001 (Nginx 프록시) |
| Web (Next.js) | 3000 | 80/443 (Nginx) |
| PostgreSQL | 5432 | 미노출 |
| Redis | 6379 | 미노출 |

### GitHub Actions 파이프라인
```
Push to main
  → lint (ESLint + tsc --noEmit)
  → test (API unit tests)
  → build (Docker images)
  → push (GitHub Container Registry)
  → deploy (SSH to ws-248-247, docker compose pull + up)
```

---

## 5. Team Strategy (Agent Teams)

| Agent | 역할 | 담당 |
|-------|------|------|
| infra-agent (sonnet) | Docker Compose + Nginx + 배포 스크립트 | docker-compose.yml, Dockerfile, nginx.conf |
| cicd-agent (sonnet) | GitHub Actions CI/CD | .github/workflows/deploy.yml |
| health-agent (sonnet) | 헬스체크 + 환경변수 | /health endpoint, .env.example |

---

## 6. Success Criteria

- [ ] `docker compose up` 으로 전체 스택 로컬 실행 성공
- [ ] GitHub Actions 파이프라인 green
- [ ] shop.abada.kr 접속 시 Next.js 앱 표시
- [ ] API `/health` 엔드포인트 200 응답
- [ ] 환경변수 문서화 완료

---

## 7. Risks

| 리스크 | 대응 |
|--------|------|
| ws-248-247 서버 접근 권한 | SSH key 설정 필요 (사용자 직접 설정) |
| Cloudflare Tunnel 설정 | cloudflared 설치 스크립트 포함 |
| Next.js standalone 빌드 | output: 'standalone' 설정 필요 |
| Prisma 마이그레이션 | 배포 스크립트에 migrate deploy 포함 |
