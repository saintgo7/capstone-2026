# Plan: abada 쇼핑몰 (abada-shop)

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Plan
**Level**: Enterprise

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | abada 쇼핑몰 |
| 도메인 | shop.abada.kr |
| 서버 | ws-248-247 |
| 배포 | Cloudflare Tunnel |
| 데이터베이스 | PostgreSQL |
| 아키텍처 | DDD + CQRS + Hexagonal |
| 플랫폼 | Web (Next.js) + Mobile (React Native/Expo) |

### 목적

abada 브랜드의 종합 온라인 쇼핑몰. PC/모바일 웹과 iOS/Android 네이티브 앱을 동시 지원하며,
DDD(Domain-Driven Design) 패턴으로 확장 가능한 백엔드를 구성한다.

---

## 2. 기술 스택

### Backend (API Server)
| 구성 | 기술 |
|------|------|
| Language | TypeScript 5.x + Node.js 22 |
| Framework | Fastify 5.x |
| Architecture | DDD + CQRS + Hexagonal |
| ORM | Prisma 6.x |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + Refresh Token |
| File Storage | Cloudflare R2 (S3 호환) |
| Queue | BullMQ (Redis 기반) |

### Frontend Web
| 구성 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 4 + shadcn/ui |
| State | Zustand + TanStack Query |
| Payment | 토스페이먼츠 |

### Mobile App
| 구성 | 기술 |
|------|------|
| Framework | React Native 0.76 (Expo SDK 52) |
| Navigation | Expo Router |
| State | Zustand + TanStack Query |
| UI | NativeWind (Tailwind for RN) |

### Infrastructure
| 구성 | 기술 |
|------|------|
| 서버 | ws-248-247 (온프레미스) |
| 터널 | Cloudflare Tunnel (Zero Trust) |
| 도메인 | shop.abada.kr |
| 컨테이너 | Docker + Docker Compose |
| SSL | Cloudflare (자동) |

---

## 3. DDD Bounded Context 설계

```
┌─────────────────────────────────────────────────────────┐
│                    abada 쇼핑몰                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  User    │  │ Product  │  │ Catalog  │             │
│  │ Context  │  │ Context  │  │ Context  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │              │              │                    │
│  ┌────▼──────────────▼──────────────▼─────┐            │
│  │              Order Context              │            │
│  └────────────────────┬────────────────────┘            │
│                        │                                 │
│  ┌─────────┐  ┌────────▼───────┐  ┌──────────┐        │
│  │Inventory│  │    Payment     │  │ Shipping │        │
│  │ Context │  │    Context     │  │ Context  │        │
│  └─────────┘  └────────────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Bounded Context 목록

| Context | 책임 | 주요 Aggregate |
|---------|------|----------------|
| **User** | 회원가입, 로그인, 프로필, 주소록 | Member, Address |
| **Product** | 상품 등록, 수정, 옵션 관리 | Product, ProductOption |
| **Catalog** | 카테고리, 검색, 진열 | Category, ProductDisplay |
| **Order** | 주문 생성, 상태 관리, 주문 내역 | Order, OrderItem |
| **Payment** | 결제, 환불, 영수증 | Payment |
| **Inventory** | 재고 추적, 예약, 복원 | Stock, StockReservation |
| **Shipping** | 배송지, 배송 추적, 배송사 | Shipment, TrackingInfo |

---

## 4. 핵심 기능 목록

### 4.1 회원 (User Context)
- [ ] 이메일 회원가입 / 로그인
- [ ] 소셜 로그인 (카카오, 네이버, 구글)
- [ ] 배송지 관리 (다중)
- [ ] 회원 등급 (일반/VIP/VVIP)
- [ ] 포인트 적립/사용

### 4.2 상품 (Product + Catalog Context)
- [ ] 상품 목록 / 상세
- [ ] 카테고리 계층 구조 (3단계)
- [ ] 상품 옵션 (색상, 사이즈 등)
- [ ] 상품 검색 (키워드, 필터, 정렬)
- [ ] 상품 이미지 업로드 (Cloudflare R2)
- [ ] 상품 리뷰 / 평점
- [ ] 위시리스트

### 4.3 주문 (Order Context)
- [ ] 장바구니 (비회원 포함)
- [ ] 주문서 작성
- [ ] 주문 확정
- [ ] 주문 내역 조회
- [ ] 주문 취소 / 반품 신청

### 4.4 결제 (Payment Context)
- [ ] 토스페이먼츠 연동
- [ ] 카드 / 가상계좌 / 계좌이체
- [ ] 포인트 결제
- [ ] 쿠폰 적용
- [ ] 환불 처리

### 4.5 배송 (Shipping Context)
- [ ] 배송지 선택
- [ ] 배송 현황 조회
- [ ] 배송 완료 처리

### 4.6 관리자
- [ ] 상품 관리 (CRUD)
- [ ] 주문 관리
- [ ] 회원 관리
- [ ] 통계 대시보드

### 4.7 모바일 앱 (React Native)
- [ ] Web 기능 전체 지원
- [ ] 푸시 알림 (주문 상태, 프로모션)
- [ ] 생체 인증 로그인
- [ ] 딥링크

---

## 5. 개발 단계 (Phase)

### Phase 1 — 기반 구성 (1주)
- 프로젝트 디렉토리 구조
- DDD Shared Kernel
- PostgreSQL 스키마 (Prisma)
- Docker Compose 로컬 환경
- Cloudflare Tunnel 연결

### Phase 2 — Core Domain (2주)
- User Context (회원, JWT Auth)
- Product Context (상품, 옵션)
- Catalog Context (카테고리, 검색)
- Inventory Context (재고)

### Phase 3 — Order & Payment (1주)
- Order Context (장바구니, 주문)
- Payment Context (토스페이먼츠)
- Shipping Context (배송)

### Phase 4 — Frontend Web (2주)
- Next.js 프로젝트 구성
- 공통 UI 컴포넌트 (Design System)
- 상품 목록/상세 페이지
- 주문/결제 플로우
- 마이페이지

### Phase 5 — Mobile App (2주)
- Expo 프로젝트 구성
- 공유 코드 (API 클라이언트, 상태)
- 네이티브 UI 구현
- 푸시 알림
- 앱스토어 배포 준비

### Phase 6 — 배포 & 운영 (1주)
- Docker 프로덕션 빌드
- Cloudflare Tunnel 설정
- 도메인 연결 (shop.abada.kr)
- 모니터링 설정

---

## 6. 프로젝트 구조

```
abada-shop/
├── apps/
│   ├── api/                    # Fastify API Server (DDD)
│   │   └── src/
│   │       ├── shared/         # Shared Kernel
│   │       ├── user/           # User Bounded Context
│   │       ├── product/        # Product Bounded Context
│   │       ├── catalog/        # Catalog Bounded Context
│   │       ├── order/          # Order Bounded Context
│   │       ├── payment/        # Payment Bounded Context
│   │       ├── inventory/      # Inventory Bounded Context
│   │       └── shipping/       # Shipping Bounded Context
│   ├── web/                    # Next.js Web App
│   │   └── src/
│   │       ├── app/            # App Router
│   │       ├── components/     # UI Components
│   │       └── features/       # Feature Modules
│   └── mobile/                 # React Native (Expo)
│       └── src/
│           ├── app/            # Expo Router
│           ├── components/     # Native Components
│           └── features/       # Feature Modules
├── packages/
│   ├── ui/                     # Shared UI Components
│   ├── api-client/             # API Client (web + mobile 공유)
│   └── types/                  # Shared TypeScript Types
├── docker/
│   ├── docker-compose.yml      # 로컬 개발
│   ├── docker-compose.prod.yml # 프로덕션
│   └── cloudflare/
│       └── config.yml          # Cloudflare Tunnel
├── prisma/
│   └── schema.prisma           # DB Schema
└── docs/
    ├── 01-plan/
    ├── 02-design/
    ├── 03-analysis/
    └── 04-report/
```

---

## 7. 배포 아키텍처

```
[사용자/앱]
    │
    ▼
[Cloudflare CDN + WAF]
    │
    ▼ (Cloudflare Tunnel - Zero Trust)
[ws-248-247 서버]
    ├── Docker: api (Fastify:3000)
    ├── Docker: web (Next.js:3001)
    ├── Docker: postgresql (5432)
    └── Docker: redis (6379)
```

---

## 8. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| API 응답시간 | p95 < 200ms |
| 페이지 로드 | LCP < 2.5s |
| 가용성 | 99.9% |
| 동시 접속 | 500 req/s |
| 테스트 커버리지 | Domain Layer 90%+ |

---

## 9. 관련 링크

- 서버: ws-248-247
- 도메인: shop.abada.kr
- 기존 홈페이지: abada-homepage (Cloudflare Pages)
- 참조 스킬: ddd-code-generator
