import { randomUUID } from 'crypto';
import { AggregateRoot, DomainError, EntityId } from '../../../shared/domain/index.js';
import { Money } from '../../../order/domain/value-object/money.js';

export class PaymentId extends EntityId {
  static create(value?: string): PaymentId {
    return new PaymentId({ value: value ?? randomUUID() });
  }
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  KAKAO_PAY = 'KAKAO_PAY',
  NAVER_PAY = 'NAVER_PAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  POINT = 'POINT',
}

class PaymentInitiated {
  readonly eventType = 'PaymentInitiated' as const;
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly method: string,
  ) {}
}

class PaymentCompleted {
  readonly eventType = 'PaymentCompleted' as const;
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
  ) {}
}

class PaymentFailed {
  readonly eventType = 'PaymentFailed' as const;
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly reason: string,
  ) {}
}

class PaymentRefunded {
  readonly eventType = 'PaymentRefunded' as const;
  readonly eventId = randomUUID();
  readonly occurredAt = new Date();
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly refundedAmount: number,
    public readonly currency: string,
  ) {}
}

type PaymentEvent = PaymentInitiated | PaymentCompleted | PaymentFailed | PaymentRefunded;

export class Payment extends AggregateRoot<PaymentId> {
  private _orderId!: string;
  private _amount!: Money;
  private _method!: string;
  private _status!: PaymentStatus;
  private _failureReason: string | null;
  private _pgTransactionId: string | null;
  private _createdAt!: Date;
  private _events: PaymentEvent[] = [];

  private constructor(id: PaymentId) {
    super(id);
    this._failureReason = null;
    this._pgTransactionId = null;
  }

  static reconstitute(props: {
    id: string;
    orderId: string;
    amount: Money;
    method: string;
    status: PaymentStatus;
    failureReason: string | null;
    pgTransactionId: string | null;
    createdAt: Date;
  }): Payment {
    const payment = new Payment(PaymentId.create(props.id));
    payment._orderId = props.orderId;
    payment._amount = props.amount;
    payment._method = props.method;
    payment._status = props.status;
    payment._failureReason = props.failureReason;
    payment._pgTransactionId = props.pgTransactionId;
    payment._createdAt = props.createdAt;
    return payment;
  }

  static initiate(orderId: string, amount: Money, method: string): Payment {
    const payment = new Payment(PaymentId.create());
    payment._orderId = orderId;
    payment._amount = amount;
    payment._method = method;
    payment._status = PaymentStatus.INITIATED;
    payment._createdAt = new Date();

    payment._events.push(new PaymentInitiated(
      payment.id.value, orderId, amount.amount, amount.currency, method,
    ));
    return payment;
  }

  complete(pgTransactionId?: string): void {
    if (this._status !== PaymentStatus.INITIATED) {
      throw new DomainError(`Cannot complete payment in status: ${this._status}`);
    }
    this._status = PaymentStatus.COMPLETED;
    this._pgTransactionId = pgTransactionId ?? null;
    this._events.push(new PaymentCompleted(this.id.value, this._orderId));
  }

  fail(reason: string): void {
    if (this._status !== PaymentStatus.INITIATED) {
      throw new DomainError(`Cannot fail payment in status: ${this._status}`);
    }
    this._status = PaymentStatus.FAILED;
    this._failureReason = reason;
    this._events.push(new PaymentFailed(this.id.value, this._orderId, reason));
  }

  refund(): void {
    if (this._status !== PaymentStatus.COMPLETED) {
      throw new DomainError(`Cannot refund payment in status: ${this._status}`);
    }
    this._status = PaymentStatus.REFUNDED;
    this._events.push(new PaymentRefunded(
      this.id.value, this._orderId,
      this._amount.amount, this._amount.currency,
    ));
  }

  collectEvents(): PaymentEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  get orderId(): string { return this._orderId; }
  get amount(): Money { return this._amount; }
  get method(): string { return this._method; }
  get status(): PaymentStatus { return this._status; }
  get failureReason(): string | null { return this._failureReason; }
  get pgTransactionId(): string | null { return this._pgTransactionId; }
  get createdAt(): Date { return this._createdAt; }
}
