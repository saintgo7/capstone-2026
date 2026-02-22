# DDD Domain Model Design: User + Product Bounded Contexts

**Date**: 2026-02-22
**Author**: Domain Designer
**Project**: abada 쇼핑몰 (shop.abada.kr)
**Architecture**: DDD + CQRS + Hexagonal (TypeScript)

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Bounded Contexts                          │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────────────────┐  │
│  │   User Context   │         │      Product Context         │  │
│  │                  │         │                              │  │
│  │  Member (AR)     │         │  Product (AR)                │  │
│  │  Address (E)     │         │  ProductOption (E)           │  │
│  │  UserPoint (VO)  │         │  ProductOptionValue (E)      │  │
│  │                  │         │  ProductImage (E)            │  │
│  │  Domain Events:  │         │  Money (VO)                  │  │
│  │  - Registered    │         │                              │  │
│  │  - GradeUpgraded │ ──────► │  Domain Events:              │  │
│  │  - PointEarned   │         │  - ProductCreated            │  │
│  │  - PointUsed     │         │  - ProductActivated          │  │
│  └──────────────────┘         │  - ProductOptionAdded        │  │
│                               └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

AR = Aggregate Root, E = Entity, VO = Value Object
```

---

## 1. Shared Kernel (공유 커널)

양 Bounded Context에서 공통으로 사용하는 기반 타입들입니다.

```typescript
// src/shared/domain/value-object.ts
export abstract class ValueObject<T extends Record<string, unknown>> {
  protected readonly props: Readonly<T>;
  protected constructor(props: T) { ... }
  protected abstract validate(props: T): void;
  equals(other: ValueObject<T>): boolean { ... }
}

// src/shared/domain/entity.ts
export abstract class Entity<TId extends EntityId> {
  readonly id: TId;
  protected constructor(id: TId) { ... }
  equals(other: Entity<TId>): boolean { ... }
}

// src/shared/domain/aggregate-root.ts
export abstract class AggregateRoot<TId extends EntityId> extends Entity<TId> {
  private _domainEvents: DomainEvent[];
  private _version: number;

  protected registerEvent(event: DomainEvent): void;
  collectEvents(): DomainEvent[];
}

// src/shared/domain/domain-event.ts
export abstract class DomainEvent {
  readonly eventId: string;        // UUID
  readonly occurredAt: Date;
  abstract readonly aggregateId: string;
}

// src/shared/domain/errors.ts
export class DomainError extends Error { ... }
export class ApplicationError extends Error { ... }
export class NotFoundError extends ApplicationError { ... }
```

---

## 2. User Bounded Context

### 2.1 파일 구조

```
src/user/
├── domain/
│   ├── model/
│   │   ├── member.ts               # Member Aggregate Root
│   │   ├── address.ts              # Address Entity
│   │   ├── member-grade.ts         # MemberGrade Enum
│   │   └── member-status.ts        # MemberStatus Enum
│   ├── value-object/
│   │   ├── member-id.ts            # MemberId
│   │   ├── email.ts                # Email Value Object
│   │   ├── user-point.ts           # UserPoint Value Object
│   │   └── address-id.ts           # AddressId
│   ├── event/
│   │   └── member-events.ts        # Domain Events
│   ├── repository/
│   │   └── member-repository.ts    # Repository Port (Interface)
│   └── error/
│       └── user-domain-error.ts
├── application/
│   ├── command/
│   │   └── member-commands.ts      # CreateMemberCommand, LoginCommand
│   ├── query/
│   │   └── member-queries.ts       # GetMemberQuery
│   ├── dto/
│   │   └── member-dto.ts
│   └── service/
│       └── member-application-service.ts
├── infrastructure/
│   └── persistence/
│       └── typeorm/
│           ├── member.entity.ts
│           └── typeorm-member-repository.ts
└── interface/
    └── api/
        ├── member-controller.ts
        ├── request.ts
        └── response.ts
```

### 2.2 Enum Definitions

```typescript
// src/user/domain/model/member-grade.ts
export enum MemberGrade {
  NORMAL = "NORMAL",
  VIP    = "VIP",
  VVIP   = "VVIP",
}

// Grade 승급 조건 (도메인 규칙)
// NORMAL -> VIP  : 누적 구매금액 300,000원 이상
// VIP    -> VVIP : 누적 구매금액 1,000,000원 이상

// src/user/domain/model/member-status.ts
export enum MemberStatus {
  ACTIVE    = "ACTIVE",
  INACTIVE  = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  WITHDRAWN = "WITHDRAWN",
}
```

### 2.3 Value Objects

```typescript
// src/user/domain/value-object/member-id.ts
export class MemberId extends EntityId {
  static create(value?: string): MemberId {
    return new MemberId({ value: value ?? crypto.randomUUID() });
  }
}

// src/user/domain/value-object/email.ts
interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  protected validate(props: EmailProps): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.value)) {
      throw new DomainError(`유효하지 않은 이메일 형식: ${props.value}`);
    }
  }

  static create(value: string): Email;
  get value(): string;
}

// src/user/domain/value-object/user-point.ts
interface UserPointProps {
  amount: number;  // 정수, 1포인트 = 1원
}

export class UserPoint extends ValueObject<UserPointProps> {
  protected validate(props: UserPointProps): void {
    if (!Number.isInteger(props.amount) || props.amount < 0) {
      throw new DomainError(`포인트는 0 이상의 정수여야 합니다: ${props.amount}`);
    }
  }

  static create(amount: number): UserPoint;
  static zero(): UserPoint;

  get amount(): number;

  add(points: number): UserPoint;
  subtract(points: number): UserPoint;         // 잔액 부족 시 DomainError
  canAfford(points: number): boolean;
}
```

### 2.4 Address Entity

```typescript
// src/user/domain/model/address.ts
interface AddressProps {
  id: AddressId;
  memberId: MemberId;
  zipCode: string;       // 5자리 우편번호
  street: string;        // 도로명 주소
  detail: string;        // 상세 주소
  isDefault: boolean;
}

export class Address extends Entity<AddressId> {
  private _memberId: MemberId;
  private _zipCode: string;
  private _street: string;
  private _detail: string;
  private _isDefault: boolean;

  private constructor(props: AddressProps) { ... }

  static create(props: Omit<AddressProps, 'id'>): Address;
  static reconstitute(props: AddressProps): Address;

  // Getters
  get memberId(): MemberId;
  get zipCode(): string;
  get street(): string;
  get detail(): string;
  get isDefault(): boolean;

  // Behaviors
  setAsDefault(): void;
  unsetDefault(): void;
  update(zipCode: string, street: string, detail: string): void;

  // Formatted output
  getFullAddress(): string;  // "{street} {detail}"
}
```

### 2.5 Member Aggregate Root

```typescript
// src/user/domain/model/member.ts
interface MemberProps {
  id: MemberId;
  email: Email;
  passwordHash: string;
  grade: MemberGrade;
  point: UserPoint;
  status: MemberStatus;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export class Member extends AggregateRoot<MemberId> {
  private _email: Email;
  private _passwordHash: string;
  private _grade: MemberGrade;
  private _point: UserPoint;
  private _status: MemberStatus;
  private _addresses: Address[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: MemberProps) { super(props.id); ... }

  // -- Factory Methods --

  /**
   * 신규 회원 등록 (MemberRegistered 이벤트 발행)
   */
  static register(
    id: MemberId,
    email: Email,
    passwordHash: string,
  ): Member;

  /**
   * 영속성에서 재구성 (이벤트 발행 없음)
   */
  static reconstitute(props: MemberProps & { version: number }): Member;

  // -- Getters --

  get email(): Email;
  get passwordHash(): string;
  get grade(): MemberGrade;
  get point(): UserPoint;
  get status(): MemberStatus;
  get addresses(): readonly Address[];
  get createdAt(): Date;
  get updatedAt(): Date;
  get defaultAddress(): Address | undefined;

  // -- Domain Behaviors --

  /**
   * 비밀번호 검증 (암호화된 비밀번호 비교는 Application Layer에서 수행)
   */
  verifyPassword(rawPassword: string, compareFunc: (raw: string, hash: string) => boolean): boolean;

  /**
   * 포인트 적립 (PointEarned 이벤트 발행)
   * @param amount 적립 포인트 (양수)
   * @param reason 적립 사유
   */
  earnPoint(amount: number, reason: string): void;

  /**
   * 포인트 사용 (PointUsed 이벤트 발행)
   * @param amount 사용 포인트 (양수)
   * @param reason 사용 사유
   * @throws DomainError - 잔액 부족 시
   */
  usePoint(amount: number, reason: string): void;

  /**
   * 등급 업그레이드 (MemberGradeUpgraded 이벤트 발행)
   * @param newGrade 새 등급 (현재 등급보다 높아야 함)
   */
  upgradeGrade(newGrade: MemberGrade): void;

  /**
   * 주소 추가 (최대 5개 제한)
   */
  addAddress(address: Address): void;

  /**
   * 주소 삭제
   */
  removeAddress(addressId: AddressId): void;

  /**
   * 기본 배송지 변경
   */
  setDefaultAddress(addressId: AddressId): void;

  /**
   * 회원 탈퇴 (WITHDRAWN 상태로 변경)
   */
  withdraw(): void;

  /**
   * 계정 정지
   */
  suspend(reason: string): void;

  // -- Invariant Helpers --

  private assertActive(): void;  // ACTIVE 상태가 아니면 DomainError
  private assertGradeUpgradable(newGrade: MemberGrade): void;
}
```

### 2.6 Domain Events (User Context)

```typescript
// src/user/domain/event/member-events.ts

/**
 * 회원 가입 완료 시 발행
 * -> 웰컴 이메일 발송 트리거
 */
export class MemberRegistered extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // memberId
    readonly email: string,
    readonly grade: MemberGrade,
  ) { super(); }
}

/**
 * 회원 등급 변경 시 발행
 * -> 등급 변경 알림, 혜택 적용 트리거
 */
export class MemberGradeUpgraded extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // memberId
    readonly previousGrade: MemberGrade,
    readonly newGrade: MemberGrade,
  ) { super(); }
}

/**
 * 포인트 적립 시 발행
 * -> 포인트 내역 기록 트리거
 */
export class PointEarned extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // memberId
    readonly amount: number,
    readonly totalPoint: number,
    readonly reason: string,
  ) { super(); }
}

/**
 * 포인트 사용 시 발행
 * -> 포인트 내역 기록 트리거
 */
export class PointUsed extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // memberId
    readonly amount: number,
    readonly remainingPoint: number,
    readonly reason: string,
  ) { super(); }
}
```

### 2.7 Repository Interface (User Context)

```typescript
// src/user/domain/repository/member-repository.ts

export interface MemberRepository {
  findById(memberId: MemberId): Promise<Member | null>;
  findByEmail(email: Email): Promise<Member | null>;
  existsByEmail(email: Email): Promise<boolean>;
  save(member: Member): Promise<void>;
  delete(member: Member): Promise<void>;
  nextId(): MemberId;
}

// DI Symbol
export const MEMBER_REPOSITORY = Symbol("MemberRepository");
```

### 2.8 CQRS - Commands & Queries (User Context)

```typescript
// src/user/application/command/member-commands.ts

/** 회원 가입 */
export interface CreateMemberCommand {
  readonly email: string;
  readonly password: string;        // raw password (Application Layer에서 해시 처리)
}

/** 로그인 */
export interface LoginCommand {
  readonly email: string;
  readonly password: string;        // raw password
}

/** 포인트 적립 */
export interface EarnPointCommand {
  readonly memberId: string;
  readonly amount: number;
  readonly reason: string;
}

/** 포인트 사용 */
export interface UsePointCommand {
  readonly memberId: string;
  readonly amount: number;
  readonly reason: string;
}

/** 주소 추가 */
export interface AddAddressCommand {
  readonly memberId: string;
  readonly zipCode: string;
  readonly street: string;
  readonly detail: string;
  readonly isDefault: boolean;
}

/** 등급 업그레이드 */
export interface UpgradeGradeCommand {
  readonly memberId: string;
  readonly newGrade: MemberGrade;
}
```

```typescript
// src/user/application/query/member-queries.ts

/** 회원 단건 조회 */
export interface GetMemberQuery {
  readonly memberId: string;
}

/** 회원 목록 조회 (관리자용) */
export interface GetMembersQuery {
  readonly page: number;
  readonly limit: number;
  readonly grade?: MemberGrade;
  readonly status?: MemberStatus;
  readonly searchEmail?: string;
}

/** 회원 포인트 내역 조회 */
export interface GetPointHistoryQuery {
  readonly memberId: string;
  readonly page: number;
  readonly limit: number;
}
```

```typescript
// src/user/application/dto/member-dto.ts

export interface MemberDTO {
  id: string;
  email: string;
  grade: MemberGrade;
  pointAmount: number;
  status: MemberStatus;
  addressCount: number;
  createdAt: string;   // ISO 8601
}

export interface MemberDetailDTO extends MemberDTO {
  addresses: AddressDTO[];
}

export interface AddressDTO {
  id: string;
  zipCode: string;
  street: string;
  detail: string;
  isDefault: boolean;
  fullAddress: string;
}

export interface LoginResultDTO {
  accessToken: string;
  refreshToken: string;
  member: MemberDTO;
}
```

---

## 3. Product Bounded Context

### 3.1 파일 구조

```
src/product/
├── domain/
│   ├── model/
│   │   ├── product.ts              # Product Aggregate Root
│   │   ├── product-option.ts       # ProductOption Entity
│   │   ├── product-option-value.ts # ProductOptionValue Entity
│   │   ├── product-image.ts        # ProductImage Entity
│   │   └── product-status.ts       # ProductStatus Enum
│   ├── value-object/
│   │   ├── product-id.ts           # ProductId
│   │   ├── product-option-id.ts    # ProductOptionId
│   │   ├── product-option-value-id.ts
│   │   ├── product-image-id.ts     # ProductImageId
│   │   └── money.ts                # Money Value Object
│   ├── event/
│   │   └── product-events.ts       # Domain Events
│   ├── repository/
│   │   └── product-repository.ts   # Repository Port (Interface)
│   └── error/
│       └── product-domain-error.ts
├── application/
│   ├── command/
│   │   └── product-commands.ts     # CreateProductCommand, AddOptionCommand
│   ├── query/
│   │   └── product-queries.ts      # GetProductQuery, SearchProductsQuery
│   ├── dto/
│   │   └── product-dto.ts
│   └── service/
│       └── product-application-service.ts
├── infrastructure/
│   └── persistence/
│       └── typeorm/
│           ├── product.entity.ts
│           └── typeorm-product-repository.ts
└── interface/
    └── api/
        ├── product-controller.ts
        ├── request.ts
        └── response.ts
```

### 3.2 Enum Definitions

```typescript
// src/product/domain/model/product-status.ts
export enum ProductStatus {
  DRAFT    = "DRAFT",     // 임시저장 (비공개)
  ACTIVE   = "ACTIVE",    // 판매중
  INACTIVE = "INACTIVE",  // 판매중지
  DELETED  = "DELETED",   // 삭제됨 (Soft Delete)
}
```

### 3.3 Money Value Object (Product Context)

```typescript
// src/product/domain/value-object/money.ts
interface MoneyProps {
  amount: number;    // 정수 (원 단위), 소수점 없음
  currency: string;  // ISO 4217 ("KRW", "USD")
}

export class Money extends ValueObject<MoneyProps> {
  protected validate(props: MoneyProps): void {
    if (!Number.isInteger(props.amount) || props.amount < 0) {
      throw new DomainError(`금액은 0 이상의 정수여야 합니다: ${props.amount}`);
    }
    if (!["KRW", "USD"].includes(props.currency)) {
      throw new DomainError(`지원하지 않는 통화: ${props.currency}`);
    }
  }

  static create(amount: number, currency: string = "KRW"): Money;
  static zero(currency: string = "KRW"): Money;

  get amount(): number;
  get currency(): string;

  add(other: Money): Money;
  subtract(other: Money): Money;      // 음수 방지
  multiply(factor: number): Money;   // factor >= 0
  isGreaterThan(other: Money): boolean;
  isZero(): boolean;

  // 포맷팅
  format(): string;  // "10,000원" 또는 "$10.00"
}
```

### 3.4 ProductOptionValue Entity

```typescript
// src/product/domain/model/product-option-value.ts
interface ProductOptionValueProps {
  id: ProductOptionValueId;
  optionId: ProductOptionId;
  value: string;             // 예: "빨강", "XL", "500ml"
  additionalPrice: Money;    // 추가 금액 (0원 가능)
  stockQuantity: number;     // 재고 수량
  sortOrder: number;         // 정렬 순서
}

export class ProductOptionValue extends Entity<ProductOptionValueId> {
  private _optionId: ProductOptionId;
  private _value: string;
  private _additionalPrice: Money;
  private _stockQuantity: number;
  private _sortOrder: number;

  private constructor(props: ProductOptionValueProps) { ... }

  static create(props: Omit<ProductOptionValueProps, 'id'>): ProductOptionValue;
  static reconstitute(props: ProductOptionValueProps): ProductOptionValue;

  // Getters
  get optionId(): ProductOptionId;
  get value(): string;
  get additionalPrice(): Money;
  get stockQuantity(): number;
  get sortOrder(): number;
  get isInStock(): boolean;  // stockQuantity > 0

  // Behaviors
  updateAdditionalPrice(price: Money): void;
  reduceStock(quantity: number): void;    // 재고 부족 시 DomainError
  increaseStock(quantity: number): void;
  updateSortOrder(order: number): void;
}
```

### 3.5 ProductOption Entity

```typescript
// src/product/domain/model/product-option.ts
interface ProductOptionProps {
  id: ProductOptionId;
  productId: ProductId;
  name: string;          // 예: "색상", "사이즈", "용량"
  values: ProductOptionValue[];
  sortOrder: number;
}

export class ProductOption extends Entity<ProductOptionId> {
  private _productId: ProductId;
  private _name: string;
  private _values: ProductOptionValue[];
  private _sortOrder: number;

  private constructor(props: ProductOptionProps) { ... }

  static create(props: Omit<ProductOptionProps, 'id' | 'values'>): ProductOption;
  static reconstitute(props: ProductOptionProps): ProductOption;

  // Getters
  get productId(): ProductId;
  get name(): string;
  get values(): readonly ProductOptionValue[];
  get sortOrder(): number;

  // Behaviors
  addValue(value: string, additionalPrice: Money): ProductOptionValue;
  removeValue(valueId: ProductOptionValueId): void;
  updateName(name: string): void;
  updateSortOrder(order: number): void;

  // Query Helpers
  findValue(valueId: ProductOptionValueId): ProductOptionValue | undefined;
  hasStock(): boolean;  // 하나라도 재고 있으면 true
}
```

### 3.6 ProductImage Entity

```typescript
// src/product/domain/model/product-image.ts
interface ProductImageProps {
  id: ProductImageId;
  productId: ProductId;
  url: string;
  sortOrder: number;
  isThumbnail: boolean;
  altText: string;
}

export class ProductImage extends Entity<ProductImageId> {
  private _productId: ProductId;
  private _url: string;
  private _sortOrder: number;
  private _isThumbnail: boolean;
  private _altText: string;

  private constructor(props: ProductImageProps) { ... }

  static create(props: Omit<ProductImageProps, 'id'>): ProductImage;
  static reconstitute(props: ProductImageProps): ProductImage;

  // Getters
  get productId(): ProductId;
  get url(): string;
  get sortOrder(): number;
  get isThumbnail(): boolean;
  get altText(): string;

  // Behaviors
  setAsThumbnail(): void;
  unsetThumbnail(): void;
  updateSortOrder(order: number): void;
}
```

### 3.7 Product Aggregate Root

```typescript
// src/product/domain/model/product.ts
interface ProductProps {
  id: ProductId;
  name: string;
  description: string;
  basePrice: Money;
  status: ProductStatus;
  options: ProductOption[];
  images: ProductImage[];
  categoryId: string;      // Category Context 참조 (ID만 보관)
  sellerId: string;        // User Context 참조 (ID만 보관)
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot<ProductId> {
  private _name: string;
  private _description: string;
  private _basePrice: Money;
  private _status: ProductStatus;
  private _options: ProductOption[];
  private _images: ProductImage[];
  private _categoryId: string;
  private _sellerId: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ProductProps) { super(props.id); ... }

  // -- Factory Methods --

  /**
   * 신규 상품 생성 (DRAFT 상태로 시작, ProductCreated 이벤트 발행)
   */
  static create(
    id: ProductId,
    name: string,
    description: string,
    basePrice: Money,
    categoryId: string,
    sellerId: string,
  ): Product;

  /**
   * 영속성에서 재구성 (이벤트 발행 없음)
   */
  static reconstitute(props: ProductProps & { version: number }): Product;

  // -- Getters --

  get name(): string;
  get description(): string;
  get basePrice(): Money;
  get status(): ProductStatus;
  get options(): readonly ProductOption[];
  get images(): readonly ProductImage[];
  get categoryId(): string;
  get sellerId(): string;
  get createdAt(): Date;
  get updatedAt(): Date;
  get thumbnailImage(): ProductImage | undefined;
  get isAvailableForSale(): boolean;  // ACTIVE 상태인지

  // -- Domain Behaviors --

  /**
   * 상품 활성화 (DRAFT/INACTIVE -> ACTIVE, ProductActivated 이벤트 발행)
   * 최소 1개 옵션, 1개 이미지 필요
   */
  activate(): void;

  /**
   * 상품 비활성화 (ACTIVE -> INACTIVE)
   */
  deactivate(): void;

  /**
   * 상품 정보 수정 (DRAFT 또는 INACTIVE 상태에서만 가능)
   */
  updateInfo(name: string, description: string): void;

  /**
   * 기본 가격 수정
   */
  updateBasePrice(price: Money): void;

  /**
   * 옵션 추가 (ProductOptionAdded 이벤트 발행)
   * 최대 3개 옵션 제한
   */
  addOption(name: string): ProductOption;

  /**
   * 옵션 삭제
   */
  removeOption(optionId: ProductOptionId): void;

  /**
   * 이미지 추가 (최대 10개 제한)
   */
  addImage(url: string, altText: string, isThumbnail: boolean): ProductImage;

  /**
   * 이미지 삭제
   */
  removeImage(imageId: ProductImageId): void;

  /**
   * 썸네일 이미지 변경
   */
  setThumbnail(imageId: ProductImageId): void;

  /**
   * 재고 감소 (주문 시 호출)
   */
  reduceOptionStock(optionValueId: ProductOptionValueId, quantity: number): void;

  /**
   * 재고 증가 (주문 취소 시 호출)
   */
  increaseOptionStock(optionValueId: ProductOptionValueId, quantity: number): void;

  // -- Invariant Helpers --

  private assertModifiable(): void;         // DELETED 상태면 DomainError
  private assertReadyForActivation(): void; // 활성화 조건 검증
}
```

### 3.8 Domain Events (Product Context)

```typescript
// src/product/domain/event/product-events.ts

/**
 * 상품 생성 시 발행
 * -> 검색 인덱스 초기화 트리거
 */
export class ProductCreated extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // productId
    readonly name: string,
    readonly basePrice: number,
    readonly currency: string,
    readonly categoryId: string,
    readonly sellerId: string,
  ) { super(); }
}

/**
 * 상품 활성화 시 발행
 * -> 검색 인덱스 업데이트, 알림 발송 트리거
 */
export class ProductActivated extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // productId
    readonly name: string,
    readonly basePrice: number,
    readonly currency: string,
  ) { super(); }
}

/**
 * 상품 옵션 추가 시 발행
 * -> 검색 인덱스 업데이트 트리거
 */
export class ProductOptionAdded extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // productId
    readonly optionId: string,
    readonly optionName: string,
  ) { super(); }
}

/**
 * 상품 비활성화 시 발행
 * -> 검색 인덱스에서 제거 트리거
 */
export class ProductDeactivated extends DomainEvent {
  constructor(
    readonly aggregateId: string,  // productId
    readonly reason: string,
  ) { super(); }
}
```

### 3.9 Repository Interface (Product Context)

```typescript
// src/product/domain/repository/product-repository.ts

export interface ProductSearchCriteria {
  keyword?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  page: number;
  limit: number;
}

export interface ProductRepository {
  findById(productId: ProductId): Promise<Product | null>;
  findByIds(productIds: ProductId[]): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(product: Product): Promise<void>;
  nextId(): ProductId;
}

// DI Symbol
export const PRODUCT_REPOSITORY = Symbol("ProductRepository");
```

### 3.10 CQRS - Commands & Queries (Product Context)

```typescript
// src/product/application/command/product-commands.ts

/** 상품 생성 */
export interface CreateProductCommand {
  readonly name: string;
  readonly description: string;
  readonly basePriceAmount: number;
  readonly currency?: string;
  readonly categoryId: string;
  readonly sellerId: string;
}

/** 옵션 추가 */
export interface AddOptionCommand {
  readonly productId: string;
  readonly optionName: string;
}

/** 옵션 값 추가 */
export interface AddOptionValueCommand {
  readonly productId: string;
  readonly optionId: string;
  readonly value: string;
  readonly additionalPriceAmount: number;
  readonly stockQuantity: number;
}

/** 이미지 추가 */
export interface AddImageCommand {
  readonly productId: string;
  readonly url: string;
  readonly altText: string;
  readonly isThumbnail: boolean;
}

/** 상품 활성화 */
export interface ActivateProductCommand {
  readonly productId: string;
}

/** 상품 비활성화 */
export interface DeactivateProductCommand {
  readonly productId: string;
  readonly reason: string;
}

/** 재고 감소 */
export interface ReduceStockCommand {
  readonly productId: string;
  readonly optionValueId: string;
  readonly quantity: number;
}
```

```typescript
// src/product/application/query/product-queries.ts

/** 상품 단건 조회 */
export interface GetProductQuery {
  readonly productId: string;
}

/** 상품 목록 검색 */
export interface SearchProductsQuery {
  readonly keyword?: string;
  readonly categoryId?: string;
  readonly minPriceAmount?: number;
  readonly maxPriceAmount?: number;
  readonly status?: ProductStatus;
  readonly page: number;
  readonly limit: number;
  readonly sortBy?: "price_asc" | "price_desc" | "newest" | "popular";
}

/** 판매자의 상품 목록 조회 */
export interface GetSellerProductsQuery {
  readonly sellerId: string;
  readonly status?: ProductStatus;
  readonly page: number;
  readonly limit: number;
}
```

```typescript
// src/product/application/dto/product-dto.ts

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  basePriceAmount: number;
  currency: string;
  status: ProductStatus;
  categoryId: string;
  sellerId: string;
  thumbnailUrl: string | null;
  optionCount: number;
  createdAt: string;  // ISO 8601
}

export interface ProductDetailDTO extends ProductDTO {
  options: ProductOptionDTO[];
  images: ProductImageDTO[];
}

export interface ProductOptionDTO {
  id: string;
  name: string;
  sortOrder: number;
  values: ProductOptionValueDTO[];
}

export interface ProductOptionValueDTO {
  id: string;
  value: string;
  additionalPriceAmount: number;
  currency: string;
  stockQuantity: number;
  isInStock: boolean;
}

export interface ProductImageDTO {
  id: string;
  url: string;
  sortOrder: number;
  isThumbnail: boolean;
  altText: string;
}

export interface ProductSearchResultDTO {
  items: ProductDTO[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}
```

---

## 4. Context 간 상호작용

### 4.1 이벤트 흐름

```
[User Context]                          [Product Context]
     │                                        │
     │  MemberRegistered                      │  ProductCreated
     │  ──────────────► (Email Service)       │  ──────────► (Search Index)
     │                                        │
     │  PointEarned / PointUsed               │  ProductActivated
     │  ──────────────► (Notification)        │  ──────────► (Notification)
     │                                        │
     └──────────────── [Order Context] ───────┘
                            │
                     주문 생성 시:
                     - Member 등급 확인 (User Context 조회)
                     - Product 재고 확인 (Product Context 조회)
                     - ReduceStock 명령 (Product Context)
                     - EarnPoint 명령 (User Context)
```

### 4.2 Context 경계 규칙

- User Context와 Product Context는 **도메인 이벤트**로만 통신
- Order Context에서 양 Context의 데이터 조회 시: **Application Service 인터페이스** 사용
- ID 참조: Product에서 `sellerId`(string)만 보관, User 전체 객체 참조 금지
- 순환 의존성 금지: User ↛ Product, Product ↛ User

---

## 5. 불변식 요약 (Invariants Summary)

### Member (User Context)

| 규칙 | 설명 |
|------|------|
| 이메일 유일성 | 동일 이메일로 중복 가입 불가 |
| 포인트 비음수 | UserPoint.amount >= 0 항상 유지 |
| 등급 단방향 | 등급은 상향만 가능 (VVIP -> VIP 불가) |
| 주소 최대 5개 | addresses.length <= 5 |
| 탈퇴 회원 제한 | WITHDRAWN 상태에서 모든 동작 불가 |

### Product (Product Context)

| 규칙 | 설명 |
|------|------|
| 활성화 조건 | options >= 1, images >= 1 이어야 activate() 가능 |
| 옵션 최대 3개 | options.length <= 3 |
| 이미지 최대 10개 | images.length <= 10 |
| 썸네일 유일성 | 동시에 하나의 이미지만 thumbnail |
| 재고 비음수 | stockQuantity >= 0 항상 유지 |
| 삭제 후 수정 불가 | DELETED 상태에서 모든 변경 불가 |

---

## 6. 프로젝트 구조 전체 (abada-shop)

```
src/
├── shared/                          # Shared Kernel
│   ├── domain/
│   │   ├── aggregate-root.ts
│   │   ├── entity.ts
│   │   ├── value-object.ts
│   │   ├── domain-event.ts
│   │   └── errors.ts
│   └── infrastructure/
│       ├── event-publisher.ts       # Port
│       └── logger.ts
│
├── user/                            # User Bounded Context
│   ├── domain/
│   │   ├── model/
│   │   │   ├── member.ts            # Aggregate Root
│   │   │   ├── address.ts           # Entity
│   │   │   ├── member-grade.ts      # Enum
│   │   │   └── member-status.ts     # Enum
│   │   ├── value-object/
│   │   │   ├── member-id.ts
│   │   │   ├── email.ts
│   │   │   ├── user-point.ts
│   │   │   └── address-id.ts
│   │   ├── event/
│   │   │   └── member-events.ts
│   │   ├── repository/
│   │   │   └── member-repository.ts
│   │   └── error/
│   │       └── user-domain-error.ts
│   ├── application/
│   │   ├── command/
│   │   │   └── member-commands.ts
│   │   ├── query/
│   │   │   └── member-queries.ts
│   │   ├── dto/
│   │   │   └── member-dto.ts
│   │   └── service/
│   │       └── member-application-service.ts
│   ├── infrastructure/
│   │   └── persistence/typeorm/
│   │       ├── member.entity.ts
│   │       └── typeorm-member-repository.ts
│   └── interface/
│       └── api/
│           ├── member-controller.ts
│           ├── request.ts
│           └── response.ts
│
├── product/                         # Product Bounded Context
│   ├── domain/
│   │   ├── model/
│   │   │   ├── product.ts           # Aggregate Root
│   │   │   ├── product-option.ts    # Entity
│   │   │   ├── product-option-value.ts # Entity
│   │   │   ├── product-image.ts     # Entity
│   │   │   └── product-status.ts    # Enum
│   │   ├── value-object/
│   │   │   ├── product-id.ts
│   │   │   ├── product-option-id.ts
│   │   │   ├── product-option-value-id.ts
│   │   │   ├── product-image-id.ts
│   │   │   └── money.ts
│   │   ├── event/
│   │   │   └── product-events.ts
│   │   ├── repository/
│   │   │   └── product-repository.ts
│   │   └── error/
│   │       └── product-domain-error.ts
│   ├── application/
│   │   ├── command/
│   │   │   └── product-commands.ts
│   │   ├── query/
│   │   │   └── product-queries.ts
│   │   ├── dto/
│   │   │   └── product-dto.ts
│   │   └── service/
│   │       └── product-application-service.ts
│   ├── infrastructure/
│   │   └── persistence/typeorm/
│   │       ├── product.entity.ts
│   │       └── typeorm-product-repository.ts
│   └── interface/
│       └── api/
│           ├── product-controller.ts
│           ├── request.ts
│           └── response.ts
│
└── main.ts
```

---

**Status**: Design Complete
**Next**: Task #3 - Order + Cart Context Domain Model Design
