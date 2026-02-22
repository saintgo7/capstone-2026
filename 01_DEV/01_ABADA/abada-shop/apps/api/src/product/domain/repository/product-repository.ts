import { Product } from '../model/product.js';
import { ProductId, CategoryId } from '../value-object/product-ids.js';

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: ProductId): Promise<Product | null>;
  findByCategory(categoryId: CategoryId): Promise<Product[]>;
  findAll(options?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]>;
}
