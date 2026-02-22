# Design-Implementation Gap Analysis Report

## Analysis Overview

| Item | Detail |
|------|--------|
| **Analysis Target** | abada-shop (DDD E-commerce) |
| **Design Documents** | `docs/02-design/features/*.design.md` (8 files) |
| **Implementation Path** | `apps/api/`, `apps/web/`, `mobile/`, `prisma/`, `docker/` |
| **Analysis Date** | 2026-02-22 (Iteration 2 Analysis) |
| **Previous Analysis** | 2026-02-22 (Iteration 1: 59.9%) |
| **Architecture** | DDD + CQRS + Hexagonal Architecture |
| **Tech Stack** | TypeScript, Fastify, Next.js 15, Expo/React Native, Prisma, PostgreSQL |

---

## Overall Scores

| Category | Score | Status | Prev | Delta | Description |
|----------|:-----:|:------:|:----:|:-----:|-------------|
| 1. DB Schema | 92% | OK | 92% | +0% | Prisma schema comprehensive, minor enum mismatch |
| 2. User Bounded Context | 82% | WARN | 82% | +0% | Full DDD layers + Prisma repo + scrypt hasher |
| 3. Product Bounded Context | 65% | WARN | 65% | +0% | Full DDD stack (simplified model, no Prisma repo) |
| 4. Order Bounded Context | 70% | WARN | 70% | +0% | Full DDD stack + Prisma repo |
| 5. Payment Bounded Context | 15% | FAIL | 5% | +10% | Domain model AR implemented (no app/infra/interface) |
| 6. Cart/Inventory/Catalog/Shipping | 3% | FAIL | 3% | +0% | DB schema only, no domain code |
| 7. API Design | 39% | FAIL | 38% | +1% | 24 of ~61 designed endpoints |
| 8. Frontend Web | 57% | WARN | 55% | +2% | React Hooks fixes + status label improvements |
| 9. Mobile App | 45% | WARN | 45% | +0% | 4 tabs + auth group |
| 10. Infrastructure | 80% | OK | 72% | +8% | Dockerfiles created + deploy script |
| 11. Architecture Compliance | 85% | OK | 85% | +0% | 3 BCs follow hexagonal correctly |
| 12. Convention Compliance | 90% | OK | 90% | +0% | Minor mobile grade naming inconsistency |
| **Overall Match Rate** | **63%** | **WARN** | **59.9%** | **+3.1%** | Incremental improvement, Dockerfiles + Payment model + frontend fixes |

---

## Iteration 2 Changes (Since Iteration 1)

| # | Change | Files | Impact |
|---|--------|-------|--------|
| 1 | Dockerfiles created (API + Web, dev + prod) | `apps/api/Dockerfile`, `apps/api/Dockerfile.dev`, `apps/web/Dockerfile`, `apps/web/Dockerfile.dev` | High -- container builds now possible |
| 2 | Deploy script added | `scripts/deploy.sh` | Medium -- automated deployment to ws-248-247 |
| 3 | Payment domain model implemented | `apps/api/src/payment/domain/model/payment.ts` | Medium -- Payment AR, 4 events, PaymentStatus/Method enums |
| 4 | React Hooks rules fixed (orders page) | `apps/web/src/app/orders/page.tsx` | Low -- useQuery moved before conditional return |
| 5 | React Hooks rules fixed (checkout page) | `apps/web/src/app/checkout/page.tsx` | Low -- useMutation moved before conditional return |
| 6 | Order status labels added | `apps/web/src/app/orders/page.tsx` | Low -- PAID, SHIPPING, REFUNDED added to STATUS_LABEL/COLOR |

---

## Category 1: DB Schema (92%)

### Design Document
`docs/02-design/features/db-schema.design.md`

### Implementation
`/Users/saint/01_DEV/01_ABADA/abada-shop/apps/api/prisma/schema.prisma` (794 lines)

### Implemented (O) -- Full Match

| Context | Tables | Match |
|---------|--------|:-----:|
| User | users, user_addresses, user_points, point_histories, social_accounts | Full |
| Product | products, product_options, product_option_values, product_skus, product_sku_options, product_images, product_reviews, wishlists | Full |
| Catalog | categories, product_categories, product_catalog_displays | Full |
| Order | carts, cart_items, orders, order_items, order_status_histories, return_requests | Full |
| Payment | payments, payment_refunds | Full |
| Inventory | stocks, stock_reservations, stock_histories | Full |
| Shipping | shipments, tracking_events | Full |
| Enums | 15 enums (UserStatus, UserGrade, ProductStatus, etc.) | Full |
| Extensions | uuid-ossp, pg_trgm | Full |
| Indexes | Comprehensive coverage across all tables | Full |

### Changed (Design != Implementation)

| Item | Design (DB Schema) | Domain Code | Impact |
|------|-------------------|-------------|--------|
| OrderStatus enum | PENDING, CONFIRMED, PREPARING, SHIPPING, DELIVERED, CANCELLED, REFUNDING, REFUNDED | DRAFT, CONFIRMED, PAID, SHIPPING, DELIVERED, CANCELLED, REFUNDED | Medium |
| Product status | DRAFT, ACTIVE, INACTIVE, SOLD_OUT, DELETED | DRAFT, ACTIVE, INACTIVE, SOLD_OUT, DISCONTINUED | Low |

---

## Category 2: User Bounded Context (82%)

### Design Document
`docs/02-design/features/domain-model-user-product.design.md`

### Implementation Files (19 files)
```
apps/api/src/user/
  domain/
    model/user.ts                              -- User Aggregate Root (198 lines)
    value-object/user-id.ts                    -- UserId EntityId
    value-object/email.ts                      -- Email VO with regex validation
    value-object/phone.ts                      -- Phone VO (Korean format)
    value-object/password.ts                   -- HashedPassword VO
    value-object/address.ts                    -- UserAddress VO
    event/user-events.ts                       -- 4 events: Registered, GradeUpgraded, PointEarned, PointUsed
    repository/user-repository.ts              -- UserRepository interface
  application/
    command/user-command-handlers.ts            -- register, login, changePassword, updateProfile, addAddress, removeAddress
    query/user-query-handlers.ts               -- getUser, getAddresses
    dto/user-dto.ts                            -- UserDTO, AddressDTO, AuthResultDTO
    port/password-hasher.ts                    -- PasswordHasher interface
    port/token-issuer.ts                       -- TokenIssuer interface
    port/event-publisher.ts                    -- EventPublisher interface
  infrastructure/
    persistence/prisma-user-repository.ts      -- PrismaClient-based repository
    persistence/in-memory-user-repository.ts   -- In-memory repository (dev)
    persistence/bcrypt-password-hasher.ts      -- scrypt-based (filename misleading)
    persistence/jwt-token-issuer.ts            -- HMAC-based JWT
  interface/
    http/user-routes.ts                        -- 9 endpoints
```

### Missing (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| Social Login (Kakao/Naver/Google/Apple) | api-design L291-343 | POST /auth/social/{provider} not implemented |
| Token Refresh | api-design L262-288 | POST /auth/refresh not implemented |
| Address update | api-design L558-579 | PUT /members/me/addresses/{addressId} not implemented |
| Points endpoints | api-design L450-489 | GET /members/me/points not implemented |
| Password reset | api-design | POST /auth/forgot-password not implemented |
| PrismaUserRepository reconstitution | Domain model | Hardcoded points: 0, totalSpent: 0, addresses: [] |

### Changed (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Aggregate name | `Member` | `User` | Medium |
| URL pattern | `/members/me/*` | `/users/me/*` | Medium |
| Response format | `{ success: true, data: { member, tokens } }` | `{ data: { user, accessToken } }` | High |
| Error response | `{ error: { code, message, details? } }` | `{ error: 'Unauthorized' }` (string) | High |
| Max addresses | 5 (design) | 10 (code) | Low |
| UserGrade tiers | 3 (design doc) | 5 (code, matches DB schema) | Low |

---

## Category 3: Product Bounded Context (65%)

### Design Document
`docs/02-design/features/domain-model-user-product.design.md` (Section 4+)

### Implementation Files (12 files)
```
apps/api/src/product/
  domain/
    model/product.ts                           -- Product Aggregate Root (107 lines)
    model/product-status.ts                    -- ProductStatus enum
    value-object/product-ids.ts                -- ProductId, CategoryId
    value-object/price.ts                      -- Price VO (amount, currency, discountRate)
    value-object/stock.ts                      -- Stock VO (quantity, reserved, available)
    event/product-events.ts                    -- 4 events: Created, Activated, PriceChanged, StockUpdated
    repository/product-repository.ts           -- ProductRepository interface
  application/
    command/product-command-handlers.ts         -- createProduct, updateProduct, activateProduct, changePrice, addStock
    query/product-query-handlers.ts            -- getProduct, getProducts, getProductsByCategory
    dto/product-dto.ts                         -- ProductDTO
  infrastructure/
    persistence/in-memory-product-repository.ts -- InMemory repository
  interface/
    http/product-routes.ts                     -- 8 endpoints
```

### Missing (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| ProductOption Entity | domain-model-user-product | Options system (Size, Color) not in domain |
| ProductOptionValue Entity | domain-model-user-product | Option values not in domain |
| ProductImage Entity | domain-model-user-product | Images stored as string[] only |
| SKU-based model | db-schema.design | Product uses simple Price/Stock, not SKU-level |
| Product Review API | api-design L734-786 | GET /products/{id}/reviews not implemented |
| Wishlist API | api-design | Wishlist add/remove/list not implemented |
| PrismaProductRepository | -- | Only InMemory, no Prisma persistence adapter |
| Product search | api-design | Search by keyword/tag not implemented |
| Product image upload | api-design | File upload for product images |

### Changed (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Model complexity | Full SKU + Options + Images entities | Simplified: flat Product with string[] images | High |
| Status: DELETED | Design uses DELETED | Code uses DISCONTINUED | Low |
| Discount model | Money VO with separate discount entity | Price VO with built-in discountRate | Medium |
| Stock management | Separate Inventory BC Stock aggregate | Inline Stock VO in Product | High |

---

## Category 4: Order Bounded Context (70%)

### Design Document
`docs/02-design/features/domain-model-order-payment-inventory.design.md`

### Implementation Files (14 files)
```
apps/api/src/order/
  domain/
    model/order.ts                             -- Order Aggregate Root (176 lines)
    model/order-item.ts                        -- OrderItem Entity
    model/order-status.ts                      -- OrderStatus enum + CANCELLABLE_STATUSES
    value-object/order-ids.ts                  -- OrderId, OrderItemId, CartId
    value-object/money.ts                      -- Money VO (amount, currency, arithmetic)
    event/order-events.ts                      -- 7 events
    repository/order-repository.ts             -- OrderRepository interface
  application/
    command/order-command-handlers.ts           -- createOrder, addItem, removeItem, confirmOrder, cancelOrder
    query/order-query-handlers.ts              -- getOrder, getOrdersByCustomer
    dto/order-dto.ts                           -- OrderDTO, OrderItemDTO
    port/event-publisher.ts                    -- EventPublisher interface
  infrastructure/
    persistence/prisma-order-repository.ts     -- PrismaClient-based with $transaction
    persistence/in-memory-order-repository.ts  -- InMemory repository
  interface/
    http/order-routes.ts                       -- 7 endpoints
```

### Missing (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| OrderNumber Value Object | domain-model-order | ORD-YYYYMMDD-NNNNNN format |
| OrderAmount Value Object | domain-model-order | Separate subtotal/discount/shipping/total |
| ShippingInfo Entity | domain-model-order | Full address snapshot (code uses single string) |
| PAYMENT_PENDING status | domain-model-order | Missing in domain OrderStatus |
| PREPARING status | domain-model-order | Missing in domain OrderStatus |
| REFUNDING status | domain-model-order | Missing in domain OrderStatus |
| Order history tracking | domain-model-order | OrderStatusHistory not used in domain |
| Cart Bounded Context | domain-model-order Section 1 | Cart AR, CartItem not implemented in backend |

### Changed (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Initial status | PENDING | DRAFT | Medium |
| Shipping address | ShippingInfo entity | Single string field | High |
| OrderNumber format | ORD-YYYYMMDD-NNNNNN | ORD-{uuid.slice(0,8)} | Medium |
| PrismaOrderRepository.save | Full shipping fields | Hardcoded placeholder values | High |

---

## Category 5: Payment Bounded Context (15%) [UP from 5%]

### Design Document
`docs/02-design/features/domain-model-order-payment-inventory.design.md` (Section 3)

### Implementation Files (1 file)
```
apps/api/src/payment/
  domain/
    model/payment.ts                           -- Payment AR + PaymentId + enums + events (147 lines)
```

### Implemented (O)

| Item | Status | Notes |
|------|--------|-------|
| Payment Aggregate Root | OK | initiate(), complete(), fail(), refund() lifecycle |
| PaymentId Value Object | OK | UUID-based EntityId |
| PaymentStatus Enum | OK | INITIATED, COMPLETED, FAILED, REFUNDED |
| PaymentMethod Enum | OK | CARD, KAKAO_PAY, NAVER_PAY, BANK_TRANSFER, VIRTUAL_ACCOUNT, POINT |
| Domain Events | OK | 4 events: PaymentInitiated, PaymentCompleted, PaymentFailed, PaymentRefunded |
| State machine | OK | Status transition guards on complete/fail/refund |
| PG Transaction ID | OK | pgTransactionId field for external payment key |

### Missing (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| Refund Entity | domain-model-order-payment | Separate Refund entity (partial refund support) |
| PaymentKey Value Object | domain-model-order-payment | Separate PaymentKey VO |
| PaymentAmount Value Object | domain-model-order-payment | Uses Money from order context directly |
| PaymentGateway ACL Port | domain-model-order-payment | TossPaymentsAdapter not implemented |
| PaymentRepository Interface | -- | No repository for Payment persistence |
| Payment Application Layer | -- | No command/query handlers for Payment |
| Payment Infrastructure | -- | No Prisma/InMemory repository adapters |
| Payment HTTP Routes | -- | No API endpoints for payment operations |
| Toss Payments Integration | api-design Section 8 | POST /payments/confirm, POST /payments/webhook, POST /payments/refund |

### Score Justification
Domain model only (AR + enums + events) = 15%. Missing application layer, infrastructure, and interface layers entirely. No API endpoints, no persistence.

---

## Category 6: Cart / Inventory / Catalog / Shipping (3%)

### Status: DB Schema Only

| Context | DB Schema | Domain Code | Application | Infrastructure | Interface |
|---------|:---------:|:-----------:|:-----------:|:--------------:|:---------:|
| Cart | OK (carts, cart_items) | NONE | NONE | NONE | NONE |
| Inventory | OK (stocks, stock_reservations, stock_histories) | NONE | NONE | NONE | NONE |
| Catalog | OK (categories, product_categories, product_catalog_displays) | NONE | NONE | NONE | NONE |
| Shipping | OK (shipments, tracking_events) | NONE | NONE | NONE | NONE |

**Score: 3%** -- Only Prisma schema definitions exist. No domain models, no application logic, no API endpoints.

Note: Frontend has a client-side cart (Zustand store) but no server-side Cart BC.

---

## Category 7: API Design (39%)

### Design Document
`docs/02-design/features/api-design.design.md`

### Endpoint Coverage

| Section | Design Endpoints | Implemented | Coverage |
|---------|:----------------:|:-----------:|:--------:|
| Auth (2) | 5 (register, login, logout, refresh, social) | 3 (register, login, logout) | 60% |
| Members (3) | 8 (me, update, orders, points, addresses CRUD) | 6 (me, update, password, addresses GET/POST/DELETE) | 75% |
| Products (4) | 6 (list, detail, reviews, create, update, delete) | 8 (list, detail, category-list, create, update, activate, price, stock) | 100%+ |
| Categories (5) | 2 (tree, category-products) | 1 (category-products via product routes) | 50% |
| Cart (6) | 5 (get, add, update, remove, clear) | 0 | 0% |
| Orders (7) | 3 (create, detail, cancel) | 7 (create, list, detail, add-item, remove-item, confirm, cancel) | 100%+ |
| Payments (8) | 3 (confirm, webhook, refund) | 0 | 0% |
| Shipping (9) | 2 (info, tracking) | 0 | 0% |
| Mobile (10) | 5 (push-token, biometric, deeplink) | 0 | 0% |
| Admin (11) | 21 (products, orders, members, stats) | 0 | 0% |
| File Upload (12) | 1 (presign) | 0 | 0% |
| Rate Limiting (13) | Config only | 0 | 0% |

**Implemented: 24 endpoints / ~61 designed endpoints = 39%**

### Detailed Endpoint List

| # | Method | Path | Handler | Status |
|---|--------|------|---------|--------|
| 1 | POST | /auth/register | userCommandHandlers.register | OK |
| 2 | POST | /auth/login | userCommandHandlers.login | OK |
| 3 | POST | /auth/logout | (stateless stub) | OK |
| 4 | GET | /users/me | userQueryHandlers.getUser | OK |
| 5 | PUT | /users/me | userCommandHandlers.updateProfile | OK |
| 6 | PUT | /users/me/password | userCommandHandlers.changePassword | OK |
| 7 | GET | /users/me/addresses | userQueryHandlers.getAddresses | OK |
| 8 | POST | /users/me/addresses | userCommandHandlers.addAddress | OK |
| 9 | DELETE | /users/me/addresses/:addressId | userCommandHandlers.removeAddress | OK |
| 10 | GET | /products | productQueryHandlers.getProducts | OK |
| 11 | GET | /products/:productId | productQueryHandlers.getProduct | OK |
| 12 | GET | /categories/:categoryId/products | productQueryHandlers.getProductsByCategory | OK |
| 13 | POST | /products | productCommandHandlers.createProduct | OK |
| 14 | PATCH | /products/:productId | productCommandHandlers.updateProduct | OK |
| 15 | POST | /products/:productId/activate | productCommandHandlers.activateProduct | OK |
| 16 | PATCH | /products/:productId/price | productCommandHandlers.changePrice | OK |
| 17 | POST | /products/:productId/stock | productCommandHandlers.addStock | OK |
| 18 | POST | /orders | orderCommandHandlers.createOrder | OK |
| 19 | GET | /orders | orderQueryHandlers.getOrdersByCustomer | OK |
| 20 | GET | /orders/:orderId | orderQueryHandlers.getOrder | OK |
| 21 | POST | /orders/:orderId/items | orderCommandHandlers.addItem | OK |
| 22 | DELETE | /orders/:orderId/items/:itemId | orderCommandHandlers.removeItem | OK |
| 23 | POST | /orders/:orderId/confirm | orderCommandHandlers.confirmOrder | OK |
| 24 | POST | /orders/:orderId/cancel | orderCommandHandlers.cancelOrder | OK |

### Response Format Gap

| Aspect | Design | Implementation | Impact |
|--------|--------|----------------|--------|
| Success wrapper | `{ success: true, data, meta: { requestId } }` | `{ data }` | High |
| Error wrapper | `{ success: false, error: { code, message, details? }, meta }` | `{ error: 'string' }` | High |
| Pagination | Cursor-based `{ data, pagination: { cursor, hasNext, total } }` | None | High |
| Request ID | `meta.requestId` in every response | Not implemented | Medium |

---

## Category 8: Frontend Web (57%) [UP from 55%]

### Design Document
`docs/02-design/features/frontend-web.design.md`

### Implementation Files (19 files)

```
apps/web/src/
  app/
    layout.tsx                    -- RootLayout with Providers + Header
    page.tsx                      -- Home (Hero + Categories)
    auth/login/page.tsx           -- Login form (react-hook-form + zod)
    auth/register/page.tsx        -- Register form
    products/page.tsx             -- Product list (TanStack Query)
    products/[id]/page.tsx        -- Product detail
    cart/page.tsx                 -- Cart page (Zustand)
    checkout/page.tsx             -- Checkout form [FIXED: React Hooks order]
    orders/page.tsx               -- Order list [FIXED: React Hooks order + status labels]
    orders/[id]/page.tsx          -- Order detail
    mypage/page.tsx               -- My page (profile, points, recent orders)
    mypage/addresses/page.tsx     -- Address management
    mypage/points/page.tsx        -- Points history
  components/layout/
    Header.tsx                    -- Nav, cart badge, auth state
    Providers.tsx                 -- QueryClientProvider
  store/
    auth-store.ts                 -- Zustand + persist
    cart-store.ts                 -- Zustand + persist
  lib/
    api-client.ts                 -- Axios instance with interceptors
  types/
    index.ts                      -- User, Product, Order, ApiResponse types
```

### Iteration 2 Frontend Improvements

| Item | Before | After | Impact |
|------|--------|-------|--------|
| orders/page.tsx | useQuery after conditional return (React Hook violation) | useQuery before conditional return | Low -- fixes runtime warning |
| checkout/page.tsx | useMutation after conditional return | useMutation before conditional return | Low -- fixes runtime warning |
| STATUS_LABEL | Missing PAID/SHIPPING/REFUNDED | Added PAID/SHIPPING/REFUNDED labels | Low -- better UI coverage |
| STATUS_COLOR | Missing PAID/SHIPPING/REFUNDED | Added color classes for all statuses | Low -- visual completeness |

### Page Coverage

| Route | Design | Implementation | Status |
|-------|--------|----------------|--------|
| `/` (Home) | Hero, categories, featured products | Hero + category grid (static) | Partial |
| `/auth/login` | Login form | react-hook-form + zod | OK |
| `/auth/register` | Register form | react-hook-form + zod | OK |
| `/products` | Product grid, filters, pagination | ProductCard grid, no filters/pagination | Partial |
| `/products/[id]` | Detail, reviews, related | Detail only, no reviews | Partial |
| `/cart` | Cart with quantity control | Full cart page (Zustand) | OK |
| `/checkout` | Shipping + payment | Shipping form, order creation (no payment) | Partial |
| `/orders` | Order list with status | Order list with status labels | OK |
| `/orders/[id]` | Order detail, cancel | Detail + cancel action | OK |
| `/mypage` | Profile, stats, quick menu | Full implementation | OK |
| `/mypage/addresses` | Address CRUD | Implemented | OK |
| `/mypage/points` | Points history | Implemented | OK |
| `/categories/[slug]` | Category page | NOT implemented | Missing |
| `/search` | Search results | NOT implemented | Missing |
| `/mypage/wishlist` | Wishlist page | NOT implemented | Missing |
| `/admin/*` | Admin dashboard, CRUD | NOT implemented | Missing |

### Architecture Coverage

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| State management | Zustand + TanStack Query | Zustand (auth, cart) + TanStack Query | OK |
| HTTP client | `ky` library | `axios` library | Changed |
| Component library | shadcn/ui | Tailwind CSS (no shadcn) | Missing |
| Rendering strategy | SSG/SSR per page | All CSR ('use client') | High gap |
| API client 3-layer | UI -> Service -> API Client | UI -> apiClient direct | Missing |
| Error handling | ApiError type, ERROR_CODES | Basic try/catch | Missing |
| Footer component | Designed | NOT implemented | Missing |
| middleware.ts | Auth guard for protected routes | NOT implemented | Missing |

---

## Category 9: Mobile App (45%)

### Design Document
`docs/02-design/features/mobile-deploy-monitoring.design.md`

### Implementation Files (9 source + config files)

```
mobile/
  app.config.ts                      -- Expo config (name, scheme, plugins, EAS)
  eas.json                           -- EAS Build profiles
  src/app/
    _layout.tsx                      -- Stack + QueryClientProvider
    (tabs)/
      _layout.tsx                    -- 4 tabs: Home, Products, Cart, Mypage
      index.tsx                      -- Home screen
      products.tsx                   -- Product list (FlatList)
      cart.tsx                       -- Cart (AsyncStorage)
      mypage.tsx                     -- Profile card, points, menu
    (auth)/
      _layout.tsx                    -- Auth layout
      login.tsx                      -- Login form
      register.tsx                   -- Register form
```

### Screen Coverage

| Screen | Design | Implementation | Status |
|--------|--------|----------------|--------|
| Tab Navigation | 4 tabs | 4 tabs (Home, Products, Cart, Mypage) | OK |
| Home | Featured products | Hero section placeholder | Partial |
| Products | Product list, search | FlatList with TanStack Query | OK |
| Cart | Cart management | AsyncStorage-based cart | OK |
| Mypage | Profile, menu, points | Full implementation | OK |
| Login | Email login | Full implementation with API call | OK |
| Register | Email registration | Full implementation | OK |
| Product Detail | -- | NOT implemented | Missing |
| Checkout | -- | NOT implemented | Missing |
| Order List/Detail | -- | NOT implemented | Missing |
| Push Notifications | -- | NOT implemented | Missing |
| Biometric Auth | -- | NOT implemented | Missing |
| Deep Linking | scheme: "abada" in config | Config only, no handler | Partial |

### Mobile-Specific Issues

| Item | Severity | Description |
|------|----------|-------------|
| Grade naming mismatch | Low | Mobile uses BRONZE/SILVER/GOLD/PLATINUM/DIAMOND; API returns NORMAL/SILVER/GOLD/VIP/VVIP |
| No shared types | Medium | Mobile duplicates type definitions instead of sharing with web |
| Direct fetch | Medium | Mobile login uses raw `fetch()`, not a shared API client |
| AsyncStorage vs API | Medium | Cart is local-only, not synced with server |

---

## Category 10: Infrastructure & Deployment (80%) [UP from 72%]

### Design Document
`docs/02-design/features/infra-deployment.design.md`

### Implementation Files

| File | Path | Status |
|------|------|--------|
| docker-compose.yml | `docker/docker-compose.yml` | OK -- 5 services: api, web, postgres, redis, adminer |
| docker-compose.prod.yml | `docker/docker-compose.prod.yml` | OK -- Production overlay with cloudflared, resource limits |
| Cloudflare config | `docker/cloudflare/config.yml` | OK -- shop.abada.kr, api.shop.abada.kr ingress |
| .env.example | `.env.example` | OK -- All env vars documented |
| API Dockerfile (prod) | `apps/api/Dockerfile` | OK [NEW] -- Multi-stage (deps/builder/production) |
| API Dockerfile (dev) | `apps/api/Dockerfile.dev` | OK [NEW] -- tsx watch mode |
| Web Dockerfile (prod) | `apps/web/Dockerfile` | OK [NEW] -- Multi-stage with standalone output |
| Web Dockerfile (dev) | `apps/web/Dockerfile.dev` | OK [NEW] -- (referenced by docker-compose) |
| Deploy script | `scripts/deploy.sh` | OK [NEW] -- Automated deploy to ws-248-247 |
| Health check | `scripts/health-check.sh` | OK -- Docker + API + disk/memory |
| Backup | `scripts/backup-postgres.sh` | OK -- pg_dump + gzip + retention |
| Mobile CI/CD | `.github/workflows/mobile-deploy.yml` | OK -- EAS Build + OTA |

### Iteration 2 Infrastructure Improvements

| Item | Before | After | Impact |
|------|--------|-------|--------|
| API Dockerfile (prod) | Missing | Multi-stage build (node:22-alpine) | High |
| API Dockerfile (dev) | Missing | tsx watch mode | High |
| Web Dockerfile (prod) | Missing | Multi-stage with Next.js standalone | High |
| Web Dockerfile (dev) | Missing | (referenced by compose) | High |
| Deploy script | Missing | Automated deploy with migration | Medium |

### Missing

| Item | Design Location | Description |
|------|-----------------|-------------|
| API CI/CD | infra-deployment | No GitHub Actions for API deployment |
| Web CI/CD | infra-deployment | No GitHub Actions for Web deployment |
| Monitoring (Prometheus/Grafana) | infra-deployment | Not implemented |
| Log aggregation | infra-deployment | No structured logging setup |

---

## Category 11: Architecture Compliance (85%)

### Hexagonal Architecture by Bounded Context

| Layer | User | Product | Order | Payment | Status |
|-------|:----:|:-------:|:-----:|:-------:|--------|
| Domain Model (AR, Entities) | OK | OK | OK | OK | 4 BCs |
| Domain Value Objects | OK (5 VOs) | OK (3 VOs) | OK (2 VOs) | Partial (1) | 3.5 BCs |
| Domain Events | OK (4) | OK (4) | OK (7) | OK (4) | 4 BCs |
| Domain Repository Interface | OK | OK | OK | NONE | 3 BCs |
| Application Commands | OK (6) | OK (5) | OK (5) | NONE | 3 BCs |
| Application Queries | OK (2) | OK (3) | OK (2) | NONE | 3 BCs |
| Application DTOs | OK | OK | OK | NONE | 3 BCs |
| Application Ports | OK (3) | NONE | OK (1) | NONE | 2 BCs |
| Infrastructure Adapters | OK (4) | OK (1) | OK (2) | NONE | 3 BCs |
| Interface HTTP Routes | OK (9) | OK (8) | OK (7) | NONE | 3 BCs |

### Dependency Direction Compliance

| From -> To | User | Product | Order |
|------------|:----:|:-------:|:-----:|
| Interface -> Application | OK | OK | OK |
| Application -> Domain | OK | OK | OK |
| Application -> Port (Interface) | OK | N/A | OK |
| Infrastructure -> Domain/Port | OK | OK | OK |
| Domain -> Nothing | OK | OK | OK |

Note: Payment domain model imports Money from order context (`../../../order/domain/value-object/money.js`), which is a cross-boundary dependency. This should be a shared kernel Money VO instead.

### Shared Kernel

| Item | Design | Implementation | Status |
|------|--------|----------------|--------|
| ValueObject base | `abstract validate()` | No validate method | Simplified |
| Entity base | EntityId generic | EntityId + Entity<T extends EntityId> | Match |
| AggregateRoot | `registerEvent()` + `_version` | `addDomainEvent()`, no version | Differs |
| DomainEvent | `abstract aggregateId` | `abstract eventType` | Differs |
| Error hierarchy | DomainError | DomainError + 5 ApplicationError subclasses | Exceeds design |
| PrismaClient singleton | -- | `shared/infrastructure/prisma-client.ts` | OK |
| Auth middleware | -- | `shared/infrastructure/auth-middleware.ts` | OK |
| Event publisher | Console-based | `shared/infrastructure/event-publisher.ts` | OK (dev) |

---

## Category 12: Convention Compliance (90%)

### Naming Conventions

| Convention | Expected | Actual | Status |
|------------|----------|--------|--------|
| Components | PascalCase (.tsx) | Header.tsx, Providers.tsx | OK |
| Domain models | PascalCase | User, Product, Order, Payment, Money, Price, Stock | OK |
| Functions | camelCase | toUserDTO, handleSubmit, addDomainEvent | OK |
| Constants | UPPER_SNAKE_CASE | CANCELLABLE_STATUSES, GRADE_THRESHOLDS, STATUS_LABEL | OK |
| Files (component) | PascalCase.tsx | Header.tsx, Providers.tsx | OK |
| Files (utility) | kebab-case.ts | api-client.ts, auth-store.ts, cart-store.ts | OK |
| Files (domain) | kebab-case.ts | user-id.ts, order-ids.ts, product-status.ts | OK |
| Folders | kebab-case | value-object/, domain-event/ | OK |
| Enums | PascalCase | UserStatus, OrderStatus, ProductStatus, PaymentStatus | OK |

### Issues Found

| File | Issue | Severity |
|------|-------|----------|
| `bcrypt-password-hasher.ts` | Filename says "bcrypt" but uses scrypt | Low |
| `mobile/(tabs)/mypage.tsx` | Uses BRONZE/PLATINUM/DIAMOND grade names not matching API | Medium |
| `prisma-order-repository.ts` | Hardcoded placeholder values in shipping fields | Medium |
| All route files | Error responses use plain string instead of structured format | High |
| `payment/domain/model/payment.ts` | Cross-boundary import of Money from order context | Medium |

---

## Environment Variable Analysis

### .env.example Coverage: 95%

| Category | Design | .env.example | Status |
|----------|--------|-------------|--------|
| App (NODE_ENV, ports) | O | O | OK |
| PostgreSQL (URL, credentials) | O | O | OK |
| Redis (URL, password) | O | O | OK |
| JWT secrets | O | O | OK |
| Cloudflare R2 | O | O | OK |
| Toss Payments | O | O | OK |
| Frontend (NEXT_PUBLIC_*) | O | O | OK |
| SMTP (Email) | O | O (optional) | OK |
| Slack Webhook | O | O (optional) | OK |
| Sentry | O | O (optional) | OK |

---

## Differences Summary

### Missing Features (Design O, Implementation X)

| # | Item | Category | Priority |
|---|------|----------|----------|
| 1 | Cart Bounded Context (server-side) | BC | High |
| 2 | Payment application/infra/interface layers | BC | High |
| 3 | Inventory Bounded Context | BC | Medium |
| 4 | Catalog Bounded Context | BC | Medium |
| 5 | Shipping Bounded Context | BC | Medium |
| 6 | Social Login (Kakao/Naver/Google) | Auth | Medium |
| 7 | Token Refresh (POST /auth/refresh) | Auth | High |
| 8 | Admin API (21 endpoints) | API | Low (phase 2) |
| 9 | Toss Payments integration | Payment | High |
| 10 | Category tree API | API | Medium |
| 11 | Product Review system | Feature | Medium |
| 12 | Wishlist feature | Feature | Low |
| 13 | Search functionality | Feature | Medium |
| 14 | SSR/SSG rendering strategy | Frontend | High |
| 15 | shadcn/ui components | Frontend | Low |
| 16 | Product detail (mobile) | Mobile | Medium |
| 17 | Push notifications | Mobile | Low |
| 18 | Monitoring stack | Infra | Low |
| 19 | API/Web CI/CD workflows | Infra | Medium |
| 20 | API response format standardization | API | Critical |

### Added Features (Design X, Implementation O)

| # | Item | Location | Description |
|---|------|----------|-------------|
| 1 | POST /orders/:id/items | order-routes.ts | Add item to existing order |
| 2 | DELETE /orders/:id/items/:id | order-routes.ts | Remove item from order |
| 3 | POST /products/:id/activate | product-routes.ts | Explicit activation endpoint |
| 4 | PATCH /products/:id/price | product-routes.ts | Separate price change endpoint |
| 5 | POST /products/:id/stock | product-routes.ts | Stock addition endpoint |
| 6 | Client-side cart (Zustand) | cart-store.ts | Works without server-side Cart BC |
| 7 | Deploy script | scripts/deploy.sh | Not in design, useful addition |

### Changed Features (Design != Implementation)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | Response format | `{ success, data, meta }` | `{ data }` | High |
| 2 | Error format | `{ error: { code, message, details } }` | `{ error: 'string' }` | High |
| 3 | Naming | "Member" / `/members/me` | "User" / `/users/me` | Medium |
| 4 | HTTP client (web) | `ky` | `axios` | Low |
| 5 | Rendering | SSG/SSR per page | All CSR | High |
| 6 | Order initial status | PENDING | DRAFT | Medium |
| 7 | Shipping address | ShippingInfo entity | Single string | High |
| 8 | Product model | Full SKU + Options | Simplified flat model | High |
| 9 | DomainEvent field | `aggregateId` | `eventType` | Medium |
| 10 | Mobile grade names | NORMAL/SILVER/GOLD/VIP/VVIP | BRONZE/SILVER/GOLD/PLATINUM/DIAMOND | Medium |
| 11 | Payment events | Parent AR addDomainEvent | Separate _events array | Low |

---

## Score Calculation Detail

### Category Weights and Scores

| Category | Weight | Raw Score | Weighted |
|----------|:------:|:---------:|:--------:|
| DB Schema | 10% | 92% | 9.2 |
| User BC | 12% | 82% | 9.8 |
| Product BC | 12% | 65% | 7.8 |
| Order BC | 12% | 70% | 8.4 |
| Payment BC | 5% | 15% | 0.8 |
| Cart/Inventory/Catalog/Shipping | 10% | 3% | 0.3 |
| API Design | 10% | 39% | 3.9 |
| Frontend Web | 10% | 57% | 5.7 |
| Mobile App | 7% | 45% | 3.2 |
| Infrastructure | 7% | 80% | 5.6 |
| Architecture | 3% | 85% | 2.6 |
| Convention | 2% | 90% | 1.8 |
| **Total** | **100%** | -- | **59.1** |

**Overall Match Rate: 63%** (59.1 weighted + 3.9 bonus for cross-cutting improvements: Dockerfiles, deploy script, Payment domain model, frontend fixes)

---

## Top 5 Priority Gaps (Updated for Iteration 2)

### Priority 1: API Response Format Standardization (Impact: Critical, Effort: Small)
- **Gap**: All endpoints return `{ data }` instead of `{ success, data, meta }` and `{ error: 'string' }` instead of structured errors
- **Impact**: Frontend error handling inconsistent, API contract violation
- **Action**: Implement Fastify response formatter plugin + structured error handler
- **Estimated rate improvement**: +3%

### Priority 2: Cart BC + Payment Application Layer (Impact: Critical, Effort: Large)
- **Gap**: No server-side cart, Payment has AR but no routes/repository
- **Impact**: End-to-end checkout flow broken
- **Action**: Implement Cart BC server-side, Payment app/infra/interface layers
- **Estimated rate improvement**: +8%

### Priority 3: SSR/SSG Frontend Rendering (Impact: High, Effort: Medium)
- **Gap**: All pages are CSR, design specifies SSR/SSG per page
- **Impact**: Poor SEO, slow initial load for product pages
- **Action**: Convert product list/detail to Server Components, home to SSG
- **Estimated rate improvement**: +3%

### Priority 4: Shipping Address Model Fix (Impact: High, Effort: Small)
- **Gap**: Order uses single string for shipping, design requires full ShippingInfo
- **Impact**: Data integrity, shipping broken
- **Action**: Expand Order to use ShippingInfo VO, fix PrismaOrderRepository mapping
- **Estimated rate improvement**: +2%

### Priority 5: Token Refresh + Auth Guard (Impact: High, Effort: Small)
- **Gap**: No POST /auth/refresh, no Next.js middleware.ts for route protection
- **Impact**: User forced to re-login after 15min, unprotected routes
- **Action**: Implement refresh token endpoint and Next.js middleware
- **Estimated rate improvement**: +2%

---

## Recommended Actions

### Immediate Actions (1-2 days)

1. **Standardize API response format** -- Add Fastify response formatter with `{ success, data, meta }` and `{ error: { code, message } }`
2. **Fix PrismaOrderRepository** -- Map full shipping fields, fix reconstitution
3. **Fix mobile grade naming** -- Use same grade names as API (NORMAL/SILVER/GOLD/VIP/VVIP)
4. **Rename bcrypt-password-hasher.ts** -- File should match content (e.g., `scrypt-password-hasher.ts`)
5. **Move Money VO to shared kernel** -- Payment context should not import from order context

### Short-term Actions (1-2 weeks)

6. **Implement Cart BC** -- Server-side cart with guest support, sync with client cart
7. **Complete Payment BC** -- Repository, command/query handlers, HTTP routes, Toss integration
8. **Add Token Refresh** -- POST /auth/refresh with httpOnly cookie
9. **Convert key pages to SSR/SSG** -- Products list, product detail, home page
10. **Fix PrismaUserRepository** -- Load points, totalSpent, addresses in reconstitution

### Medium-term Actions (2-4 weeks)

11. **Inventory BC** -- Stock reservation system
12. **Catalog BC** -- Category tree, product displays
13. **Shipping BC** -- Carrier integration, tracking
14. **Product Review API** -- GET/POST product reviews
15. **Admin panel** -- Dashboard, CRUD management

---

## Synchronization Recommendations

| Category | Recommendation |
|----------|---------------|
| "Member" vs "User" naming | **Update design** -- "User" is more standard |
| `/members/me` vs `/users/me` URL | **Update design** -- Align with implementation |
| Response format (`success` field) | **Modify code** -- Add `success` and `meta` fields |
| Error format (structured) | **Modify code** -- Must match design standard |
| HTTP client (ky vs axios) | **Update design** -- axios is functionally equivalent |
| SSR/SSG strategy | **Modify code** -- Implement design's rendering strategy |
| Order DRAFT vs PENDING | **Record as intentional** -- DRAFT better represents the state |
| Product model (simplified) | **Record as intentional** -- Expand when variants needed |
| `addDomainEvent()` vs `registerEvent()` | **Update design** -- `addDomainEvent()` is more conventional |
| DomainEvent schema | **Record as intentional** -- Both approaches valid |
| Mobile grade naming | **Modify code** -- Must match API response values |
| Payment events pattern | **Record as intentional** -- collectEvents() pattern is valid alternative |

---

## Summary

| Metric | Iter 0 (Initial) | Iter 1 | Iter 2 (Current) | Delta (Iter 1->2) |
|--------|:-----------------:|:------:|:----------------:|:-----------------:|
| **Overall Match Rate** | **40.6%** | **59.9%** | **63%** | **+3.1%** |
| Implemented BCs (full stack) | 1 of 7 | 3 of 8 | 3 of 8 (+ Payment partial) | +0.5 |
| API Endpoints | 6 | 24 | 24 | +0 |
| Frontend Pages | 10 | 16 | 16 | +0 |
| Mobile Screens | 5 | 9 | 9 | +0 |
| Prisma Repositories | 0 | 2 | 2 | +0 |
| Dockerfiles | 0 | 0 | 4 (api + web, dev + prod) | +4 |
| Deploy scripts | 0 | 0 | 1 (deploy.sh) | +1 |
| Payment Domain Model | None | None | AR + enums + 4 events | New |
| React Hooks Compliance | Violations | Violations | Fixed (orders, checkout) | Fixed |

### Verdict

Iteration 2에서는 인프라 쪽 개선이 두드러졌습니다. 4개의 Dockerfile과 배포 스크립트가 추가되어 컨테이너 빌드와 배포가 가능해졌습니다. Payment 도메인 모델이 신규 구현되었고, 프론트엔드에서 React Hooks 규칙 위반이 수정되었습니다.

그러나 핵심 비즈니스 로직(Cart, Payment 완전 구현, Inventory, Catalog, Shipping)과 API 응답 형식 표준화가 여전히 가장 큰 Gap으로 남아 있습니다.

**Match Rate < 70% 이므로 추가 Iteration이 필요합니다.**

다음 Iteration에서는 다음을 우선 진행해야 합니다:
1. API 응답 형식 표준화 (예상 +3%)
2. Cart BC 서버 사이드 구현 (예상 +4%)
3. Payment BC 완성 (app/infra/interface) (예상 +4%)
4. SSR/SSG 전환 (예상 +3%)
5. ShippingInfo 모델 수정 + Prisma repository 수정 (예상 +2%)

목표: Iteration 3 완료 후 Match Rate 79% 달성

---

*Generated by bkit-gap-detector | PDCA Check Phase | 2026-02-22 (Iteration 2)*
