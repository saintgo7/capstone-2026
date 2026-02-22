import { ValueObject } from '../../../shared/domain/index.js';
import { DomainError } from '../../../shared/domain/index.js';

export class Email extends ValueObject<{ value: string }> {
  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static create(raw: string): Email {
    const trimmed = raw.trim().toLowerCase();
    if (!Email.REGEX.test(trimmed)) {
      throw new DomainError(`Invalid email: ${raw}`);
    }
    return new Email({ value: trimmed });
  }

  get value(): string {
    return this.props.value;
  }
}
