import { ValueObject } from './value-object.js';

export abstract class EntityId extends ValueObject<{ value: string }> {
  get value(): string {
    return this.props.value;
  }
}

export abstract class Entity<TId extends EntityId> {
  protected readonly _id: TId;

  protected constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return this._id.equals(other._id);
  }
}
