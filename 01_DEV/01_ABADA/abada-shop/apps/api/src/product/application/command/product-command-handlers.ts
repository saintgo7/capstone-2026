import { Product } from '../../domain/model/product.js';
import { ProductId } from '../../domain/value-object/product-ids.js';
import { ProductRepository } from '../../domain/repository/product-repository.js';
import { EventPublisher } from '../../../user/application/port/event-publisher.js';
import { ProductDTO } from '../dto/product-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';

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

export class ProductCommandHandlers {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async createProduct(cmd: {
    categoryId: string;
    name: string;
    description: string;
    priceAmount: number;
    currency?: string;
    initialStock: number;
  }): Promise<ProductDTO> {
    const product = Product.create(cmd);
    await this.productRepo.save(product);
    await this.publisher.publishAll(product.collectEvents());
    return toDTO(product);
  }

  async activateProduct(cmd: { productId: string }): Promise<ProductDTO> {
    const product = await this.productRepo.findById(ProductId.create(cmd.productId));
    if (!product) throw new NotFoundError('Product', cmd.productId);
    product.activate();
    await this.productRepo.save(product);
    await this.publisher.publishAll(product.collectEvents());
    return toDTO(product);
  }

  async changePrice(cmd: { productId: string; newAmount: number }): Promise<ProductDTO> {
    const product = await this.productRepo.findById(ProductId.create(cmd.productId));
    if (!product) throw new NotFoundError('Product', cmd.productId);
    product.changePrice(cmd.newAmount);
    await this.productRepo.save(product);
    await this.publisher.publishAll(product.collectEvents());
    return toDTO(product);
  }

  async addStock(cmd: { productId: string; quantity: number }): Promise<ProductDTO> {
    const product = await this.productRepo.findById(ProductId.create(cmd.productId));
    if (!product) throw new NotFoundError('Product', cmd.productId);
    product.addStock(cmd.quantity);
    await this.productRepo.save(product);
    await this.publisher.publishAll(product.collectEvents());
    return toDTO(product);
  }

  async updateProduct(cmd: {
    productId: string;
    name?: string;
    description?: string;
    discountRate?: number;
  }): Promise<ProductDTO> {
    const product = await this.productRepo.findById(ProductId.create(cmd.productId));
    if (!product) throw new NotFoundError('Product', cmd.productId);
    product.updateInfo({ name: cmd.name, description: cmd.description });
    if (cmd.discountRate !== undefined) product.setDiscount(cmd.discountRate);
    await this.productRepo.save(product);
    await this.publisher.publishAll(product.collectEvents());
    return toDTO(product);
  }
}
