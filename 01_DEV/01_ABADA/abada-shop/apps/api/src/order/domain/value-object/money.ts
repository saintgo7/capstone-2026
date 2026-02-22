import { ValueObject, DomainError } from '../../../shared/domain/index.js';

const SUPPORTED_CURRENCIES = ['KRW', 'USD', 'JPY'] as const;
type Currency = typeof SUPPORTED_CURRENCIES[number];

export class Money extends ValueObject<{ amount: number; currency: Currency }> {
  static create(amount: number, currency: string = 'KRW'): Money {
    if (!SUPPORTED_CURRENCIES.includes(currency as Currency)) {
      throw new DomainError(`Unsupported currency: ${currency}`);
    }
    if (!Number.isInteger(amount) || amount < 0) {
      throw new DomainError(`Amount must be non-negative integer: ${amount}`);
    }
    return new Money({ amount, currency: currency as Currency });
  }

  static zero(currency: string = 'KRW'): Money {
    return Money.create(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ amount: this.props.amount + other.props.amount, currency: this.props.currency });
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (this.props.amount < other.props.amount) {
      throw new DomainError('Subtraction result cannot be negative');
    }
    return new Money({ amount: this.props.amount - other.props.amount, currency: this.props.currency });
  }

  multiply(factor: number): Money {
    if (factor < 0) throw new DomainError('Factor must be non-negative');
    return new Money({ amount: Math.round(this.props.amount * factor), currency: this.props.currency });
  }

  isZero(): boolean { return this.props.amount === 0; }
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount > other.props.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.props.currency) {
      throw new DomainError(`Currency mismatch: ${this.props.currency} vs ${other.props.currency}`);
    }
  }

  get amount(): number { return this.props.amount; }
  get currency(): Currency { return this.props.currency; }
}
