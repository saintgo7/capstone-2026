# DDD Domain Model Design: Order + Payment + Inventory Bounded Contexts

**Date**: 2026-02-22
**Author**: Domain Designer
**Project**: abada 쇼핑몰 (shop.abada.kr)
**Architecture**: DDD + CQRS + Hexagonal (TypeScript)

---

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Order + Payment + Inventory Contexts                    │
│                                                                            │
│  ┌─────────────────┐   ┌──────────────────┐   ┌───────────────────────┐  │
│  │  Cart Context   │   │  Order Context   │   │  Inventory Context   │  │
│  │                 │   │                  │   │                       │  │
│  │  Cart (AR)      │──►│  Order (AR)      │──►│  Stock (AR)           │  │
│  │  CartItem (E)   │   │  OrderItem (E)   │   │  StockReservation (E) │  │
│  │                 │   │  ShippingInfo(E) │   │                       │  │
│  │                 │   │  OrderAmount(VO) │   │  Events:              │  │
│  │                 │   │  OrderNumber(VO) │   │  - StockReserved      │  │
│  │                 │   │                  │   │  - StockReleased      │  │
│  │                 │   │  Events:         │   │  - StockConfirmed     │  │
│  │                 │   │  - OrderPlaced   │   │  - StockLow           │  │
│  │                 │   │  - OrderConfirmed│   └───────────────────────┘  │
│  │                 │   │  - OrderCancelled│                               │
│  │                 │   │  - OrderShipped  │   ┌───────────────────────┐  │
│  └─────────────────┘   └──────────────────┘   │  Payment Context      │  │
│                                │               │                       │  │
│                                └──────────────►│  Payment (AR)         │  │
│                                                │  Refund (E)           │  │
│                                                │  TossACL (Port)       │  │
│                                                │                       │  │
│                                                │  Events:              │  │
│                                                │  - PaymentApproved    │  │
│                                                │  - PaymentFailed      │  │
│                                                │  - RefundCompleted    │  │
│                                                └───────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘

AR = Aggregate Root, E = Entity, VO = Value Object
```

---

## 이벤트 기반 Context 간 통신 (SAGA 패턴)

```
주문 생성 사가 (Order Placement Saga)
═══════════════════════════════════════

  [Client]
     │  PlaceOrderCommand
     ▼
  [Order Context]
     │  Order.place() → OrderPlaced 이벤트 발행
     ▼
  [Inventory Context]  ◄── OrderPlaced 이벤트 수신
     │  Stock.reserve(items) → StockReserved 이벤트 발행
     │  실패 시 → StockReservationFailed 이벤트 발행
     ▼
  [Payment Context]    ◄── StockReserved 이벤트 수신
     │  Payment.initiate() → 토스페이먼츠 호출
     │  성공 시 → PaymentApproved 이벤트 발행
     │  실패 시 → PaymentFailed 이벤트 발행
     ▼
  [Order Context]      ◄── PaymentApproved 이벤트 수신
     │  Order.confirm() → OrderConfirmed 이벤트 발행
     ▼
  [Inventory Context]  ◄── OrderConfirmed 이벤트 수신
     │  Stock.confirmReservation() → StockConfirmed 이벤트 발행
  [User Context]       ◄── OrderConfirmed 이벤트 수신
     │  Member.earnPoint() → PointEarned 이벤트 발행

보상 트랜잭션 (Compensating Transaction)
══════════════════════════════════════════

  PaymentFailed 수신 시:
     [Inventory Context] → Stock.releaseReservation() → StockReleased
     [Order Context]     → Order.cancel(reason) → OrderCancelled

  OrderCancelled 수신 시 (결제 후):
     [Payment Context]   → Payment.requestRefund() → RefundRequested
     [Inventory Context] → Stock.increase() → StockReleased
     [User Context]      → 포인트 환불 처리
```

---

## 1. Cart Context (장바구니)

### 1.1 파일 구조

```
src/cart/
├── domain/
│   ├── model/
│   │   ├── cart.ts                # Cart Aggregate Root
│   │   └── cart-item.ts           # CartItem Entity
│   ├── value-object/
│   │   ├── cart-id.ts
│   │   ├── cart-item-id.ts
│   │   └── cart-item-quantity.ts
│   ├── event/
│   │   └── cart-events.ts
│   └── repository/
│       └── cart-repository.ts
├── application/
│   ├── command/
│   │   └── cart-commands.ts
│   ├── query/
│   │   └── cart-queries.ts
│   ├── dto/
│   │   └── cart-dto.ts
│   └── service/
│       └── cart-application-service.ts
└── interface/
    └── api/
        ├── cart-controller.ts
        └── request.ts
```

### 1.2 Value Objects

```typescript
// src/cart/domain/value-object/cart-item-quantity.ts
interface CartItemQuantityProps {
  value: number;
}

export class CartItemQuantity extends ValueObject<CartItemQuantityProps> {
  static readonly MIN = 1;
  static readonly MAX = 100;

  protected validate(props: CartItemQuantityProps): void {
    if (!Number.isInteger(props.value) ||
        props.value < CartItemQuantity.MIN ||
        props.value > CartItemQuantity.MAX) {
      throw new DomainError(
        `수량은 ${CartItemQuantity.MIN}~${CartItemQuantity.MAX} 사이여야 합니다: ${props.value}`
      );
    }
  }

  static create(value: number): CartItemQuantity;
  static min(): CartItemQuantity;

  get value(): number;
  increment(): CartItemQuantity;
  decrement(): CartItemQuantity;   // MIN 미만이면 DomainError
}
```

### 1.3 CartItem Entity

```typescript
// src/cart/domain/model/cart-item.ts
interface CartItemProps {
  id: CartItemId;
  cartId: CartId;
  productId: string;            // Product Context 참조 (ID만)
  productName: string;          // 스냅샷 (변경 방지)
  productOptionValueId: string;
  optionSummary: string;        // 예: "색상: 빨강 / 사이즈: XL"
  unitPrice: number;            // 스냅샷 - 원 단위 정수
  quantity: CartItemQuantity;
  addedAt: Date;
}

export class CartItem extends Entity<CartItemId> {
  private _cartId: CartId;
  private _productId: string;
  private _productName: string;
  private _productOptionValueId: string;
  private _optionSummary: string;
  private _unitPrice: number;
  private _quantity: CartItemQuantity;
  private _addedAt: Date;

  static create(props: Omit<CartItemProps, 'id' | 'addedAt'>): CartItem;
  static reconstitute(props: CartItemProps): CartItem;

  get cartId(): CartId;
  get productId(): string;
  get productName(): string;
  get productOptionValueId(): string;
  get optionSummary(): string;
  get unitPrice(): number;
  get quantity(): CartItemQuantity;
  get addedAt(): Date;
  get subtotal(): number;  // unitPrice * quantity.value

  updateQuantity(quantity: CartItemQuantity): void;
  isSameProduct(productId: string, optionValueId: string): boolean;
}
```

### 1.4 Cart Aggregate Root

```typescript
// src/cart/domain/model/cart.ts
interface CartProps {
  id: CartId;
  memberId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Cart extends AggregateRoot<CartId> {
  private _memberId: string;
  private _items: CartItem[];
  private _createdAt: Date;
  private _updatedAt: Date;

  static create(id: CartId, memberId: string): Cart;
  static reconstitute(props: CartProps & { version: number }): Cart;

  get memberId(): string;
  get items(): readonly CartItem[];
  get totalAmount(): number;
  get totalItemCount(): number;
  get isEmpty(): boolean;

  /**
   * 상품 추가 또는 수량 증가
   * - 동일 상품+옵션 조합이면 수량 합산
   * - 최대 20종 제한
   * CartItemAdded 이벤트 발행
   */
  addItem(
    productId: string,
    productName: string,
    productOptionValueId: string,
    optionSummary: string,
    unitPrice: number,
    quantity: number,
  ): CartItem;

  updateItemQuantity(cartItemId: CartItemId, quantity: number): void;
  removeItem(cartItemId: CartItemId): void;
  clear(): void;

  /** 체크아웃할 아이템 추출 (주문 생성용) */
  getItemsForCheckout(cartItemIds: CartItemId[]): CartItem[];

  private assertMaxItems(): void;  // 20종 초과 시 DomainError
}
```

### 1.5 Domain Events & Repository (Cart)

```typescript
// src/cart/domain/event/cart-events.ts
export class CartItemAdded extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly productId: string,
    readonly quantity: number,
  ) { super(); }
}

export class CartItemRemoved extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly cartItemId: string,
  ) { super(); }
}

export class CartCleared extends DomainEvent {
  constructor(readonly aggregateId: string) { super(); }
}

// src/cart/domain/repository/cart-repository.ts
export interface CartRepository {
  findByMemberId(memberId: string): Promise<Cart | null>;
  findById(cartId: CartId): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
  delete(cart: Cart): Promise<void>;
  nextId(): CartId;
}
export const CART_REPOSITORY = Symbol("CartRepository");
```

### 1.6 CQRS - Cart

```typescript
// src/cart/application/command/cart-commands.ts
export interface AddCartItemCommand {
  readonly memberId: string;
  readonly productId: string;
  readonly productName: string;
  readonly productOptionValueId: string;
  readonly optionSummary: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

export interface UpdateCartItemQuantityCommand {
  readonly memberId: string;
  readonly cartItemId: string;
  readonly quantity: number;
}

export interface RemoveCartItemCommand {
  readonly memberId: string;
  readonly cartItemId: string;
}

export interface ClearCartCommand {
  readonly memberId: string;
}

// src/cart/application/query/cart-queries.ts
export interface GetCartQuery {
  readonly memberId: string;
}

// src/cart/application/dto/cart-dto.ts
export interface CartDTO {
  id: string;
  memberId: string;
  items: CartItemDTO[];
  totalAmount: number;
  totalItemCount: number;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  productOptionValueId: string;
  optionSummary: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}
```

---

## 2. Order Context

### 2.1 파일 구조

```
src/order/
├── domain/
│   ├── model/
│   │   ├── order.ts               # Order Aggregate Root
│   │   ├── order-item.ts          # OrderItem Entity
│   │   ├── shipping-info.ts       # ShippingInfo Entity
│   │   └── order-status.ts        # OrderStatus Enum
│   ├── value-object/
│   │   ├── order-id.ts
│   │   ├── order-item-id.ts
│   │   ├── order-number.ts        # 주문번호 VO
│   │   └── order-amount.ts        # 금액 합계 VO
│   ├── event/
│   │   └── order-events.ts
│   ├── repository/
│   │   └── order-repository.ts
│   └── service/
│       └── order-number-generator.ts
├── application/
│   ├── command/
│   │   └── order-commands.ts
│   ├── query/
│   │   └── order-queries.ts
│   ├── dto/
│   │   └── order-dto.ts
│   └── service/
│       └── order-application-service.ts
├── infrastructure/
│   └── persistence/typeorm/
│       ├── order.entity.ts
│       └── typeorm-order-repository.ts
└── interface/
    └── api/
        ├── order-controller.ts
        ├── request.ts
        └── response.ts
```

### 2.2 Enum & Value Objects

```typescript
// src/order/domain/model/order-status.ts
export enum OrderStatus {
  PENDING          = "PENDING",          // 주문 생성됨 (결제 전)
  PAYMENT_PENDING  = "PAYMENT_PENDING",  // 결제 진행 중
  CONFIRMED        = "CONFIRMED",        // 결제 완료, 주문 확정
  PREPARING        = "PREPARING",        // 상품 준비 중
  SHIPPED          = "SHIPPED",          // 배송 중
  DELIVERED        = "DELIVERED",        // 배송 완료
  CANCELLED        = "CANCELLED",        // 주문 취소
  REFUNDING        = "REFUNDING",        // 환불 처리 중
  REFUNDED         = "REFUNDED",         // 환불 완료
}

// 상태 전이:
// PENDING → PAYMENT_PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED
//                          ↘ CANCELLED (재고 부족/결제 실패)
//                                                  → REFUNDING → REFUNDED

// src/order/domain/value-object/order-number.ts
// 형식: "ORD-20260222-000001"
interface OrderNumberProps { value: string; }

export class OrderNumber extends ValueObject<OrderNumberProps> {
  protected validate(props: OrderNumberProps): void {
    if (!/^ORD-\d{8}-\d{6}$/.test(props.value)) {
      throw new DomainError(`잘못된 주문번호 형식: ${props.value}`);
    }
  }

  static create(value: string): OrderNumber;
  get value(): string;
  toString(): string;
}

// src/order/domain/value-object/order-amount.ts
interface OrderAmountProps {
  itemTotal: number;       // 상품 합계
  discountAmount: number;  // 할인 금액
  pointUsed: number;       // 사용 포인트
  shippingFee: number;     // 배송비
  finalAmount: number;     // 최종 결제 금액
}

export class OrderAmount extends ValueObject<OrderAmountProps> {
  protected validate(props: OrderAmountProps): void {
    if (Object.values(props).some(v => v < 0)) {
      throw new DomainError("금액은 0 이상이어야 합니다");
    }
    const expected = props.itemTotal - props.discountAmount - props.pointUsed + props.shippingFee;
    if (expected !== props.finalAmount) {
      throw new DomainError(`최종 금액 불일치: expected=${expected}, actual=${props.finalAmount}`);
    }
  }

  static create(props: OrderAmountProps): OrderAmount;
  static calculate(
    itemTotal: number,
    discountAmount: number,
    pointUsed: number,
    shippingFee: number,
  ): OrderAmount;

  get itemTotal(): number;
  get discountAmount(): number;
  get pointUsed(): number;
  get shippingFee(): number;
  get finalAmount(): number;
}
```

### 2.3 ShippingInfo Entity

```typescript
// src/order/domain/model/shipping-info.ts
interface ShippingInfoProps {
  id: string;
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  street: string;
  detail: string;
  deliveryRequest?: string;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export class ShippingInfo extends Entity<EntityId> {
  private _recipientName: string;
  private _recipientPhone: string;
  private _zipCode: string;
  private _street: string;
  private _detail: string;
  private _deliveryRequest: string | undefined;
  private _trackingNumber: string | undefined;
  private _shippedAt: Date | undefined;
  private _deliveredAt: Date | undefined;

  static create(props: Omit<ShippingInfoProps, 'id'>): ShippingInfo;
  static reconstitute(props: ShippingInfoProps): ShippingInfo;

  get recipientName(): string;
  get recipientPhone(): string;
  get zipCode(): string;
  get street(): string;
  get detail(): string;
  get deliveryRequest(): string | undefined;
  get trackingNumber(): string | undefined;
  get shippedAt(): Date | undefined;
  get deliveredAt(): Date | undefined;
  get fullAddress(): string;   // "{street} {detail}"

  registerShipping(trackingNumber: string): void;
  confirmDelivery(): void;
}
```

### 2.4 OrderItem Entity

```typescript
// src/order/domain/model/order-item.ts
interface OrderItemProps {
  id: OrderItemId;
  orderId: OrderId;
  productId: string;
  productName: string;          // 주문 시점 스냅샷
  productOptionValueId: string;
  optionSummary: string;        // 주문 시점 스냅샷
  unitPrice: number;            // 주문 시점 가격 스냅샷 (원 단위)
  quantity: number;
  subtotal: number;             // unitPrice * quantity
}

export class OrderItem extends Entity<OrderItemId> {
  private _orderId: OrderId;
  private _productId: string;
  private _productName: string;
  private _productOptionValueId: string;
  private _optionSummary: string;
  private _unitPrice: number;
  private _quantity: number;
  private _subtotal: number;

  static create(props: Omit<OrderItemProps, 'id' | 'subtotal'>): OrderItem;
  static reconstitute(props: OrderItemProps): OrderItem;

  get orderId(): OrderId;
  get productId(): string;
  get productName(): string;
  get productOptionValueId(): string;
  get optionSummary(): string;
  get unitPrice(): number;
  get quantity(): number;
  get subtotal(): number;
}
```

### 2.5 Order Aggregate Root

```typescript
// src/order/domain/model/order.ts
interface OrderProps {
  id: OrderId;
  orderNumber: OrderNumber;
  memberId: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  amount: OrderAmount;
  status: OrderStatus;
  paymentId?: string;        // Payment Context 참조 (ID만)
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Order extends AggregateRoot<OrderId> {
  private _orderNumber: OrderNumber;
  private _memberId: string;
  private _items: OrderItem[];
  private _shippingInfo: ShippingInfo;
  private _amount: OrderAmount;
  private _status: OrderStatus;
  private _paymentId: string | undefined;
  private _cancelReason: string | undefined;
  private _createdAt: Date;
  private _updatedAt: Date;

  // -- Factory Methods --

  /**
   * 주문 생성 (PENDING 상태)
   * OrderPlaced 이벤트 발행 → Inventory에서 재고 예약
   */
  static place(
    id: OrderId,
    orderNumber: OrderNumber,
    memberId: string,
    items: Array<{
      productId: string;
      productName: string;
      productOptionValueId: string;
      optionSummary: string;
      unitPrice: number;
      quantity: number;
    }>,
    shippingInfo: Omit<ShippingInfoProps, 'id'>,
    amount: OrderAmount,
  ): Order;

  static reconstitute(props: OrderProps & { version: number }): Order;

  // -- Getters --
  get orderNumber(): OrderNumber;
  get memberId(): string;
  get items(): readonly OrderItem[];
  get shippingInfo(): ShippingInfo;
  get amount(): OrderAmount;
  get status(): OrderStatus;
  get paymentId(): string | undefined;
  get cancelReason(): string | undefined;
  get createdAt(): Date;
  get updatedAt(): Date;
  get isCancellable(): boolean;  // PENDING, PAYMENT_PENDING, CONFIRMED, PREPARING

  // -- 상태 머신 (Domain Behaviors) --

  /** PENDING → PAYMENT_PENDING (결제 시작) */
  startPayment(): void;

  /**
   * PAYMENT_PENDING → CONFIRMED
   * OrderConfirmed 이벤트 발행 → Inventory 확정, User 포인트 적립
   */
  confirm(paymentId: string): void;

  /** CONFIRMED → PREPARING */
  startPreparing(): void;

  /**
   * PREPARING → SHIPPED
   * OrderShipped 이벤트 발행 → Notification 알림
   */
  ship(trackingNumber: string): void;

  /** SHIPPED → DELIVERED */
  confirmDelivery(): void;

  /**
   * → CANCELLED (isCancellable 상태에서만)
   * OrderCancelled 이벤트 발행 → Payment 환불, Inventory 해제
   */
  cancel(reason: string): void;

  /**
   * DELIVERED → REFUNDING
   * OrderRefundRequested 이벤트 발행 → Payment 환불 처리
   */
  requestRefund(reason: string): void;

  /**
   * REFUNDING → REFUNDED
   * OrderRefunded 이벤트 발행 → User 포인트 회수
   */
  completeRefund(): void;

  private assertStatus(...allowed: OrderStatus[]): void;
}
```

### 2.6 Domain Events (Order Context)

```typescript
// src/order/domain/event/order-events.ts

/** 주문 생성 → Inventory: 재고 예약 요청 */
export class OrderPlaced extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
    readonly items: Array<{
      productId: string;
      productOptionValueId: string;
      quantity: number;
    }>,
    readonly totalAmount: number,
  ) { super(); }
}

/** 결제 완료 후 확정 → Inventory: 예약 확정, User: 포인트 적립 */
export class OrderConfirmed extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
    readonly paymentId: string,
    readonly finalAmount: number,
    readonly pointEarnAmount: number,  // 결제금액 1%
  ) { super(); }
}

/** 출고 처리 → Notification: 배송 시작 알림 */
export class OrderShipped extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
    readonly trackingNumber: string,
  ) { super(); }
}

/** 배송 완료 */
export class OrderDelivered extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
  ) { super(); }
}

/** 주문 취소 → Payment: 환불, Inventory: 재고 해제 */
export class OrderCancelled extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
    readonly reason: string,
    readonly items: Array<{
      productOptionValueId: string;
      quantity: number;
    }>,
    readonly refundAmount: number,
  ) { super(); }
}

/** 환불 요청 → Payment: 환불 처리 */
export class OrderRefundRequested extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly paymentId: string,
    readonly refundAmount: number,
    readonly reason: string,
  ) { super(); }
}

/** 환불 완료 → User: 포인트 회수 */
export class OrderRefunded extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderNumber: string,
    readonly memberId: string,
    readonly refundAmount: number,
  ) { super(); }
}
```

### 2.7 Repository & Domain Service

```typescript
// src/order/domain/repository/order-repository.ts
export interface OrderRepository {
  findById(orderId: OrderId): Promise<Order | null>;
  findByOrderNumber(orderNumber: OrderNumber): Promise<Order | null>;
  findByMemberId(
    memberId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Order[]; total: number }>;
  save(order: Order): Promise<void>;
  nextId(): OrderId;
}
export const ORDER_REPOSITORY = Symbol("OrderRepository");

// src/order/domain/service/order-number-generator.ts
// Domain Service: 주문번호 생성 (형식: ORD-{YYYYMMDD}-{6자리 시퀀스})
export interface OrderNumberGenerator {
  generate(): Promise<OrderNumber>;
}
export const ORDER_NUMBER_GENERATOR = Symbol("OrderNumberGenerator");
```

### 2.8 CQRS - Order

```typescript
// src/order/application/command/order-commands.ts

/** 주문 생성 (장바구니 → 주문) */
export interface PlaceOrderCommand {
  readonly memberId: string;
  readonly cartItemIds: string[];
  readonly shippingInfo: {
    readonly recipientName: string;
    readonly recipientPhone: string;
    readonly zipCode: string;
    readonly street: string;
    readonly detail: string;
    readonly deliveryRequest?: string;
  };
  readonly pointToUse: number;
}

export interface CancelOrderCommand {
  readonly orderId: string;
  readonly memberId: string;
  readonly reason: string;
}

export interface RequestRefundCommand {
  readonly orderId: string;
  readonly memberId: string;
  readonly reason: string;
}

export interface ShipOrderCommand {
  readonly orderId: string;
  readonly trackingNumber: string;
}

// src/order/application/query/order-queries.ts
export interface GetOrderQuery {
  readonly orderId: string;
  readonly memberId: string;
}

export interface GetOrdersQuery {
  readonly memberId: string;
  readonly page: number;
  readonly limit: number;
  readonly status?: OrderStatus;
}

export interface GetOrderByNumberQuery {
  readonly orderNumber: string;
  readonly memberId: string;
}

// src/order/application/dto/order-dto.ts
export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemTotal: number;
  discountAmount: number;
  pointUsed: number;
  shippingFee: number;
  finalAmount: number;
  items: OrderItemDTO[];
  shippingInfo: ShippingInfoDTO;
  createdAt: string;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  optionSummary: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingInfoDTO {
  recipientName: string;
  recipientPhone: string;
  fullAddress: string;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}
```

---

## 3. Payment Context

### 3.1 파일 구조

```
src/payment/
├── domain/
│   ├── model/
│   │   ├── payment.ts             # Payment Aggregate Root
│   │   ├── refund.ts              # Refund Entity
│   │   └── payment-status.ts      # PaymentStatus Enum
│   ├── value-object/
│   │   ├── payment-id.ts
│   │   ├── payment-key.ts         # 토스페이먼츠 paymentKey VO
│   │   └── payment-amount.ts
│   ├── event/
│   │   └── payment-events.ts
│   ├── repository/
│   │   └── payment-repository.ts
│   └── port/
│       └── payment-gateway.ts     # ACL Port (Anti-Corruption Layer)
├── application/
│   ├── command/
│   │   └── payment-commands.ts
│   ├── query/
│   │   └── payment-queries.ts
│   ├── dto/
│   │   └── payment-dto.ts
│   └── service/
│       └── payment-application-service.ts
├── infrastructure/
│   ├── persistence/typeorm/
│   │   ├── payment.entity.ts
│   │   └── typeorm-payment-repository.ts
│   └── external/toss/
│       ├── toss-payments-adapter.ts   # ACL 구현체
│       ├── toss-payments-client.ts    # HTTP Client
│       └── toss-dto.ts               # 토스 API 응답 타입
└── interface/
    ├── api/
    │   ├── payment-controller.ts
    │   └── request.ts
    └── webhook/
        └── toss-webhook-controller.ts
```

### 3.2 Anti-Corruption Layer (ACL) - 토스페이먼츠

```typescript
// src/payment/domain/port/payment-gateway.ts
// Domain Layer에 위치 - 도메인이 외부 시스템에 직접 의존하지 않음

export interface PaymentGatewayApproveRequest {
  paymentKey: string;
  orderId: string;    // 토스 orderId = 우리 orderNumber
  amount: number;
}

export interface PaymentGatewayApproveResult {
  paymentKey: string;
  status: "DONE" | "CANCELED" | "PARTIAL_CANCELED" | "ABORTED" | "EXPIRED";
  approvedAt: string;   // ISO 8601
  receipt: { url: string };
  method: string;       // "카드", "가상계좌", "간편결제" 등
  totalAmount: number;
}

export interface PaymentGatewayCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;  // 없으면 전액 취소
}

export interface PaymentGatewayCancelResult {
  paymentKey: string;
  cancels: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  }>;
}

/**
 * 결제 게이트웨이 Port (Anti-Corruption Layer)
 * Infrastructure Layer의 TossPaymentsAdapter에서 구현
 */
export interface PaymentGateway {
  approve(request: PaymentGatewayApproveRequest): Promise<PaymentGatewayApproveResult>;
  cancel(request: PaymentGatewayCancelRequest): Promise<PaymentGatewayCancelResult>;
  getPayment(paymentKey: string): Promise<PaymentGatewayApproveResult>;
}
export const PAYMENT_GATEWAY = Symbol("PaymentGateway");

// src/payment/infrastructure/external/toss/toss-payments-adapter.ts
// 토스 API 응답을 도메인 모델로 변환 (번역 계층)
export class TossPaymentsAdapter implements PaymentGateway {
  constructor(private readonly client: TossPaymentsClient) {}

  async approve(request: PaymentGatewayApproveRequest): Promise<PaymentGatewayApproveResult>;
  async cancel(request: PaymentGatewayCancelRequest): Promise<PaymentGatewayCancelResult>;
  async getPayment(paymentKey: string): Promise<PaymentGatewayApproveResult>;

  // 토스 응답 → 도메인 모델 변환
  private toApproveResult(tossResponse: TossPaymentResponse): PaymentGatewayApproveResult;
  private toCancelResult(tossResponse: TossCancelResponse): PaymentGatewayCancelResult;
}
```

### 3.3 Enums & Value Objects (Payment)

```typescript
// src/payment/domain/model/payment-status.ts
export enum PaymentStatus {
  INITIATED          = "INITIATED",           // 결제 초기화
  APPROVED           = "APPROVED",            // 결제 승인 완료
  CANCELLED          = "CANCELLED",           // 전액 취소
  PARTIAL_CANCELLED  = "PARTIAL_CANCELLED",   // 부분 취소
  FAILED             = "FAILED",              // 결제 실패
}

// src/payment/domain/value-object/payment-key.ts
interface PaymentKeyProps { value: string; }

export class PaymentKey extends ValueObject<PaymentKeyProps> {
  protected validate(props: PaymentKeyProps): void {
    if (!props.value || props.value.trim() === "") {
      throw new DomainError("paymentKey는 비어있을 수 없습니다");
    }
  }

  static create(value: string): PaymentKey;
  get value(): string;
}

// src/payment/domain/value-object/payment-amount.ts
interface PaymentAmountProps {
  originalAmount: number;   // 원래 결제 금액
  approvedAmount: number;   // 실제 승인 금액
  cancelledAmount: number;  // 취소된 금액
}

export class PaymentAmount extends ValueObject<PaymentAmountProps> {
  protected validate(props: PaymentAmountProps): void {
    if (Object.values(props).some(v => v < 0)) {
      throw new DomainError("결제 금액은 0 이상이어야 합니다");
    }
    if (props.cancelledAmount > props.approvedAmount) {
      throw new DomainError("취소 금액이 승인 금액을 초과할 수 없습니다");
    }
  }

  static initiate(amount: number): PaymentAmount;
  static create(props: PaymentAmountProps): PaymentAmount;

  get originalAmount(): number;
  get approvedAmount(): number;
  get cancelledAmount(): number;
  get remainingAmount(): number;   // approvedAmount - cancelledAmount
}
```

### 3.4 Refund Entity

```typescript
// src/payment/domain/model/refund.ts
export enum RefundStatus {
  REQUESTED  = "REQUESTED",
  PROCESSING = "PROCESSING",
  COMPLETED  = "COMPLETED",
  FAILED     = "FAILED",
}

interface RefundProps {
  id: string;
  paymentId: PaymentId;
  amount: number;
  reason: string;
  status: RefundStatus;
  cancelledAt?: Date;
  requestedAt: Date;
}

export class Refund extends Entity<EntityId> {
  private _paymentId: PaymentId;
  private _amount: number;
  private _reason: string;
  private _status: RefundStatus;
  private _cancelledAt: Date | undefined;
  private _requestedAt: Date;

  static create(props: Omit<RefundProps, 'id' | 'status' | 'requestedAt'>): Refund;
  static reconstitute(props: RefundProps): Refund;

  get paymentId(): PaymentId;
  get amount(): number;
  get reason(): string;
  get status(): RefundStatus;
  get cancelledAt(): Date | undefined;
  get requestedAt(): Date;

  markProcessing(): void;
  complete(cancelledAt: Date): void;
  fail(): void;
}
```

### 3.5 Payment Aggregate Root

```typescript
// src/payment/domain/model/payment.ts
interface PaymentProps {
  id: PaymentId;
  orderId: string;
  orderNumber: string;       // 토스 orderId로 사용
  memberId: string;
  paymentKey?: PaymentKey;   // 승인 후 할당
  amount: PaymentAmount;
  method: string | undefined;
  status: PaymentStatus;
  refunds: Refund[];
  approvedAt?: Date;
  failureReason?: string;
  receiptUrl?: string;
  createdAt: Date;
}

export class Payment extends AggregateRoot<PaymentId> {
  private _orderId: string;
  private _orderNumber: string;
  private _memberId: string;
  private _paymentKey: PaymentKey | undefined;
  private _amount: PaymentAmount;
  private _method: string | undefined;
  private _status: PaymentStatus;
  private _refunds: Refund[];
  private _approvedAt: Date | undefined;
  private _failureReason: string | undefined;
  private _receiptUrl: string | undefined;
  private _createdAt: Date;

  // -- Factory Methods --

  /**
   * 결제 초기화 (INITIATED 상태)
   */
  static initiate(
    id: PaymentId,
    orderId: string,
    orderNumber: string,
    memberId: string,
    amount: number,
  ): Payment;

  static reconstitute(props: PaymentProps & { version: number }): Payment;

  // -- Getters --
  get orderId(): string;
  get orderNumber(): string;
  get memberId(): string;
  get paymentKey(): PaymentKey | undefined;
  get amount(): PaymentAmount;
  get method(): string | undefined;
  get status(): PaymentStatus;
  get refunds(): readonly Refund[];
  get approvedAt(): Date | undefined;
  get totalRefundedAmount(): number;
  get isRefundable(): boolean;

  // -- Domain Behaviors --

  /**
   * 결제 승인 (토스 승인 결과 적용)
   * INITIATED → APPROVED
   * PaymentApproved 이벤트 발행 → Order: confirm()
   * 금액 검증: approvedAmount === originalAmount
   */
  approve(
    paymentKey: PaymentKey,
    approvedAmount: number,
    method: string,
    approvedAt: Date,
    receiptUrl: string,
  ): void;

  /**
   * 결제 실패
   * INITIATED → FAILED
   * PaymentFailed 이벤트 발행 → Order: cancel(), Inventory: release
   */
  fail(reason: string): void;

  /**
   * 환불 요청
   * APPROVED → (환불 처리 중)
   * RefundRequested 이벤트 발행
   */
  requestRefund(amount: number, reason: string): Refund;

  /**
   * 환불 완료 (토스 취소 API 결과 적용)
   * RefundCompleted 이벤트 발행 → Order: completeRefund()
   */
  completeRefund(refundId: string, cancelledAt: Date): void;

  private assertStatus(...allowed: PaymentStatus[]): void;
  private assertRefundableAmount(amount: number): void;
}
```

### 3.6 Domain Events (Payment Context)

```typescript
// src/payment/domain/event/payment-events.ts

/** 결제 승인 완료 → Order: 주문 확정 */
export class PaymentApproved extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // paymentId
    readonly orderId: string,
    readonly orderNumber: string,
    readonly paymentKey: string,
    readonly approvedAmount: number,
    readonly method: string,
  ) { super(); }
}

/** 결제 실패 → Order: 취소, Inventory: 재고 해제 */
export class PaymentFailed extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderId: string,
    readonly orderNumber: string,
    readonly reason: string,
  ) { super(); }
}

/** 환불 요청됨 */
export class RefundRequested extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly refundId: string,
    readonly orderId: string,
    readonly amount: number,
    readonly reason: string,
  ) { super(); }
}

/** 환불 완료 → Order: 환불 완료 상태 변경 */
export class RefundCompleted extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly refundId: string,
    readonly orderId: string,
    readonly amount: number,
    readonly cancelledAt: string,
  ) { super(); }
}
```

### 3.7 Repository & CQRS (Payment)

```typescript
// src/payment/domain/repository/payment-repository.ts
export interface PaymentRepository {
  findById(paymentId: PaymentId): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByOrderNumber(orderNumber: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
  nextId(): PaymentId;
}
export const PAYMENT_REPOSITORY = Symbol("PaymentRepository");

// src/payment/application/command/payment-commands.ts

/** 결제 초기화 */
export interface InitiatePaymentCommand {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly memberId: string;
  readonly amount: number;
}

/** 결제 승인 (토스 SDK 완료 후 서버 승인) */
export interface ApprovePaymentCommand {
  readonly paymentKey: string;
  readonly orderNumber: string;  // 토스 orderId = 우리 orderNumber
  readonly amount: number;
}

/** 환불 요청 */
export interface RequestRefundCommand {
  readonly paymentId: string;
  readonly amount: number;
  readonly reason: string;
}

// src/payment/application/query/payment-queries.ts
export interface GetPaymentByOrderQuery {
  readonly orderId: string;
  readonly memberId: string;
}

// src/payment/application/dto/payment-dto.ts
export interface PaymentDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PaymentStatus;
  originalAmount: number;
  approvedAmount: number;
  cancelledAmount: number;
  method: string | null;
  receiptUrl: string | null;
  approvedAt: string | null;
  refunds: RefundDTO[];
}

export interface RefundDTO {
  id: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  cancelledAt: string | null;
  requestedAt: string;
}
```

---

## 4. Inventory Context

### 4.1 파일 구조

```
src/inventory/
├── domain/
│   ├── model/
│   │   ├── stock.ts               # Stock Aggregate Root
│   │   └── stock-reservation.ts   # StockReservation Entity
│   ├── value-object/
│   │   ├── stock-id.ts
│   │   ├── reservation-id.ts
│   │   └── stock-quantity.ts
│   ├── event/
│   │   └── inventory-events.ts
│   ├── repository/
│   │   └── stock-repository.ts
│   └── service/
│       └── stock-reservation-service.ts  # 다수 Stock 일괄 예약 도메인 서비스
├── application/
│   ├── command/
│   │   └── inventory-commands.ts
│   ├── query/
│   │   └── inventory-queries.ts
│   ├── dto/
│   │   └── inventory-dto.ts
│   └── service/
│       └── inventory-application-service.ts
├── infrastructure/
│   └── persistence/typeorm/
│       ├── stock.entity.ts
│       └── typeorm-stock-repository.ts
└── interface/
    └── consumer/
        └── order-event-consumer.ts   # OrderPlaced, OrderConfirmed, OrderCancelled 수신
```

### 4.2 Value Objects (Inventory)

```typescript
// src/inventory/domain/value-object/stock-quantity.ts
interface StockQuantityProps { value: number; }

export class StockQuantity extends ValueObject<StockQuantityProps> {
  static readonly LOW_STOCK_THRESHOLD = 10;

  protected validate(props: StockQuantityProps): void {
    if (!Number.isInteger(props.value) || props.value < 0) {
      throw new DomainError(`재고 수량은 0 이상의 정수여야 합니다: ${props.value}`);
    }
  }

  static create(value: number): StockQuantity;
  static zero(): StockQuantity;

  get value(): number;
  get isOutOfStock(): boolean;   // value === 0
  get isLowStock(): boolean;     // 0 < value <= LOW_STOCK_THRESHOLD
  get isInStock(): boolean;      // value > 0

  add(amount: number): StockQuantity;
  subtract(amount: number): StockQuantity;   // 부족 시 DomainError
  canFulfill(amount: number): boolean;
}
```

### 4.3 StockReservation Entity

```typescript
// src/inventory/domain/model/stock-reservation.ts
export enum ReservationStatus {
  PENDING    = "PENDING",    // 예약됨 (결제 전)
  CONFIRMED  = "CONFIRMED",  // 확정됨 (결제 완료)
  RELEASED   = "RELEASED",   // 해제됨 (결제 실패/취소)
  EXPIRED    = "EXPIRED",    // 만료됨 (결제 시간 초과)
}

interface StockReservationProps {
  id: ReservationId;
  stockId: StockId;
  orderId: string;
  orderNumber: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;           // 생성 후 15분
  confirmedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
}

export class StockReservation extends Entity<ReservationId> {
  private _stockId: StockId;
  private _orderId: string;
  private _orderNumber: string;
  private _quantity: number;
  private _status: ReservationStatus;
  private _expiresAt: Date;
  private _confirmedAt: Date | undefined;
  private _releasedAt: Date | undefined;
  private _createdAt: Date;

  static create(props: Omit<StockReservationProps, 'id' | 'status' | 'createdAt'>): StockReservation;
  static reconstitute(props: StockReservationProps): StockReservation;

  get stockId(): StockId;
  get orderId(): string;
  get orderNumber(): string;
  get quantity(): number;
  get status(): ReservationStatus;
  get expiresAt(): Date;
  get isExpired(): boolean;   // now > expiresAt && status === PENDING
  get isPending(): boolean;

  confirm(at: Date): void;   // PENDING → CONFIRMED
  release(at: Date): void;   // PENDING → RELEASED
  expire(): void;            // PENDING → EXPIRED
}
```

### 4.4 Stock Aggregate Root

```typescript
// src/inventory/domain/model/stock.ts
interface StockProps {
  id: StockId;
  productOptionValueId: string;  // Product Context 참조 (ID만)
  productId: string;
  quantity: StockQuantity;       // 실제 재고
  reservedQuantity: number;      // 현재 예약된 수량
  reservations: StockReservation[];
  updatedAt: Date;
}

export class Stock extends AggregateRoot<StockId> {
  private _productOptionValueId: string;
  private _productId: string;
  private _quantity: StockQuantity;
  private _reservedQuantity: number;
  private _reservations: StockReservation[];
  private _updatedAt: Date;

  static create(
    id: StockId,
    productOptionValueId: string,
    productId: string,
    initialQuantity: number,
  ): Stock;

  static reconstitute(props: StockProps & { version: number }): Stock;

  // -- Getters --
  get productOptionValueId(): string;
  get productId(): string;
  get quantity(): StockQuantity;           // 전체 재고
  get reservedQuantity(): number;
  get availableQuantity(): number;         // quantity.value - reservedQuantity
  get reservations(): readonly StockReservation[];
  get isAvailable(): boolean;
  get isLowStock(): boolean;

  // -- Domain Behaviors (SAGA Steps) --

  /**
   * 재고 예약 [SAGA Step 1: OrderPlaced 이벤트 수신]
   * StockReserved 이벤트 발행 → Payment: 결제 진행
   * @throws DomainError - 가용 재고 부족
   */
  reserve(
    orderId: string,
    orderNumber: string,
    quantity: number,
  ): StockReservation;

  /**
   * 예약 확정 [SAGA 완료: OrderConfirmed 이벤트 수신]
   * - 실제 재고에서 차감, reservedQuantity 감소
   * StockConfirmed 이벤트 발행
   * StockLow / StockExhausted 이벤트 조건부 발행
   */
  confirmReservation(orderId: string): void;

  /**
   * 예약 해제 [SAGA 보상: PaymentFailed / OrderCancelled 이벤트 수신]
   * - reservedQuantity 감소 (실제 재고 변동 없음)
   * StockReleased 이벤트 발행
   */
  releaseReservation(orderId: string): void;

  /**
   * 만료 예약 정리 [스케줄러 호출 - 15분 주기]
   * StockReservationExpired 이벤트 발행
   */
  expireReservations(): void;

  /**
   * 재고 추가 [입고 / 주문 취소 후 재입고]
   */
  increase(amount: number, reason: string): void;

  /**
   * 재고 직접 조정 [관리자]
   */
  adjust(newQuantity: number, reason: string): void;

  private findReservation(orderId: string): StockReservation;
  private assertSufficientAvailable(quantity: number): void;
  private checkAndEmitStockWarnings(): void;  // Low/Exhausted 이벤트 조건부 발행
}
```

### 4.5 Domain Service - 일괄 예약

```typescript
// src/inventory/domain/service/stock-reservation-service.ts
/**
 * Domain Service: 주문의 여러 아이템을 일괄 예약
 * - 모든 아이템 예약 성공 시 StockReserved 이벤트들 반환
 * - 하나라도 실패 시 이미 예약된 것들 롤백 + StockReservationFailed 발행
 */
export class StockReservationService {
  reserveAll(
    stocks: Map<string, Stock>,  // productOptionValueId → Stock
    orderId: string,
    orderNumber: string,
    items: Array<{ productOptionValueId: string; quantity: number }>,
  ): void;  // 실패 시 DomainError + 내부 보상 처리
}
```

### 4.6 Domain Events (Inventory Context)

```typescript
// src/inventory/domain/event/inventory-events.ts

/** 재고 예약 완료 → Payment: 결제 진행 */
export class StockReserved extends DomainEvent {
  constructor(
    readonly aggregateId: string,   // stockId
    readonly orderId: string,
    readonly orderNumber: string,
    readonly productOptionValueId: string,
    readonly quantity: number,
    readonly reservationId: string,
  ) { super(); }
}

/** 재고 예약 실패 → Order: 주문 취소 보상 */
export class StockReservationFailed extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderId: string,
    readonly orderNumber: string,
    readonly productOptionValueId: string,
    readonly requestedQuantity: number,
    readonly availableQuantity: number,
    readonly reason: string,
  ) { super(); }
}

/** 재고 확정 (결제 완료 → 실제 차감) */
export class StockConfirmed extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderId: string,
    readonly reservationId: string,
    readonly confirmedQuantity: number,
    readonly remainingQuantity: number,
  ) { super(); }
}

/** 재고 예약 해제 (결제 실패/취소 → 복구) */
export class StockReleased extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly orderId: string,
    readonly reservationId: string,
    readonly releasedQuantity: number,
  ) { super(); }
}

/** 재고 부족 경고 → Notification: 관리자 알림 */
export class StockLow extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly productOptionValueId: string,
    readonly productId: string,
    readonly currentQuantity: number,
    readonly threshold: number,
  ) { super(); }
}

/** 재고 소진 → Product 비활성화 트리거 */
export class StockExhausted extends DomainEvent {
  constructor(
    readonly aggregateId: string,
    readonly productOptionValueId: string,
    readonly productId: string,
  ) { super(); }
}
```

### 4.7 Repository & CQRS (Inventory)

```typescript
// src/inventory/domain/repository/stock-repository.ts
export interface StockRepository {
  findByProductOptionValueId(optionValueId: string): Promise<Stock | null>;
  findByProductId(productId: string): Promise<Stock[]>;
  findByProductOptionValueIds(optionValueIds: string[]): Promise<Stock[]>;
  save(stock: Stock): Promise<void>;
  saveAll(stocks: Stock[]): Promise<void>;
  nextId(): StockId;
}
export const STOCK_REPOSITORY = Symbol("StockRepository");

// src/inventory/application/command/inventory-commands.ts

/** 재고 초기화 (ProductOptionValue 생성 시) */
export interface InitializeStockCommand {
  readonly productOptionValueId: string;
  readonly productId: string;
  readonly initialQuantity: number;
}

/** 재고 예약 (OrderPlaced 이벤트 핸들러) */
export interface ReserveStockCommand {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly items: Array<{
    readonly productOptionValueId: string;
    readonly quantity: number;
  }>;
}

/** 예약 확정 (OrderConfirmed 이벤트 핸들러) */
export interface ConfirmReservationCommand {
  readonly orderId: string;
}

/** 예약 해제 (PaymentFailed / OrderCancelled 이벤트 핸들러) */
export interface ReleaseReservationCommand {
  readonly orderId: string;
  readonly reason: string;
}

/** 재고 추가 (관리자) */
export interface IncreaseStockCommand {
  readonly productOptionValueId: string;
  readonly amount: number;
  readonly reason: string;
}

// src/inventory/application/query/inventory-queries.ts
export interface GetStockQuery {
  readonly productOptionValueId: string;
}

export interface GetStockByProductQuery {
  readonly productId: string;
}

// src/inventory/application/dto/inventory-dto.ts
export interface StockDTO {
  id: string;
  productOptionValueId: string;
  productId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  isLowStock: boolean;
}
```

---

## 5. 전체 이벤트 흐름 (SAGA 상세)

### 5.1 정상 주문 흐름

```
명령/이벤트                         발행 Context     수신 Context    처리 내용
══════════════════════════════════════════════════════════════════════════════
PlaceOrderCommand                  Client          Order          주문 생성 (PENDING)
OrderPlaced                        Order           Inventory      재고 예약 시도
StockReserved (전체 아이템)        Inventory       Order          startPayment()
                                                   Payment        initiate()
ApprovePaymentCommand              Client          Payment        토스 API 승인
PaymentApproved                    Payment         Order          confirm(paymentId)
OrderConfirmed                     Order           Inventory      예약 확정 (차감)
                                                   User           포인트 적립
StockConfirmed                     Inventory       -              완료
PointEarned                        User            -              완료
```

### 5.2 결제 실패 보상 흐름

```
명령/이벤트                         발행 Context     수신 Context    처리 내용
══════════════════════════════════════════════════════════════════════════════
PaymentFailed                      Payment         Order          cancel("결제 실패")
OrderCancelled                     Order           Inventory      예약 해제
StockReleased                      Inventory       -              완료
```

### 5.3 재고 부족 보상 흐름

```
명령/이벤트                         발행 Context     수신 Context    처리 내용
══════════════════════════════════════════════════════════════════════════════
OrderPlaced                        Order           Inventory      재고 예약 시도
StockReservationFailed             Inventory       Order          cancel("재고 부족")
OrderCancelled                     Order           -              완료 (결제 없음)
```

### 5.4 주문 취소 보상 흐름 (결제 완료 후)

```
명령/이벤트                         발행 Context     수신 Context    처리 내용
══════════════════════════════════════════════════════════════════════════════
CancelOrderCommand                 Client          Order          cancel()
OrderCancelled                     Order           Payment        requestRefund()
                                                   Inventory      increase() 재입고
RefundRequested                    Payment         -              토스 취소 API 호출
RefundCompleted                    Payment         Order          completeRefund()
OrderRefunded                      Order           User           포인트 회수
```

---

## 6. 불변식 요약 (Invariants Summary)

### Cart

| 규칙 | 설명 |
|------|------|
| 아이템 종류 최대 20개 | items.length <= 20 |
| 수량 범위 | 1 <= quantity <= 100 |
| 동일 상품+옵션 합산 | 같은 조합 추가 시 수량 합산 |

### Order

| 규칙 | 설명 |
|------|------|
| 상태 단방향 전이 | 역방향 상태 변경 불가 |
| 취소 가능 상태 | PENDING, PAYMENT_PENDING, CONFIRMED, PREPARING만 가능 |
| OrderAmount 일관성 | itemTotal - discount - point + shipping = finalAmount |
| 가격 스냅샷 | 주문 후 상품 가격 변동이 기존 주문에 영향 없음 |
| 아이템 최소 1개 | items.length >= 1 |

### Payment

| 규칙 | 설명 |
|------|------|
| 승인 금액 일치 | 요청 금액 === 토스 승인 금액 (금액 위변조 방지) |
| 환불 한도 | cancelledAmount <= approvedAmount |
| paymentKey 유일 | 토스 paymentKey는 Payment당 하나 |
| orderId당 하나 | 하나의 Order에 하나의 Payment |

### Stock (Inventory)

| 규칙 | 설명 |
|------|------|
| 가용 재고 비음수 | availableQuantity >= 0 항상 유지 |
| 실제 재고 비음수 | quantity.value >= 0 항상 유지 |
| 예약 만료 15분 | 결제 미완료 시 15분 후 자동 해제 |
| orderId당 하나의 예약 | 중복 예약 불가 |

---

## 7. 프로젝트 구조 전체

```
src/
├── cart/
│   ├── domain/
│   │   ├── model/         (cart.ts, cart-item.ts)
│   │   ├── value-object/  (cart-id.ts, cart-item-id.ts, cart-item-quantity.ts)
│   │   ├── event/         (cart-events.ts)
│   │   └── repository/    (cart-repository.ts)
│   ├── application/
│   │   ├── command/       (cart-commands.ts)
│   │   ├── query/         (cart-queries.ts)
│   │   ├── dto/           (cart-dto.ts)
│   │   └── service/       (cart-application-service.ts)
│   └── interface/api/
│
├── order/
│   ├── domain/
│   │   ├── model/         (order.ts, order-item.ts, shipping-info.ts, order-status.ts)
│   │   ├── value-object/  (order-id.ts, order-number.ts, order-amount.ts)
│   │   ├── event/         (order-events.ts)
│   │   ├── repository/    (order-repository.ts)
│   │   └── service/       (order-number-generator.ts)
│   ├── application/
│   │   ├── command/       (order-commands.ts)
│   │   ├── query/         (order-queries.ts)
│   │   ├── dto/           (order-dto.ts)
│   │   └── service/       (order-application-service.ts)
│   ├── infrastructure/persistence/typeorm/
│   └── interface/api/
│
├── payment/
│   ├── domain/
│   │   ├── model/         (payment.ts, refund.ts, payment-status.ts)
│   │   ├── value-object/  (payment-id.ts, payment-key.ts, payment-amount.ts)
│   │   ├── event/         (payment-events.ts)
│   │   ├── repository/    (payment-repository.ts)
│   │   └── port/          (payment-gateway.ts)   ← ACL Port
│   ├── application/
│   │   ├── command/       (payment-commands.ts)
│   │   ├── query/         (payment-queries.ts)
│   │   ├── dto/           (payment-dto.ts)
│   │   └── service/       (payment-application-service.ts)
│   ├── infrastructure/
│   │   ├── persistence/typeorm/
│   │   └── external/toss/ (toss-payments-adapter.ts)  ← ACL 구현체
│   └── interface/
│       ├── api/
│       └── webhook/       (toss-webhook-controller.ts)
│
├── inventory/
│   ├── domain/
│   │   ├── model/         (stock.ts, stock-reservation.ts)
│   │   ├── value-object/  (stock-id.ts, reservation-id.ts, stock-quantity.ts)
│   │   ├── event/         (inventory-events.ts)
│   │   ├── repository/    (stock-repository.ts)
│   │   └── service/       (stock-reservation-service.ts)
│   ├── application/
│   │   ├── command/       (inventory-commands.ts)
│   │   ├── query/         (inventory-queries.ts)
│   │   ├── dto/           (inventory-dto.ts)
│   │   └── service/       (inventory-application-service.ts)
│   ├── infrastructure/persistence/typeorm/
│   └── interface/consumer/
│       └── order-event-consumer.ts  ← OrderPlaced, OrderConfirmed, OrderCancelled 수신
│
└── shared/
    ├── domain/  (aggregate-root.ts, entity.ts, value-object.ts, domain-event.ts, errors.ts)
    └── infrastructure/  (event-publisher.ts, logger.ts)
```

---

**Status**: Design Complete
**Dependencies**: Task #2 (User + Product Context) 패턴 준수
**Next**: Task #1 - DB Schema (전체 Context Prisma 스키마)
