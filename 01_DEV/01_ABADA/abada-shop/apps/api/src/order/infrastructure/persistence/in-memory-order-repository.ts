import { Order } from '../../domain/model/order.js';
import { OrderId } from '../../domain/value-object/order-ids.js';
import { OrderRepository } from '../../domain/repository/order-repository.js';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly store = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.store.set(order.id.value, order);
  }

  async findById(id: OrderId): Promise<Order | null> {
    return this.store.get(id.value) ?? null;
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    return Array.from(this.store.values())
      .filter(o => o.customerId === customerId);
  }

  async findAll(options?: { status?: string; limit?: number; offset?: number }): Promise<Order[]> {
    let orders = Array.from(this.store.values());
    if (options?.status) orders = orders.filter(o => o.status === options.status);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return orders.slice(offset, offset + limit);
  }

  async countAll(options?: { status?: string }): Promise<number> {
    let orders = Array.from(this.store.values());
    if (options?.status) orders = orders.filter(o => o.status === options.status);
    return orders.length;
  }
}
