# Design: Mobile 앱 배포 + 모니터링 설계

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Level**: Enterprise

---

## 1. 전체 배포 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                  Mobile 배포 파이프라인                        │
│                                                              │
│  ┌────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  개발자    │    │  GitHub      │    │   EAS Build     │  │
│  │  로컬 환경 │───▶│  Actions CI  │───▶│  (Expo 클라우드)│  │
│  └────────────┘    └──────────────┘    └────────┬────────┘  │
│                                                  │           │
│                          ┌───────────────────────┘           │
│                          │                                   │
│               ┌──────────▼──────────┐                       │
│               │    빌드 아티팩트     │                       │
│               └──────────┬──────────┘                       │
│                          │                                   │
│          ┌───────────────┼───────────────┐                   │
│          │               │               │                   │
│   ┌──────▼──────┐ ┌──────▼──────┐ ┌────▼──────────┐        │
│   │  App Store  │ │ Google Play │ │  OTA Update   │        │
│   │   (iOS)     │ │  (Android)  │ │  (JS 변경만)  │        │
│   └─────────────┘ └─────────────┘ └───────────────┘        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   서버 모니터링 아키텍처                        │
│                                                              │
│  ws-248-247 (Docker)                                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  api  │  web  │  postgres  │  redis  │  cloudflared   │  │
│  └───┬───┴───┬───┴─────┬──────┴────┬────┴───────┬────────┘  │
│      │       │         │           │            │            │
│      └───────┴─────────┴───────────┴────────────┘            │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │  로그 집계      │                          │
│                  │ (Docker logs + │                          │
│                  │  파일 로테이션) │                          │
│                  └───────┬────────┘                          │
│                          │                                   │
│               ┌──────────▼──────────┐                        │
│               │    알림 발송         │                        │
│               │  (Slack Webhook)    │                        │
│               └─────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. EAS Build 설정

### 2.1 eas.json 구성

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
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "APP_ENV": "development",
        "API_URL": "https://api.shop.abada.kr"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_ENV": "staging",
        "API_URL": "https://api.shop.abada.kr"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
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

### 2.2 app.config.ts 구성

```typescript
import { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';

const config: ExpoConfig = {
  name: APP_ENV === 'production' ? 'abada 쇼핑몰' : `abada (${APP_ENV})`,
  slug: 'abada-shop',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'abada',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'kr.abada.shop',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: '상품 리뷰 사진 업로드에 사용됩니다.',
      NSPhotoLibraryUsageDescription: '프로필 사진 및 리뷰 사진 업로드에 사용됩니다.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'kr.abada.shop',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'standalone',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    [
      'expo-camera',
      { cameraPermission: '상품 리뷰 사진 촬영에 사용됩니다.' },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.API_URL,
    appEnv: APP_ENV,
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID',
    },
  },
  updates: {
    url: 'https://u.expo.dev/YOUR_EAS_PROJECT_ID',
    enabled: true,
    checkAutomatically: 'ON_LOAD',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
};

export default config;
```

---

## 3. OTA 업데이트 전략

### 3.1 런타임 버전 정책

| 정책 | 설명 | 사용 시점 |
|------|------|----------|
| `appVersion` | 앱 버전별 채널 분리 | 권장 (기본값) |
| `nativeVersion` | 네이티브 빌드 해시 기준 | 네이티브 변경 잦을 때 |
| `sdkVersion` | Expo SDK 버전 기준 | SDK 업그레이드 중심 |

### 3.2 업데이트 채널 구성

```
production 채널  ─── 앱스토어/플레이스토어 배포 빌드
preview 채널     ─── 내부 테스트 배포
development 채널 ─── 개발자 전용
```

### 3.3 OTA 적용 가능 변경 vs 스토어 배포 필요

| 변경 유형 | OTA 가능 | 스토어 배포 필요 |
|----------|---------|----------------|
| JS/TS 로직 변경 | Yes | No |
| 화면 UI 변경 | Yes | No |
| 이미지/에셋 변경 | Yes | No |
| 네이티브 모듈 추가 | No | Yes |
| app.json 권한 변경 | No | Yes |
| Expo SDK 업그레이드 | No | Yes |
| React Native 버전 업 | No | Yes |

### 3.4 OTA 업데이트 배포 명령

```bash
# 프로덕션 채널에 OTA 배포
eas update --channel production --message "hotfix: 결제 버그 수정"

# 특정 브랜치에 배포
eas update --branch main --channel production

# 업데이트 목록 확인
eas update:list --channel production
```

---

## 4. iOS App Store 배포 절차

### 4.1 사전 준비

```bash
# Apple Developer Program 등록 필요 ($99/년)
# App Store Connect에서 앱 등록

# 1. EAS 빌드 (프로덕션)
eas build --platform ios --profile production

# 2. TestFlight 제출 (내부 테스트)
eas submit --platform ios --profile production --latest

# 또는 자동 제출 포함 빌드
eas build --platform ios --profile production --auto-submit
```

### 4.2 App Store Connect 메타데이터

| 항목 | 내용 |
|------|------|
| 앱 이름 | abada 쇼핑몰 |
| 번들 ID | kr.abada.shop |
| 카테고리 | 쇼핑 |
| 연령 등급 | 4+ |
| 언어 | 한국어 (기본), 영어 |

### 4.3 필수 스크린샷 규격

| 기기 | 해상도 | 수량 |
|------|--------|------|
| iPhone 16 Pro Max | 1320 x 2868 | 최소 3장 |
| iPhone 8 Plus | 1242 x 2208 | 최소 3장 |
| iPad Pro 12.9" | 2048 x 2732 | 최소 3장 |

---

## 5. Google Play 배포 절차

### 5.1 사전 준비

```bash
# Google Play Console 계정 필요 ($25 일회성)
# 서비스 계정 키 생성 (JSON) → google-service-account.json

# 1. EAS 빌드 (AAB 형식)
eas build --platform android --profile production

# 2. Internal Testing 트랙 제출
eas submit --platform android --profile production --latest

# 트랙 옵션: internal, alpha, beta, production
```

### 5.2 google-services.json 설정

```bash
# Firebase Console에서 다운로드
# android/app/google-services.json 위치에 배치
# .gitignore에 추가 (민감 정보 포함)
```

---

## 6. Expo 푸시 알림 서버 연동

### 6.1 아키텍처

```
모바일 앱
    │ 1. 앱 시작 시 푸시 토큰 등록
    ▼
Expo Push Notification Service
    │
    ▼ (토큰 전달)
abada API Server (Fastify)
    │ 저장: users.expo_push_token
    │
    ├─── 2. 주문 완료 → 푸시 발송 요청
    ├─── 3. 배송 업데이트 → 푸시 발송 요청
    └─── 4. 프로모션 → 푸시 발송 요청
         │
         ▼
Expo Push API (https://exp.host/--/api/v2/push/send)
         │
         ▼
    APNs (iOS) / FCM (Android)
         │
         ▼
    사용자 기기
```

### 6.2 API 서버 푸시 알림 서비스 설계

```typescript
// src/api/src/notifications/push-notification.service.ts

interface PushNotificationPayload {
  to: string;          // Expo push token
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;  // Android notification channel
}

interface PushNotificationResult {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
  };
}

class PushNotificationService {
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
  private readonly CHUNK_SIZE = 100; // Expo 최대 배치 크기

  // 단일 발송
  async sendToUser(userId: string, payload: Omit<PushNotificationPayload, 'to'>): Promise<void>;

  // 배치 발송 (BullMQ 큐 활용)
  async sendBatch(tokens: string[], payload: Omit<PushNotificationPayload, 'to'>): Promise<void>;

  // 토큰 유효성 검증 및 정리
  async validateAndCleanTokens(results: PushNotificationResult[]): Promise<void>;
}
```

### 6.3 알림 유형별 설계

| 알림 유형 | 트리거 | 데이터 페이로드 |
|----------|--------|---------------|
| 주문 완료 | POST /orders 성공 | `{ type: 'ORDER_PLACED', orderId }` |
| 결제 완료 | Payment webhook | `{ type: 'PAYMENT_CONFIRMED', orderId }` |
| 배송 시작 | 배송 상태 업데이트 | `{ type: 'SHIPPING_STARTED', trackingNo }` |
| 배송 완료 | 배송 상태 업데이트 | `{ type: 'SHIPPING_DELIVERED', orderId }` |
| 할인 쿠폰 | 마케팅 트리거 | `{ type: 'COUPON_ISSUED', couponCode }` |
| 재입고 알림 | 재고 이벤트 | `{ type: 'RESTOCK', productId }` |

### 6.4 Android 알림 채널 설정

```typescript
// mobile/app/_layout.tsx
import * as Notifications from 'expo-notifications';

// Android 알림 채널 등록
await Notifications.setNotificationChannelAsync('orders', {
  name: '주문/배송',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
});

await Notifications.setNotificationChannelAsync('promotions', {
  name: '프로모션',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

---

## 7. GitHub Actions CI/CD 파이프라인

### 7.1 워크플로우 구성

```yaml
# .github/workflows/mobile-deploy.yml
name: Mobile Deploy

on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'
      - 'eas.json'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Build platform'
        required: true
        default: 'all'
        type: choice
        options: [all, ios, android]
      profile:
        description: 'Build profile'
        required: true
        default: 'production'
        type: choice
        options: [development, preview, production]

jobs:
  ota-update:
    name: OTA Update (JS changes only)
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Publish OTA update
        run: eas update --channel production --message "${{ github.event.head_commit.message }}"
        working-directory: mobile

  native-build:
    name: Native Build & Submit
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build and submit
        run: |
          eas build \
            --platform ${{ inputs.platform }} \
            --profile ${{ inputs.profile }} \
            --auto-submit \
            --non-interactive
        working-directory: mobile
```

### 7.2 필요한 GitHub Secrets

| Secret | 설명 |
|--------|------|
| `EXPO_TOKEN` | EAS 빌드 인증 토큰 |
| `APPLE_ID` | Apple Developer 계정 |
| `APPLE_TEAM_ID` | Apple Team ID |
| `ASC_APP_ID` | App Store Connect App ID |

---

## 8. 서버 모니터링

### 8.1 헬스체크 스크립트

```bash
#!/bin/bash
# /opt/scripts/health-check.sh

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
COMPOSE_DIR="/opt/abada-shop/docker"
SERVICES=("api" "web" "postgres" "redis" "cloudflared")
ALERT_SENT=false

check_service() {
  local service=$1
  local status=$(docker compose -f "${COMPOSE_DIR}/docker-compose.yml" \
    -f "${COMPOSE_DIR}/docker-compose.prod.yml" \
    ps --status running -q "$service" 2>/dev/null)

  if [ -z "$status" ]; then
    send_alert "CRITICAL" "$service 컨테이너가 중지되었습니다!"
    # 자동 재시작 시도
    docker compose -f "${COMPOSE_DIR}/docker-compose.yml" \
      -f "${COMPOSE_DIR}/docker-compose.prod.yml" \
      restart "$service"
  fi
}

check_api_health() {
  local response=$(curl -sf -o /dev/null -w "%{http_code}" \
    --max-time 10 https://api.shop.abada.kr/health 2>/dev/null)

  if [ "$response" != "200" ]; then
    send_alert "WARNING" "API 헬스체크 실패 (HTTP $response)"
  fi
}

check_disk_usage() {
  local usage=$(df /opt | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$usage" -gt 85 ]; then
    send_alert "WARNING" "디스크 사용률 ${usage}% 초과 (임계값: 85%)"
  fi
}

send_alert() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d "{
      \"text\": \"[${level}] abada-shop 서버 알림\",
      \"attachments\": [{
        \"color\": \"$([ '$level' = 'CRITICAL' ] && echo 'danger' || echo 'warning')\",
        \"fields\": [{
          \"title\": \"메시지\",
          \"value\": \"${message}\",
          \"short\": false
        }, {
          \"title\": \"시간\",
          \"value\": \"${timestamp}\",
          \"short\": true
        }, {
          \"title\": \"서버\",
          \"value\": \"ws-248-247\",
          \"short\": true
        }]
      }]
    }" > /dev/null
}

# 실행
for service in "${SERVICES[@]}"; do
  check_service "$service"
done
check_api_health
check_disk_usage
```

```bash
# crontab 설정 (5분마다 헬스체크)
crontab -e
# 추가:
*/5 * * * * /opt/scripts/health-check.sh >> /var/log/abada-health.log 2>&1
```

### 8.2 로그 집계 구성

```yaml
# docker/docker-compose.prod.yml에 추가된 로그 설정
# 각 서비스에 적용:
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,env"
    env: "NODE_ENV"
```

```bash
# 로그 조회 명령
# 실시간 통합 로그
docker compose logs -f --tail=100

# API 에러만 필터
docker compose logs api 2>&1 | grep -i error

# 특정 시간 이후 로그
docker compose logs --since="2026-02-22T03:00:00" api

# 로그 파일 위치 (Docker 기본)
# /var/lib/docker/containers/<container-id>/<container-id>-json.log
```

### 8.3 주요 모니터링 지표

| 지표 | 임계값 | 알림 레벨 |
|------|--------|----------|
| API 응답시간 (p95) | > 1000ms | WARNING |
| API 에러율 | > 1% | CRITICAL |
| 디스크 사용률 | > 85% | WARNING |
| 메모리 사용률 | > 90% | WARNING |
| DB 연결 실패 | 1회 이상 | CRITICAL |
| 컨테이너 재시작 | 1회 이상 | WARNING |
| Cloudflare Tunnel 단절 | 1회 이상 | CRITICAL |

### 8.4 API 헬스체크 엔드포인트 설계

```typescript
// GET /health - 기본 헬스체크
{
  "status": "ok",
  "timestamp": "2026-02-22T03:00:00Z",
  "version": "1.0.0"
}

// GET /health/detailed - 상세 헬스체크 (내부망 전용)
{
  "status": "ok",
  "services": {
    "database": { "status": "ok", "latency": 2 },
    "redis": { "status": "ok", "latency": 1 },
    "r2": { "status": "ok" }
  },
  "system": {
    "uptime": 86400,
    "memory": { "used": 256, "total": 512 }
  }
}
```

---

## 9. 환경별 구성 요약

| 항목 | Development | Preview | Production |
|------|-------------|---------|------------|
| API URL | localhost:3000 | api.shop.abada.kr | api.shop.abada.kr |
| OTA 채널 | development | preview | production |
| 앱 이름 | abada (dev) | abada (preview) | abada 쇼핑몰 |
| 아이콘 | 개발용 | 스테이징용 | 정식 |
| EAS 프로필 | development | preview | production |
| 빌드 형식 | APK / Sim | APK / IPA | AAB / IPA |
| 배포 대상 | 내부 | TestFlight / Internal | App Store / Play |

---

## 10. 관련 파일 목록

| 파일 | 용도 |
|------|------|
| `mobile/eas.json` | EAS Build/Submit 설정 |
| `mobile/app.config.ts` | Expo 앱 설정 |
| `.github/workflows/mobile-deploy.yml` | CI/CD 파이프라인 |
| `/opt/scripts/health-check.sh` | 서버 헬스체크 스크립트 |
| `/opt/scripts/backup-postgres.sh` | DB 백업 스크립트 (infra-deployment 참조) |

---

**Design**: mobile-deploy-monitoring | **Updated**: 2026-02-22
