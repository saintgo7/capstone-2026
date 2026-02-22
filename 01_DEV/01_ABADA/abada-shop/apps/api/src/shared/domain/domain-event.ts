import { randomUUID } from 'crypto';

export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  abstract readonly eventType: string;

  protected constructor() {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}
