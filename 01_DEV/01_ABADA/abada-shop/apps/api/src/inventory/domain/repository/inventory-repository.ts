import { Inventory } from '../model/inventory.js';

export const INVENTORY_REPOSITORY = Symbol('InventoryRepository');

export interface InventoryRepository {
  save(inventory: Inventory): Promise<void>;
  findByProductId(productId: string): Promise<Inventory | null>;
}
