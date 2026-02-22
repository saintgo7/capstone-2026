import { DomainEvent } from '../../../shared/domain/index.js';

export const EVENT_PUBLISHER = Symbol('EventPublisher');

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
