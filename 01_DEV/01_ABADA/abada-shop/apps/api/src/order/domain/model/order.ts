import { AggregateRoot, DomainError } from '../../../shared/domain/index.js';
import { OrderId } from '../value-object/order-ids.js';
import { Money } from '../value-object/money.js';
import { OrderItem } from './order-item.js';
import { OrderStatus, CANCELLABLE_STATUSES } from './order-status.js';
import {
  OrderCreated, OrderItemAdded, OrderItemRemoved,
  OrderConfirmed, OrderPaid, OrderCancelled, OrderRefunded,
} from '../event/order-events.js';

export class Order extends AggregateRoot<OrderId> {
  private _customerId!: string;
  private _status!: OrderStatus;
  private _items: OrderItem[];
  private _shippingAddress!: string;
  private _couponDiscount: Money;
  private _pointDiscount: Money;
  private _createdAt!: Date;

  private constructor(id: OrderId) {
    super(id);
    this._items = [];
    this._couponDiscount = Money.zero();
    this._pointDiscount = Money.zero();
  }

  static create(props: {
    customerId: string;
    shippingAddress: string;
  }): Order {
    const order = new Order(OrderId.create());
    order._customerId = props.customerId;
    order._shippingAddress = props.shippingAddress;
    order._status = OrderStatus.DRAFT;
    order._createdAt = new Date();

    order.addDomainEvent(new OrderCreated(order.id.value, props.customerId));
    return order;
  }

  static reconstitute(props: {
    id: string;
    customerId: string;
    status: OrderStatus;
    items: OrderItem[];
    shippingAddress: string;
    couponDiscountAmount: number;
    pointDiscountAmount: number;
    currency: string;
    createdAt: Date;
  }): Order {
    const order = new Order(OrderId.create(props.id));
    order._customerId = props.customerId;
    order._status = props.status;
    order._items = props.items;
    order._shippingAddress = props.shippingAddress;
    order._couponDiscount = Money.create(props.couponDiscountAmount, props.currency);
    order._pointDiscount = Money.create(props.pointDiscountAmount, props.currency);
    order._createdAt = props.createdAt;
    return order;
  }

  addItem(props: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceAmount: number;
    currency?: string;
  }): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new DomainError('Cannot add item to non-draft order');
    }
    const item = OrderItem.create(props);
    this._items.push(item);
    this.addDomainEvent(new OrderItemAdded(this.id.value, props.productId, props.quantity));
  }

  removeItem(itemId: string): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new DomainError('Cannot remove item from non-draft order');
    }
    const idx = this._items.findIndex(i => i.id.value === itemId);
    if (idx === -1) throw new DomainError(`Item not found: ${itemId}`);
    this._items.splice(idx, 1);
    this.addDomainEvent(new OrderItemRemoved(this.id.value, itemId));
  }

  confirm(): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new DomainError('Only draft orders can be confirmed');
    }
    if (this._items.length === 0) {
      throw new DomainError('Cannot confirm empty order');
    }
    this._status = OrderStatus.CONFIRMED;

    const total = this.total;
    this.addDomainEvent(new OrderConfirmed(
      this.id.value,
      this._customerId,
      total.amount,
      total.currency,
      this._shippingAddress,
    ));
  }

  markAsPaid(paymentId: string): void {
    if (this._status !== OrderStatus.CONFIRMED) {
      throw new DomainError('Only confirmed orders can be marked as paid');
    }
    this._status = OrderStatus.PAID;
    this.addDomainEvent(new OrderPaid(this.id.value, paymentId, this.total.amount));
  }

  startShipping(): void {
    if (this._status !== OrderStatus.PAID) {
      throw new DomainError('Only paid orders can start shipping');
    }
    this._status = OrderStatus.SHIPPING;
  }

  markDelivered(): void {
    if (this._status !== OrderStatus.SHIPPING) {
      throw new DomainError('Only shipping orders can be marked as delivered');
    }
    this._status = OrderStatus.DELIVERED;
  }

  cancel(reason: string): void {
    if (!CANCELLABLE_STATUSES.has(this._status)) {
      throw new DomainError(`Cannot cancel order in status: ${this._status}`);
    }
    this._status = OrderStatus.CANCELLED;
    this.addDomainEvent(new OrderCancelled(this.id.value, reason));
  }

  refund(): void {
    if (this._status !== OrderStatus.PAID && this._status !== OrderStatus.DELIVERED) {
      throw new DomainError('Only paid or delivered orders can be refunded');
    }
    this._status = OrderStatus.REFUNDED;
    this.addDomainEvent(new OrderRefunded(this.id.value, this.total.amount));
  }

  applyCoupon(discount: Money): void {
    if (this._status !== OrderStatus.DRAFT) throw new DomainError('Coupon can only be applied to draft orders');
    this._couponDiscount = discount;
  }

  applyPoints(amount: number): void {
    if (this._status !== OrderStatus.DRAFT) throw new DomainError('Points can only be applied to draft orders');
    this._pointDiscount = Money.create(amount, this.currency);
  }

  get total(): Money {
    const subtotal = this._items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero(this.currency),
    );
    let total = subtotal;
    if (!this._couponDiscount.isZero()) total = total.subtract(this._couponDiscount);
    if (!this._pointDiscount.isZero()) total = total.subtract(this._pointDiscount);
    return total;
  }

  get currency(): string {
    return this._items[0]?.unitPrice.currency ?? 'KRW';
  }

  get customerId(): string { return this._customerId; }
  get status(): OrderStatus { return this._status; }
  get items(): ReadonlyArray<OrderItem> { return this._items; }
  get shippingAddress(): string { return this._shippingAddress; }
  get itemCount(): number { return this._items.length; }
  get createdAt(): Date { return this._createdAt; }
}
