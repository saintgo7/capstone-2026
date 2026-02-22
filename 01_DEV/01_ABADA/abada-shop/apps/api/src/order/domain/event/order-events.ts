import { DomainEvent } from '../../../shared/domain/index.js';

export class OrderCreated extends DomainEvent {
  readonly eventType = 'OrderCreated' as const;
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
  ) { super(); }
}

export class OrderItemAdded extends DomainEvent {
  readonly eventType = 'OrderItemAdded' as const;
  constructor(
    public readonly orderId: string,
    public readonly productId: string,
    public readonly quantity: number,
  ) { super(); }
}

export class OrderItemRemoved extends DomainEvent {
  readonly eventType = 'OrderItemRemoved' as const;
  constructor(
    public readonly orderId: string,
    public readonly itemId: string,
  ) { super(); }
}

export class OrderConfirmed extends DomainEvent {
  readonly eventType = 'OrderConfirmed' as const;
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly totalAmount: number,
    public readonly currency: string,
    public readonly shippingAddress: string,
  ) { super(); }
}

export class OrderPaid extends DomainEvent {
  readonly eventType = 'OrderPaid' as const;
  constructor(
    public readonly orderId: string,
    public readonly paymentId: string,
    public readonly paidAmount: number,
  ) { super(); }
}

export class OrderCancelled extends DomainEvent {
  readonly eventType = 'OrderCancelled' as const;
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
  ) { super(); }
}

export class OrderRefunded extends DomainEvent {
  readonly eventType = 'OrderRefunded' as const;
  constructor(
    public readonly orderId: string,
    public readonly refundedAmount: number,
  ) { super(); }
}
