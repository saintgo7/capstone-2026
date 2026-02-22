import { ValueObject } from '../../../shared/domain/index.js';

interface StockProps { quantity: number; reserved: number }

export class Stock extends ValueObject<StockProps> {
  get quantity() { return this.props.quantity; }
  get reserved() { return this.props.reserved; }
  get available() { return this.props.quantity - this.props.reserved; }
  get isAvailable() { return this.available > 0; }

  static create(quantity: number, reserved = 0): Stock {
    if (quantity < 0) throw new Error('Stock quantity must be non-negative');
    if (reserved < 0 || reserved > quantity) throw new Error('Invalid reserved quantity');
    return new Stock({ quantity, reserved });
  }

  add(amount: number): Stock { return Stock.create(this.quantity + amount, this.reserved); }
  reserve(amount: number): Stock {
    if (amount > this.available) throw new Error('Insufficient stock');
    return Stock.create(this.quantity, this.reserved + amount);
  }
  release(amount: number): Stock {
    return Stock.create(this.quantity, Math.max(0, this.reserved - amount));
  }
  confirm(amount: number): Stock {
    return Stock.create(this.quantity - amount, Math.max(0, this.reserved - amount));
  }
}
