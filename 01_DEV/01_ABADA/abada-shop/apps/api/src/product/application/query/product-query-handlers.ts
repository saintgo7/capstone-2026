import { ProductRepository } from '../../domain/repository/product-repository.js';
import { ProductId, CategoryId } from '../../domain/value-object/product-ids.js';
import { ProductDTO } from '../dto/product-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';
import { Product } from '../../domain/model/product.js';

function toDTO(p: Product): ProductDTO {
  return {
    productId: p.id.value,
    categoryId: p.categoryId.value,
    name: p.name,
    description: p.description,
    price: p.price.amount,
    finalPrice: p.price.finalAmount,
    discountRate: p.price.discountRate,
    currency: p.price.currency,
    stockAvailable: p.stock.available,
    status: p.status,
    imageUrls: p.imageUrls,
    createdAt: p.createdAt.toISOString(),
  };
}

export interface ProductListResult {
  products: ProductDTO[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export class ProductQueryHandlers {
  constructor(private readonly productRepo: ProductRepository) {}

  async getProduct(query: { productId: string }): Promise<ProductDTO> {
    const product = await this.productRepo.findById(ProductId.create(query.productId));
    if (!product) throw new NotFoundError('Product', query.productId);
    return toDTO(product);
  }

  // Cursor-based pagination: returns nextCursor for the next page
  async getProducts(query: {
    status?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ProductDTO[]> {
    const products = await this.productRepo.findAll(query);
    return products.map(toDTO);
  }

  async getProductsWithCursor(query: {
    status?: string;
    limit?: number;
    cursor?: string;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<ProductListResult> {
    const limit = query.limit ?? 20;
    // Fetch one extra to detect hasMore
    const products = await this.productRepo.findAll({ ...query, limit: limit + 1 });
    const hasMore = products.length > limit;
    const items = hasMore ? products.slice(0, limit) : products;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.id.value : null;

    return {
      products: items.map(toDTO),
      nextCursor,
      hasMore,
    };
  }

  async getProductsByCategory(query: { categoryId: string }): Promise<ProductDTO[]> {
    const products = await this.productRepo.findByCategory(CategoryId.create(query.categoryId));
    return products.map(toDTO);
  }
}
