import { randomUUID } from 'crypto';
import { EntityId } from '../../../shared/domain/index.js';

export class CategoryId extends EntityId {
  static create(value?: string): CategoryId {
    return new CategoryId({ value: value ?? randomUUID() });
  }
}
