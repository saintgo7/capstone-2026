import { ValueObject, DomainError } from '../../../shared/domain/index.js';

// Stores hashed password only - plain text never stored in domain
export class HashedPassword extends ValueObject<{ hash: string }> {
  static fromHash(hash: string): HashedPassword {
    if (!hash || hash.length < 20) throw new DomainError('Invalid password hash');
    return new HashedPassword({ hash });
  }

  get hash(): string {
    return this.props.hash;
  }
}
