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
}
