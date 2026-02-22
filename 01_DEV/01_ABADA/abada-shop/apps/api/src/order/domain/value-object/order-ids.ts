import { randomUUID } from 'crypto';
import { EntityId } from '../../../shared/domain/index.js';

export class OrderId extends EntityId {
  static create(value?: string): OrderId {
    return new OrderId({ value: value ?? randomUUID() });
  }
}

export class OrderItemId extends EntityId {
  static create(value?: string): OrderItemId {
    return new OrderItemId({ value: value ?? randomUUID() });
  }
}

export class CartId extends EntityId {
  static create(value?: string): CartId {
    return new CartId({ value: value ?? randomUUID() });
  }
}
