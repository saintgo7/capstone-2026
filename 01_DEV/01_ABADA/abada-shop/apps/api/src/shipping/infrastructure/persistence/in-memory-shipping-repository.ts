import { Shipping } from '../../domain/model/shipping.js';
import { ShippingRepository } from '../../domain/repository/shipping-repository.js';

export class InMemoryShippingRepository implements ShippingRepository {
  private readonly store = new Map<string, Shipping>();

  async save(shipping: Shipping): Promise<void> {
    this.store.set(shipping.id.value, shipping);
  }

  async findById(id: string): Promise<Shipping | null> {
    return this.store.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Shipping | null> {
    for (const shipping of this.store.values()) {
      if (shipping.orderId === orderId) return shipping;
    }
    return null;
  }
}
