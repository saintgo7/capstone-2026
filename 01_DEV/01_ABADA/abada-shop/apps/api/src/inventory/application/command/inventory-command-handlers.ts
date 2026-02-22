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

export class InventoryCommandHandlers {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async adjustStock(cmd: {
    productId: string;
    delta: number;
  }): Promise<InventoryDTO> {
    let inventory = await this.inventoryRepo.findByProductId(cmd.productId);
    if (!inventory) {
      inventory = Inventory.create(cmd.productId, 0);
    }
    inventory.adjustStock(cmd.delta);
    await this.inventoryRepo.save(inventory);
    return toInventoryDTO(inventory);
  }

  async reserveStock(cmd: {
    productId: string;
    quantity: number;
  }): Promise<InventoryDTO> {
    const inventory = await this.inventoryRepo.findByProductId(cmd.productId);
    if (!inventory) {
      throw new NotFoundError('Inventory', cmd.productId);
    }
    inventory.reserve(cmd.quantity);
    await this.inventoryRepo.save(inventory);
    return toInventoryDTO(inventory);
  }

  async releaseStock(cmd: {
    productId: string;
    quantity: number;
  }): Promise<InventoryDTO> {
    const inventory = await this.inventoryRepo.findByProductId(cmd.productId);
    if (!inventory) {
      throw new NotFoundError('Inventory', cmd.productId);
    }
    inventory.release(cmd.quantity);
    await this.inventoryRepo.save(inventory);
    return toInventoryDTO(inventory);
  }
}
