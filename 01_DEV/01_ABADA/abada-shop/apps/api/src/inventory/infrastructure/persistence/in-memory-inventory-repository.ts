import { Inventory } from '../../domain/model/inventory.js';
import { InventoryRepository } from '../../domain/repository/inventory-repository.js';

export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly store = new Map<string, Inventory>();

  async save(inventory: Inventory): Promise<void> {
    this.store.set(inventory.productId, inventory);
  }

  async findByProductId(productId: string): Promise<Inventory | null> {
    return this.store.get(productId) ?? null;
  }
}
