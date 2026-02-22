import { randomUUID } from 'crypto';
import { EntityId } from '../../../shared/domain/index.js';

export class ShippingId extends EntityId {
  static create(value?: string): ShippingId {
    return new ShippingId({ value: value ?? randomUUID() });
  }
}
