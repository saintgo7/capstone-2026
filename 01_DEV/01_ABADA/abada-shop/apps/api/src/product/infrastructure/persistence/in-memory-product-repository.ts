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

  async findAll(options?: {
    status?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]> {
    let products = Array.from(this.store.values());

    if (options?.status) products = products.filter(p => p.status === options.status);
    if (options?.categoryId) products = products.filter(p => p.categoryId.value === options.categoryId);
    if (options?.search) {
      const q = options.search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q));
    }
    if (options?.minPrice !== undefined) products = products.filter(p => p.price.amount >= options.minPrice!);
    if (options?.maxPrice !== undefined) products = products.filter(p => p.price.amount <= options.maxPrice!);

    // Sort by createdAt descending for stable cursor pagination
    products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Cursor-based pagination: cursor is the last product ID seen
    if (options?.cursor) {
      const idx = products.findIndex(p => p.id.value === options.cursor);
      if (idx !== -1) products = products.slice(idx + 1);
    } else if (options?.offset !== undefined) {
      products = products.slice(options.offset);
    }

    const limit = options?.limit ?? 20;
    return products.slice(0, limit);
  }

  async countAll(options?: {
    status?: string;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<number> {
    let products = Array.from(this.store.values());
    if (options?.status) products = products.filter(p => p.status === options.status);
    if (options?.categoryId) products = products.filter(p => p.categoryId.value === options.categoryId);
    if (options?.search) {
      const q = options.search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q));
    }
    if (options?.minPrice !== undefined) products = products.filter(p => p.price.amount >= options.minPrice!);
    if (options?.maxPrice !== undefined) products = products.filter(p => p.price.amount <= options.maxPrice!);
    return products.length;
  }
}
