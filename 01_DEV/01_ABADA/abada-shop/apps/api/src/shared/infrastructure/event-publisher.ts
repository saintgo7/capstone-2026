import { DomainEvent } from '../domain/index.js';
import { EventPublisher } from '../../user/application/port/event-publisher.js';

// Development: console-based event publisher
export class ConsoleEventPublisher implements EventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    console.log(`[Event] ${event.eventType}`, {
      eventId: event.eventId,
      occurredAt: event.occurredAt.toISOString(),
    });
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
