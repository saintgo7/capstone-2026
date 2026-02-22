import { Product } from '../../domain/model/product.js';
import { ProductId, CategoryId } from '../../domain/value-object/product-ids.js';
import { ProductRepository } from '../../domain/repository/product-repository.js';

export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, Product>();

  async save(product: Product): Promise<void> {
    this.store.set(product.id.value, product);
  }

  async findById(id: ProductId): Promise<Product | null> {
    return this.store.get(id.value) ?? null;
  }

  async findByCategory(categoryId: CategoryId): Promise<Product[]> {
    return Array.from(this.store.values()).filter(p => p.categoryId.value === categoryId.value);
  }

  async findAll(options?: { status?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let products = Array.from(this.store.values());
    if (options?.status) products = products.filter(p => p.status === options.status);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return products.slice(offset, offset + limit);
  }
}
