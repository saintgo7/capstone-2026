import { Entity } from '../../../shared/domain/index.js';
import { OrderItemId } from '../value-object/order-ids.js';
import { Money } from '../value-object/money.js';

export class OrderItem extends Entity<OrderItemId> {
  private readonly _productId: string;
  private readonly _productName: string;
  private readonly _unitPrice: Money;
  private _quantity: number;

  private constructor(
    id: OrderItemId,
    productId: string,
    productName: string,
    unitPrice: Money,
    quantity: number,
  ) {
    super(id);
    this._productId = productId;
    this._productName = productName;
    this._unitPrice = unitPrice;
    this._quantity = quantity;
  }

  static create(props: {
    productId: string;
    productName: string;
    unitPriceAmount: number;
    currency?: string;
    quantity: number;
  }): OrderItem {
    if (props.quantity <= 0) throw new Error('Quantity must be positive');
    return new OrderItem(
      OrderItemId.create(),
      props.productId,
      props.productName,
      Money.create(props.unitPriceAmount, props.currency),
      props.quantity,
    );
  }

  static reconstitute(props: {
    id: string;
    productId: string;
    productName: string;
    unitPriceAmount: number;
    currency: string;
    quantity: number;
  }): OrderItem {
    return new OrderItem(
      OrderItemId.create(props.id),
      props.productId,
      props.productName,
      Money.create(props.unitPriceAmount, props.currency),
      props.quantity,
    );
  }

  get subtotal(): Money {
    return this._unitPrice.multiply(this._quantity);
  }

  get productId(): string { return this._productId; }
  get productName(): string { return this._productName; }
  get unitPrice(): Money { return this._unitPrice; }
  get quantity(): number { return this._quantity; }
}
