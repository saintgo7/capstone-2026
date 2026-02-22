import { PrismaClient } from '@prisma/client';
import { Inventory } from '../../domain/model/inventory.js';
import { InventoryRepository } from '../../domain/repository/inventory-repository.js';

// Uses Prisma Stock model, treating skuId as productId for simplified domain
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(inventory: Inventory): Promise<void> {
    const db = this.db as any;
    await db.stock.upsert({
      where: { skuId: inventory.productId },
      create: {
        id: inventory.id.value,
        skuId: inventory.productId,
        quantity: inventory.quantity,
        reserved: inventory.reservedQuantity,
        available: inventory.availableQuantity,
      },
      update: {
        quantity: inventory.quantity,
        reserved: inventory.reservedQuantity,
        available: inventory.availableQuantity,
      },
    });
  }

  async findByProductId(productId: string): Promise<Inventory | null> {
    const db = this.db as any;
    const row = await db.stock.findUnique({ where: { skuId: productId } });
    if (!row) return null;
    return Inventory.reconstitute({
      id: row.id,
      productId: row.skuId,
      quantity: row.quantity,
      reservedQuantity: row.reserved,
    });
  }
}
