import { DomainEvent } from '../../../shared/domain/index.js';

export const ORDER_EVENT_PUBLISHER = Symbol('OrderEventPublisher');

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
