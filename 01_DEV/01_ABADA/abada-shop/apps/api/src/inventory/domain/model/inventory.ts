import { randomUUID } from 'crypto';
import { AggregateRoot, EntityId, DomainError } from '../../../shared/domain/index.js';

export class InventoryId extends EntityId {
  static create(value?: string): InventoryId {
    return new InventoryId({ value: value ?? randomUUID() });
  }
}

export class Inventory extends AggregateRoot<InventoryId> {
  private _productId!: string;
  private _quantity!: number;
  private _reservedQuantity!: number;

  private constructor(id: InventoryId) {
    super(id);
  }

  static create(productId: string, quantity: number = 0): Inventory {
    const inv = new Inventory(InventoryId.create());
    inv._productId = productId;
    inv._quantity = quantity;
    inv._reservedQuantity = 0;
    return inv;
  }

  static reconstitute(props: {
    id: string;
    productId: string;
    quantity: number;
    reservedQuantity: number;
  }): Inventory {
    const inv = new Inventory(InventoryId.create(props.id));
    inv._productId = props.productId;
    inv._quantity = props.quantity;
    inv._reservedQuantity = props.reservedQuantity;
    return inv;
  }

  adjustStock(delta: number): void {
    const newQty = this._quantity + delta;
    if (newQty < 0) {
      throw new DomainError('Stock quantity cannot be negative');
    }
    this._quantity = newQty;
  }

  reserve(quantity: number): void {
    const available = this._quantity - this._reservedQuantity;
    if (quantity > available) {
      throw new DomainError(`Insufficient stock: available ${available}, requested ${quantity}`);
    }
    this._reservedQuantity += quantity;
  }

  release(quantity: number): void {
    const newReserved = this._reservedQuantity - quantity;
    if (newReserved < 0) {
      throw new DomainError('Reserved quantity cannot be negative');
    }
    this._reservedQuantity = newReserved;
  }

  confirm(quantity: number): void {
    this.release(quantity);
    const newQty = this._quantity - quantity;
    if (newQty < 0) {
      throw new DomainError('Stock quantity cannot be negative after confirm');
    }
    this._quantity = newQty;
  }

  get productId(): string { return this._productId; }
  get quantity(): number { return this._quantity; }
  get reservedQuantity(): number { return this._reservedQuantity; }
  get availableQuantity(): number { return this._quantity - this._reservedQuantity; }
}
