import { ValueObject, DomainError } from '../../../shared/domain/index.js';

export class Phone extends ValueObject<{ value: string }> {
  // Korean phone number: 010-XXXX-XXXX or 010XXXXXXXX
  private static readonly REGEX = /^01[016789]\d{7,8}$/;

  static create(raw: string): Phone {
    const digits = raw.replace(/\D/g, '');
    if (!Phone.REGEX.test(digits)) {
      throw new DomainError(`Invalid phone number: ${raw}`);
    }
    return new Phone({ value: digits });
  }

  get value(): string {
    return this.props.value;
  }

  get formatted(): string {
    const v = this.props.value;
    return `${v.slice(0, 3)}-${v.slice(3, 7)}-${v.slice(7)}`;
  }
}
