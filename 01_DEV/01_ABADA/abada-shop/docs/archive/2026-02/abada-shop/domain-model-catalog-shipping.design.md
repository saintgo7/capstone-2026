# Domain Model Design: Catalog + Shipping Context

**Project**: abada 쇼핑몰 (shop.abada.kr)
**Architecture**: DDD + CQRS + Hexagonal (TypeScript)
**Date**: 2026-02-22
**Author**: Ph.D SNT Go.
**Task**: #15 - Catalog / Shipping Domain Model

---

## 목차

1. [Context Map (컨텍스트 맵)](#1-context-map)
2. [Catalog Context (카탈로그 컨텍스트)](#2-catalog-context)
3. [Shipping Context (배송 컨텍스트)](#3-shipping-context)
4. [CQRS Commands & Queries](#4-cqrs-commands--queries)
5. [Domain Events 전체 목록](#5-domain-events-전체-목록)
6. [디렉토리 구조](#6-디렉토리-구조)
7. [설계 결정 사항](#7-설계-결정-사항)

---

## 1. Context Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        abada-shop Bounded Contexts                        │
│                                                                           │
│  ┌──────────────────────┐         ┌───────────────────────────────────┐  │
│  │   CATALOG CONTEXT     │         │         SHIPPING CONTEXT          │  │
│  │                       │         │                                   │  │
│  │  Category Aggregate   │         │  Shipment Aggregate (AR)         │  │
│  │  (3-level hierarchy)  │         │  TrackingEvent Entity            │  │
│  │                       │         │  ShippingAddress Value Object    │  │
│  │  ProductDisplay Entity│         │                                   │  │
│  │  (진열 정보)           │         │  CarrierAdapter (ACL)            │  │
│  │                       │         │  - CJLogisticsAdapter            │  │
│  │  Domain Events:       │         │  - HanjinAdapter                 │  │
│  │  - CategoryCreated    │         │                                   │  │
│  │  - CategoryMoved      │         │  Domain Events:                  │  │
│  │  - ProductDisplayed   │         │  - ShipmentCreated               │  │
│  │  - ProductHidden      │         │  - ShipmentDispatched            │  │
│  └──────────────────────┘         │  - TrackingUpdated               │  │
│            │                      │  - ShipmentDelivered             │  │
│            │  CategoryResolved     │  - DeliveryFailed                │  │
│            └──────────────────────►                                   │  │
│                                   └───────────────────────────────────┘  │
│                                               │                          │
│   ┌───────────────────────────────────────────┘                          │
│   │  ShipmentCreated → Order Context (OrderShipped event trigger)        │
│   │  ProductDisplay 조회 → Product Context (Product 상세 데이터 참조)      │
└───┴──────────────────────────────────────────────────────────────────────┘
```

### 컨텍스트 관계

| 상류(Upstream) | 하류(Downstream) | 관계 패턴 | 통신 방식 |
|---------------|-----------------|-----------|----------|
| Product | Catalog | Customer/Supplier | Product 변경 이벤트 → Catalog 동기화 |
| Order | Shipping | Published Language | OrderPaid → ShipmentCreated |
| Shipping | Order | Published Language | ShipmentDelivered → Order.deliver() |
| Carrier (외부) | Shipping | ACL | 택배사 API → 도메인 TrackingEvent 변환 |

---

## 2. Catalog Context

카탈로그 컨텍스트는 고객에게 보이는 상품 진열 구조를 관리한다.
Product Context의 상품 원본 데이터와는 분리된 **진열 관점**의 모델이다.

### 2.1 Category Aggregate (3단계 계층)

카테고리는 최대 3단계 계층(대분류 → 중분류 → 소분류)을 지원한다.
계층 구조는 `parentId` 참조와 `depth` 필드로 관리하며,
한 카테고리는 하나의 Aggregate다 (전체 트리를 하나로 묶지 않음 - 성능 고려).

```typescript
// catalog/domain/model/category.ts

export class CategoryId extends EntityId {
  static create(value?: string): CategoryId {
    return new CategoryId({ value: value ?? crypto.randomUUID() });
  }
}

export enum CategoryDepth {
  ROOT  = 1,  // 대분류
  MID   = 2,  // 중분류
  LEAF  = 3,  // 소분류
}

export enum CategoryStatus {
  ACTIVE   = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export class CategoryName extends ValueObject<{ value: string }> {
  protected validate(props: { value: string }): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new DomainError("카테고리명은 비어있을 수 없다");
    }
    if (props.value.length > 50) {
      throw new DomainError("카테고리명은 50자 이하여야 한다");
    }
  }

  static create(value: string): CategoryName {
    return new CategoryName({ value: value.trim() });
  }

  get value(): string { return this.props.value; }
}

export class CategorySlug extends ValueObject<{ value: string }> {
  private static readonly SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  protected validate(props: { value: string }): void {
    if (!this.SLUG_PATTERN.test(props.value)) {
      throw new DomainError(`유효하지 않은 슬러그: ${props.value}`);
    }
    if (props.value.length > 100) {
      throw new DomainError("슬러그는 100자 이하여야 한다");
    }
  }

  static create(value: string): CategorySlug {
    return new CategorySlug({ value });
  }

  get value(): string { return this.props.value; }
}

export class Category extends AggregateRoot<CategoryId> {
  private _name: CategoryName;
  private _slug: CategorySlug;
  private _depth: CategoryDepth;
  private _parentId?: CategoryId;
  private _status: CategoryStatus;
  private _displayOrder: number;
  private _imageUrl?: string;
  private _description?: string;
  private _productDisplays: ProductDisplay[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: CategoryId,
    name: CategoryName,
    slug: CategorySlug,
    depth: CategoryDepth,
    displayOrder: number,
    status: CategoryStatus,
    createdAt: Date,
    updatedAt: Date,
    parentId?: CategoryId,
    imageUrl?: string,
    description?: string,
    productDisplays: ProductDisplay[] = [],
  ) {
    super(id);
    this._name = name;
    this._slug = slug;
    this._depth = depth;
    this._parentId = parentId;
    this._status = status;
    this._displayOrder = displayOrder;
    this._imageUrl = imageUrl;
    this._description = description;
    this._productDisplays = productDisplays;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  // -- Factory: create root category (대분류) --
  static createRoot(
    id: CategoryId,
    name: CategoryName,
    slug: CategorySlug,
    displayOrder: number,
  ): Category {
    const now = new Date();
    const category = new Category(
      id, name, slug,
      CategoryDepth.ROOT,
      displayOrder,
      CategoryStatus.ACTIVE,
      now, now,
    );
    category.registerEvent(new CategoryCreated(
      id.value, name.value, slug.value, CategoryDepth.ROOT, null,
    ));
    return category;
  }

  // -- Factory: create child category (중/소분류) --
  static createChild(
    id: CategoryId,
    name: CategoryName,
    slug: CategorySlug,
    parent: Category,
    displayOrder: number,
  ): Category {
    const childDepth = parent.depth + 1;
    if (childDepth > CategoryDepth.LEAF) {
      throw new DomainError("카테고리는 최대 3단계까지만 허용된다");
    }
    const now = new Date();
    const category = new Category(
      id, name, slug,
      childDepth as CategoryDepth,
      displayOrder,
      CategoryStatus.ACTIVE,
      now, now,
      parent.id,
    );
    category.registerEvent(new CategoryCreated(
      id.value, name.value, slug.value, childDepth, parent.id.value,
    ));
    return category;
  }

  // -- Reconstitution --
  static reconstitute(params: {
    id: CategoryId;
    name: CategoryName;
    slug: CategorySlug;
    depth: CategoryDepth;
    displayOrder: number;
    status: CategoryStatus;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    parentId?: CategoryId;
    imageUrl?: string;
    description?: string;
    productDisplays?: ProductDisplay[];
  }): Category {
    const category = new Category(
      params.id, params.name, params.slug,
      params.depth, params.displayOrder, params.status,
      params.createdAt, params.updatedAt,
      params.parentId, params.imageUrl, params.description,
      params.productDisplays ?? [],
    );
    category.version = params.version;
    return category;
  }

  // -- Domain Behaviors --

  rename(newName: CategoryName): void {
    if (this._name.equals(newName)) return;
    this._name = newName;
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._status === CategoryStatus.ACTIVE) return;
    this._status = CategoryStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    if (this._productDisplays.some(p => p.isDisplayed)) {
      throw new DomainError("진열 중인 상품이 있는 카테고리는 비활성화할 수 없다");
    }
    this._status = CategoryStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  setDisplayOrder(order: number): void {
    if (order < 0) throw new DomainError("진열 순서는 0 이상이어야 한다");
    this._displayOrder = order;
    this._updatedAt = new Date();
  }

  setImage(imageUrl: string): void {
    this._imageUrl = imageUrl;
    this._updatedAt = new Date();
  }

  setDescription(description: string): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  // -- Product Display Management --

  displayProduct(
    productId: string,
    productName: string,
    thumbnailUrl: string,
    displayOrder: number,
    featuredUntil?: Date,
  ): ProductDisplay {
    this.assertActive();

    const existing = this._productDisplays.find(p => p.productId === productId);
    if (existing) {
      throw new DomainError(`이미 진열 중인 상품이다: ${productId}`);
    }

    const display = ProductDisplay.create(
      this.id.value,
      productId,
      productName,
      thumbnailUrl,
      displayOrder,
      featuredUntil,
    );
    this._productDisplays.push(display);
    this._updatedAt = new Date();

    this.registerEvent(new ProductDisplayed(
      this.id.value,
      productId,
      displayOrder,
      featuredUntil ?? null,
    ));

    return display;
  }

  hideProduct(productId: string): void {
    const display = this._productDisplays.find(p => p.productId === productId);
    if (!display) {
      throw new DomainError(`진열 정보를 찾을 수 없다: ${productId}`);
    }
    display.hide();
    this._updatedAt = new Date();

    this.registerEvent(new ProductHidden(this.id.value, productId));
  }

  reorderProducts(orderedProductIds: string[]): void {
    this.assertActive();
    orderedProductIds.forEach((productId, idx) => {
      const display = this._productDisplays.find(p => p.productId === productId);
      if (display) {
        display.setDisplayOrder(idx + 1);
      }
    });
    this._updatedAt = new Date();
  }

  // -- Invariant Guards --

  private assertActive(): void {
    if (this._status !== CategoryStatus.ACTIVE) {
      throw new DomainError("비활성 카테고리에는 상품을 진열할 수 없다");
    }
  }

  // -- Getters --

  get name(): CategoryName { return this._name; }
  get slug(): CategorySlug { return this._slug; }
  get depth(): CategoryDepth { return this._depth; }
  get parentId(): CategoryId | undefined { return this._parentId; }
  get status(): CategoryStatus { return this._status; }
  get displayOrder(): number { return this._displayOrder; }
  get imageUrl(): string | undefined { return this._imageUrl; }
  get description(): string | undefined { return this._description; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get isRoot(): boolean { return this._depth === CategoryDepth.ROOT; }
  get isLeaf(): boolean { return this._depth === CategoryDepth.LEAF; }
  get isActive(): boolean { return this._status === CategoryStatus.ACTIVE; }

  get productDisplays(): readonly ProductDisplay[] {
    return [...this._productDisplays];
  }

  get displayedProducts(): readonly ProductDisplay[] {
    return this._productDisplays.filter(p => p.isDisplayed);
  }

  get featuredProducts(): readonly ProductDisplay[] {
    const now = new Date();
    return this._productDisplays.filter(
      p => p.isDisplayed && p.featuredUntil != null && p.featuredUntil > now
    );
  }
}
```

### 2.2 ProductDisplay Entity

카테고리 내 상품 진열 정보를 담는 Entity다.
실제 상품 상세 데이터는 Product Context에 있으며,
ProductDisplay는 "어떻게 보여줄지"만 관리한다.

```typescript
// catalog/domain/model/product-display.ts

export enum DisplayStatus {
  DISPLAYED = "DISPLAYED",
  HIDDEN    = "HIDDEN",
}

export class ProductDisplay extends Entity<EntityId> {
  private _categoryId: string;
  private _productId: string;
  private _productName: string;     // denormalized for display (캐시)
  private _thumbnailUrl: string;    // denormalized for display (캐시)
  private _displayOrder: number;
  private _status: DisplayStatus;
  private _featuredUntil?: Date;    // null = 기획전 아님, Date = 기획전 종료일
  private _displayedAt: Date;
  private _hiddenAt?: Date;

  private constructor(
    id: EntityId,
    categoryId: string,
    productId: string,
    productName: string,
    thumbnailUrl: string,
    displayOrder: number,
    status: DisplayStatus,
    displayedAt: Date,
    featuredUntil?: Date,
    hiddenAt?: Date,
  ) {
    super(id);
    this._categoryId = categoryId;
    this._productId = productId;
    this._productName = productName;
    this._thumbnailUrl = thumbnailUrl;
    this._displayOrder = displayOrder;
    this._status = status;
    this._displayedAt = displayedAt;
    this._featuredUntil = featuredUntil;
    this._hiddenAt = hiddenAt;
  }

  static create(
    categoryId: string,
    productId: string,
    productName: string,
    thumbnailUrl: string,
    displayOrder: number,
    featuredUntil?: Date,
  ): ProductDisplay {
    if (featuredUntil && featuredUntil <= new Date()) {
      throw new DomainError("기획전 종료일은 현재 시각 이후여야 한다");
    }
    return new ProductDisplay(
      new EntityId({ value: crypto.randomUUID() }),
      categoryId,
      productId,
      productName,
      thumbnailUrl,
      displayOrder,
      DisplayStatus.DISPLAYED,
      new Date(),
      featuredUntil,
    );
  }

  static reconstitute(params: {
    id: string;
    categoryId: string;
    productId: string;
    productName: string;
    thumbnailUrl: string;
    displayOrder: number;
    status: DisplayStatus;
    displayedAt: Date;
    featuredUntil?: Date;
    hiddenAt?: Date;
  }): ProductDisplay {
    return new ProductDisplay(
      new EntityId({ value: params.id }),
      params.categoryId,
      params.productId,
      params.productName,
      params.thumbnailUrl,
      params.displayOrder,
      params.status,
      params.displayedAt,
      params.featuredUntil,
      params.hiddenAt,
    );
  }

  hide(): void {
    if (this._status === DisplayStatus.HIDDEN) return;
    this._status = DisplayStatus.HIDDEN;
    this._hiddenAt = new Date();
  }

  setDisplayOrder(order: number): void {
    if (order <= 0) throw new DomainError("진열 순서는 1 이상이어야 한다");
    this._displayOrder = order;
  }

  // Update denormalized product info when product changes
  syncProductInfo(productName: string, thumbnailUrl: string): void {
    this._productName = productName;
    this._thumbnailUrl = thumbnailUrl;
  }

  get categoryId(): string { return this._categoryId; }
  get productId(): string { return this._productId; }
  get productName(): string { return this._productName; }
  get thumbnailUrl(): string { return this._thumbnailUrl; }
  get displayOrder(): number { return this._displayOrder; }
  get status(): DisplayStatus { return this._status; }
  get featuredUntil(): Date | undefined { return this._featuredUntil; }
  get displayedAt(): Date { return this._displayedAt; }
  get hiddenAt(): Date | undefined { return this._hiddenAt; }
  get isDisplayed(): boolean { return this._status === DisplayStatus.DISPLAYED; }

  get isFeatured(): boolean {
    return this._featuredUntil != null && this._featuredUntil > new Date();
  }
}
```

### 2.3 Catalog Domain Events

```typescript
// catalog/domain/event/catalog-events.ts

export class CategoryCreated extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly name: string,
    readonly slug: string,
    readonly depth: number,
    readonly parentId: string | null,
  ) { super(); }
}

export class CategoryRenamed extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly oldName: string,
    readonly newName: string,
  ) { super(); }
}

export class CategoryMoved extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly oldParentId: string | null,
    readonly newParentId: string | null,
  ) { super(); }
}

export class CategoryActivated extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
  ) { super(); }
}

export class CategoryDeactivated extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
  ) { super(); }
}

export class ProductDisplayed extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly productId: string,
    readonly displayOrder: number,
    readonly featuredUntil: Date | null,
  ) { super(); }
}

export class ProductHidden extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly productId: string,
  ) { super(); }
}

export class ProductDisplayInfoSynced extends DomainEvent {
  constructor(
    readonly aggregateId: string,       // categoryId
    readonly productId: string,
    readonly newProductName: string,
    readonly newThumbnailUrl: string,
  ) { super(); }
}
```

### 2.4 Catalog Repository Port

```typescript
// catalog/domain/repository/category-repository.ts

export interface CategoryRepository {
  findById(categoryId: CategoryId): Promise<Category | null>;
  findBySlug(slug: CategorySlug): Promise<Category | null>;
  findByParentId(parentId: CategoryId): Promise<Category[]>;
  findRoots(): Promise<Category[]>;  // depth === ROOT
  save(category: Category): Promise<void>;
  delete(categoryId: CategoryId): Promise<void>;
  nextId(): CategoryId;
}

export const CATEGORY_REPOSITORY = Symbol("CategoryRepository");
```

---

## 3. Shipping Context

배송 컨텍스트는 주문 완료 후 실물 배송 과정을 추적·관리한다.
외부 택배사 API는 ACL(Anti-Corruption Layer)을 통해 도메인 모델과 격리된다.

### 3.1 ShippingAddress Value Object

Order Context의 ShippingAddress와 동일한 개념이지만,
Shipping Context 내 자체 Value Object로 정의한다 (컨텍스트 독립성 유지).

```typescript
// shipping/domain/model/shipping-address.ts

interface ShippingAddressProps {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
  memo?: string;
}

export class ShippingAddress extends ValueObject<ShippingAddressProps> {
  protected validate(props: ShippingAddressProps): void {
    if (!props.recipientName?.trim()) {
      throw new DomainError("수령인 이름은 필수다");
    }
    if (!props.phone?.trim()) {
      throw new DomainError("전화번호는 필수다");
    }
    if (!props.zipCode?.trim()) {
      throw new DomainError("우편번호는 필수다");
    }
    if (!/^\d{5}$/.test(props.zipCode)) {
      throw new DomainError("우편번호는 5자리 숫자여야 한다");
    }
    if (!props.address1?.trim()) {
      throw new DomainError("주소는 필수다");
    }
  }

  static create(props: ShippingAddressProps): ShippingAddress {
    return new ShippingAddress(props);
  }

  get recipientName(): string { return this.props.recipientName; }
  get phone(): string { return this.props.phone; }
  get zipCode(): string { return this.props.zipCode; }
  get address1(): string { return this.props.address1; }
  get address2(): string { return this.props.address2; }
  get memo(): string | undefined { return this.props.memo; }

  get fullAddress(): string {
    return `[${this.zipCode}] ${this.address1} ${this.address2}`.trim();
  }
}
```

### 3.2 TrackingEvent Entity

택배사로부터 수신한 개별 배송 추적 이벤트를 나타낸다.
불변(immutable) 기록이므로 생성 후 수정하지 않는다.

```typescript
// shipping/domain/model/tracking-event.ts

export enum TrackingStatus {
  PICKUP_SCHEDULED  = "PICKUP_SCHEDULED",   // 집화 예정
  PICKED_UP         = "PICKED_UP",          // 집화 완료
  IN_TRANSIT        = "IN_TRANSIT",         // 간선 이동 중
  AT_DISTRIBUTION   = "AT_DISTRIBUTION",    // 배송 허브 도착
  OUT_FOR_DELIVERY  = "OUT_FOR_DELIVERY",   // 배달 출발
  DELIVERED         = "DELIVERED",          // 배달 완료
  FAILED_ATTEMPT    = "FAILED_ATTEMPT",     // 배달 시도 실패
  RETURNED          = "RETURNED",           // 반송
  EXCEPTION         = "EXCEPTION",          // 배송 예외 (분실 등)
}

export class TrackingEvent extends Entity<EntityId> {
  private readonly _status: TrackingStatus;
  private readonly _location: string;
  private readonly _description: string;
  private readonly _occurredAt: Date;
  private readonly _carrierEventCode?: string;  // 택배사 원본 코드 (보존)

  private constructor(
    id: EntityId,
    status: TrackingStatus,
    location: string,
    description: string,
    occurredAt: Date,
    carrierEventCode?: string,
  ) {
    super(id);
    this._status = status;
    this._location = location;
    this._description = description;
    this._occurredAt = occurredAt;
    this._carrierEventCode = carrierEventCode;
  }

  static create(
    status: TrackingStatus,
    location: string,
    description: string,
    occurredAt: Date,
    carrierEventCode?: string,
  ): TrackingEvent {
    return new TrackingEvent(
      new EntityId({ value: crypto.randomUUID() }),
      status,
      location,
      description,
      occurredAt,
      carrierEventCode,
    );
  }

  static reconstitute(params: {
    id: string;
    status: TrackingStatus;
    location: string;
    description: string;
    occurredAt: Date;
    carrierEventCode?: string;
  }): TrackingEvent {
    return new TrackingEvent(
      new EntityId({ value: params.id }),
      params.status,
      params.location,
      params.description,
      params.occurredAt,
      params.carrierEventCode,
    );
  }

  get status(): TrackingStatus { return this._status; }
  get location(): string { return this._location; }
  get description(): string { return this._description; }
  get occurredAt(): Date { return this._occurredAt; }
  get carrierEventCode(): string | undefined { return this._carrierEventCode; }
}
```

### 3.3 Shipment Aggregate

```typescript
// shipping/domain/model/shipment.ts

export class ShipmentId extends EntityId {
  static create(value?: string): ShipmentId {
    return new ShipmentId({ value: value ?? crypto.randomUUID() });
  }
}

export enum ShipmentStatus {
  READY             = "READY",             // 배송 준비 (운송장 미발행)
  DISPATCHED        = "DISPATCHED",        // 발송됨 (운송장 발행)
  IN_TRANSIT        = "IN_TRANSIT",        // 배송 중
  OUT_FOR_DELIVERY  = "OUT_FOR_DELIVERY",  // 배달 출발
  DELIVERED         = "DELIVERED",         // 배달 완료
  FAILED            = "FAILED",            // 배달 실패
  RETURNED          = "RETURNED",          // 반송 완료
}

export enum CarrierCode {
  CJ_LOGISTICS  = "CJ",       // CJ대한통운
  HANJIN        = "HANJIN",   // 한진택배
  LOTTE         = "LOTTE",    // 롯데택배
  POST_OFFICE   = "EPOST",    // 우체국택배
}

// Shipment state machine transitions
const SHIPMENT_STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.READY]:            [ShipmentStatus.DISPATCHED],
  [ShipmentStatus.DISPATCHED]:       [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
  [ShipmentStatus.IN_TRANSIT]:       [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED],
  [ShipmentStatus.DELIVERED]:        [],
  [ShipmentStatus.FAILED]:           [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURNED],
  [ShipmentStatus.RETURNED]:         [],
};

export class Shipment extends AggregateRoot<ShipmentId> {
  private _orderId: string;
  private _customerId: string;
  private _shippingAddress: ShippingAddress;
  private _carrierCode?: CarrierCode;
  private _trackingNumber?: string;
  private _status: ShipmentStatus;
  private _trackingEvents: TrackingEvent[];
  private _estimatedDeliveryAt?: Date;
  private _deliveredAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(params: {
    id: ShipmentId;
    orderId: string;
    customerId: string;
    shippingAddress: ShippingAddress;
    status: ShipmentStatus;
    createdAt: Date;
    updatedAt: Date;
    trackingEvents: TrackingEvent[];
    carrierCode?: CarrierCode;
    trackingNumber?: string;
    estimatedDeliveryAt?: Date;
    deliveredAt?: Date;
  }) {
    super(params.id);
    this._orderId = params.orderId;
    this._customerId = params.customerId;
    this._shippingAddress = params.shippingAddress;
    this._status = params.status;
    this._createdAt = params.createdAt;
    this._updatedAt = params.updatedAt;
    this._trackingEvents = params.trackingEvents;
    this._carrierCode = params.carrierCode;
    this._trackingNumber = params.trackingNumber;
    this._estimatedDeliveryAt = params.estimatedDeliveryAt;
    this._deliveredAt = params.deliveredAt;
  }

  // -- Factory: create shipment when order is paid --
  static create(
    id: ShipmentId,
    orderId: string,
    customerId: string,
    shippingAddress: ShippingAddress,
  ): Shipment {
    const now = new Date();
    const shipment = new Shipment({
      id,
      orderId,
      customerId,
      shippingAddress,
      status: ShipmentStatus.READY,
      createdAt: now,
      updatedAt: now,
      trackingEvents: [],
    });
    shipment.registerEvent(new ShipmentCreated(
      id.value,
      orderId,
      customerId,
    ));
    return shipment;
  }

  // -- Reconstitution --
  static reconstitute(params: {
    id: ShipmentId;
    orderId: string;
    customerId: string;
    shippingAddress: ShippingAddress;
    status: ShipmentStatus;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    trackingEvents: TrackingEvent[];
    carrierCode?: CarrierCode;
    trackingNumber?: string;
    estimatedDeliveryAt?: Date;
    deliveredAt?: Date;
  }): Shipment {
    const shipment = new Shipment(params);
    shipment.version = params.version;
    return shipment;
  }

  // -- Domain Behaviors --

  // Issue waybill (운송장 발행)
  dispatch(
    carrierCode: CarrierCode,
    trackingNumber: string,
    estimatedDeliveryAt?: Date,
  ): void {
    this.transitionTo(ShipmentStatus.DISPATCHED);
    this._carrierCode = carrierCode;
    this._trackingNumber = trackingNumber;
    this._estimatedDeliveryAt = estimatedDeliveryAt;

    this.registerEvent(new ShipmentDispatched(
      this.id.value,
      this._orderId,
      carrierCode,
      trackingNumber,
      estimatedDeliveryAt ?? null,
    ));
  }

  // Append tracking event received from carrier
  addTrackingEvent(
    status: TrackingStatus,
    location: string,
    description: string,
    occurredAt: Date,
    carrierEventCode?: string,
  ): void {
    // Prevent duplicate events (same status + occurredAt)
    const isDuplicate = this._trackingEvents.some(
      e => e.status === status && e.occurredAt.getTime() === occurredAt.getTime()
    );
    if (isDuplicate) return;

    const event = TrackingEvent.create(
      status, location, description, occurredAt, carrierEventCode,
    );
    this._trackingEvents.push(event);
    this._updatedAt = new Date();

    // Sync shipment status with tracking status
    this.syncStatusFromTracking(status);

    this.registerEvent(new TrackingUpdated(
      this.id.value,
      this._orderId,
      status,
      location,
      description,
      occurredAt,
    ));
  }

  // Mark as delivered
  markDelivered(deliveredAt: Date): void {
    this.transitionTo(ShipmentStatus.DELIVERED);
    this._deliveredAt = deliveredAt;

    this.registerEvent(new ShipmentDelivered(
      this.id.value,
      this._orderId,
      this._customerId,
      deliveredAt,
    ));
  }

  // Mark delivery failed
  markFailed(reason: string): void {
    this.transitionTo(ShipmentStatus.FAILED);

    this.registerEvent(new DeliveryFailed(
      this.id.value,
      this._orderId,
      this._customerId,
      reason,
    ));
  }

  // Mark as returned
  markReturned(): void {
    this.transitionTo(ShipmentStatus.RETURNED);
  }

  // -- Internal Helpers --

  private syncStatusFromTracking(trackingStatus: TrackingStatus): void {
    const statusMap: Partial<Record<TrackingStatus, ShipmentStatus>> = {
      [TrackingStatus.PICKED_UP]:        ShipmentStatus.IN_TRANSIT,
      [TrackingStatus.IN_TRANSIT]:       ShipmentStatus.IN_TRANSIT,
      [TrackingStatus.AT_DISTRIBUTION]:  ShipmentStatus.IN_TRANSIT,
      [TrackingStatus.OUT_FOR_DELIVERY]: ShipmentStatus.OUT_FOR_DELIVERY,
      [TrackingStatus.DELIVERED]:        ShipmentStatus.DELIVERED,
      [TrackingStatus.FAILED_ATTEMPT]:   ShipmentStatus.FAILED,
      [TrackingStatus.RETURNED]:         ShipmentStatus.RETURNED,
    };

    const nextStatus = statusMap[trackingStatus];
    if (!nextStatus) return;

    const allowed = SHIPMENT_STATUS_TRANSITIONS[this._status];
    if (allowed.includes(nextStatus)) {
      this._status = nextStatus;
      if (nextStatus === ShipmentStatus.DELIVERED) {
        this._deliveredAt = new Date();
        this.registerEvent(new ShipmentDelivered(
          this.id.value,
          this._orderId,
          this._customerId,
          this._deliveredAt,
        ));
      }
      if (nextStatus === ShipmentStatus.FAILED) {
        this.registerEvent(new DeliveryFailed(
          this.id.value,
          this._orderId,
          this._customerId,
          "배달 시도 실패",
        ));
      }
    }
  }

  private transitionTo(nextStatus: ShipmentStatus): void {
    const allowed = SHIPMENT_STATUS_TRANSITIONS[this._status];
    if (!allowed.includes(nextStatus)) {
      throw new DomainError(
        `배송 상태 전이 불가: ${this._status} -> ${nextStatus}`
      );
    }
    this._status = nextStatus;
    this._updatedAt = new Date();
  }

  // -- Getters --

  get orderId(): string { return this._orderId; }
  get customerId(): string { return this._customerId; }
  get shippingAddress(): ShippingAddress { return this._shippingAddress; }
  get carrierCode(): CarrierCode | undefined { return this._carrierCode; }
  get trackingNumber(): string | undefined { return this._trackingNumber; }
  get status(): ShipmentStatus { return this._status; }
  get estimatedDeliveryAt(): Date | undefined { return this._estimatedDeliveryAt; }
  get deliveredAt(): Date | undefined { return this._deliveredAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  get trackingEvents(): readonly TrackingEvent[] {
    // Ordered chronologically
    return [...this._trackingEvents].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
    );
  }

  get latestTrackingEvent(): TrackingEvent | undefined {
    return this.trackingEvents[this.trackingEvents.length - 1];
  }

  get isDelivered(): boolean { return this._status === ShipmentStatus.DELIVERED; }
  get isActive(): boolean {
    return ![ShipmentStatus.DELIVERED, ShipmentStatus.RETURNED].includes(this._status);
  }
}
```

### 3.4 Shipping Domain Events

```typescript
// shipping/domain/event/shipping-events.ts

export class ShipmentCreated extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
    readonly customerId: string,
  ) { super(); }
}

export class ShipmentDispatched extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
    readonly carrierCode: CarrierCode,
    readonly trackingNumber: string,
    readonly estimatedDeliveryAt: Date | null,
  ) { super(); }
}

export class TrackingUpdated extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
    readonly trackingStatus: TrackingStatus,
    readonly location: string,
    readonly description: string,
    readonly occurredAt: Date,
  ) { super(); }
}

export class ShipmentDelivered extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
    readonly customerId: string,
    readonly deliveredAt: Date,
  ) { super(); }
}

export class DeliveryFailed extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
    readonly customerId: string,
    readonly reason: string,
  ) { super(); }
}

export class ShipmentReturned extends DomainEvent {
  constructor(
    readonly aggregateId: string,         // shipmentId
    readonly orderId: string,
  ) { super(); }
}
```

### 3.5 CarrierAdapter ACL (Anti-Corruption Layer)

외부 택배사 API의 이벤트 코드와 응답 구조를 도메인 TrackingStatus로 변환한다.

```typescript
// shipping/infrastructure/carrier/carrier-adapter.ts

// -- 도메인 포트 (Port) --
export interface CarrierAdapter {
  getTrackingEvents(trackingNumber: string): Promise<CarrierTrackingResult>;
}

export interface CarrierTrackingResult {
  trackingNumber: string;
  carrierCode: CarrierCode;
  events: CarrierTrackingEventResult[];
}

export interface CarrierTrackingEventResult {
  status: TrackingStatus;             // 도메인 상태 (변환 완료)
  location: string;
  description: string;
  occurredAt: Date;
  carrierEventCode: string;           // 원본 코드 (보존)
}

// -- CJ대한통운 외부 응답 모델 --
interface CJTrackingResponse {
  resultCode: string;
  waybillInfo: {
    waybillNo: string;
    waybillSttList: Array<{
      sttNm: string;     // 상태명 (e.g. "배달완료")
      sttCd: string;     // 상태코드 (e.g. "91")
      rgsDttm: string;   // 등록일시 (e.g. "20260222143000")
      rgsBrnNm: string;  // 지점명
      rgsEmpNm: string;  // 담당자명
    }>;
  };
}

// -- CJ대한통운 Adapter 구현 --
export class CJLogisticsAdapter implements CarrierAdapter {
  private readonly BASE_URL = "https://www.cjlogistics.com/ko/tool/parcel/tracking";

  // CJ 상태코드 → 도메인 TrackingStatus 매핑
  private readonly STATUS_MAP: Record<string, TrackingStatus> = {
    "11": TrackingStatus.PICKED_UP,
    "12": TrackingStatus.PICKED_UP,
    "21": TrackingStatus.IN_TRANSIT,
    "41": TrackingStatus.AT_DISTRIBUTION,
    "82": TrackingStatus.OUT_FOR_DELIVERY,
    "91": TrackingStatus.DELIVERED,
    "92": TrackingStatus.FAILED_ATTEMPT,
    "D0": TrackingStatus.RETURNED,
  };

  constructor(private readonly apiKey: string) {}

  async getTrackingEvents(trackingNumber: string): Promise<CarrierTrackingResult> {
    const response = await this.callCJAPI<CJTrackingResponse>(trackingNumber);

    const events = (response.waybillInfo?.waybillSttList ?? []).map(stt => ({
      status: this.mapStatus(stt.sttCd),
      location: stt.rgsBrnNm,
      description: `${stt.sttNm} (${stt.rgsEmpNm})`,
      occurredAt: this.parseDateTime(stt.rgsDttm),
      carrierEventCode: stt.sttCd,
    }));

    return {
      trackingNumber,
      carrierCode: CarrierCode.CJ_LOGISTICS,
      events,
    };
  }

  private mapStatus(cjCode: string): TrackingStatus {
    return this.STATUS_MAP[cjCode] ?? TrackingStatus.IN_TRANSIT;
  }

  private parseDateTime(raw: string): Date {
    // "20260222143000" → Date
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    const h = raw.slice(8, 10);
    const mi = raw.slice(10, 12);
    const s = raw.slice(12, 14);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`);
  }

  private async callCJAPI<T>(trackingNumber: string): Promise<T> {
    const res = await fetch(`${this.BASE_URL}?wblNo=${trackingNumber}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new CarrierError(`CJ API 오류: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }
}

// -- 한진택배 외부 응답 모델 --
interface HanjinTrackingResponse {
  REQ_WAYBILL_NO: string;
  WAYBILL_LIST: Array<{
    SCAN_DTM: string;       // "20260222143000"
    SCAN_STATUS: string;    // "배달완료"
    SCAN_STATUS_CD: string; // "P068"
    BRANCH_NAME: string;
  }>;
}

// -- 한진택배 Adapter 구현 --
export class HanjinAdapter implements CarrierAdapter {
  private readonly STATUS_MAP: Record<string, TrackingStatus> = {
    "P060": TrackingStatus.PICKED_UP,
    "P040": TrackingStatus.IN_TRANSIT,
    "P058": TrackingStatus.OUT_FOR_DELIVERY,
    "P068": TrackingStatus.DELIVERED,
    "P063": TrackingStatus.FAILED_ATTEMPT,
  };

  constructor(private readonly apiKey: string) {}

  async getTrackingEvents(trackingNumber: string): Promise<CarrierTrackingResult> {
    const response = await this.callHanjinAPI<HanjinTrackingResponse>(trackingNumber);

    const events = (response.WAYBILL_LIST ?? []).map(item => ({
      status: this.mapStatus(item.SCAN_STATUS_CD),
      location: item.BRANCH_NAME,
      description: item.SCAN_STATUS,
      occurredAt: this.parseDateTime(item.SCAN_DTM),
      carrierEventCode: item.SCAN_STATUS_CD,
    }));

    return {
      trackingNumber,
      carrierCode: CarrierCode.HANJIN,
      events,
    };
  }

  private mapStatus(code: string): TrackingStatus {
    return this.STATUS_MAP[code] ?? TrackingStatus.IN_TRANSIT;
  }

  private parseDateTime(raw: string): Date {
    const y = raw.slice(0, 4);
    const mo = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    const h = raw.slice(8, 10);
    const mi = raw.slice(10, 12);
    const s = raw.slice(12, 14);
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`);
  }

  private async callHanjinAPI<T>(trackingNumber: string): Promise<T> {
    const res = await fetch(
      `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillSch.do?wbl_num=${trackingNumber}`,
      { headers: { "Authorization": `Bearer ${this.apiKey}` } },
    );
    if (!res.ok) throw new CarrierError(`한진 API 오류: ${res.status}`);
    return res.json() as Promise<T>;
  }
}

// -- Carrier Adapter Factory --
export class CarrierAdapterFactory {
  constructor(private readonly adapters: Map<CarrierCode, CarrierAdapter>) {}

  get(carrierCode: CarrierCode): CarrierAdapter {
    const adapter = this.adapters.get(carrierCode);
    if (!adapter) throw new Error(`지원하지 않는 택배사: ${carrierCode}`);
    return adapter;
  }
}

export class CarrierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CarrierError";
  }
}

export const CARRIER_ADAPTER_FACTORY = Symbol("CarrierAdapterFactory");
```

### 3.6 Shipment Repository Port

```typescript
// shipping/domain/repository/shipment-repository.ts

export interface ShipmentRepository {
  findById(shipmentId: ShipmentId): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
  findByTrackingNumber(trackingNumber: string): Promise<Shipment | null>;
  findActiveShipments(): Promise<Shipment[]>;   // for batch polling
  save(shipment: Shipment): Promise<void>;
  nextId(): ShipmentId;
}

export const SHIPMENT_REPOSITORY = Symbol("ShipmentRepository");
```

---

## 4. CQRS Commands & Queries

### 4.1 Catalog Commands & Queries

```typescript
// catalog/application/command/category-commands.ts

export interface CreateRootCategoryCommand {
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
  readonly imageUrl?: string;
  readonly description?: string;
}

export interface CreateChildCategoryCommand {
  readonly parentCategoryId: string;
  readonly name: string;
  readonly slug: string;
  readonly displayOrder: number;
  readonly imageUrl?: string;
  readonly description?: string;
}

export interface DisplayProductCommand {
  readonly categoryId: string;
  readonly productId: string;
  readonly productName: string;
  readonly thumbnailUrl: string;
  readonly displayOrder: number;
  readonly featuredUntil?: Date;
}

export interface HideProductCommand {
  readonly categoryId: string;
  readonly productId: string;
}

export interface ReorderProductsCommand {
  readonly categoryId: string;
  readonly orderedProductIds: string[];
}

// -- Queries --

export interface GetCategoryTreeQuery {
  readonly rootSlug?: string;   // null = 전체 트리
}

export interface GetCategoryProductsQuery {
  readonly categoryId: string;
  readonly includeSubcategories: boolean;
  readonly page: number;
  readonly size: number;
  readonly featuredOnly?: boolean;
}

// -- DTOs --

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  depth: number;
  parentId: string | null;
  status: CategoryStatus;
  displayOrder: number;
  imageUrl?: string;
  description?: string;
  children?: CategoryDTO[];       // nested for tree query
  productCount?: number;
}

export interface ProductDisplayDTO {
  id: string;
  categoryId: string;
  productId: string;
  productName: string;
  thumbnailUrl: string;
  displayOrder: number;
  isDisplayed: boolean;
  isFeatured: boolean;
  featuredUntil?: Date;
  displayedAt: Date;
}
```

### 4.2 Shipping Commands & Queries

```typescript
// shipping/application/command/shipment-commands.ts

export interface CreateShipmentCommand {
  readonly orderId: string;
  readonly customerId: string;
  readonly shippingAddress: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2: string;
    memo?: string;
  };
}

export interface DispatchShipmentCommand {
  readonly shipmentId: string;
  readonly carrierCode: CarrierCode;
  readonly trackingNumber: string;
  readonly estimatedDeliveryAt?: Date;
}

export interface SyncTrackingCommand {
  readonly shipmentId: string;  // batch polling trigger
}

// -- Queries --

export interface GetShipmentQuery {
  readonly shipmentId: string;
  readonly customerId: string;  // authorization
}

export interface GetShipmentByOrderQuery {
  readonly orderId: string;
  readonly customerId: string;
}

// -- DTOs --

export interface ShipmentDTO {
  id: string;
  orderId: string;
  customerId: string;
  status: ShipmentStatus;
  carrierCode?: CarrierCode;
  trackingNumber?: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2: string;
    memo?: string;
  };
  estimatedDeliveryAt?: Date;
  deliveredAt?: Date;
  trackingEvents: TrackingEventDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackingEventDTO {
  id: string;
  status: TrackingStatus;
  location: string;
  description: string;
  occurredAt: Date;
}
```

### 4.3 Tracking Sync Application Service

배송 추적은 주기적으로 택배사 API를 폴링하거나 택배사 Webhook을 수신하여 갱신한다.

```typescript
// shipping/application/service/tracking-sync.service.ts

@injectable()
export class TrackingSyncService {
  constructor(
    @inject(SHIPMENT_REPOSITORY)      private readonly shipmentRepo: ShipmentRepository,
    @inject(CARRIER_ADAPTER_FACTORY)  private readonly carrierFactory: CarrierAdapterFactory,
    @inject(EVENT_PUBLISHER)          private readonly eventPublisher: EventPublisher,
  ) {}

  // Called by cron job or webhook handler
  async syncShipment(shipmentId: string): Promise<void> {
    const shipment = await this.shipmentRepo.findById(ShipmentId.create(shipmentId));
    if (!shipment || !shipment.trackingNumber || !shipment.carrierCode) return;
    if (!shipment.isActive) return;  // skip delivered/returned

    const adapter = this.carrierFactory.get(shipment.carrierCode);
    const result = await adapter.getTrackingEvents(shipment.trackingNumber);

    for (const event of result.events) {
      shipment.addTrackingEvent(
        event.status,
        event.location,
        event.description,
        event.occurredAt,
        event.carrierEventCode,
      );
    }

    await this.shipmentRepo.save(shipment);

    for (const event of shipment.collectEvents()) {
      await this.eventPublisher.publish(event);
    }
  }

  // Webhook: single event push from carrier
  async handleWebhookEvent(
    carrierCode: CarrierCode,
    trackingNumber: string,
    rawEventCode: string,
    location: string,
    description: string,
    occurredAt: Date,
  ): Promise<void> {
    const shipment = await this.shipmentRepo.findByTrackingNumber(trackingNumber);
    if (!shipment) return;

    const adapter = this.carrierFactory.get(carrierCode);
    const result = await adapter.getTrackingEvents(trackingNumber);
    const matched = result.events.find(e => e.carrierEventCode === rawEventCode);
    if (!matched) return;

    shipment.addTrackingEvent(
      matched.status,
      location,
      description,
      occurredAt,
      rawEventCode,
    );

    await this.shipmentRepo.save(shipment);

    for (const event of shipment.collectEvents()) {
      await this.eventPublisher.publish(event);
    }
  }
}
```

---

## 5. Domain Events 전체 목록

### Catalog Context Events

| 이벤트 | 발행자 | 구독자 | 설명 |
|--------|--------|--------|------|
| `CategoryCreated` | Category | - | 카테고리 생성됨 |
| `CategoryRenamed` | Category | - | 카테고리명 변경됨 |
| `CategoryMoved` | Category | - | 카테고리 부모 변경됨 |
| `CategoryActivated` | Category | - | 카테고리 활성화됨 |
| `CategoryDeactivated` | Category | - | 카테고리 비활성화됨 |
| `ProductDisplayed` | Category | Search(색인) | 상품 진열 시작됨 |
| `ProductHidden` | Category | Search(색인) | 상품 진열 숨김 처리됨 |
| `ProductDisplayInfoSynced` | Category | - | 진열 상품 정보 동기화됨 |

### Shipping Context Events

| 이벤트 | 발행자 | 구독자 | 설명 |
|--------|--------|--------|------|
| `ShipmentCreated` | Shipment | - | 배송 생성됨 |
| `ShipmentDispatched` | Shipment | Order(ship 호출), Notification | 운송장 발행됨 |
| `TrackingUpdated` | Shipment | Notification | 배송 추적 정보 갱신됨 |
| `ShipmentDelivered` | Shipment | Order(deliver 호출), Notification | 배달 완료됨 |
| `DeliveryFailed` | Shipment | Notification | 배달 시도 실패됨 |
| `ShipmentReturned` | Shipment | Order, Notification | 반송 완료됨 |

### 컨텍스트 간 이벤트 흐름

```
Order Context          Shipping Context          Order Context
     │                        │                        │
     │── OrderPaid ──────────►│                        │
     │                        │ ShipmentCreated        │
     │                        │ (internal)             │
     │                        │                        │
     │                  [운송장 발행]                   │
     │                        │                        │
     │                        │── ShipmentDispatched ─►│
     │                        │                    Order.ship(trackingNumber)
     │                        │                        │
     │                  [배송 추적 폴링]                │
     │                        │                        │
     │                        │── ShipmentDelivered ──►│
     │                        │                    Order.deliver()
     │                        │                        │
```

---

## 6. 디렉토리 구조

```text
src/
├── shared/
│   └── domain/
│       ├── value-object.ts
│       ├── entity.ts
│       ├── aggregate-root.ts
│       ├── domain-event.ts
│       └── errors.ts
│
├── catalog/
│   ├── domain/
│   │   ├── model/
│   │   │   ├── category.ts          # Category Aggregate (3-level hierarchy)
│   │   │   └── product-display.ts   # ProductDisplay Entity
│   │   ├── event/
│   │   │   └── catalog-events.ts    # CategoryCreated, ProductDisplayed, ...
│   │   └── repository/
│   │       └── category-repository.ts  # CategoryRepository port
│   │
│   ├── application/
│   │   ├── command/
│   │   │   ├── category-commands.ts      # Commands + Handlers
│   │   │   └── product-display-commands.ts
│   │   └── query/
│   │       └── category-queries.ts       # Queries + Handlers + DTOs
│   │
│   └── infrastructure/
│       └── persistence/
│           └── typeorm/
│               ├── category.orm-entity.ts
│               ├── product-display.orm-entity.ts
│               └── typeorm-category-repository.ts
│
└── shipping/
    ├── domain/
    │   ├── model/
    │   │   ├── shipment.ts          # Shipment Aggregate
    │   │   ├── tracking-event.ts    # TrackingEvent Entity
    │   │   └── shipping-address.ts  # ShippingAddress Value Object
    │   ├── event/
    │   │   └── shipping-events.ts   # ShipmentCreated, ShipmentDelivered, ...
    │   └── repository/
    │       └── shipment-repository.ts  # ShipmentRepository port
    │
    ├── application/
    │   ├── command/
    │   │   └── shipment-commands.ts     # Commands + Handlers
    │   ├── query/
    │   │   └── shipment-queries.ts      # Queries + Handlers + DTOs
    │   └── service/
    │       └── tracking-sync.service.ts # Batch polling + Webhook handler
    │
    └── infrastructure/
        ├── persistence/
        │   └── typeorm/
        │       ├── shipment.orm-entity.ts
        │       ├── tracking-event.orm-entity.ts
        │       └── typeorm-shipment-repository.ts
        └── carrier/
            ├── carrier-adapter.ts           # Port + CarrierAdapterFactory
            ├── cj-logistics.adapter.ts      # CJ대한통운 ACL
            └── hanjin.adapter.ts            # 한진택배 ACL
```

---

## 7. 설계 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| Category 단위 Aggregate | 카테고리 하나 = 하나의 Aggregate | 전체 트리를 하나로 묶으면 동시성 충돌, 성능 저하 |
| ProductDisplay 비정규화 | productName, thumbnailUrl 복사 저장 | 카탈로그 조회 시 Product Context 조회 없이 빠른 응답 |
| ShippingAddress 컨텍스트별 독립 정의 | Shipping 전용 VO 별도 선언 | 컨텍스트 간 공유 커널 없이 독립 배포 가능 |
| TrackingEvent 불변 | 생성 후 수정 불가 | 배송 이력은 감사 기록(audit log)이므로 불변 유지 |
| 중복 추적 이벤트 방지 | status + occurredAt 기준 dedup | 폴링 방식이라 동일 이벤트 중복 수신 가능 |
| CarrierAdapter Factory | Map 기반 팩토리 | 택배사 추가 시 Factory 등록만으로 확장 가능 |
| Tracking 동기화 | 폴링(Cron) + Webhook 병행 | 일부 택배사는 Webhook 미지원, 폴링으로 보완 |
| 카테고리 최대 3단계 | `CategoryDepth.LEAF = 3` 강제 | 한국 쇼핑몰 관행, 4단계 이상은 UX 저하 |

---

**Document version**: 1.0
**Context**: Catalog + Shipping
**Related documents**:
- `domain-model-user-product.design.md` - User, Product Context
- `domain-model-order-payment-inventory.design.md` - Order, Payment, Inventory Context
