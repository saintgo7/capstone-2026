import { randomUUID } from 'crypto';
import { EntityId } from '../../../shared/domain/index.js';

export class UserId extends EntityId {
  static create(value?: string): UserId {
    return new UserId({ value: value ?? randomUUID() });
  }
}
