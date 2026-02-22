# Design: Mobile 앱 배포 + 모니터링

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Level**: Enterprise

---

## 1. Expo/EAS 빌드 파이프라인

### 1.1 eas.json 프로파일 구성

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": {
        "APP_ENV": "development",
        "API_URL": "http://localhost:3000"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "APP_ENV": "preview",
        "API_URL": "https://api.shop.abada.kr"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.shop.abada.kr"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@abada.kr",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 1.2 앱 버전 관리 (Semver + BuildNumber)

```
버전 형식: MAJOR.MINOR.PATCH  (예: 1.2.3)
- MAJOR: 하위 호환 불가 변경 (디자인 전면 개편, 네이티브 구조 변경)
- MINOR: 새 기능 추가 (신규 화면, 기능 추가)
- PATCH: 버그 수정, OTA 가능 변경
```

| 항목 | iOS | Android | 관리 방식 |
|------|-----|---------|----------|
| 사용자 표시 버전 | CFBundleShortVersionString | versionName | `version` in app.config.ts |
| 빌드 식별자 | CFBundleVersion | versionCode | `autoIncrement: true` (EAS 자동) |
| OTA 채널 분리 | `runtimeVersion: { policy: "appVersion" }` | 동일 | appVersion 기준 |

```typescript
// app.config.ts 버전 전략
const config: ExpoConfig = {
  version: '1.0.0',               // semver (사용자 표시)
  ios: { buildNumber: '1' },      // EAS autoIncrement로 자동 증가
  android: { versionCode: 1 },    // EAS autoIncrement로 자동 증가
  runtimeVersion: {
    policy: 'appVersion',         // 1.0.0 → OTA 채널, 1.1.0 → 새 채널
  },
};
```

### 1.3 iOS App Store 배포 흐름

```
로컬 개발
    │
    ▼
eas build --platform ios --profile production
    │ EAS 클라우드에서 빌드 (Xcode 최신)
    ▼
.ipa 생성
    │
    ▼
eas submit --platform ios   (또는 --auto-submit)
    │ App Store Connect 업로드
    ▼
TestFlight 내부 테스트 (최대 90일)
    │ 통과 후
    ▼
App Store Review 제출
    │ Apple 심사 (1~2일)
    ▼
App Store 출시
```

**필수 사전 준비:**

| 항목 | 위치 | 비고 |
|------|------|------|
| Apple Developer Program | developer.apple.com | $99/년 |
| App Store Connect 앱 등록 | appstoreconnect.apple.com | Bundle ID: kr.abada.shop |
| 인증서/프로비저닝 | EAS 자동 관리 | `eas credentials` |
| 스크린샷 | App Store Connect | iPhone 16 Pro Max 필수 |

### 1.4 Android Google Play 배포 흐름

```
로컬 개발
    │
    ▼
eas build --platform android --profile production
    │ EAS 클라우드에서 빌드 (AAB 형식)
    ▼
.aab 생성
    │
    ▼
eas submit --platform android  (또는 --auto-submit)
    │ Google Play Console 업로드
    ▼
Internal Testing (즉시 배포, 최대 100명)
    │
    ▼
Closed Testing (Alpha) → Open Testing (Beta)
    │
    ▼
Production 출시 (단계적 롤아웃 가능: 10% → 50% → 100%)
```

**필수 사전 준비:**

| 항목 | 비고 |
|------|------|
| Google Play Console | $25 일회성 |
| 서비스 계정 키 | `google-service-account.json` (.gitignore) |
| google-services.json | Firebase Console → android/app/ |
| 앱 서명 | Play App Signing 위임 (권장) |

### 1.5 OTA 업데이트 전략

**OTA 적용 가능 vs 스토어 배포 필요:**

| 변경 유형 | OTA | 스토어 |
|----------|-----|--------|
| JS/TS 로직, 화면 UI | Yes | No |
| 이미지/폰트 에셋 | Yes | No |
| 네이티브 모듈 추가/변경 | No | Yes |
| app.config 권한 변경 | No | Yes |
| Expo SDK / RN 버전 업 | No | Yes |

**OTA 배포 명령:**

```bash
# 프로덕션 채널 OTA 배포
eas update --channel production --message "fix: 결제 화면 버그 수정"

# 특정 런타임 버전 타겟
eas update --channel production --runtime-version 1.2.0

# 업데이트 목록 확인
eas update:list --channel production

# 특정 업데이트 롤백 (이전 업데이트로 재발행)
eas update --channel production --message "rollback" \
  --republish --group <previous-update-group-id>
```

---

## 2. 푸시 알림 서버 연동

### 2.1 전체 흐름

```
모바일 앱 시작
    │ 1. 알림 권한 요청
    │ 2. Expo 푸시 토큰 수신
    ▼
POST /mobile/push-token
    │ { token: "ExponentPushToken[xxx]", platform: "ios" }
    ▼
API Server (Fastify)
    │ users.expo_push_token 저장
    │
    ├── 주문 완료 이벤트 → BullMQ 큐 enqueue
    ├── 배송 상태 변경 → BullMQ 큐 enqueue
    └── 프로모션 발송 → BullMQ 큐 enqueue (배치)
         │
         ▼
BullMQ Worker (최대 100개 배치)
         │
         ▼
Expo Push API (https://exp.host/--/api/v2/push/send)
         │
         ├── APNs (iOS)
         └── FCM (Android)
              │
              ▼
         사용자 기기
```

### 2.2 `/mobile/push-token` 엔드포인트

```typescript
// POST /mobile/push-token
// Request
interface RegisterPushTokenRequest {
  token: string;       // "ExponentPushToken[xxxxxxxx]"
  platform: 'ios' | 'android';
  deviceId?: string;   // 기기 식별자 (선택)
}

// Response
interface RegisterPushTokenResponse {
  success: boolean;
}

// 처리 로직
// 1. JWT로 인증된 사용자 확인
// 2. users 테이블의 expo_push_token 업데이트 (upsert)
// 3. 토큰 유효성 Expo API로 사전 검증 (선택)
```

### 2.3 알림 유형별 트리거

| 알림 유형 | 트리거 이벤트 | 데이터 페이로드 | 채널 |
|----------|-------------|---------------|------|
| 주문 접수 | `order.created` | `{ orderId, amount }` | orders |
| 결제 완료 | `payment.confirmed` | `{ orderId, amount }` | orders |
| 배송 시작 | `shipping.started` | `{ orderId, trackingNo, carrier }` | orders |
| 배송 완료 | `shipping.delivered` | `{ orderId }` | orders |
| 주문 취소 | `order.cancelled` | `{ orderId, reason }` | orders |
| 재입고 | `inventory.restocked` | `{ productId, productName }` | promotions |
| 할인 쿠폰 | 마케팅 트리거 | `{ couponCode, expiresAt }` | promotions |

### 2.4 실패 처리 및 토큰 정리

```typescript
// 푸시 발송 후 결과 처리
async function handlePushResults(results: ExpoPushTicket[]): Promise<void> {
  const invalidTokens: string[] = [];

  for (const result of results) {
    if (result.status === 'error') {
      if (result.details?.error === 'DeviceNotRegistered') {
        // 앱 삭제 또는 알림 거부 → 토큰 삭제
        invalidTokens.push(result.expoPushToken);
      }
    }
  }

  if (invalidTokens.length > 0) {
    await db.user.updateMany({
      where: { expoPushToken: { in: invalidTokens } },
      data: { expoPushToken: null },
    });
  }
}
```

---

## 3. 서버 모니터링 (ws-248-247)

### 3.1 Docker 컨테이너 헬스체크

```bash
# 전체 서비스 상태 확인
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml ps

# 개별 컨테이너 헬스 상태
docker inspect --format='{{.Name}} {{.State.Health.Status}}' \
  abada-api abada-web abada-postgres abada-redis

# 실시간 리소스 사용량
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# API 엔드포인트 헬스체크
curl -sf https://api.shop.abada.kr/health | jq .

# DB 연결 확인
docker exec abada-postgres pg_isready -U abada -d abada_shop

# Redis 연결 확인
docker exec abada-redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping
```

### 3.2 로그 집계 및 파일 로테이션

**Docker 로그 설정** (docker-compose.prod.yml 적용):

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"   # 파일당 최대 10MB
    max-file: "3"     # 최대 3개 파일 (총 30MB)
```

**로그 조회 명령:**

```bash
# 실시간 통합 로그
docker compose logs -f --tail=100

# 서비스별 에러 필터
docker compose logs api 2>&1 | grep -i "error\|warn" | tail -50

# 특정 시간 이후 로그
docker compose logs --since="2026-02-22T00:00:00"

# JSON 로그 파싱 (jq 활용)
docker logs abada-api --tail=100 | \
  jq -r 'select(.level == "error") | [.time, .msg] | @tsv'
```

**로그 파일 실제 위치:**

```bash
# Docker 컨테이너 로그 파일 위치
/var/lib/docker/containers/<container-id>/<container-id>-json.log

# 컨테이너 ID 확인
docker inspect --format='{{.Id}}' abada-api
```

### 3.3 디스크/메모리/CPU 알림 스크립트

```bash
# /opt/scripts/health-check.sh (5분 간격 cron)
# */5 * * * * /opt/scripts/health-check.sh >> /var/log/abada-health.log 2>&1

#!/bin/bash
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

send_alert() {
  local level="$1" message="$2"
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d "{\"text\": \"[${level}] abada-shop: ${message} (${TIMESTAMP})\"}" > /dev/null
}

# 디스크 사용률
DISK=$(df /opt | tail -1 | awk '{print $5}' | tr -d '%')
[ "$DISK" -gt 90 ] && send_alert "CRITICAL" "디스크 ${DISK}% 초과"
[ "$DISK" -gt 85 ] && [ "$DISK" -le 90 ] && send_alert "WARNING" "디스크 ${DISK}%"

# 메모리 사용률
MEM=$(free | awk '/^Mem:/{printf "%.0f", $3/$2*100}')
[ "$MEM" -gt 90 ] && send_alert "WARNING" "메모리 ${MEM}% 초과"

# CPU (1분 Load Average / CPU 코어 수)
CORES=$(nproc)
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
LOAD_INT=$(echo "$LOAD * 100 / $CORES" | bc 2>/dev/null || echo "0")
[ "$LOAD_INT" -gt 80 ] && send_alert "WARNING" "CPU Load ${LOAD} (코어: ${CORES}개)"

# 컨테이너 상태
for svc in api web postgres redis cloudflared; do
  STATUS=$(docker compose -f /opt/abada-shop/docker/docker-compose.yml \
    -f /opt/abada-shop/docker/docker-compose.prod.yml \
    ps --status running -q "$svc" 2>/dev/null)
  [ -z "$STATUS" ] && send_alert "CRITICAL" "${svc} 컨테이너 중지"
done

# API 헬스체크
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 \
  https://api.shop.abada.kr/health 2>/dev/null || echo "000")
[ "$HTTP_CODE" != "200" ] && send_alert "CRITICAL" "API 헬스체크 실패 (HTTP ${HTTP_CODE})"
```

### 3.4 PostgreSQL 커넥션 풀 모니터링

**현재 연결 상태 확인:**

```sql
-- 전체 연결 현황
SELECT
  state,
  COUNT(*) AS count,
  MAX(NOW() - state_change) AS max_duration
FROM pg_stat_activity
WHERE datname = 'abada_shop'
GROUP BY state;

-- 연결 대기 중인 쿼리
SELECT pid, wait_event_type, wait_event, query_start, query
FROM pg_stat_activity
WHERE datname = 'abada_shop'
  AND state = 'active'
  AND wait_event IS NOT NULL;

-- 최대 연결 수 확인
SHOW max_connections;

-- 현재 사용 중인 연결 수
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'abada_shop';
```

**Prisma 커넥션 풀 설정:**

```
# DATABASE_URL에 풀 파라미터 추가
DATABASE_URL="postgresql://abada:password@postgres:5432/abada_shop
  ?schema=public
  &connection_limit=10
  &pool_timeout=20
  &connect_timeout=10"
```

| 파라미터 | 권장값 | 설명 |
|---------|--------|------|
| `connection_limit` | CPU 코어 수 × 2 + 1 | 최대 DB 연결 수 |
| `pool_timeout` | 20 | 연결 획득 대기 시간(초) |
| `connect_timeout` | 10 | DB 연결 타임아웃(초) |

**커넥션 풀 모니터링 쿼리 (cron으로 주기 실행):**

```bash
# /opt/scripts/monitor-postgres.sh (1분 간격)
#!/bin/bash
CONN_COUNT=$(docker exec abada-postgres psql -U abada -d abada_shop -t -c \
  "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'abada_shop';" | tr -d ' ')

MAX_CONN=$(docker exec abada-postgres psql -U abada -d abada_shop -t -c \
  "SHOW max_connections;" | tr -d ' ')

USAGE_PCT=$((CONN_COUNT * 100 / MAX_CONN))

if [ "$USAGE_PCT" -gt 80 ]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\": \"[WARNING] PostgreSQL 커넥션 ${CONN_COUNT}/${MAX_CONN} (${USAGE_PCT}%)\"}" \
    > /dev/null
fi
```

---

## 4. 배포 체크리스트

### 4.1 로컬 개발 → 스테이징

```
[ ] 기능 구현 완료 및 로컬 테스트 통과
[ ] TypeScript 타입 에러 없음 (tsc --noEmit)
[ ] ESLint 에러 없음 (npm run lint)
[ ] API 엔드포인트 수동 검증 (Postman/curl)
[ ] 새 환경 변수 .env.example에 추가
[ ] DB 마이그레이션 파일 생성 확인 (npx prisma migrate dev)
[ ] Git 커밋 및 main 브랜치 머지
[ ] GitHub Actions OTA 배포 자동 실행 확인
[ ] preview 채널 앱에서 변경사항 확인
[ ] Slack 알림 정상 수신 확인
```

### 4.2 스테이징 → 프로덕션 (서버 배포)

```
[ ] 스테이징 환경 전체 기능 검증 완료
[ ] 성능 테스트 통과 (API p95 < 200ms)
[ ] .env.production 환경 변수 업데이트 확인
[ ] DB 마이그레이션 dry-run 검토
      npx prisma migrate diff --from-url $PROD_DB --to-schema-datamodel prisma/schema.prisma
[ ] Docker 이미지 빌드 테스트
      docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml build
[ ] 배포 전 DB 백업 실행 (수동)
      /opt/scripts/backup-postgres.sh
[ ] 프로덕션 배포 실행
      docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
        up -d --build --no-deps api web
[ ] DB 마이그레이션 실행
      docker compose exec api npx prisma migrate deploy
[ ] 배포 후 헬스체크
      curl https://api.shop.abada.kr/health
[ ] 주요 기능 스모크 테스트 (로그인, 상품 조회, 장바구니)
[ ] Cloudflare Tunnel 연결 상태 확인 (Zero Trust 대시보드)
[ ] 에러 로그 모니터링 (10분간)
```

### 4.3 스토어 앱 배포 (네이티브 변경 시)

```
[ ] app.config.ts 버전 번호 업데이트 (version)
[ ] CHANGELOG 업데이트
[ ] EAS 프로덕션 빌드 실행
      eas build --platform all --profile production
[ ] TestFlight 내부 테스트 (iOS, 최소 1일)
[ ] Google Play Internal Testing (Android, 최소 1일)
[ ] 스토어 메타데이터 업데이트 (스크린샷, 릴리즈 노트)
[ ] App Store 심사 제출
[ ] Google Play 프로덕션 단계적 롤아웃 (10% → 100%)
```

### 4.4 롤백 절차

**서버 배포 롤백:**

```bash
# 1. 이전 Git 커밋으로 체크아웃
git log --oneline -10
git checkout <previous-commit-hash>

# 2. 이미지 재빌드 및 재시작
docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml \
  up -d --build --no-deps api web

# 3. DB 마이그레이션 롤백 (필요 시)
docker compose exec api npx prisma migrate resolve \
  --rolled-back <migration-name>

# 4. 이전 DB 백업에서 복원 (최후 수단)
gunzip -c /opt/backups/postgres/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i abada-postgres psql -U abada abada_shop
```

**OTA 업데이트 롤백:**

```bash
# 이전 업데이트 그룹 ID 확인
eas update:list --channel production

# 이전 업데이트 재발행
eas update \
  --channel production \
  --message "rollback to previous version" \
  --republish \
  --group <previous-update-group-id>
```

**스토어 앱 롤백:**

| 플랫폼 | 방법 | 비고 |
|--------|------|------|
| iOS | App Store Connect에서 이전 버전 재활성화 | 심사 없이 즉시 가능 |
| Android | Play Console 단계적 롤아웃 일시정지 | 신규 설치만 차단 |
| OTA | 이전 업데이트 재발행 | 즉시 적용 (앱 재시작 시) |

---

## 5. 관련 파일 목록

| 파일 | 용도 |
|------|------|
| `mobile/eas.json` | EAS Build/Submit 프로파일 |
| `mobile/app.config.ts` | Expo 앱 메타데이터 및 버전 |
| `.github/workflows/mobile-deploy.yml` | CI/CD 파이프라인 |
| `scripts/health-check.sh` | 서버 헬스체크 (5분 cron) |
| `scripts/backup-postgres.sh` | DB 백업 (새벽 2시 cron) |
| `docker/docker-compose.prod.yml` | 프로덕션 Docker 구성 |

---

**Design**: mobile-deployment-monitoring | **Updated**: 2026-02-22
