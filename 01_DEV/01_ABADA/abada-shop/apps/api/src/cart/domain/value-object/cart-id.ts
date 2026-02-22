import { randomUUID } from 'crypto';
import { EntityId } from '../../../shared/domain/index.js';

export class CartId extends EntityId {
  static create(value?: string): CartId {
    return new CartId({ value: value ?? randomUUID() });
  }
}
