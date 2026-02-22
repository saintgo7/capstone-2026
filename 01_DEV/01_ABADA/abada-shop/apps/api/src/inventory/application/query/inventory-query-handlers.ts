import { InventoryRepository } from '../../domain/repository/inventory-repository.js';
import { Inventory } from '../../domain/model/inventory.js';
import { NotFoundError } from '../../../shared/domain/index.js';
import { InventoryDTO } from '../dto/inventory-dto.js';

function toInventoryDTO(inventory: Inventory): InventoryDTO {
  return {
    id: inventory.id.value,
    productId: inventory.productId,
    quantity: inventory.quantity,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity: inventory.availableQuantity,
  };
}

export class InventoryQueryHandlers {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async getInventory(query: { productId: string }): Promise<InventoryDTO> {
    const inventory = await this.inventoryRepo.findByProductId(query.productId);
    if (!inventory) {
      throw new NotFoundError('Inventory', query.productId);
    }
    return toInventoryDTO(inventory);
  }
}
