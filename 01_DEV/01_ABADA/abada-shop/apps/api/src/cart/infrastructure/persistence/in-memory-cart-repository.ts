import { Cart } from '../../domain/model/cart.js';
import { CartRepository } from '../../domain/repository/cart-repository.js';

export class InMemoryCartRepository implements CartRepository {
  private readonly store = new Map<string, Cart>();

  async save(cart: Cart): Promise<void> {
    this.store.set(cart.userId, cart);
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    return this.store.get(userId) ?? null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.store.delete(userId);
  }
}
