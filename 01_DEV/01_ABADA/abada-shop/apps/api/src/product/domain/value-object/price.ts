import { ValueObject } from '../../../shared/domain/index.js';

interface PriceProps {
  amount: number;
  currency: string;
  discountRate: number; // 0-100 percent
}

export class Price extends ValueObject<PriceProps> {
  get amount() { return this.props.amount; }
  get currency() { return this.props.currency; }
  get discountRate() { return this.props.discountRate; }
  get finalAmount() { return Math.floor(this.props.amount * (1 - this.props.discountRate / 100)); }

  static create(amount: number, currency = 'KRW', discountRate = 0): Price {
    if (amount < 0) throw new Error('Price amount must be non-negative');
    if (discountRate < 0 || discountRate > 100) throw new Error('Discount rate must be between 0 and 100');
    return new Price({ amount, currency, discountRate });
  }

  withDiscount(rate: number): Price {
    return Price.create(this.amount, this.currency, rate);
  }
}
