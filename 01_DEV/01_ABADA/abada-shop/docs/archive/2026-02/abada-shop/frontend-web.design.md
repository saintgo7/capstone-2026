# Design: Frontend Web - Next.js 페이지 구조 + 컴포넌트 설계

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Stack**: Next.js 15 (App Router) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui

---

## 목차

1. [디렉토리 구조](#1-디렉토리-구조)
2. [라우팅 설계 (App Router)](#2-라우팅-설계-app-router)
3. [레이아웃 계층 구조](#3-레이아웃-계층-구조)
4. [페이지별 설계](#4-페이지별-설계)
5. [공통 컴포넌트](#5-공통-컴포넌트)
6. [상태 관리 설계](#6-상태-관리-설계)
7. [API 클라이언트 설계](#7-api-클라이언트-설계)
8. [렌더링 전략](#8-렌더링-전략)
9. [성능 최적화](#9-성능-최적화)

---

## 1. 디렉토리 구조

```text
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (shop)/                   # 쇼핑몰 Route Group (공통 Header/Footer)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # 홈 (/)
│   │   │   ├── products/
│   │   │   │   ├── page.tsx          # 상품 목록
│   │   │   │   └── [productId]/
│   │   │   │       └── page.tsx      # 상품 상세
│   │   │   ├── categories/
│   │   │   │   └── [categoryId]/
│   │   │   │       └── page.tsx      # 카테고리별 상품
│   │   │   ├── cart/
│   │   │   │   └── page.tsx          # 장바구니
│   │   │   ├── orders/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx      # 주문서 작성
│   │   │   │   └── [orderId]/
│   │   │   │       ├── page.tsx      # 주문 상세
│   │   │   │       └── complete/
│   │   │   │           └── page.tsx  # 주문 완료
│   │   │   ├── my/                   # 마이페이지
│   │   │   │   ├── layout.tsx        # 마이페이지 사이드바 레이아웃
│   │   │   │   ├── page.tsx          # 마이페이지 홈
│   │   │   │   ├── orders/
│   │   │   │   │   ├── page.tsx      # 주문 내역
│   │   │   │   │   └── [orderId]/
│   │   │   │   │       └── page.tsx  # 주문 상세
│   │   │   │   ├── points/
│   │   │   │   │   └── page.tsx      # 포인트 내역
│   │   │   │   ├── addresses/
│   │   │   │   │   └── page.tsx      # 배송지 관리
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx      # 회원정보 수정
│   │   │   └── search/
│   │   │       └── page.tsx          # 검색 결과
│   │   ├── (auth)/                   # 인증 Route Group (Header 없음)
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── [provider]/
│   │   │               └── page.tsx  # 소셜 로그인 콜백
│   │   ├── (payment)/                # 결제 Route Group (최소 UI)
│   │   │   ├── layout.tsx
│   │   │   └── payments/
│   │   │       ├── checkout/
│   │   │       │   └── page.tsx      # 토스페이먼츠 결제창
│   │   │       └── result/
│   │   │           └── page.tsx      # 결제 결과 (success/fail)
│   │   ├── admin/                    # 관리자 (별도 레이아웃)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # 대시보드
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── members/
│   │   │       ├── page.tsx
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   ├── api/                      # Route Handlers (BFF 역할)
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx                # Root Layout
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── common/                   # 전역 공통 컴포넌트
│   │   │   ├── Header/
│   │   │   ├── Footer/
│   │   │   ├── CartDrawer/
│   │   │   ├── SearchBar/
│   │   │   └── Providers/
│   │   ├── ui/                       # shadcn/ui 기반 기본 UI
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   └── ...
│   │   ├── product/                  # 상품 관련 컴포넌트
│   │   │   ├── ProductCard/
│   │   │   ├── ProductGrid/
│   │   │   ├── ProductFilter/
│   │   │   ├── ProductImageGallery/
│   │   │   ├── ProductOptionSelector/
│   │   │   └── ReviewList/
│   │   ├── cart/
│   │   │   ├── CartItem/
│   │   │   └── CartSummary/
│   │   ├── order/
│   │   │   ├── OrderForm/
│   │   │   ├── OrderItem/
│   │   │   └── OrderStatusBadge/
│   │   └── admin/
│   │       ├── DataTable/
│   │       ├── StatCard/
│   │       └── SalesChart/
│   ├── features/                     # Feature-based 모듈
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   ├── product/
│   │   │   └── hooks/
│   │   ├── cart/
│   │   │   ├── hooks/
│   │   │   └── stores/
│   │   └── order/
│   │       └── hooks/
│   ├── lib/
│   │   ├── api/                      # API 클라이언트
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── cart.ts
│   │   │   ├── orders.ts
│   │   │   └── payments.ts
│   │   ├── utils/
│   │   │   ├── format.ts             # 가격, 날짜 포맷
│   │   │   └── cn.ts                 # tailwind-merge + clsx
│   │   └── constants/
│   │       ├── routes.ts
│   │       └── query-keys.ts
│   ├── stores/                       # Zustand 전역 스토어
│   │   ├── auth.store.ts
│   │   ├── cart.store.ts
│   │   └── ui.store.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts                 # Auth 미들웨어
├── public/
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 2. 라우팅 설계 (App Router)

### 2.1 전체 라우트 맵

| 경로 | 파일 | 렌더링 | 인증 |
|------|------|--------|------|
| `/` | `(shop)/page.tsx` | SSG | public |
| `/products` | `(shop)/products/page.tsx` | SSR | public |
| `/products/[productId]` | `(shop)/products/[productId]/page.tsx` | SSR | public |
| `/categories/[categoryId]` | `(shop)/categories/[categoryId]/page.tsx` | SSR | public |
| `/search` | `(shop)/search/page.tsx` | SSR | public |
| `/cart` | `(shop)/cart/page.tsx` | CSR | public (비회원 가능) |
| `/orders/new` | `(shop)/orders/new/page.tsx` | CSR | user |
| `/orders/[orderId]` | `(shop)/orders/[orderId]/page.tsx` | SSR | user |
| `/orders/[orderId]/complete` | `(shop)/orders/[orderId]/complete/page.tsx` | CSR | user |
| `/my` | `(shop)/my/page.tsx` | CSR | user |
| `/my/orders` | `(shop)/my/orders/page.tsx` | CSR | user |
| `/my/orders/[orderId]` | `(shop)/my/orders/[orderId]/page.tsx` | SSR | user |
| `/my/points` | `(shop)/my/points/page.tsx` | CSR | user |
| `/my/addresses` | `(shop)/my/addresses/page.tsx` | CSR | user |
| `/my/profile` | `(shop)/my/profile/page.tsx` | CSR | user |
| `/login` | `(auth)/login/page.tsx` | CSR | guest only |
| `/register` | `(auth)/register/page.tsx` | CSR | guest only |
| `/auth/callback/[provider]` | `(auth)/auth/callback/[provider]/page.tsx` | CSR | public |
| `/payments/checkout` | `(payment)/payments/checkout/page.tsx` | CSR | user |
| `/payments/result` | `(payment)/payments/result/page.tsx` | CSR | user |
| `/admin` | `admin/page.tsx` | CSR | admin |
| `/admin/products` | `admin/products/page.tsx` | CSR | admin |
| `/admin/orders` | `admin/orders/page.tsx` | CSR | admin |
| `/admin/members` | `admin/members/page.tsx` | CSR | admin |

### 2.2 미들웨어 (Auth Guard)

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const USER_ROUTES = ['/my', '/orders/new', '/payments'];
const ADMIN_ROUTES = ['/admin'];
const GUEST_ONLY_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  // Guest only: 로그인 상태면 홈으로
  if (GUEST_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    if (accessToken) return NextResponse.redirect(new URL('/', request.url));
  }

  // User required
  if (USER_ROUTES.some(r => pathname.startsWith(r))) {
    if (!accessToken) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url)
      );
    }
  }

  // Admin required
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!accessToken || userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

---

## 3. 레이아웃 계층 구조

### 3.1 Root Layout

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>          {/* QueryClient + Zustand hydration */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### 3.2 Shop Layout (쇼핑몰 공통)

```
┌─────────────────────────────────────────────┐
│  Header                                      │
│  ┌─────────────────────────────────────────┐ │
│  │  Logo   SearchBar   Nav   Cart   Auth   │ │
│  └─────────────────────────────────────────┘ │
│  CategoryNav (2단계 메가 메뉴)               │
├─────────────────────────────────────────────┤
│                                              │
│  {children}                                  │
│                                              │
├─────────────────────────────────────────────┤
│  Footer                                      │
│  ┌──────────┬──────────┬────────────────┐   │
│  │ 회사정보  │ 고객센터 │ SNS / 앱 다운  │   │
│  └──────────┴──────────┴────────────────┘   │
└─────────────────────────────────────────────┘
CartDrawer (right side panel, z-50)
```

### 3.3 MyPage Layout (마이페이지)

```
┌──────────────────────────────────────────────┐
│  Header                                       │
├────────────┬─────────────────────────────────┤
│            │                                  │
│  Sidebar   │  {children}                      │
│            │                                  │
│  - 주문내역│                                  │
│  - 포인트  │                                  │
│  - 배송지  │                                  │
│  - 회원정보│                                  │
│            │                                  │
└────────────┴─────────────────────────────────┘
```

### 3.4 Admin Layout

```
┌──────────────────────────────────────────────┐
│  AdminHeader (Logo + User + Logout)          │
├──────────┬───────────────────────────────────┤
│          │                                   │
│  Sidebar │  {children}                       │
│          │                                   │
│  - 대시보│                                   │
│  - 상품  │                                   │
│  - 주문  │                                   │
│  - 회원  │                                   │
│  - 통계  │                                   │
└──────────┴───────────────────────────────────┘
```

---

## 4. 페이지별 설계

### 4.1 홈 페이지 (`/`)

**렌더링**: SSG (ISR, revalidate: 3600)

**섹션 구성:**
```
┌─────────────────────────────────────────┐
│  HeroBanner (Carousel, 자동 슬라이드)   │
├─────────────────────────────────────────┤
│  CategoryQuickLinks (아이콘 + 텍스트)   │
├─────────────────────────────────────────┤
│  BestProducts (판매량 TOP 8, SSG)       │
├─────────────────────────────────────────┤
│  NewProducts (신상품 8개, SSG)          │
├─────────────────────────────────────────┤
│  BrandStory (정적 콘텐츠)              │
└─────────────────────────────────────────┘
```

---

### 4.2 상품 목록 페이지 (`/products`)

**렌더링**: SSR (검색/필터 파라미터 의존)

**컴포넌트 구성:**
```
┌────────────────────────────────────────────────┐
│  Breadcrumb                                    │
├──────────────┬─────────────────────────────────┤
│              │  SortBar (정렬 + 총 상품 수)    │
│  FilterPanel │─────────────────────────────────┤
│              │                                 │
│  - 카테고리  │  ProductGrid                    │
│  - 가격 범위 │  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│  - 정렬      │  │    │ │    │ │    │ │    │  │
│  - 태그      │  └────┘ └────┘ └────┘ └────┘  │
│              │  ...                            │
│  [적용] btn  │─────────────────────────────────┤
│              │  InfiniteScrollTrigger          │
└──────────────┴─────────────────────────────────┘
```

**URL 파라미터 반영:**
```
/products?q=티셔츠&categoryId=cat_01&sort=-price&minPrice=10000
```

**데이터 페칭:**
- Server Component에서 초기 데이터 fetch
- 필터 변경 시 TanStack Query로 클라이언트 재요청
- InfiniteScroll: `useInfiniteQuery` + Intersection Observer

---

### 4.3 상품 상세 페이지 (`/products/[productId]`)

**렌더링**: SSR + generateStaticParams (인기 상품 50개 사전 생성)

**컴포넌트 구성:**
```
┌──────────────────────────────────────────────┐
│  Breadcrumb                                  │
├──────────────────┬───────────────────────────┤
│                  │                           │
│  ImageGallery    │  상품명                   │
│  ┌────────────┐  │  가격 (할인율 포함)       │
│  │  메인 이미 │  │  별점 / 리뷰 수           │
│  └────────────┘  │  ─────────────────────── │
│  썸네일 목록     │  ProductOptionSelector    │
│  ◀ ■ □ □ □ ▶   │  (색상, 사이즈 선택)      │
│                  │  ─────────────────────── │
│                  │  수량 선택               │
│                  │  ─────────────────────── │
│                  │  [장바구니] [바로 구매]   │
│                  │  위시리스트 버튼          │
├──────────────────┴───────────────────────────┤
│  TabBar: 상품설명 | 리뷰 | 배송/교환         │
├──────────────────────────────────────────────┤
│  {탭 내용}                                   │
│  - 상품 설명: HTML 렌더링                    │
│  - 리뷰: ReviewList + ReviewSummary          │
│  - 배송: 정적 텍스트                         │
└──────────────────────────────────────────────┘
```

**주요 기능:**
- 옵션 선택 시 재고 수량 실시간 표시
- 옵션 품절 시 선택 불가 + 배지 표시
- 이미지 갤러리: 핀치줌 (모바일)
- 구조화 데이터 (JSON-LD) 삽입 (SEO)

---

### 4.4 장바구니 페이지 (`/cart`)

**렌더링**: CSR

**컴포넌트 구성:**
```
┌────────────────────────────────────────────┐
│  장바구니 (N개)          [전체 선택 □]     │
├──────────────────────────┬─────────────────┤
│                          │                 │
│  CartItemList            │  CartSummary    │
│  ┌──────────────────┐    │  소계: 00,000   │
│  │ □ 이미지 상품명  │    │  배송비: 3,000  │
│  │     옵션 수량    │    │  할인: -0,000   │
│  │     가격 삭제    │    │  ─────────────  │
│  └──────────────────┘    │  합계: 00,000   │
│  (반복)                  │                 │
│                          │  [주문하기]     │
│  [선택 삭제]             │                 │
│                          │  CouponInput    │
│                          │  PointInput     │
└──────────────────────────┴─────────────────┘
```

**비회원 처리:**
- localStorage에 `cart_token` 저장
- API 요청 시 `X-Cart-Token` 헤더 전송
- 로그인 시 비회원 장바구니 병합

---

### 4.5 주문서 작성 (`/orders/new`)

**렌더링**: CSR (user 인증 필요)

**컴포넌트 구성:**
```
┌───────────────────────────────────────────┐
│  Step Indicator: 주문서 → 결제 → 완료    │
├───────────────────────────────────────────┤
│  OrderItemList (수량 변경 불가, 확인용)   │
├───────────────────────────────────────────┤
│  ShippingAddressSection                   │
│  - 기존 배송지 선택 (라디오)             │
│  - 새 배송지 직접 입력 (토글)            │
│  - 배송 메모 선택 (select + 직접입력)    │
├───────────────────────────────────────────┤
│  CouponSection (쿠폰 선택)               │
│  PointSection (포인트 사용 입력)         │
├───────────────────────────────────────────┤
│  PaymentMethodSection                     │
│  ◉ 카드  ○ 가상계좌  ○ 계좌이체         │
├───────────────────────────────────────────┤
│  PriceSummary (최종 결제 금액)           │
│  [결제하기] → 토스페이먼츠 위젯 열림     │
└───────────────────────────────────────────┘
```

---

### 4.6 결제 페이지 (`/payments/checkout`)

**렌더링**: CSR

**플로우:**
```
OrderForm 제출
    │
    ▼
POST /orders → orderId, paymentKey 생성
    │
    ▼
토스페이먼츠 위젯 초기화 (useEffect)
    │
    ▼
사용자 결제 진행 (위젯 내 처리)
    │
    ├─ 성공 → /payments/result?orderId=...&paymentKey=...
    └─ 실패 → /payments/result?orderId=...&code=...&message=...
```

---

### 4.7 결제 결과 (`/payments/result`)

**렌더링**: CSR

**성공 처리:**
```typescript
// URL에서 paymentKey, orderId, amount 추출
// POST /payments (서버에 결제 승인 요청)
// 성공 시 /orders/{orderId}/complete 리다이렉트
```

**실패 처리:**
```typescript
// 에러 메시지 표시
// 주문서로 돌아가기 버튼
```

---

### 4.8 주문 완료 (`/orders/[orderId]/complete`)

**렌더링**: CSR

```
┌───────────────────────────────────────┐
│  ✓ 주문이 완료되었습니다.            │
│  주문번호: 20260222-001234           │
├───────────────────────────────────────┤
│  OrderItem 요약                       │
│  결제 금액 / 방법                    │
│  배송지 정보                         │
├───────────────────────────────────────┤
│  [주문 상세 보기]  [쇼핑 계속]       │
└───────────────────────────────────────┘
```

---

### 4.9 마이페이지 (`/my`)

**마이페이지 홈:**
```
┌──────────────────────────────────────┐
│  회원 등급 카드 (이름, 등급, 포인트) │
├──────────────────────────────────────┤
│  최근 주문 (3건)                     │
│  배송지 (기본 배송지 표시)           │
│  빠른 메뉴 링크                      │
└──────────────────────────────────────┘
```

**주문 내역 (`/my/orders`):**
- 상태별 탭 필터 (전체/결제완료/배송중/배달완료/취소)
- InfiniteScroll 목록
- 주문 카드: 상품 썸네일 + 주문 정보 + 상태 배지 + 액션 버튼

**포인트 내역 (`/my/points`):**
- 잔액 카드 (상단 고정)
- 적립/사용/소멸 탭 필터
- 내역 목록 (InfiniteScroll)

**배송지 관리 (`/my/addresses`):**
- 배송지 카드 목록 (기본 배송지 강조)
- [+ 배송지 추가] 버튼 → 모달
- 수정/삭제/기본설정 액션

---

### 4.10 검색 결과 (`/search`)

**렌더링**: SSR

```
/search?q=티셔츠
```

- 검색어 하이라이트
- ProductGrid (필터 없이 간략 버전)
- 검색 결과 없을 때 대안 추천

---

### 4.11 관리자 페이지 (`/admin`)

**대시보드:**
```
┌──────────────────────────────────────────────┐
│  StatCards Row                               │
│  [ 오늘 주문 ] [ 오늘 매출 ] [ 신규 회원 ]  │
│  [ 처리중 주문 ] [ 환불 대기 ]              │
├──────────────────────────────────────────────┤
│  SalesChart (7일 매출 추이, recharts)        │
├──────────────────────────────────────────────┤
│  RecentOrdersTable (최근 10건)               │
└──────────────────────────────────────────────┘
```

**상품 관리 (`/admin/products`):**
- DataTable (검색 + 필터 + 정렬 + 페이지네이션)
- 컬럼: 썸네일, 상품명, 카테고리, 가격, 재고, 상태, 수정일
- 일괄 처리: 체크박스 + 액션 드롭다운

**주문 관리 (`/admin/orders`):**
- DataTable (상태별 탭)
- 주문 상세 패널 (Side Sheet)
- 배송 정보 등록 인라인 폼

**회원 관리 (`/admin/members`):**
- DataTable (검색 + 등급 필터)
- 회원 상세: 주문 이력, 포인트 이력, 등급 변경

---

## 5. 공통 컴포넌트

### 5.1 Header

```typescript
// components/common/Header/index.tsx
interface HeaderProps {}

// 구성:
// - Logo (abada 로고 이미지)
// - SearchBar (모달/오버레이 방식)
// - Navigation (카테고리 메뉴, 메가 드롭다운)
// - CartButton (장바구니 수량 배지)
// - AuthButton (로그인 상태에 따라 분기)
//   - 비로그인: [로그인] [회원가입]
//   - 로그인: 아바타 드롭다운 (마이페이지, 로그아웃)
```

**모바일 Header:**
- 햄버거 메뉴 → 풀스크린 사이드 드로어
- 하단 고정 네비게이션 바: 홈 / 카테고리 / 검색 / 장바구니 / MY

---

### 5.2 CartDrawer

```typescript
// components/common/CartDrawer/index.tsx
// Zustand cartStore.isOpen 제어
// Right side panel (Sheet 컴포넌트 기반)

// 구성:
// - CartItem 목록 (삭제, 수량 변경)
// - 소계 금액
// - [장바구니 보기] [주문하기] 버튼
// - 빈 장바구니 상태 처리
```

---

### 5.3 ProductCard

```typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    discountRate: number;
    finalPrice: number;
    thumbnailUrl: string;
    rating: number;
    reviewCount: number;
    isNew: boolean;
    isBest: boolean;
  };
  variant?: 'default' | 'compact' | 'horizontal';
}

// 구성:
// - 이미지 (Next.js Image, lazy loading)
// - New / Best 배지
// - 상품명 (2줄 말줄임)
// - 할인율 + 가격 (원가 취소선)
// - 별점 + 리뷰 수
// - 호버 시 [장바구니 담기] 퀵 버튼
```

---

### 5.4 ProductGrid

```typescript
interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;         // 반응형 기본값: mobile:2, tablet:3, desktop:4
}

// 스켈레톤 로딩 처리
// 무한 스크롤 트리거 포함 (optional)
```

---

### 5.5 ProductFilter

```typescript
// 데스크탑: 사이드 패널 (sticky)
// 모바일: 하단 시트 (BottomSheet)

// 필터 항목:
// - 카테고리 (체크박스 트리)
// - 가격 범위 (Range Slider)
// - 브랜드 (체크박스)
// [필터 초기화] [적용하기 N개]
```

---

### 5.6 ProductOptionSelector

```typescript
interface ProductOptionSelectorProps {
  options: ProductOption[];
  variants: ProductVariant[];
  onSelect: (variantId: string) => void;
}

// 동작:
// - 각 옵션 값 버튼/뱃지 렌더링
// - 선택한 옵션 조합으로 variant 매핑
// - 재고 없는 조합 비활성화 (strikethrough + disabled)
// - 선택 완료 시 재고 수량 표시
```

---

### 5.7 OrderStatusBadge

```typescript
const STATUS_CONFIG = {
  PENDING_PAYMENT: { label: '결제 대기', color: 'yellow' },
  PAID:            { label: '결제 완료', color: 'blue' },
  PREPARING:       { label: '상품 준비', color: 'blue' },
  SHIPPING:        { label: '배송 중',   color: 'orange' },
  DELIVERED:       { label: '배달 완료', color: 'green' },
  CANCELLED:       { label: '취소',      color: 'red' },
  REFUND_REQUESTED:{ label: '환불 요청', color: 'red' },
  REFUNDED:        { label: '환불 완료', color: 'gray' },
};
```

---

### 5.8 SearchBar

```typescript
// 동작:
// - 클릭 시 전체화면 오버레이 (모바일) / 인라인 확장 (데스크탑)
// - 실시간 자동완성 (debounce 300ms, useQuery)
// - 최근 검색어 (localStorage 저장, 최대 10개)
// - 인기 검색어 (정적, API 또는 하드코딩)
// - Enter / 아이템 클릭 → /search?q={keyword}
```

---

### 5.9 Admin DataTable

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  pagination: PaginationState;
  onPaginationChange: (state: PaginationState) => void;
  rowSelection?: boolean;
  onRowSelectionChange?: (ids: string[]) => void;
}

// TanStack Table v8 기반
// 서버 사이드 정렬/필터/페이지네이션
// 체크박스 일괄 선택
// 컬럼 정의는 각 페이지에서 주입
```

---

## 6. 상태 관리 설계

### 6.1 Zustand 스토어 구조

```typescript
// stores/auth.store.ts
interface AuthState {
  member: Member | null;
  accessToken: string | null;
  isLoading: boolean;

  // Actions
  setAuth: (member: Member, token: string) => void;
  clearAuth: () => void;
  refreshToken: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      accessToken: null,
      isLoading: false,
      setAuth: (member, accessToken) => set({ member, accessToken }),
      clearAuth: () => set({ member: null, accessToken: null }),
      refreshToken: async () => {
        // POST /auth/refresh
        // accessToken 갱신 후 set
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ member: s.member }) }
  )
);
```

```typescript
// stores/cart.store.ts
interface CartState {
  cartToken: string;           // 비회원용 토큰
  itemCount: number;           // 배지 표시용
  isDrawerOpen: boolean;

  // Actions
  setItemCount: (count: number) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  initCartToken: () => void;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartToken: '',
      itemCount: 0,
      isDrawerOpen: false,
      initCartToken: () => {
        if (!get().cartToken) set({ cartToken: crypto.randomUUID() });
      },
      setItemCount: (itemCount) => set({ itemCount }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    { name: 'cart-store', partialize: (s) => ({ cartToken: s.cartToken }) }
  )
);
```

```typescript
// stores/ui.store.ts
interface UIState {
  isSearchOpen: boolean;
  isMobileMenuOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleMobileMenu: () => void;
}
```

---

### 6.2 TanStack Query 설계

#### Query Key 구조

```typescript
// lib/constants/query-keys.ts
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    reviews: (id: string, filters: ReviewFilters) =>
      ['products', id, 'reviews', filters] as const,
  },
  categories: {
    all: ['categories'] as const,
    tree: () => ['categories', 'tree'] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: () => ['cart', 'detail'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  members: {
    me: () => ['members', 'me'] as const,
    addresses: () => ['members', 'me', 'addresses'] as const,
    points: (filters: PointFilters) => ['members', 'me', 'points', filters] as const,
  },
} as const;
```

#### 주요 Custom Hooks

```typescript
// features/product/hooks/useProducts.ts
export function useProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ pageParam }) => api.products.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.cursor : undefined,
    staleTime: 1000 * 60 * 5,  // 5분
  });
}

// features/product/hooks/useProduct.ts
export function useProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => api.products.getById(productId),
    staleTime: 1000 * 60 * 5,
  });
}

// features/cart/hooks/useCart.ts
export function useCart() {
  const { cartToken } = useCartStore();
  return useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: () => api.cart.get(cartToken),
    staleTime: 0,  // 항상 최신
  });
}

// features/cart/hooks/useAddToCart.ts
export function useAddToCart() {
  const queryClient = useQueryClient();
  const { cartToken, openDrawer } = useCartStore();

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => api.cart.addItem(cartToken, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      openDrawer();  // 추가 후 드로어 열기
    },
  });
}
```

---

## 7. API 클라이언트 설계

### 7.1 기본 클라이언트

```typescript
// lib/api/client.ts
import ky from 'ky';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://shop.abada.kr/api/v1';

export const apiClient = ky.create({
  prefixUrl: BASE_URL,
  timeout: 10000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().accessToken;
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          // Refresh Token 시도
          try {
            await useAuthStore.getState().refreshToken();
            // 원래 요청 재시도
            return ky(request);
          } catch {
            useAuthStore.getState().clearAuth();
            window.location.href = '/login';
          }
        }
      },
    ],
    beforeError: [
      async (error) => {
        const { response } = error;
        if (response) {
          const body = await response.json<ApiErrorResponse>();
          error.message = body.error.message;
        }
        return error;
      },
    ],
  },
});
```

### 7.2 도메인별 API 함수

```typescript
// lib/api/products.ts
export const productsApi = {
  list: (params: ProductListParams) =>
    apiClient.get('products', { searchParams: params }).json<ProductListResponse>(),

  getById: (id: string) =>
    apiClient.get(`products/${id}`).json<ProductDetailResponse>(),

  getReviews: (id: string, params: ReviewListParams) =>
    apiClient.get(`products/${id}/reviews`, { searchParams: params }).json<ReviewListResponse>(),
};

// lib/api/cart.ts
export const cartApi = {
  get: (cartToken?: string) =>
    apiClient.get('cart', {
      headers: cartToken ? { 'X-Cart-Token': cartToken } : {},
    }).json<CartResponse>(),

  addItem: (cartToken: string | undefined, payload: AddCartItemPayload) =>
    apiClient.post('cart/items', {
      json: payload,
      headers: cartToken ? { 'X-Cart-Token': cartToken } : {},
    }).json<AddCartItemResponse>(),

  updateItem: (cartItemId: string, quantity: number, cartToken?: string) =>
    apiClient.put(`cart/items/${cartItemId}`, {
      json: { quantity },
      headers: cartToken ? { 'X-Cart-Token': cartToken } : {},
    }).json<UpdateCartItemResponse>(),

  removeItem: (cartItemId: string, cartToken?: string) =>
    apiClient.delete(`cart/items/${cartItemId}`, {
      headers: cartToken ? { 'X-Cart-Token': cartToken } : {},
    }).json<void>(),
};
```

---

## 8. 렌더링 전략

| 페이지 | 전략 | 이유 |
|--------|------|------|
| 홈 | SSG (ISR 1h) | 자주 변경되지 않는 콘텐츠, SEO 중요 |
| 상품 목록 | SSR | URL 파라미터(필터/정렬) 의존, SEO |
| 상품 상세 | SSR + 인기상품 generateStaticParams | SEO + 빠른 로드 |
| 장바구니 | CSR | 사용자 고유 데이터 |
| 주문서 | CSR | 인증 필요, 동적 |
| 결제 | CSR | 토스페이먼츠 위젯 |
| 주문 완료 | CSR | URL 파라미터 처리 |
| 마이페이지 | CSR | 사용자 고유, SEO 불필요 |
| 검색 | SSR | SEO (오픈그래프 키워드 포함) |
| 관리자 | CSR | 인증 필요, 대화형 |

### Server Components vs Client Components 원칙

```
Server Components (기본):
- 데이터 fetch (SEO 필요 페이지)
- 정적 UI 렌더링
- 민감 로직 (API 키 등)

Client Components ('use client' 명시):
- 이벤트 핸들러 (onClick, onChange)
- Zustand / TanStack Query 훅 사용
- 브라우저 API (localStorage, window)
- 애니메이션 (framer-motion)
- 토스페이먼츠 위젯
```

---

## 9. 성능 최적화

### 9.1 이미지 최적화

```typescript
// Next.js Image 설정
// next.config.ts
const config = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'r2.shop.abada.kr' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [375, 640, 828, 1080, 1200, 1920],
  },
};
```

- 상품 목록: `sizes="(max-width: 640px) 50vw, 25vw"`
- 상품 상세 메인: `sizes="(max-width: 768px) 100vw, 50vw"`
- 비율: 상품 이미지 1:1 고정

### 9.2 코드 스플리팅

```typescript
// 무거운 컴포넌트 dynamic import
const ProductImageGallery = dynamic(
  () => import('@/components/product/ProductImageGallery'),
  { loading: () => <Skeleton className="aspect-square w-full" /> }
);

const SalesChart = dynamic(
  () => import('@/components/admin/SalesChart'),
  { ssr: false }
);

const TosspaymentWidget = dynamic(
  () => import('@/components/payment/TossWidget'),
  { ssr: false }
);
```

### 9.3 캐싱 전략

```typescript
// Server Component fetch 캐싱
// 상품 목록: 5분 캐시
fetch(`${BASE_URL}/products`, {
  next: { revalidate: 300 },
});

// 상품 상세: 10분 캐시
fetch(`${BASE_URL}/products/${id}`, {
  next: { revalidate: 600, tags: [`product-${id}`] },
});

// 카테고리: 1시간 캐시
fetch(`${BASE_URL}/categories`, {
  next: { revalidate: 3600 },
});
```

### 9.4 Suspense 경계

```typescript
// 상품 상세 페이지 구조
<Suspense fallback={<ProductDetailSkeleton />}>
  <ProductDetail productId={productId} />
</Suspense>
<Suspense fallback={<ReviewListSkeleton />}>
  <ReviewList productId={productId} />
</Suspense>
```

### 9.5 반응형 브레이크포인트

```
mobile:   375px  (2 columns grid)
tablet:   768px  (3 columns grid, sidebar 등장)
desktop: 1024px  (4 columns grid, 풀 레이아웃)
wide:    1280px  (최대 너비 제한)
```

---

## 부록: 주요 패키지 목록

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `next` | 15.x | 프레임워크 |
| `react` | 19.x | UI |
| `typescript` | 5.x | 타입 |
| `tailwindcss` | 4.x | 스타일 |
| `@shadcn/ui` | latest | UI 컴포넌트 |
| `zustand` | 5.x | 전역 상태 |
| `@tanstack/react-query` | 5.x | 서버 상태 |
| `ky` | latest | HTTP 클라이언트 |
| `@tanstack/react-table` | 8.x | 어드민 테이블 |
| `recharts` | 2.x | 차트 (어드민) |
| `framer-motion` | 11.x | 애니메이션 |
| `@tosspayments/tosspayments-js` | latest | 결제 위젯 |
| `react-hook-form` | 7.x | 폼 관리 |
| `zod` | 3.x | 유효성 검사 |
| `dayjs` | latest | 날짜 처리 |
| `clsx` + `tailwind-merge` | latest | 클래스 병합 |

---

**Document**: frontend-web.design.md
**Project**: abada-shop (shop.abada.kr)
**Updated**: 2026-02-22
