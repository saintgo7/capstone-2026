# API Design: abada 쇼핑몰 REST API

**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Phase**: Design
**Base URL**: `https://shop.abada.kr/api/v1`

---

## 목차

1. [공통 규격](#1-공통-규격)
2. [Auth API](#2-auth-api)
3. [Members API](#3-members-api)
4. [Products API](#4-products-api)
5. [Categories API](#5-categories-api)
6. [Cart API](#6-cart-api)
7. [Orders API](#7-orders-api)
8. [Payments API](#8-payments-api)
9. [Shipping API](#9-shipping-api)
10. [Mobile API](#10-mobile-api)
11. [Admin API](#11-admin-api)
12. [파일 업로드 (Presigned URL)](#12-파일-업로드-presigned-url)
13. [레이트 리미팅](#13-레이트-리미팅)

---

## 1. 공통 규격

### 1.1 인증 방식

```
Authorization: Bearer {accessToken}
```

| 인증 레벨 | 설명 |
|----------|------|
| `public` | 인증 불필요 |
| `user` | JWT accessToken 필요 |
| `admin` | JWT + 관리자 권한 필요 |

- **Access Token**: JWT, 만료 15분
- **Refresh Token**: httpOnly cookie (`refresh_token`), 만료 30일
- 소셜 로그인 시 동일한 토큰 체계 적용

### 1.2 표준 성공 응답

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01HXYZ..."
  }
}
```

목록 조회 시:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "hasNext": true,
    "hasPrev": false,
    "total": 1240
  }
}
```

### 1.3 표준 에러 응답

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "상품을 찾을 수 없습니다.",
    "details": [
      {
        "field": "productId",
        "message": "존재하지 않는 상품 ID입니다."
      }
    ]
  },
  "meta": {
    "requestId": "req_01HXYZ..."
  }
}
```

### 1.4 공통 에러 코드

| HTTP | Code | 설명 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 요청 유효성 검사 실패 |
| 401 | `UNAUTHORIZED` | 인증 토큰 없음/만료 |
| 401 | `TOKEN_EXPIRED` | Access Token 만료 |
| 401 | `INVALID_TOKEN` | 유효하지 않은 토큰 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복/충돌 |
| 422 | `UNPROCESSABLE` | 비즈니스 룰 위반 |
| 429 | `RATE_LIMIT_EXCEEDED` | 요청 한도 초과 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

### 1.5 페이지네이션 (Cursor-based)

**요청 파라미터:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `cursor` | string | - | 이전 응답의 `pagination.cursor` |
| `limit` | number | 20 | 최대 100 |
| `direction` | `next`\|`prev` | `next` | 페이지 방향 |

**Cursor 인코딩:** Base64(JSON) — `{"id": 100, "createdAt": "2026-02-22T..."}`

**예시:**
```
GET /api/v1/products?cursor=eyJpZCI6MTAwfQ==&limit=20
```

### 1.6 공통 Query 파라미터 (목록 API)

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `sort` | string | 정렬 필드 (e.g., `createdAt`, `-price`) |
| `cursor` | string | 커서 페이지네이션 |
| `limit` | number | 페이지당 수량 (max: 100) |

> `sort` 앞에 `-` 붙이면 DESC, 없으면 ASC

---

## 2. Auth API

### 2.1 이메일 회원가입

```
POST /auth/register
Auth: public
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd!",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "agreeTerms": true,
  "agreePrivacy": true,
  "agreeMarketing": false
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "mem_01HXYZ",
      "email": "user@example.com",
      "name": "홍길동",
      "grade": "NORMAL",
      "createdAt": "2026-02-22T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

**Set-Cookie:** `refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`

**에러 코드:**
| Code | 설명 |
|------|------|
| `EMAIL_ALREADY_EXISTS` | 이미 가입된 이메일 |
| `INVALID_PASSWORD_FORMAT` | 비밀번호 형식 오류 |
| `TERMS_NOT_AGREED` | 필수 약관 미동의 |

---

### 2.2 이메일 로그인

```
POST /auth/login
Auth: public
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Passw0rd!",
  "deviceInfo": {
    "platform": "ios",
    "deviceId": "uuid",
    "pushToken": "fcm_token"
  }
}
```

> `deviceInfo`는 모바일 앱에서만 전송 (선택)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "mem_01HXYZ",
      "email": "user@example.com",
      "name": "홍길동",
      "grade": "NORMAL",
      "avatarUrl": null
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `INVALID_CREDENTIALS` | 이메일/비밀번호 불일치 |
| `ACCOUNT_SUSPENDED` | 정지된 계정 |
| `ACCOUNT_DELETED` | 탈퇴한 계정 |

---

### 2.3 로그아웃

```
POST /auth/logout
Auth: user
```

**Request Body:** (없음)

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

**Set-Cookie:** `refresh_token=; Max-Age=0` (쿠키 삭제)

---

### 2.4 토큰 갱신

```
POST /auth/refresh
Auth: public (httpOnly cookie 사용)
```

**Request:** Cookie의 `refresh_token` 자동 전송

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `REFRESH_TOKEN_EXPIRED` | Refresh Token 만료 (재로그인 필요) |
| `REFRESH_TOKEN_INVALID` | 유효하지 않은 Refresh Token |
| `REFRESH_TOKEN_REVOKED` | 폐기된 Refresh Token |

---

### 2.5 소셜 로그인

```
POST /auth/social/{provider}
Auth: public
```

**Path:** `provider` = `kakao` | `naver` | `google`

**Request Body:**
```json
{
  "code": "authorization_code_from_provider",
  "redirectUri": "https://shop.abada.kr/auth/callback/kakao",
  "deviceInfo": {
    "platform": "ios",
    "deviceId": "uuid",
    "pushToken": "fcm_token"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "isNewMember": false,
    "member": {
      "id": "mem_01HXYZ",
      "email": "user@kakao.com",
      "name": "홍길동",
      "grade": "NORMAL",
      "provider": "kakao"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

> `isNewMember: true`이면 앱에서 추가 정보 입력 유도

**에러 코드:**
| Code | 설명 |
|------|------|
| `INVALID_OAUTH_CODE` | 유효하지 않은 인가 코드 |
| `OAUTH_PROVIDER_ERROR` | 소셜 로그인 서버 오류 |
| `EMAIL_ALREADY_EXISTS` | 동일 이메일로 다른 방식 가입됨 |

---

## 3. Members API

### 3.1 내 정보 조회

```
GET /members/me
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "mem_01HXYZ",
    "email": "user@example.com",
    "name": "홍길동",
    "phone": "010-1234-5678",
    "grade": "VIP",
    "points": 15000,
    "avatarUrl": "https://r2.shop.abada.kr/avatars/...",
    "provider": "local",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

---

### 3.2 내 정보 수정

```
PUT /members/me
Auth: user
```

**Request Body:**
```json
{
  "name": "홍길동",
  "phone": "010-9999-8888",
  "avatarUrl": "https://r2.shop.abada.kr/avatars/..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "mem_01HXYZ",
    "name": "홍길동",
    "phone": "010-9999-8888",
    "updatedAt": "2026-02-22T10:00:00Z"
  }
}
```

---

### 3.3 내 주문 목록

```
GET /members/me/orders
Auth: user
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `status` | string | `PENDING`\|`PAID`\|`SHIPPING`\|`DELIVERED`\|`CANCELLED` |
| `cursor` | string | 커서 |
| `limit` | number | 기본값 10 |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ord_01HXYZ",
      "orderNumber": "20260222-001234",
      "status": "SHIPPING",
      "totalAmount": 89000,
      "itemCount": 2,
      "representativeImage": "https://r2.shop.abada.kr/...",
      "representativeName": "abada 반팔 티셔츠 외 1건",
      "createdAt": "2026-02-22T09:00:00Z"
    }
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjEwIn0=",
    "hasNext": true,
    "hasPrev": false,
    "total": 48
  }
}
```

---

### 3.4 포인트 내역

```
GET /members/me/points
Auth: user
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `type` | string | `EARN`\|`USE`\|`EXPIRE` |
| `cursor` | string | 커서 |
| `limit` | number | 기본값 20 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "balance": 15000,
    "history": [
      {
        "id": "pt_01HXYZ",
        "type": "EARN",
        "amount": 890,
        "description": "주문 적립 (20260222-001234)",
        "expiredAt": "2027-02-22T00:00:00Z",
        "createdAt": "2026-02-22T10:00:00Z"
      }
    ]
  },
  "pagination": {
    "cursor": "eyJpZCI6IjIwIn0=",
    "hasNext": false,
    "hasPrev": false,
    "total": 12
  }
}
```

---

### 3.5 배송지 목록

```
GET /members/me/addresses
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "addr_01HXYZ",
      "alias": "집",
      "recipientName": "홍길동",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "101호",
      "isDefault": true
    }
  ]
}
```

---

### 3.6 배송지 추가

```
POST /members/me/addresses
Auth: user
```

**Request Body:**
```json
{
  "alias": "회사",
  "recipientName": "홍길동",
  "phone": "010-1234-5678",
  "zipCode": "12345",
  "address1": "서울시 강남구 테헤란로 123",
  "address2": "101호",
  "isDefault": false
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "addr_02HXYZ",
    "alias": "회사",
    "isDefault": false,
    "createdAt": "2026-02-22T10:00:00Z"
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `ADDRESS_LIMIT_EXCEEDED` | 최대 배송지 수 초과 (최대 10개) |

---

### 3.7 배송지 수정

```
PUT /members/me/addresses/{addressId}
Auth: user
```

**Request Body:** (3.6과 동일)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "addr_01HXYZ",
    "updatedAt": "2026-02-22T10:00:00Z"
  }
}
```

---

### 3.8 배송지 삭제

```
DELETE /members/me/addresses/{addressId}
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `DEFAULT_ADDRESS_CANNOT_DELETE` | 기본 배송지는 삭제 불가 |

---

## 4. Products API

### 4.1 상품 목록 조회

```
GET /products
Auth: public
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `categoryId` | string | 카테고리 ID 필터 |
| `q` | string | 검색 키워드 |
| `minPrice` | number | 최소 가격 |
| `maxPrice` | number | 최대 가격 |
| `sort` | string | `createdAt`\|`-price`\|`price`\|`-salesCount`\|`-rating` |
| `status` | string | `ACTIVE` (기본)\|`ALL` (admin only) |
| `cursor` | string | 커서 |
| `limit` | number | 기본값 20 |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "prd_01HXYZ",
      "name": "abada 반팔 티셔츠",
      "slug": "abada-short-sleeve-tee",
      "price": 29000,
      "discountRate": 10,
      "finalPrice": 26100,
      "thumbnailUrl": "https://r2.shop.abada.kr/products/...",
      "rating": 4.5,
      "reviewCount": 128,
      "salesCount": 3420,
      "isNew": true,
      "isBest": false,
      "status": "ACTIVE",
      "categoryId": "cat_01HXYZ"
    }
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjUwIn0=",
    "hasNext": true,
    "hasPrev": false,
    "total": 340
  }
}
```

---

### 4.2 상품 상세 조회

```
GET /products/{productId}
Auth: public
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "prd_01HXYZ",
    "name": "abada 반팔 티셔츠",
    "slug": "abada-short-sleeve-tee",
    "description": "...",
    "price": 29000,
    "discountRate": 10,
    "finalPrice": 26100,
    "images": [
      {
        "id": "img_01",
        "url": "https://r2.shop.abada.kr/products/...",
        "order": 0,
        "isMain": true
      }
    ],
    "options": [
      {
        "id": "opt_01",
        "name": "색상",
        "values": [
          { "id": "val_01", "value": "블랙", "stockQuantity": 50, "additionalPrice": 0 },
          { "id": "val_02", "value": "화이트", "stockQuantity": 20, "additionalPrice": 0 }
        ]
      },
      {
        "id": "opt_02",
        "name": "사이즈",
        "values": [
          { "id": "val_03", "value": "S", "stockQuantity": 30, "additionalPrice": 0 },
          { "id": "val_04", "value": "M", "stockQuantity": 40, "additionalPrice": 0 },
          { "id": "val_05", "value": "L", "stockQuantity": 15, "additionalPrice": 0 }
        ]
      }
    ],
    "variants": [
      {
        "id": "var_01",
        "optionValues": ["val_01", "val_03"],
        "sku": "SKU-TEE-BLK-S",
        "stockQuantity": 15,
        "additionalPrice": 0
      }
    ],
    "category": {
      "id": "cat_01HXYZ",
      "name": "상의",
      "fullPath": "의류 > 상의 > 티셔츠"
    },
    "rating": 4.5,
    "reviewCount": 128,
    "salesCount": 3420,
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `PRODUCT_NOT_FOUND` | 상품 없음 |
| `PRODUCT_INACTIVE` | 비활성 상품 (관리자만 접근 가능) |

---

### 4.3 상품 리뷰 목록

```
GET /products/{productId}/reviews
Auth: public
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `sort` | string | `-createdAt`\|`-rating`\|`rating` |
| `rating` | number | 별점 필터 (1-5) |
| `cursor` | string | 커서 |
| `limit` | number | 기본값 10 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "rating": 4.5,
      "count": 128,
      "distribution": { "5": 80, "4": 30, "3": 12, "2": 4, "1": 2 }
    },
    "reviews": [
      {
        "id": "rev_01HXYZ",
        "member": {
          "name": "홍*동",
          "grade": "VIP"
        },
        "rating": 5,
        "content": "품질이 정말 좋아요!",
        "images": ["https://r2.shop.abada.kr/reviews/..."],
        "optionSummary": "블랙 / M",
        "helpfulCount": 12,
        "createdAt": "2026-02-01T00:00:00Z"
      }
    ]
  },
  "pagination": {
    "cursor": "eyJpZCI6IjMwIn0=",
    "hasNext": true,
    "hasPrev": false,
    "total": 128
  }
}
```

---

### 4.4 상품 등록 (Admin)

```
POST /products
Auth: admin
```

**Request Body:**
```json
{
  "name": "abada 반팔 티셔츠",
  "slug": "abada-short-sleeve-tee",
  "description": "...",
  "price": 29000,
  "discountRate": 10,
  "categoryId": "cat_01HXYZ",
  "imageKeys": ["products/uuid1.jpg", "products/uuid2.jpg"],
  "options": [
    {
      "name": "색상",
      "values": ["블랙", "화이트"]
    }
  ],
  "variants": [
    {
      "optionValues": ["블랙"],
      "sku": "SKU-TEE-BLK",
      "stockQuantity": 100,
      "additionalPrice": 0
    }
  ],
  "status": "ACTIVE"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "prd_01HXYZ",
    "name": "abada 반팔 티셔츠",
    "slug": "abada-short-sleeve-tee",
    "createdAt": "2026-02-22T10:00:00Z"
  }
}
```

---

### 4.5 상품 수정 (Admin)

```
PUT /products/{productId}
Auth: admin
```

**Request Body:** (4.4와 동일, 부분 업데이트 지원)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "prd_01HXYZ",
    "updatedAt": "2026-02-22T10:00:00Z"
  }
}
```

---

### 4.6 상품 삭제 (Admin)

```
DELETE /products/{productId}
Auth: admin
```

> 실제 삭제가 아닌 `status: DELETED` 처리 (소프트 딜리트)

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `PRODUCT_HAS_ACTIVE_ORDERS` | 진행 중인 주문이 있어 삭제 불가 |

---

## 5. Categories API

### 5.1 카테고리 트리 조회

```
GET /categories
Auth: public
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `depth` | number | 조회 깊이 (기본: 3) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_01",
      "name": "의류",
      "slug": "clothing",
      "imageUrl": "https://r2.shop.abada.kr/categories/...",
      "order": 1,
      "children": [
        {
          "id": "cat_02",
          "name": "상의",
          "slug": "tops",
          "order": 1,
          "children": [
            {
              "id": "cat_03",
              "name": "티셔츠",
              "slug": "tshirts",
              "order": 1,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

### 5.2 카테고리 상품 목록

```
GET /categories/{categoryId}/products
Auth: public
```

> `GET /products?categoryId={categoryId}`와 동일. 카테고리 하위 전체 포함 여부:

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `includeChildren` | boolean | true | 하위 카테고리 상품 포함 |
| (+ 4.1 공통 파라미터) | | | |

**Response 200:** 4.1과 동일

---

## 6. Cart API

### 6.1 장바구니 조회

```
GET /cart
Auth: user (비회원: X-Cart-Token 헤더)
```

**Headers (비회원):**
```
X-Cart-Token: {local-uuid}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "cartId": "cart_01HXYZ",
    "items": [
      {
        "id": "ci_01HXYZ",
        "product": {
          "id": "prd_01HXYZ",
          "name": "abada 반팔 티셔츠",
          "thumbnailUrl": "https://r2.shop.abada.kr/...",
          "status": "ACTIVE"
        },
        "variant": {
          "id": "var_01",
          "optionSummary": "블랙 / M",
          "sku": "SKU-TEE-BLK-M"
        },
        "quantity": 2,
        "unitPrice": 26100,
        "totalPrice": 52200,
        "stockQuantity": 15,
        "isAvailable": true
      }
    ],
    "summary": {
      "itemCount": 1,
      "totalQuantity": 2,
      "subtotal": 52200,
      "estimatedShipping": 3000,
      "total": 55200
    }
  }
}
```

---

### 6.2 장바구니 상품 추가

```
POST /cart/items
Auth: user (비회원: X-Cart-Token 헤더)
```

**Request Body:**
```json
{
  "productId": "prd_01HXYZ",
  "variantId": "var_01",
  "quantity": 2
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "cartItemId": "ci_01HXYZ",
    "quantity": 2,
    "totalPrice": 52200
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `PRODUCT_INACTIVE` | 비활성 상품 |
| `INSUFFICIENT_STOCK` | 재고 부족 |
| `CART_ITEM_LIMIT_EXCEEDED` | 최대 상품 수 초과 (최대 50종) |

---

### 6.3 장바구니 상품 수량 변경

```
PUT /cart/items/{cartItemId}
Auth: user (비회원: X-Cart-Token 헤더)
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "cartItemId": "ci_01HXYZ",
    "quantity": 3,
    "totalPrice": 78300
  }
}
```

---

### 6.4 장바구니 상품 삭제

```
DELETE /cart/items/{cartItemId}
Auth: user (비회원: X-Cart-Token 헤더)
```

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

---

### 6.5 장바구니 전체 비우기

```
DELETE /cart
Auth: user (비회원: X-Cart-Token 헤더)
```

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

---

## 7. Orders API

### 7.1 주문 생성

```
POST /orders
Auth: user
```

**Request Body:**
```json
{
  "cartItemIds": ["ci_01HXYZ", "ci_02HXYZ"],
  "shippingAddress": {
    "addressId": "addr_01HXYZ"
  },
  "shippingMemo": "문 앞에 놔주세요",
  "couponId": "cpn_01HXYZ",
  "pointsToUse": 5000,
  "paymentMethod": "CARD"
}
```

> `addressId` 대신 직접 입력 시:
```json
{
  "shippingAddress": {
    "recipientName": "홍길동",
    "phone": "010-1234-5678",
    "zipCode": "12345",
    "address1": "서울시 강남구",
    "address2": "101호"
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_01HXYZ",
    "orderNumber": "20260222-001234",
    "status": "PENDING_PAYMENT",
    "items": [
      {
        "id": "oi_01HXYZ",
        "productName": "abada 반팔 티셔츠",
        "optionSummary": "블랙 / M",
        "quantity": 2,
        "unitPrice": 26100,
        "totalPrice": 52200
      }
    ],
    "pricing": {
      "subtotal": 52200,
      "shippingFee": 3000,
      "discountAmount": 5000,
      "pointsUsed": 5000,
      "totalAmount": 45200
    },
    "payment": {
      "method": "CARD",
      "amount": 45200,
      "paymentKey": null
    },
    "expiresAt": "2026-02-22T10:30:00Z"
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `CART_ITEM_NOT_FOUND` | 장바구니 상품 없음 |
| `INSUFFICIENT_STOCK` | 재고 부족 |
| `INVALID_COUPON` | 유효하지 않은 쿠폰 |
| `INSUFFICIENT_POINTS` | 포인트 잔액 부족 |
| `MINIMUM_ORDER_AMOUNT` | 최소 주문 금액 미달 |

---

### 7.2 주문 상세 조회

```
GET /orders/{orderId}
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "ord_01HXYZ",
    "orderNumber": "20260222-001234",
    "status": "SHIPPING",
    "items": [ ... ],
    "shippingAddress": {
      "recipientName": "홍길동",
      "phone": "010-1234-5678",
      "zipCode": "12345",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "101호"
    },
    "shippingMemo": "문 앞에 놔주세요",
    "pricing": {
      "subtotal": 52200,
      "shippingFee": 3000,
      "discountAmount": 5000,
      "pointsUsed": 5000,
      "totalAmount": 45200
    },
    "payment": {
      "method": "CARD",
      "amount": 45200,
      "paidAt": "2026-02-22T10:05:00Z",
      "receiptUrl": "https://toss.im/..."
    },
    "shipment": {
      "carrier": "CJ대한통운",
      "trackingNumber": "1234567890",
      "status": "IN_TRANSIT"
    },
    "createdAt": "2026-02-22T10:00:00Z",
    "updatedAt": "2026-02-22T10:05:00Z"
  }
}
```

---

### 7.3 주문 취소

```
POST /orders/{orderId}/cancel
Auth: user
```

**Request Body:**
```json
{
  "reason": "단순 변심",
  "details": "색상을 바꾸고 싶어요"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "orderId": "ord_01HXYZ",
    "status": "CANCELLED",
    "refund": {
      "amount": 45200,
      "method": "CARD",
      "estimatedAt": "2026-02-25T00:00:00Z"
    }
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `ORDER_CANNOT_CANCEL` | 취소 불가 상태 (배송 후) |
| `ORDER_NOT_FOUND` | 주문 없음 |
| `UNAUTHORIZED_ORDER` | 본인 주문 아님 |

---

## 8. Payments API

### 8.1 결제 승인 요청

```
POST /payments
Auth: user
```

> 토스페이먼츠 결제창 완료 후 클라이언트에서 호출

**Request Body:**
```json
{
  "orderId": "ord_01HXYZ",
  "paymentKey": "5zJ4xY7m0kODnyRpQWGrN3FhbkQYCApbDcs1mdBe",
  "amount": 45200,
  "provider": "TOSSPAYMENTS"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_01HXYZ",
    "orderId": "ord_01HXYZ",
    "status": "PAID",
    "amount": 45200,
    "method": "CARD",
    "paidAt": "2026-02-22T10:05:00Z",
    "receiptUrl": "https://toss.im/..."
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `PAYMENT_AMOUNT_MISMATCH` | 결제 금액 불일치 (위변조 의심) |
| `PAYMENT_FAILED` | 토스페이먼츠 결제 실패 |
| `ORDER_ALREADY_PAID` | 이미 결제된 주문 |
| `ORDER_EXPIRED` | 주문 만료 |

---

### 8.2 결제 확인 (Webhook)

```
POST /payments/{paymentId}/confirm
Auth: admin (Webhook Secret 검증)
```

> 토스페이먼츠 Webhook으로 호출됨

**Headers:**
```
X-Webhook-Secret: {secret}
```

**Request Body:** (토스페이먼츠 Webhook 페이로드)
```json
{
  "eventType": "PAYMENT_STATUS_CHANGED",
  "data": {
    "paymentKey": "5zJ4xY7m0kODnyRpQWGrN3...",
    "orderId": "ord_01HXYZ",
    "status": "DONE"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

---

### 8.3 환불 요청

```
POST /payments/{paymentId}/refund
Auth: user (본인) | admin
```

**Request Body:**
```json
{
  "reason": "상품 불량",
  "amount": 45200,
  "bankCode": "004",
  "accountNumber": "1234567890",
  "accountHolderName": "홍길동"
}
```

> 카드 결제는 `bankCode` 등 불필요, 가상계좌 환불 시 필요

**Response 200:**
```json
{
  "success": true,
  "data": {
    "refundId": "ref_01HXYZ",
    "amount": 45200,
    "status": "PROCESSING",
    "estimatedAt": "2026-02-25T00:00:00Z"
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `REFUND_AMOUNT_EXCEEDED` | 환불 금액 초과 |
| `ALREADY_REFUNDED` | 이미 환불됨 |
| `REFUND_PERIOD_EXPIRED` | 환불 기간 초과 |

---

## 9. Shipping API

### 9.1 주문 배송 정보 조회

```
GET /shipments/{orderId}
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "shipmentId": "shp_01HXYZ",
    "orderId": "ord_01HXYZ",
    "status": "IN_TRANSIT",
    "carrier": {
      "code": "CJ",
      "name": "CJ대한통운",
      "trackingUrl": "https://trace.cjlogistics.com/..."
    },
    "trackingNumber": "1234567890",
    "estimatedDeliveryAt": "2026-02-24T00:00:00Z",
    "shippingAddress": {
      "recipientName": "홍길동",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "101호"
    },
    "createdAt": "2026-02-22T14:00:00Z",
    "updatedAt": "2026-02-22T20:00:00Z"
  }
}
```

---

### 9.2 배송 추적 이벤트 조회

```
GET /shipments/{shipmentId}/tracking
Auth: user
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "shipmentId": "shp_01HXYZ",
    "trackingNumber": "1234567890",
    "carrier": "CJ대한통운",
    "currentStatus": "IN_TRANSIT",
    "events": [
      {
        "timestamp": "2026-02-22T20:30:00Z",
        "status": "IN_TRANSIT",
        "description": "대전 허브에서 출발",
        "location": "대전 물류센터"
      },
      {
        "timestamp": "2026-02-22T15:00:00Z",
        "status": "PICKED_UP",
        "description": "집하 완료",
        "location": "서울 강남 지점"
      }
    ]
  }
}
```

---

## 10. Mobile API

### 10.1 푸시 토큰 등록

```
POST /mobile/push-token
Auth: user
```

**Request Body:**
```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios",
  "deviceId": "uuid-v4"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "registered": true
  }
}
```

---

### 10.2 푸시 토큰 삭제

```
DELETE /mobile/push-token
Auth: user
```

**Request Body:**
```json
{
  "deviceId": "uuid-v4"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": null
}
```

---

### 10.3 생체 인증 챌린지 요청

```
POST /mobile/biometric-challenge
Auth: public
```

> 생체 인증 로그인 1단계: 서버에서 챌린지 발급

**Request Body:**
```json
{
  "deviceId": "uuid-v4",
  "memberId": "mem_01HXYZ"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "challenge": "base64-encoded-random-bytes",
    "expiresIn": 60
  }
}
```

---

### 10.4 생체 인증 로그인

```
POST /mobile/biometric-login
Auth: public
```

> 생체 인증 2단계: 챌린지에 서명하여 로그인

**Request Body:**
```json
{
  "deviceId": "uuid-v4",
  "memberId": "mem_01HXYZ",
  "challenge": "base64-encoded-challenge",
  "signature": "base64-encoded-signature",
  "publicKey": "base64-encoded-public-key"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "mem_01HXYZ",
      "name": "홍길동"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `BIOMETRIC_CHALLENGE_EXPIRED` | 챌린지 만료 (60초) |
| `BIOMETRIC_VERIFICATION_FAILED` | 서명 검증 실패 |
| `BIOMETRIC_NOT_REGISTERED` | 생체 인증 미등록 기기 |

---

### 10.5 딥링크 메타 조회

```
GET /mobile/deeplink
Auth: public
```

**Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `url` | string | 딥링크 URL (e.g., `abada://product/prd_01`) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "type": "PRODUCT",
    "resourceId": "prd_01HXYZ",
    "meta": {
      "name": "abada 반팔 티셔츠",
      "thumbnailUrl": "https://r2.shop.abada.kr/..."
    }
  }
}
```

---

## 11. Admin API

> 모든 Admin API: `Auth: admin`

### 11.1 상품 관리

```
GET    /admin/products              # 상품 목록 (status=ALL 포함)
POST   /admin/products              # 상품 등록
GET    /admin/products/{id}         # 상품 상세
PUT    /admin/products/{id}         # 상품 수정
DELETE /admin/products/{id}         # 상품 삭제
PUT    /admin/products/{id}/status  # 상품 상태 변경
POST   /admin/products/bulk         # 상품 일괄 처리
```

**상품 상태 변경:**
```json
{
  "status": "INACTIVE"
}
```

**일괄 처리:**
```json
{
  "action": "ACTIVATE" | "DEACTIVATE" | "DELETE",
  "productIds": ["prd_01", "prd_02"]
}
```

---

### 11.2 주문 관리

```
GET  /admin/orders                         # 주문 목록
GET  /admin/orders/{id}                    # 주문 상세
PUT  /admin/orders/{id}/status             # 주문 상태 변경
POST /admin/orders/{id}/shipment           # 배송 정보 등록
POST /admin/orders/{id}/cancel             # 주문 강제 취소
```

**주문 목록 Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `status` | string | 주문 상태 필터 |
| `memberId` | string | 회원 필터 |
| `startDate` | string | 시작일 (ISO 8601) |
| `endDate` | string | 종료일 (ISO 8601) |
| `q` | string | 주문번호/회원명 검색 |

**배송 정보 등록:**
```json
{
  "carrier": "CJ",
  "trackingNumber": "1234567890"
}
```

---

### 11.3 회원 관리

```
GET  /admin/members           # 회원 목록
GET  /admin/members/{id}      # 회원 상세
PUT  /admin/members/{id}      # 회원 정보 수정
POST /admin/members/{id}/grade # 회원 등급 변경
POST /admin/members/{id}/suspend # 회원 정지
POST /admin/members/{id}/activate # 회원 활성화
```

**회원 목록 Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `grade` | string | `NORMAL`\|`VIP`\|`VVIP` |
| `status` | string | `ACTIVE`\|`SUSPENDED`\|`DELETED` |
| `q` | string | 이름/이메일 검색 |

**등급 변경:**
```json
{
  "grade": "VIP",
  "reason": "구매액 기준 달성"
}
```

---

### 11.4 통계 (Stats)

```
GET /admin/stats/overview        # 오늘의 주요 지표
GET /admin/stats/sales           # 매출 통계
GET /admin/stats/products        # 상품별 통계
GET /admin/stats/members         # 회원 통계
```

**Overview Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "orderCount": 128,
      "revenue": 5840000,
      "newMembers": 23,
      "cancelCount": 5
    },
    "thisMonth": {
      "orderCount": 2340,
      "revenue": 104500000,
      "newMembers": 456
    },
    "pendingShipments": 89,
    "pendingRefunds": 12
  }
}
```

**Sales Query Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `period` | string | `daily`\|`weekly`\|`monthly` |
| `startDate` | string | 시작일 |
| `endDate` | string | 종료일 |
| `groupBy` | string | `category`\|`product` |

---

## 12. 파일 업로드 (Presigned URL)

### 업로드 플로우

```
Client                    API Server              Cloudflare R2
  │                           │                       │
  │  POST /files/presign      │                       │
  │ ──────────────────────>   │                       │
  │                           │  Generate Presigned   │
  │                           │ ──────────────────>   │
  │                           │  Return URL           │
  │  200 { uploadUrl, key }   │ <──────────────────   │
  │ <──────────────────────   │                       │
  │                           │                       │
  │  PUT {uploadUrl} (binary) │                       │
  │ ─────────────────────────────────────────────>    │
  │  200 OK                   │                       │
  │ <─────────────────────────────────────────────    │
  │                           │                       │
  │  사용 시 key를 body에 포함  │                       │
```

### 12.1 Presigned URL 발급

```
POST /files/presign
Auth: user (admin for product images)
```

**Request Body:**
```json
{
  "fileName": "product-image.jpg",
  "contentType": "image/jpeg",
  "purpose": "PRODUCT_IMAGE" | "REVIEW_IMAGE" | "AVATAR",
  "size": 2048576
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://r2.shop.abada.kr/presigned/...",
    "key": "products/2026/02/uuid-filename.jpg",
    "expiresIn": 300,
    "publicUrl": "https://r2.shop.abada.kr/products/2026/02/uuid-filename.jpg"
  }
}
```

**에러 코드:**
| Code | 설명 |
|------|------|
| `FILE_SIZE_EXCEEDED` | 파일 크기 초과 (최대 10MB) |
| `INVALID_CONTENT_TYPE` | 허용되지 않는 파일 타입 |
| `UNAUTHORIZED_PURPOSE` | 해당 목적 업로드 권한 없음 |

**허용 파일 타입:**
- `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- 최대 크기: 상품 이미지 10MB, 리뷰 이미지 5MB, 아바타 2MB

---

## 13. 레이트 리미팅

### 13.1 레이트 리미팅 규칙

| 엔드포인트 그룹 | 제한 | 윈도우 | 키 기준 |
|----------------|------|--------|---------|
| `POST /auth/login` | 10회 | 10분 | IP |
| `POST /auth/register` | 5회 | 1시간 | IP |
| `POST /auth/social/*` | 10회 | 10분 | IP |
| `POST /auth/refresh` | 30회 | 1분 | IP + User |
| `POST /payments` | 5회 | 1분 | User |
| `POST /files/presign` | 20회 | 1분 | User |
| `GET /products` | 200회 | 1분 | IP |
| `Admin API` | 300회 | 1분 | User |
| 기타 인증 API | 100회 | 1분 | User |
| 기타 공개 API | 200회 | 1분 | IP |

### 13.2 레이트 리미팅 응답 헤더

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1740220800
Retry-After: 60
```

### 13.3 초과 시 응답

**HTTP 429:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "details": [
      {
        "field": "retryAfter",
        "message": "60초 후 재시도 가능합니다."
      }
    ]
  }
}
```

---

## 부록: 상태값 정의

### 주문 상태 (Order Status)

| 값 | 설명 |
|----|------|
| `PENDING_PAYMENT` | 결제 대기 |
| `PAID` | 결제 완료 |
| `PREPARING` | 상품 준비 중 |
| `SHIPPING` | 배송 중 |
| `DELIVERED` | 배송 완료 |
| `CANCELLED` | 취소됨 |
| `REFUND_REQUESTED` | 환불 요청 |
| `REFUNDED` | 환불 완료 |

### 배송 상태 (Shipment Status)

| 값 | 설명 |
|----|------|
| `WAITING` | 배송 대기 |
| `PICKED_UP` | 집하 완료 |
| `IN_TRANSIT` | 이동 중 |
| `OUT_FOR_DELIVERY` | 배달 중 |
| `DELIVERED` | 배달 완료 |
| `FAILED` | 배달 실패 |

### 회원 등급 (Member Grade)

| 값 | 조건 |
|----|------|
| `NORMAL` | 기본 |
| `VIP` | 월 구매 30만원 이상 |
| `VVIP` | 월 구매 100만원 이상 |

### 결제 방법 (Payment Method)

| 값 | 설명 |
|----|------|
| `CARD` | 신용/체크카드 |
| `VIRTUAL_ACCOUNT` | 가상계좌 |
| `BANK_TRANSFER` | 계좌이체 |
| `EASY_PAY` | 간편결제 (토스페이 등) |

---

**Document**: api-design.design.md
**Project**: abada-shop (shop.abada.kr)
**Updated**: 2026-02-22
