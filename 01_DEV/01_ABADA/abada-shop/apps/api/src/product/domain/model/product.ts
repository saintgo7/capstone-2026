import { randomUUID } from 'crypto';
import { AggregateRoot } from '../../../shared/domain/index.js';
import { ProductId, CategoryId } from '../value-object/product-ids.js';
import { Price } from '../value-object/price.js';
import { Stock } from '../value-object/stock.js';
import { ProductStatus } from './product-status.js';
import { ProductCreated, ProductActivated, ProductPriceChanged, ProductStockUpdated } from '../event/product-events.js';

interface ProductProps {
  id: ProductId;
  categoryId: CategoryId;
  name: string;
  description: string;
  price: Price;
  stock: Stock;
  status: ProductStatus;
  imageUrls: string[];
  createdAt: Date;
}

export class Product extends AggregateRoot<ProductId> {
  private _categoryId!: CategoryId;
  private _name!: string;
  private _description!: string;
  private _price!: Price;
  private _stock!: Stock;
  private _status!: ProductStatus;
  private _imageUrls: string[] = [];
  private _createdAt!: Date;

  get categoryId() { return this._categoryId; }
  get name() { return this._name; }
  get description() { return this._description; }
  get price() { return this._price; }
  get stock() { return this._stock; }
  get status() { return this._status; }
  get imageUrls() { return [...this._imageUrls]; }
  get createdAt() { return this._createdAt; }
  get isActive() { return this._status === ProductStatus.ACTIVE; }

  static create(props: {
    categoryId: string;
    name: string;
    description: string;
    priceAmount: number;
    currency?: string;
    initialStock: number;
  }): Product {
    const product = new Product(ProductId.create(randomUUID()));
    product._categoryId = CategoryId.create(props.categoryId);
    product._name = props.name;
    product._description = props.description;
    product._price = Price.create(props.priceAmount, props.currency);
    product._stock = Stock.create(props.initialStock);
    product._status = ProductStatus.DRAFT;
    product._imageUrls = [];
    product._createdAt = new Date();
    product.addDomainEvent(new ProductCreated(product.id.value, props.name));
    return product;
  }

  static reconstitute(props: ProductProps): Product {
    const product = new Product(props.id);
    product._categoryId = props.categoryId;
    product._name = props.name;
    product._description = props.description;
    product._price = props.price;
    product._stock = props.stock;
    product._status = props.status;
    product._imageUrls = props.imageUrls;
    product._createdAt = props.createdAt;
    return product;
  }

  activate(): void {
    if (this._status === ProductStatus.DISCONTINUED) throw new Error('Cannot activate discontinued product');
    this._status = ProductStatus.ACTIVE;
    this.addDomainEvent(new ProductActivated(this.id.value));
  }

  deactivate(): void { this._status = ProductStatus.INACTIVE; }

  changePrice(newAmount: number): void {
    const oldAmount = this._price.amount;
    this._price = Price.create(newAmount, this._price.currency, this._price.discountRate);
    this.addDomainEvent(new ProductPriceChanged(this.id.value, oldAmount, newAmount));
  }

  setDiscount(rate: number): void {
    this._price = this._price.withDiscount(rate);
  }

  addStock(quantity: number): void {
    this._stock = this._stock.add(quantity);
    this.addDomainEvent(new ProductStockUpdated(this.id.value, this._stock.quantity));
  }

  addImage(url: string): void {
    if (this._imageUrls.length >= 10) throw new Error('Maximum 10 images per product');
    this._imageUrls.push(url);
  }

  updateInfo(props: { name?: string; description?: string }): void {
    if (props.name) this._name = props.name;
    if (props.description !== undefined) this._description = props.description;
  }
}
