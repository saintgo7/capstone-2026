import { describe, it, expect, beforeEach } from 'vitest';
import { OrderCommandHandlers } from '../../../src/order/application/command/order-command-handlers.js';
import { InMemoryOrderRepository } from '../../../src/order/infrastructure/persistence/in-memory-order-repository.js';
import { DomainEvent } from '../../../src/shared/domain/index.js';

class SpyEventPublisher {
  events: DomainEvent[] = [];
  async publish(event: DomainEvent) { this.events.push(event); }
  async publishAll(events: DomainEvent[]) { this.events.push(...events); }
}

describe('OrderCommandHandlers', () => {
  let handlers: OrderCommandHandlers;
  let repo: InMemoryOrderRepository;
  let publisher: SpyEventPublisher;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
    publisher = new SpyEventPublisher();
    handlers = new OrderCommandHandlers(repo, publisher as any);
  });

  it('createOrder: creates a DRAFT order', async () => {
    const result = await handlers.createOrder({
      customerId: 'customer-1',
      shippingAddress: '서울시 강남구',
    });

    expect(result.status).toBe('DRAFT');
    expect(result.customerId).toBe('customer-1');
    expect(result.items).toHaveLength(0);
    expect(result.totalAmount).toBe(0);
    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]!.constructor.name).toBe('OrderCreated');
  });

  it('addItem: adds item to DRAFT order', async () => {
    const order = await handlers.createOrder({ customerId: 'c1', shippingAddress: 'Addr' });
    publisher.events = [];

    const result = await handlers.addItem({
      orderId: order.orderId,
      productId: '550e8400-e29b-41d4-a716-446655440000',
      productName: '티셔츠',
      quantity: 2,
      unitPriceAmount: 29000,
      currency: 'KRW',
    });

    expect(result.items).toHaveLength(1);
    expect(result.totalAmount).toBe(58000);
    expect(publisher.events[0]!.constructor.name).toBe('OrderItemAdded');
  });

  it('removeItem: removes item from DRAFT order', async () => {
    const order = await handlers.createOrder({ customerId: 'c1', shippingAddress: 'Addr' });
    await handlers.addItem({
      orderId: order.orderId,
      productId: '550e8400-e29b-41d4-a716-446655440000',
      productName: 'Item',
      quantity: 1,
      unitPriceAmount: 10000,
    });
    publisher.events = [];

    // Get the actual order from repo to get itemId
    const storedOrder = [...(repo as any).store.values()][0];
    const itemId = storedOrder.items[0].id.value;

    const result = await handlers.removeItem({ orderId: order.orderId, itemId });
    expect(result.items).toHaveLength(0);
    expect(result.totalAmount).toBe(0);
  });

  it('confirmOrder: confirms order with items', async () => {
    const order = await handlers.createOrder({ customerId: 'c1', shippingAddress: 'Addr' });
    await handlers.addItem({
      orderId: order.orderId, productId: 'pid', productName: 'P', quantity: 1, unitPriceAmount: 5000,
    });
    publisher.events = [];

    const result = await handlers.confirmOrder({ orderId: order.orderId });
    expect(result.status).toBe('CONFIRMED');
    expect(publisher.events[0]!.constructor.name).toBe('OrderConfirmed');
  });

  it('cancelOrder: cancels DRAFT order', async () => {
    const order = await handlers.createOrder({ customerId: 'c1', shippingAddress: 'Addr' });
    publisher.events = [];

    const result = await handlers.cancelOrder({ orderId: order.orderId, reason: '변심' });
    expect(result.status).toBe('CANCELLED');
    expect(publisher.events[0]!.constructor.name).toBe('OrderCancelled');
  });

  it('throws NotFoundError for non-existent order', async () => {
    await expect(
      handlers.confirmOrder({ orderId: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow('not found');
  });
});
