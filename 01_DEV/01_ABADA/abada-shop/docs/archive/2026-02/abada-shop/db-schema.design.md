# DB Schema Design: abada 쇼핑몰

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Stack**: TypeScript + Fastify + Prisma + PostgreSQL 16
**Architecture**: DDD + CQRS + Hexagonal

---

## 목차

1. [설계 원칙](#1-설계-원칙)
2. [Enum 타입 정의](#2-enum-타입-정의)
3. [User Context](#3-user-context)
4. [Product Context](#4-product-context)
5. [Catalog Context](#5-catalog-context)
6. [Order Context](#6-order-context)
7. [Payment Context](#7-payment-context)
8. [Inventory Context](#8-inventory-context)
9. [Shipping Context](#9-shipping-context)
10. [ERD 관계 요약](#10-erd-관계-요약)
11. [인덱스 전략](#11-인덱스-전략)
12. [Prisma Schema 전체 코드](#12-prisma-schema-전체-코드)

---

## 1. 설계 원칙

### 기본 규칙

| 항목 | 규칙 |
|------|------|
| **PK** | UUID v7 (`@default(dbgenerated("gen_random_uuid()"))`) |
| **Soft Delete** | `deleted_at DateTime?` - null이면 활성, 값이 있으면 삭제 |
| **Timestamps** | `created_at`, `updated_at` 모든 테이블 포함 |
| **Naming** | 테이블명 snake_case, 컬럼명 snake_case |
| **Foreign Key** | 참조 무결성 유지, CASCADE 삭제 최소화 |
| **Soft Delete FK** | soft delete 대상은 RESTRICT, 물리 삭제 대상만 CASCADE |

### Context 경계 규칙

- 각 Bounded Context는 독립적인 테이블 그룹을 보유
- Context 간 참조는 ID(UUID)만 저장 (직접 JOIN 최소화)
- 이벤트 기반 통신으로 Context 간 결합도 최소화

---

## 2. Enum 타입 정의

### User Context Enums

```sql
-- 회원 상태
UserStatus: ACTIVE | INACTIVE | SUSPENDED | WITHDRAWN

-- 회원 등급
UserGrade: NORMAL | SILVER | GOLD | VIP | VVIP

-- 소셜 로그인 제공자
SocialProvider: KAKAO | NAVER | GOOGLE | APPLE

-- 포인트 변동 유형
PointHistoryType: EARN | USE | EXPIRE | REFUND | ADMIN_ADJUST
```

### Product Context Enums

```sql
-- 상품 상태
ProductStatus: DRAFT | ACTIVE | INACTIVE | SOLD_OUT | DELETED

-- 상품 유형
ProductType: PHYSICAL | DIGITAL | SERVICE

-- 리뷰 상태
ReviewStatus: ACTIVE | HIDDEN | DELETED
```

### Order Context Enums

```sql
-- 주문 상태
OrderStatus: PENDING | CONFIRMED | PREPARING | SHIPPING | DELIVERED | CANCELLED | REFUNDING | REFUNDED

-- 주문 아이템 상태
OrderItemStatus: PENDING | CONFIRMED | PREPARING | SHIPPING | DELIVERED | CANCELLED | RETURN_REQUESTED | RETURNED

-- 취소/환불 사유
CancelReason: CHANGE_MIND | WRONG_ORDER | OUT_OF_STOCK | DELIVERY_DELAY | OTHER
```

### Payment Context Enums

```sql
-- 결제 방법
PaymentMethod: CARD | VIRTUAL_ACCOUNT | TRANSFER | POINT | KAKAO_PAY | NAVER_PAY | TOSS_PAY

-- 결제 상태
PaymentStatus: PENDING | COMPLETED | FAILED | CANCELLED | REFUNDED | PARTIAL_REFUNDED

-- 환불 상태
RefundStatus: REQUESTED | PROCESSING | COMPLETED | REJECTED
```

### Inventory Context Enums

```sql
-- 재고 예약 상태
StockReservationStatus: RESERVED | CONFIRMED | RELEASED | EXPIRED
```

### Shipping Context Enums

```sql
-- 배송 상태
ShipmentStatus: PREPARING | SHIPPED | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | FAILED | RETURNED

-- 배송사
CarrierCode: CJ | LOTTE | POST | HANJIN | FEDEX | DHL | EMS
```

---

## 3. User Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `users` | 회원 기본 정보 |
| `user_addresses` | 배송지 목록 |
| `user_points` | 포인트 현황 (1:1) |
| `point_histories` | 포인트 변동 이력 |
| `social_accounts` | 소셜 로그인 연결 |

### users

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)           회원 고유 ID
email             VARCHAR(255)        이메일 (unique, not null)
password_hash     VARCHAR(255)?       비밀번호 해시 (소셜 전용은 null)
name              VARCHAR(100)        이름
phone             VARCHAR(20)?        휴대폰 번호 (unique)
profile_image     VARCHAR(500)?       프로필 이미지 URL
status            UserStatus          회원 상태 (ACTIVE)
grade             UserGrade           회원 등급 (NORMAL)
birth_date        DATE?               생년월일
gender            VARCHAR(10)?        성별 (M/F)
marketing_agreed  BOOLEAN             마케팅 수신 동의 (false)
last_login_at     TIMESTAMP?          마지막 로그인 일시
created_at        TIMESTAMP           생성일시
updated_at        TIMESTAMP           수정일시
deleted_at        TIMESTAMP?          탈퇴일시 (soft delete)

인덱스:
- UNIQUE: email (partial: deleted_at IS NULL)
- UNIQUE: phone (partial: deleted_at IS NULL)
- INDEX: status, grade (관리자 조회용)
- INDEX: created_at DESC
```

### user_addresses

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)           주소 고유 ID
user_id           UUID (FK→users)     회원 ID
alias             VARCHAR(50)         배송지명 (예: 집, 회사)
recipient         VARCHAR(100)        수령인 이름
phone             VARCHAR(20)         수령인 연락처
zipcode           VARCHAR(10)         우편번호
address1          VARCHAR(200)        기본 주소
address2          VARCHAR(200)?       상세 주소
is_default        BOOLEAN             기본 배송지 여부 (false)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: user_id
- INDEX: (user_id, is_default) WHERE is_default = true
```

### user_points

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
user_id           UUID (FK→users, UNIQUE)  회원 ID (1:1)
balance           BIGINT              현재 포인트 잔액 (0 이상)
lifetime_earned   BIGINT              누적 적립 포인트
lifetime_used     BIGINT              누적 사용 포인트
updated_at        TIMESTAMP

인덱스:
- UNIQUE: user_id
```

### point_histories

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
user_id           UUID (FK→users)     회원 ID
type              PointHistoryType    변동 유형
amount            BIGINT              변동 포인트 (양수: 적립, 음수: 사용)
balance_after     BIGINT              변동 후 잔액
description       VARCHAR(200)        변동 사유
reference_id      UUID?               연관 주문/결제 ID
expires_at        TIMESTAMP?          포인트 만료일 (적립 시)
created_at        TIMESTAMP

인덱스:
- INDEX: user_id, created_at DESC
- INDEX: user_id, expires_at (만료 처리)
- INDEX: reference_id (주문 연관 조회)
```

### social_accounts

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
user_id           UUID (FK→users)     회원 ID
provider          SocialProvider      소셜 제공자
provider_id       VARCHAR(200)        소셜 제공자의 사용자 ID
provider_email    VARCHAR(255)?       소셜 이메일
access_token      TEXT?               액세스 토큰 (암호화 저장)
refresh_token     TEXT?               리프레시 토큰 (암호화 저장)
token_expires_at  TIMESTAMP?          토큰 만료일
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: (provider, provider_id)
- INDEX: user_id
```

---

## 4. Product Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `products` | 상품 기본 정보 |
| `product_options` | 상품 옵션 그룹 (색상, 사이즈 등) |
| `product_option_values` | 옵션 값 (빨강, S 등) |
| `product_skus` | SKU (옵션 조합별 단위) |
| `product_sku_options` | SKU-옵션값 매핑 |
| `product_images` | 상품 이미지 |
| `product_reviews` | 상품 리뷰 |
| `wishlists` | 위시리스트 |

### products

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
name              VARCHAR(300)        상품명
slug              VARCHAR(300)        URL 슬러그 (unique)
description       TEXT?               상품 상세 설명 (HTML/Markdown)
short_description VARCHAR(500)?       짧은 설명
type              ProductType         상품 유형 (PHYSICAL)
status            ProductStatus       상품 상태 (DRAFT)
base_price        BIGINT              기준가 (원 단위)
sale_price        BIGINT?             판매가 (null이면 base_price 사용)
cost_price        BIGINT?             원가
brand             VARCHAR(100)?       브랜드명
tags              TEXT[]              태그 배열 (PostgreSQL array)
weight_gram       INTEGER?            무게 (g) - 배송비 계산용
meta_title        VARCHAR(300)?       SEO 타이틀
meta_description  VARCHAR(500)?       SEO 설명
is_featured       BOOLEAN             추천 상품 여부 (false)
sort_order        INTEGER             정렬 순서 (0)
view_count        BIGINT              조회수 (0)
review_count      INTEGER             리뷰 수 (0)
review_avg_score  DECIMAL(3,2)?       평균 평점
created_at        TIMESTAMP
updated_at        TIMESTAMP
deleted_at        TIMESTAMP?

인덱스:
- UNIQUE: slug (partial: deleted_at IS NULL)
- INDEX: status, sort_order
- INDEX: status, is_featured
- INDEX: created_at DESC
- GIN INDEX: tags (배열 검색)
- FULLTEXT: name, description (pg_trgm 사용)
```

### product_options

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
product_id        UUID (FK→products)  상품 ID
name              VARCHAR(100)        옵션명 (예: 색상, 사이즈)
sort_order        INTEGER             정렬 순서
created_at        TIMESTAMP

인덱스:
- INDEX: product_id
```

### product_option_values

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
option_id         UUID (FK→product_options)
value             VARCHAR(100)        옵션값 (예: 빨강, L)
color_hex         VARCHAR(7)?         색상 코드 (#RRGGBB)
sort_order        INTEGER             정렬 순서
created_at        TIMESTAMP

인덱스:
- INDEX: option_id
```

### product_skus

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
product_id        UUID (FK→products)  상품 ID
sku_code          VARCHAR(100)        SKU 코드 (unique per product)
price_modifier    BIGINT              기준가 대비 가격 조정 (0이면 동일)
is_active         BOOLEAN             판매 여부 (true)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: (product_id, sku_code)
- INDEX: product_id, is_active
```

### product_sku_options

```
컬럼               타입                설명
──────────────────────────────────────────────
sku_id            UUID (FK→product_skus)
option_value_id   UUID (FK→product_option_values)
PRIMARY KEY: (sku_id, option_value_id)

인덱스:
- INDEX: sku_id
- INDEX: option_value_id
```

### product_images

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
product_id        UUID (FK→products)  상품 ID
sku_id            UUID (FK→product_skus)? SKU별 이미지 (null이면 공통)
url               VARCHAR(500)        이미지 URL (Cloudflare R2)
alt_text          VARCHAR(200)?       대체 텍스트
is_thumbnail      BOOLEAN             썸네일 여부 (false)
sort_order        INTEGER             정렬 순서 (0)
created_at        TIMESTAMP

인덱스:
- INDEX: product_id, sort_order
- INDEX: (product_id, is_thumbnail) WHERE is_thumbnail = true
```

### product_reviews

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
product_id        UUID (FK→products)  상품 ID
user_id           UUID                회원 ID (User Context 참조)
order_item_id     UUID                주문 아이템 ID (Order Context 참조)
score             SMALLINT            평점 (1-5)
title             VARCHAR(200)?       리뷰 제목
content           TEXT                리뷰 내용
images            TEXT[]              리뷰 이미지 URL 배열
is_verified       BOOLEAN             구매 인증 여부 (true=구매자)
status            ReviewStatus        리뷰 상태 (ACTIVE)
helpful_count     INTEGER             도움됨 수 (0)
created_at        TIMESTAMP
updated_at        TIMESTAMP
deleted_at        TIMESTAMP?

인덱스:
- INDEX: product_id, status, created_at DESC
- INDEX: user_id
- UNIQUE: order_item_id (주문당 1개 리뷰)
```

### wishlists

```
컬럼               타입                설명
──────────────────────────────────────────────
user_id           UUID                회원 ID
product_id        UUID (FK→products)  상품 ID
created_at        TIMESTAMP
PRIMARY KEY: (user_id, product_id)

인덱스:
- INDEX: user_id, created_at DESC
- INDEX: product_id (상품별 위시 수 집계)
```

---

## 5. Catalog Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `categories` | 카테고리 (3단계 자기참조) |
| `product_categories` | 상품-카테고리 매핑 (M:N) |
| `product_catalog_displays` | 상품 진열 설정 |

### categories

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
parent_id         UUID (FK→categories)? 상위 카테고리 (null=루트)
name              VARCHAR(100)        카테고리명
slug              VARCHAR(200)        URL 슬러그 (unique)
description       VARCHAR(500)?       카테고리 설명
image_url         VARCHAR(500)?       카테고리 이미지
depth             SMALLINT            깊이 (0=대분류, 1=중분류, 2=소분류)
sort_order        INTEGER             정렬 순서 (0)
is_active         BOOLEAN             활성 여부 (true)
meta_title        VARCHAR(300)?       SEO 타이틀
meta_description  VARCHAR(500)?       SEO 설명
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: slug
- INDEX: parent_id, sort_order
- INDEX: depth, is_active, sort_order
```

### product_categories

```
컬럼               타입                설명
──────────────────────────────────────────────
product_id        UUID (FK→products)
category_id       UUID (FK→categories)
is_primary        BOOLEAN             주 카테고리 여부 (false)
PRIMARY KEY: (product_id, category_id)

인덱스:
- INDEX: category_id, is_primary
- INDEX: product_id
```

### product_catalog_displays

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
product_id        UUID (FK→products)
category_id       UUID (FK→categories)?  카테고리 진열 (null=메인 진열)
display_zone      VARCHAR(100)        진열 구역 (예: MAIN_BANNER, NEW_ARRIVAL)
sort_order        INTEGER             진열 순서 (0)
starts_at         TIMESTAMP?          진열 시작일시
ends_at           TIMESTAMP?          진열 종료일시
is_active         BOOLEAN             활성 여부 (true)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: category_id, is_active, sort_order
- INDEX: display_zone, is_active, sort_order
- INDEX: (starts_at, ends_at) - 기간 진열 조회
```

---

## 6. Order Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `carts` | 장바구니 |
| `cart_items` | 장바구니 아이템 |
| `orders` | 주문 |
| `order_items` | 주문 아이템 |
| `order_status_histories` | 주문 상태 이력 |
| `return_requests` | 반품/교환 요청 |

### carts

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
user_id           UUID?               회원 ID (null=비회원)
session_id        VARCHAR(100)?       비회원 세션 ID
created_at        TIMESTAMP
updated_at        TIMESTAMP
expires_at        TIMESTAMP?          비회원 장바구니 만료 (30일)

인덱스:
- INDEX: user_id (partial: user_id IS NOT NULL)
- INDEX: session_id (partial: session_id IS NOT NULL)
- INDEX: expires_at (만료 처리 배치)
```

### cart_items

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
cart_id           UUID (FK→carts)     장바구니 ID
product_id        UUID                상품 ID (Product Context 참조)
sku_id            UUID                SKU ID (Product Context 참조)
quantity          INTEGER             수량 (1 이상)
unit_price        BIGINT              담은 시점 단가 (가격 변동 대비)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: cart_id
- UNIQUE: (cart_id, sku_id)
```

### orders

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_number      VARCHAR(30)         주문번호 (예: ORD-20260222-000001) unique
user_id           UUID?               회원 ID (null=비회원)
guest_email       VARCHAR(255)?       비회원 이메일
status            OrderStatus         주문 상태 (PENDING)
-- 금액
subtotal          BIGINT              상품 금액 합계
discount_amount   BIGINT              할인 금액 (0)
shipping_fee      BIGINT              배송비 (0)
point_used        BIGINT              사용 포인트 (0)
coupon_discount   BIGINT              쿠폰 할인 (0)
total_amount      BIGINT              최종 결제 금액
-- 배송지 스냅샷 (주문 시점 저장)
shipping_name     VARCHAR(100)        수령인
shipping_phone    VARCHAR(20)         수령인 연락처
shipping_zipcode  VARCHAR(10)         우편번호
shipping_address1 VARCHAR(200)        기본 주소
shipping_address2 VARCHAR(200)?       상세 주소
-- 메모
customer_note     VARCHAR(500)?       고객 요청사항
admin_note        VARCHAR(500)?       내부 메모
-- 타임스탬프
confirmed_at      TIMESTAMP?          주문 확정일시
cancelled_at      TIMESTAMP?          취소일시
cancel_reason     CancelReason?       취소 사유
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: order_number
- INDEX: user_id, created_at DESC
- INDEX: status, created_at DESC
- INDEX: created_at DESC
```

### order_items

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_id          UUID (FK→orders)    주문 ID
product_id        UUID                상품 ID (스냅샷용)
sku_id            UUID                SKU ID
-- 스냅샷 (주문 시점 상품 정보 고정)
product_name      VARCHAR(300)        상품명 스냅샷
product_image     VARCHAR(500)?       상품 이미지 URL
option_summary    VARCHAR(200)?       옵션 요약 (예: 색상:빨강, 사이즈:L)
sku_code          VARCHAR(100)        SKU 코드 스냅샷
-- 가격
unit_price        BIGINT              단가
quantity          INTEGER             수량
total_price       BIGINT              소계 (단가 × 수량)
-- 상태
status            OrderItemStatus     아이템 상태 (PENDING)
-- 리뷰
is_reviewed       BOOLEAN             리뷰 작성 여부 (false)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: order_id
- INDEX: sku_id, status
- INDEX: product_id
```

### order_status_histories

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_id          UUID (FK→orders)    주문 ID
from_status       OrderStatus?        이전 상태 (최초 생성 시 null)
to_status         OrderStatus         변경 상태
changed_by        UUID?               처리자 ID (관리자)
note              VARCHAR(500)?       메모
created_at        TIMESTAMP

인덱스:
- INDEX: order_id, created_at
```

### return_requests

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_id          UUID (FK→orders)    주문 ID
order_item_id     UUID (FK→order_items) 주문 아이템 ID
request_type      VARCHAR(20)         RETURN | EXCHANGE
reason            VARCHAR(50)         반품 사유 코드
detail            TEXT?               상세 사유
images            TEXT[]              증빙 이미지
quantity          INTEGER             반품 수량
status            VARCHAR(30)         REQUESTED | APPROVED | REJECTED | COMPLETED
admin_note        VARCHAR(500)?       처리자 메모
processed_at      TIMESTAMP?          처리일시
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: order_id
- INDEX: order_item_id
- INDEX: status, created_at DESC
```

---

## 7. Payment Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `payments` | 결제 |
| `payment_refunds` | 환불 |

### payments

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_id          UUID (UNIQUE)       주문 ID (1:1)
payment_key       VARCHAR(200)?       PG사 결제 키 (토스페이먼츠)
method            PaymentMethod       결제 방법
status            PaymentStatus       결제 상태 (PENDING)
-- 금액
requested_amount  BIGINT              요청 금액
paid_amount       BIGINT?             실제 결제 금액
-- 카드 정보
card_number       VARCHAR(20)?        카드번호 마스킹 (예: 1234-****-****-5678)
card_company      VARCHAR(50)?        카드사
installment       SMALLINT?           할부 개월 (0=일시불)
-- 가상계좌
virtual_bank      VARCHAR(50)?        가상계좌 은행
virtual_account   VARCHAR(30)?        가상계좌 번호
virtual_expires_at TIMESTAMP?         가상계좌 만료일시
-- 영수증
receipt_url       VARCHAR(500)?       영수증 URL
-- PG 응답 (JSONB)
pg_response       JSONB?              PG사 원본 응답 (토스페이먼츠)
-- 타임스탬프
paid_at           TIMESTAMP?          결제 완료일시
failed_at         TIMESTAMP?          결제 실패일시
fail_reason       VARCHAR(200)?       실패 사유
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: order_id
- UNIQUE: payment_key (partial: payment_key IS NOT NULL)
- INDEX: status, created_at DESC
- INDEX: paid_at DESC
```

### payment_refunds

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
payment_id        UUID (FK→payments)  결제 ID
order_id          UUID                주문 ID
refund_key        VARCHAR(200)?       PG사 환불 키
amount            BIGINT              환불 금액
reason            VARCHAR(200)        환불 사유
status            RefundStatus        환불 상태 (REQUESTED)
-- 계좌 환불 (가상계좌)
bank_name         VARCHAR(50)?        환불 계좌 은행
account_number    VARCHAR(30)?        환불 계좌번호
account_holder    VARCHAR(50)?        예금주
-- 처리 정보
processed_by      UUID?               처리자 ID
pg_response       JSONB?              PG사 환불 응답
refunded_at       TIMESTAMP?          환불 완료일시
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: payment_id
- INDEX: order_id
- INDEX: status, created_at DESC
```

---

## 8. Inventory Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `stocks` | 재고 현황 |
| `stock_reservations` | 재고 예약 (주문 중 임시 차감) |
| `stock_histories` | 재고 변동 이력 |

### stocks

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
sku_id            UUID (UNIQUE)       SKU ID (Product Context 참조)
quantity          INTEGER             총 재고 수량 (0 이상)
reserved          INTEGER             예약된 수량 (0)
available         INTEGER             실제 판매 가능 수량 (quantity - reserved)
safety_stock      INTEGER             안전 재고 (0) - 알림 임계값
location          VARCHAR(100)?       창고 위치
updated_at        TIMESTAMP

인덱스:
- UNIQUE: sku_id
- INDEX: available (재고 부족 알림)
- INDEX: (quantity, safety_stock) WHERE quantity <= safety_stock
```

### stock_reservations

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
stock_id          UUID (FK→stocks)    재고 ID
order_id          UUID                주문 ID (Order Context 참조)
sku_id            UUID                SKU ID
quantity          INTEGER             예약 수량
status            StockReservationStatus 예약 상태 (RESERVED)
expires_at        TIMESTAMP           예약 만료일시 (결제 미완료 시 자동 해제)
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- INDEX: stock_id, status
- INDEX: order_id
- INDEX: expires_at, status (만료 처리 배치)
```

### stock_histories

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
sku_id            UUID                SKU ID
change_type       VARCHAR(50)         IN | OUT | RESERVE | RELEASE | ADJUST
quantity_delta    INTEGER             변동 수량 (양수: 증가, 음수: 감소)
quantity_before   INTEGER             변동 전 수량
quantity_after    INTEGER             변동 후 수량
reference_id      UUID?               연관 ID (주문, 입고 등)
note              VARCHAR(200)?       비고
created_by        UUID?               처리자
created_at        TIMESTAMP

인덱스:
- INDEX: sku_id, created_at DESC
- INDEX: reference_id
```

---

## 9. Shipping Context

### 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `shipments` | 배송 정보 |
| `tracking_events` | 배송 추적 이벤트 |

### shipments

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
order_id          UUID (UNIQUE)       주문 ID (Order Context 참조)
carrier_code      CarrierCode         배송사 코드
tracking_number   VARCHAR(50)?        운송장 번호
status            ShipmentStatus      배송 상태 (PREPARING)
-- 배송지 스냅샷
recipient_name    VARCHAR(100)        수령인
recipient_phone   VARCHAR(20)         수령인 연락처
zipcode           VARCHAR(10)         우편번호
address1          VARCHAR(200)        기본 주소
address2          VARCHAR(200)?       상세 주소
-- 배송 메모
delivery_note     VARCHAR(300)?       배송 특이사항
-- 타임스탬프
shipped_at        TIMESTAMP?          발송일시
delivered_at      TIMESTAMP?          배송 완료일시
created_at        TIMESTAMP
updated_at        TIMESTAMP

인덱스:
- UNIQUE: order_id
- INDEX: (carrier_code, tracking_number) (partial: tracking_number IS NOT NULL)
- INDEX: status, created_at DESC
```

### tracking_events

```
컬럼               타입                설명
──────────────────────────────────────────────
id                UUID (PK)
shipment_id       UUID (FK→shipments) 배송 ID
status            ShipmentStatus      배송 상태
location          VARCHAR(200)?       현재 위치 (예: 인천 허브)
description       VARCHAR(300)        상태 설명 (예: 배송 출고)
event_time        TIMESTAMP           이벤트 발생 일시
created_at        TIMESTAMP

인덱스:
- INDEX: shipment_id, event_time DESC
```

---

## 10. ERD 관계 요약

```
[User Context]
users ──── user_addresses (1:N)
users ──── user_points (1:1)
users ──── point_histories (1:N)
users ──── social_accounts (1:N)

[Product Context]
products ──── product_options (1:N)
product_options ──── product_option_values (1:N)
products ──── product_skus (1:N)
product_skus ──┤├── product_sku_options ──┤├── product_option_values (M:N)
products ──── product_images (1:N)
product_skus ──── product_images (1:N, optional)
products ──── product_reviews (1:N)
products ──── wishlists (1:N)

[Catalog Context]
categories ──── categories (self: 1:N, parent_id)
products ──┤├── product_categories ──┤├── categories (M:N)
products ──── product_catalog_displays (1:N)
categories ──── product_catalog_displays (1:N, optional)

[Order Context]
carts ──── cart_items (1:N)
orders ──── order_items (1:N)
orders ──── order_status_histories (1:N)
orders ──── return_requests (1:N)
order_items ──── return_requests (1:N)

[Payment Context]
orders ──── payments (1:1)
payments ──── payment_refunds (1:N)

[Inventory Context]
(sku_id 참조, FK 없음 - Cross-Context)
stocks ──── stock_reservations (1:N)
stocks ──── stock_histories (1:N)

[Shipping Context]
(order_id 참조, FK 없음 - Cross-Context)
shipments ──── tracking_events (1:N)

[Cross-Context 참조 (ID만, FK 없음)]
order_items.product_id → products.id
order_items.sku_id → product_skus.id
stock_reservations.order_id → orders.id
stocks.sku_id → product_skus.id
shipments.order_id → orders.id
product_reviews.user_id → users.id
product_reviews.order_item_id → order_items.id
wishlists.user_id → users.id
```

---

## 11. 인덱스 전략

### 성능 최적화 인덱스

| 목적 | 인덱스 |
|------|--------|
| 회원 조회 | `users(email)`, `users(phone)` |
| 상품 목록 | `products(status, sort_order)`, `products(status, is_featured)` |
| 상품 검색 | `products` GIN(tags), pg_trgm GIN(name) |
| 주문 조회 | `orders(user_id, created_at DESC)`, `orders(status, created_at DESC)` |
| 장바구니 | `carts(user_id)`, `cart_items(cart_id)` |
| 배송 추적 | `shipments(carrier_code, tracking_number)` |
| 재고 만료 | `stock_reservations(expires_at, status)` |
| 포인트 만료 | `point_histories(user_id, expires_at)` |

### Partial Index 활용

```sql
-- 활성 사용자만 이메일 unique
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;

-- 기본 배송지
CREATE INDEX idx_addresses_default ON user_addresses(user_id) WHERE is_default = true;

-- 썸네일 이미지
CREATE INDEX idx_images_thumbnail ON product_images(product_id) WHERE is_thumbnail = true;
```

---

## 12. Prisma Schema 전체 코드

아래는 `/prisma/schema.prisma`에 작성할 전체 스키마입니다.

```prisma
// prisma/schema.prisma
// abada 쇼핑몰 Prisma Schema
// Stack: TypeScript + Fastify + Prisma + PostgreSQL 16
// Architecture: DDD + CQRS + Hexagonal

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [uuidOssp(map: "uuid-ossp"), pgTrgm(map: "pg_trgm")]
}

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

// User Context
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  WITHDRAWN
}

enum UserGrade {
  NORMAL
  SILVER
  GOLD
  VIP
  VVIP
}

enum SocialProvider {
  KAKAO
  NAVER
  GOOGLE
  APPLE
}

enum PointHistoryType {
  EARN
  USE
  EXPIRE
  REFUND
  ADMIN_ADJUST
}

// Product Context
enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  SOLD_OUT
  DELETED
}

enum ProductType {
  PHYSICAL
  DIGITAL
  SERVICE
}

enum ReviewStatus {
  ACTIVE
  HIDDEN
  DELETED
}

// Order Context
enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  SHIPPING
  DELIVERED
  CANCELLED
  REFUNDING
  REFUNDED
}

enum OrderItemStatus {
  PENDING
  CONFIRMED
  PREPARING
  SHIPPING
  DELIVERED
  CANCELLED
  RETURN_REQUESTED
  RETURNED
}

enum CancelReason {
  CHANGE_MIND
  WRONG_ORDER
  OUT_OF_STOCK
  DELIVERY_DELAY
  OTHER
}

// Payment Context
enum PaymentMethod {
  CARD
  VIRTUAL_ACCOUNT
  TRANSFER
  POINT
  KAKAO_PAY
  NAVER_PAY
  TOSS_PAY
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
  PARTIAL_REFUNDED
}

enum RefundStatus {
  REQUESTED
  PROCESSING
  COMPLETED
  REJECTED
}

// Inventory Context
enum StockReservationStatus {
  RESERVED
  CONFIRMED
  RELEASED
  EXPIRED
}

// Shipping Context
enum ShipmentStatus {
  PREPARING
  SHIPPED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  FAILED
  RETURNED
}

enum CarrierCode {
  CJ
  LOTTE
  POST
  HANJIN
  FEDEX
  DHL
  EMS
}

// ─────────────────────────────────────────────────────────────────────────────
// USER CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model User {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email           String    @db.VarChar(255)
  passwordHash    String?   @map("password_hash") @db.VarChar(255)
  name            String    @db.VarChar(100)
  phone           String?   @db.VarChar(20)
  profileImage    String?   @map("profile_image") @db.VarChar(500)
  status          UserStatus @default(ACTIVE)
  grade           UserGrade  @default(NORMAL)
  birthDate       DateTime? @map("birth_date") @db.Date
  gender          String?   @db.VarChar(10)
  marketingAgreed Boolean   @default(false) @map("marketing_agreed")
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  addresses       UserAddress[]
  points          UserPoint?
  pointHistories  PointHistory[]
  socialAccounts  SocialAccount[]

  @@unique([email], name: "uq_users_email")
  @@index([status, grade])
  @@index([createdAt(sort: Desc)])
  @@map("users")
}

model UserAddress {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  alias     String   @db.VarChar(50)
  recipient String   @db.VarChar(100)
  phone     String   @db.VarChar(20)
  zipcode   String   @db.VarChar(10)
  address1  String   @db.VarChar(200)
  address2  String?  @db.VarChar(200)
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("user_addresses")
}

model UserPoint {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @unique @map("user_id") @db.Uuid
  balance        BigInt   @default(0)
  lifetimeEarned BigInt   @default(0) @map("lifetime_earned")
  lifetimeUsed   BigInt   @default(0) @map("lifetime_used")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@map("user_points")
}

model PointHistory {
  id           String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String           @map("user_id") @db.Uuid
  type         PointHistoryType
  amount       BigInt
  balanceAfter BigInt           @map("balance_after")
  description  String           @db.VarChar(200)
  referenceId  String?          @map("reference_id") @db.Uuid
  expiresAt    DateTime?        @map("expires_at")
  createdAt    DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, expiresAt])
  @@index([referenceId])
  @@map("point_histories")
}

model SocialAccount {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String         @map("user_id") @db.Uuid
  provider       SocialProvider
  providerId     String         @map("provider_id") @db.VarChar(200)
  providerEmail  String?        @map("provider_email") @db.VarChar(255)
  accessToken    String?        @map("access_token")
  refreshToken   String?        @map("refresh_token")
  tokenExpiresAt DateTime?      @map("token_expires_at")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@unique([provider, providerId])
  @@index([userId])
  @@map("social_accounts")
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Product {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name             String        @db.VarChar(300)
  slug             String        @db.VarChar(300)
  description      String?
  shortDescription String?       @map("short_description") @db.VarChar(500)
  type             ProductType   @default(PHYSICAL)
  status           ProductStatus @default(DRAFT)
  basePrice        BigInt        @map("base_price")
  salePrice        BigInt?       @map("sale_price")
  costPrice        BigInt?       @map("cost_price")
  brand            String?       @db.VarChar(100)
  tags             String[]
  weightGram       Int?          @map("weight_gram")
  metaTitle        String?       @map("meta_title") @db.VarChar(300)
  metaDescription  String?       @map("meta_description") @db.VarChar(500)
  isFeatured       Boolean       @default(false) @map("is_featured")
  sortOrder        Int           @default(0) @map("sort_order")
  viewCount        BigInt        @default(0) @map("view_count")
  reviewCount      Int           @default(0) @map("review_count")
  reviewAvgScore   Decimal?      @map("review_avg_score") @db.Decimal(3, 2)
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")
  deletedAt        DateTime?     @map("deleted_at")

  options           ProductOption[]
  skus              ProductSku[]
  images            ProductImage[]
  reviews           ProductReview[]
  categories        ProductCategory[]
  catalogDisplays   ProductCatalogDisplay[]
  wishlists         Wishlist[]

  @@unique([slug], name: "uq_products_slug")
  @@index([status, sortOrder])
  @@index([status, isFeatured])
  @@index([createdAt(sort: Desc)])
  @@map("products")
}

model ProductOption {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId String   @map("product_id") @db.Uuid
  name      String   @db.VarChar(100)
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  product Product              @relation(fields: [productId], references: [id])
  values  ProductOptionValue[]

  @@index([productId])
  @@map("product_options")
}

model ProductOptionValue {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  optionId  String   @map("option_id") @db.Uuid
  value     String   @db.VarChar(100)
  colorHex  String?  @map("color_hex") @db.VarChar(7)
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  option   ProductOption    @relation(fields: [optionId], references: [id])
  skuLinks ProductSkuOption[]

  @@index([optionId])
  @@map("product_option_values")
}

model ProductSku {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId     String   @map("product_id") @db.Uuid
  skuCode       String   @map("sku_code") @db.VarChar(100)
  priceModifier BigInt   @default(0) @map("price_modifier")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  product     Product           @relation(fields: [productId], references: [id])
  options     ProductSkuOption[]
  images      ProductImage[]

  @@unique([productId, skuCode])
  @@index([productId, isActive])
  @@map("product_skus")
}

model ProductSkuOption {
  skuId          String @map("sku_id") @db.Uuid
  optionValueId  String @map("option_value_id") @db.Uuid

  sku         ProductSku         @relation(fields: [skuId], references: [id])
  optionValue ProductOptionValue @relation(fields: [optionValueId], references: [id])

  @@id([skuId, optionValueId])
  @@map("product_sku_options")
}

model ProductImage {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId   String   @map("product_id") @db.Uuid
  skuId       String?  @map("sku_id") @db.Uuid
  url         String   @db.VarChar(500)
  altText     String?  @map("alt_text") @db.VarChar(200)
  isThumbnail Boolean  @default(false) @map("is_thumbnail")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  product Product     @relation(fields: [productId], references: [id])
  sku     ProductSku? @relation(fields: [skuId], references: [id])

  @@index([productId, sortOrder])
  @@map("product_images")
}

model ProductReview {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId    String       @map("product_id") @db.Uuid
  userId       String       @map("user_id") @db.Uuid
  orderItemId  String       @unique @map("order_item_id") @db.Uuid
  score        Int          @db.SmallInt
  title        String?      @db.VarChar(200)
  content      String
  images       String[]
  isVerified   Boolean      @default(true) @map("is_verified")
  status       ReviewStatus @default(ACTIVE)
  helpfulCount Int          @default(0) @map("helpful_count")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")
  deletedAt    DateTime?    @map("deleted_at")

  product Product @relation(fields: [productId], references: [id])

  @@index([productId, status, createdAt(sort: Desc)])
  @@index([userId])
  @@map("product_reviews")
}

model Wishlist {
  userId    String   @map("user_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id])

  @@id([userId, productId])
  @@index([userId, createdAt(sort: Desc)])
  @@index([productId])
  @@map("wishlists")
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Category {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parentId        String?  @map("parent_id") @db.Uuid
  name            String   @db.VarChar(100)
  slug            String   @unique @db.VarChar(200)
  description     String?  @db.VarChar(500)
  imageUrl        String?  @map("image_url") @db.VarChar(500)
  depth           Int      @db.SmallInt
  sortOrder       Int      @default(0) @map("sort_order")
  isActive        Boolean  @default(true) @map("is_active")
  metaTitle       String?  @map("meta_title") @db.VarChar(300)
  metaDescription String?  @map("meta_description") @db.VarChar(500)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")

  productCategories   ProductCategory[]
  catalogDisplays     ProductCatalogDisplay[]

  @@index([parentId, sortOrder])
  @@index([depth, isActive, sortOrder])
  @@map("categories")
}

model ProductCategory {
  productId  String  @map("product_id") @db.Uuid
  categoryId String  @map("category_id") @db.Uuid
  isPrimary  Boolean @default(false) @map("is_primary")

  product  Product  @relation(fields: [productId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@id([productId, categoryId])
  @@index([categoryId, isPrimary])
  @@map("product_categories")
}

model ProductCatalogDisplay {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  productId   String    @map("product_id") @db.Uuid
  categoryId  String?   @map("category_id") @db.Uuid
  displayZone String    @db.VarChar(100)
  sortOrder   Int       @default(0) @map("sort_order")
  startsAt    DateTime? @map("starts_at")
  endsAt      DateTime? @map("ends_at")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  product  Product   @relation(fields: [productId], references: [id])
  category Category? @relation(fields: [categoryId], references: [id])

  @@index([categoryId, isActive, sortOrder])
  @@index([displayZone, isActive, sortOrder])
  @@map("product_catalog_displays")
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Cart {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String?   @map("user_id") @db.Uuid
  sessionId String?   @map("session_id") @db.VarChar(100)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  expiresAt DateTime? @map("expires_at")

  items CartItem[]

  @@index([userId])
  @@index([sessionId])
  @@index([expiresAt])
  @@map("carts")
}

model CartItem {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cartId    String   @map("cart_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  skuId     String   @map("sku_id") @db.Uuid
  quantity  Int
  unitPrice BigInt   @map("unit_price")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  cart Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)

  @@unique([cartId, skuId])
  @@index([cartId])
  @@map("cart_items")
}

model Order {
  id              String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber     String       @unique @map("order_number") @db.VarChar(30)
  userId          String?      @map("user_id") @db.Uuid
  guestEmail      String?      @map("guest_email") @db.VarChar(255)
  status          OrderStatus  @default(PENDING)
  // amounts
  subtotal        BigInt
  discountAmount  BigInt       @default(0) @map("discount_amount")
  shippingFee     BigInt       @default(0) @map("shipping_fee")
  pointUsed       BigInt       @default(0) @map("point_used")
  couponDiscount  BigInt       @default(0) @map("coupon_discount")
  totalAmount     BigInt       @map("total_amount")
  // shipping snapshot
  shippingName    String       @map("shipping_name") @db.VarChar(100)
  shippingPhone   String       @map("shipping_phone") @db.VarChar(20)
  shippingZipcode String       @map("shipping_zipcode") @db.VarChar(10)
  shippingAddress1 String      @map("shipping_address1") @db.VarChar(200)
  shippingAddress2 String?     @map("shipping_address2") @db.VarChar(200)
  // notes
  customerNote    String?      @map("customer_note") @db.VarChar(500)
  adminNote       String?      @map("admin_note") @db.VarChar(500)
  // timestamps
  confirmedAt     DateTime?    @map("confirmed_at")
  cancelledAt     DateTime?    @map("cancelled_at")
  cancelReason    CancelReason? @map("cancel_reason")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  items           OrderItem[]
  statusHistories OrderStatusHistory[]
  returnRequests  ReturnRequest[]
  payment         Payment?

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc)])
  @@map("orders")
}

model OrderItem {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId        String          @map("order_id") @db.Uuid
  productId      String          @map("product_id") @db.Uuid
  skuId          String          @map("sku_id") @db.Uuid
  // snapshot
  productName    String          @map("product_name") @db.VarChar(300)
  productImage   String?         @map("product_image") @db.VarChar(500)
  optionSummary  String?         @map("option_summary") @db.VarChar(200)
  skuCode        String          @map("sku_code") @db.VarChar(100)
  // price
  unitPrice      BigInt          @map("unit_price")
  quantity       Int
  totalPrice     BigInt          @map("total_price")
  // status
  status         OrderItemStatus @default(PENDING)
  isReviewed     Boolean         @default(false) @map("is_reviewed")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  order          Order           @relation(fields: [orderId], references: [id])
  returnRequests ReturnRequest[]

  @@index([orderId])
  @@index([skuId, status])
  @@index([productId])
  @@map("order_items")
}

model OrderStatusHistory {
  id         String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId    String      @map("order_id") @db.Uuid
  fromStatus OrderStatus? @map("from_status")
  toStatus   OrderStatus  @map("to_status")
  changedBy  String?     @map("changed_by") @db.Uuid
  note       String?     @db.VarChar(500)
  createdAt  DateTime    @default(now()) @map("created_at")

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId, createdAt])
  @@map("order_status_histories")
}

model ReturnRequest {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId       String   @map("order_id") @db.Uuid
  orderItemId   String   @map("order_item_id") @db.Uuid
  requestType   String   @map("request_type") @db.VarChar(20)
  reason        String   @db.VarChar(50)
  detail        String?
  images        String[]
  quantity      Int
  status        String   @db.VarChar(30)
  adminNote     String?  @map("admin_note") @db.VarChar(500)
  processedAt   DateTime? @map("processed_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  order     Order     @relation(fields: [orderId], references: [id])
  orderItem OrderItem @relation(fields: [orderItemId], references: [id])

  @@index([orderId])
  @@index([orderItemId])
  @@index([status, createdAt(sort: Desc)])
  @@map("return_requests")
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Payment {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId         String        @unique @map("order_id") @db.Uuid
  paymentKey      String?       @unique @map("payment_key") @db.VarChar(200)
  method          PaymentMethod
  status          PaymentStatus @default(PENDING)
  // amounts
  requestedAmount BigInt        @map("requested_amount")
  paidAmount      BigInt?       @map("paid_amount")
  // card info
  cardNumber      String?       @map("card_number") @db.VarChar(20)
  cardCompany     String?       @map("card_company") @db.VarChar(50)
  installment     Int?          @db.SmallInt
  // virtual account
  virtualBank     String?       @map("virtual_bank") @db.VarChar(50)
  virtualAccount  String?       @map("virtual_account") @db.VarChar(30)
  virtualExpiresAt DateTime?   @map("virtual_expires_at")
  // receipt
  receiptUrl      String?       @map("receipt_url") @db.VarChar(500)
  // PG response
  pgResponse      Json?         @map("pg_response")
  // timestamps
  paidAt          DateTime?     @map("paid_at")
  failedAt        DateTime?     @map("failed_at")
  failReason      String?       @map("fail_reason") @db.VarChar(200)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  order   Order           @relation(fields: [orderId], references: [id])
  refunds PaymentRefund[]

  @@index([status, createdAt(sort: Desc)])
  @@index([paidAt(sort: Desc)])
  @@map("payments")
}

model PaymentRefund {
  id            String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  paymentId     String       @map("payment_id") @db.Uuid
  orderId       String       @map("order_id") @db.Uuid
  refundKey     String?      @map("refund_key") @db.VarChar(200)
  amount        BigInt
  reason        String       @db.VarChar(200)
  status        RefundStatus @default(REQUESTED)
  // bank refund
  bankName      String?      @map("bank_name") @db.VarChar(50)
  accountNumber String?      @map("account_number") @db.VarChar(30)
  accountHolder String?      @map("account_holder") @db.VarChar(50)
  // processing
  processedBy   String?      @map("processed_by") @db.Uuid
  pgResponse    Json?        @map("pg_response")
  refundedAt    DateTime?    @map("refunded_at")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  payment Payment @relation(fields: [paymentId], references: [id])

  @@index([paymentId])
  @@index([orderId])
  @@index([status, createdAt(sort: Desc)])
  @@map("payment_refunds")
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Stock {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  skuId       String   @unique @map("sku_id") @db.Uuid
  quantity    Int      @default(0)
  reserved    Int      @default(0)
  available   Int      @default(0)
  safetyStock Int      @default(0) @map("safety_stock")
  location    String?  @db.VarChar(100)
  updatedAt   DateTime @updatedAt @map("updated_at")

  reservations StockReservation[]
  histories    StockHistory[]

  @@index([available])
  @@map("stocks")
}

model StockReservation {
  id        String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  stockId   String                 @map("stock_id") @db.Uuid
  orderId   String                 @map("order_id") @db.Uuid
  skuId     String                 @map("sku_id") @db.Uuid
  quantity  Int
  status    StockReservationStatus @default(RESERVED)
  expiresAt DateTime               @map("expires_at")
  createdAt DateTime               @default(now()) @map("created_at")
  updatedAt DateTime               @updatedAt @map("updated_at")

  stock Stock @relation(fields: [stockId], references: [id])

  @@index([stockId, status])
  @@index([orderId])
  @@index([expiresAt, status])
  @@map("stock_reservations")
}

model StockHistory {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  skuId          String   @map("sku_id") @db.Uuid
  changeType     String   @map("change_type") @db.VarChar(50)
  quantityDelta  Int      @map("quantity_delta")
  quantityBefore Int      @map("quantity_before")
  quantityAfter  Int      @map("quantity_after")
  referenceId    String?  @map("reference_id") @db.Uuid
  note           String?  @db.VarChar(200)
  createdBy      String?  @map("created_by") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")

  stock Stock @relation(fields: [skuId], references: [skuId])

  @@index([skuId, createdAt(sort: Desc)])
  @@index([referenceId])
  @@map("stock_histories")
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

model Shipment {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId         String         @unique @map("order_id") @db.Uuid
  carrierCode     CarrierCode    @map("carrier_code")
  trackingNumber  String?        @map("tracking_number") @db.VarChar(50)
  status          ShipmentStatus @default(PREPARING)
  // delivery address snapshot
  recipientName   String         @map("recipient_name") @db.VarChar(100)
  recipientPhone  String         @map("recipient_phone") @db.VarChar(20)
  zipcode         String         @db.VarChar(10)
  address1        String         @db.VarChar(200)
  address2        String?        @db.VarChar(200)
  deliveryNote    String?        @map("delivery_note") @db.VarChar(300)
  // timestamps
  shippedAt       DateTime?      @map("shipped_at")
  deliveredAt     DateTime?      @map("delivered_at")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  trackingEvents TrackingEvent[]

  @@index([status, createdAt(sort: Desc)])
  @@map("shipments")
}

model TrackingEvent {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  shipmentId  String         @map("shipment_id") @db.Uuid
  status      ShipmentStatus
  location    String?        @db.VarChar(200)
  description String         @db.VarChar(300)
  eventTime   DateTime       @map("event_time")
  createdAt   DateTime       @default(now()) @map("created_at")

  shipment Shipment @relation(fields: [shipmentId], references: [id])

  @@index([shipmentId, eventTime(sort: Desc)])
  @@map("tracking_events")
}
```

---

## 관련 파일

- 플랜 문서: `docs/01-plan/features/abada-shop.plan.md`
- Prisma 스키마: `prisma/schema.prisma` (위 코드 그대로 사용)
- 마이그레이션: `prisma/migrations/`

---

**Project**: abada-shop | **Updated**: 2026-02-22
