import { Entity } from './entity.js';
import { EntityId } from './entity.js';
import { DomainEvent } from './domain-event.js';

export abstract class AggregateRoot<TId extends EntityId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  collectEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }
}
