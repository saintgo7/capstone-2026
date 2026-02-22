# abada-shop 배포 가이드

## 서버 정보
- **서버**: ws-248-247
- **도메인**: shop.abada.kr
- **API**: api.shop.abada.kr
- **배포 방식**: Docker Compose + Cloudflare Tunnel

---

## 1. 서버 초기 설정 (ws-248-247)

```bash
# Docker 설치 (Ubuntu)
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# cloudflared 설치
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb
```

## 2. Cloudflare Tunnel 설정

```bash
# Cloudflare 로그인
cloudflared tunnel login

# Tunnel 생성
cloudflared tunnel create abada-shop

# DNS 라우팅 설정
cloudflared tunnel route dns abada-shop shop.abada.kr
cloudflared tunnel route dns abada-shop api.shop.abada.kr

# Tunnel UUID 확인
cloudflared tunnel list
```

## 3. 설정 파일 업데이트

`docker/cloudflare/config.yml`의 `<tunnel-id>`를 실제 UUID로 교체:

```yaml
tunnel: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
credentials-file: /etc/cloudflare/credentials.json
```

credentials.json은 `~/.cloudflared/<tunnel-id>.json`에 생성됨.

## 4. 프로젝트 배포

```bash
# 프로젝트 클론
git clone <repo-url> /opt/abada-shop
cd /opt/abada-shop

# 환경변수 설정
cp .env.production.example .env.production
nano .env.production  # 실제 값 입력

# Cloudflare credentials 복사
mkdir -p docker/cloudflare
cp ~/.cloudflared/<tunnel-id>.json docker/cloudflare/credentials.json

# 배포 실행
chmod +x scripts/deploy.sh
./scripts/deploy.sh prod
```

## 5. 서비스 확인

```bash
# 컨테이너 상태
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# API 헬스체크
curl https://api.shop.abada.kr/health

# 웹 확인
curl -I https://shop.abada.kr
```

## 6. 로그 확인

```bash
# API 로그
docker logs abada-api -f

# Tunnel 로그
docker logs abada-cloudflared -f

# PostgreSQL 로그
docker logs abada-postgres -f
```

## 7. Prisma 마이그레이션 (스키마 변경 시)

```bash
# 마이그레이션 생성 (로컬)
npm --workspace=@abada/api run prisma migrate dev --name <migration-name>

# 서버에서 마이그레이션 적용
docker exec abada-api npx prisma migrate deploy
```

---

## 트러블슈팅

### 터널 연결 안됨
```bash
cloudflared tunnel info abada-shop
docker logs abada-cloudflared
```

### DB 연결 실패
```bash
docker exec abada-postgres pg_isready -U abada -d abada_shop
```

### API 500 에러
```bash
docker logs abada-api --tail 50
docker exec abada-api npx prisma db push
```
