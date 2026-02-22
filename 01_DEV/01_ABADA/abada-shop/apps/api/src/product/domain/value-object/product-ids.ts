import { ValueObject } from '../../../shared/domain/index.js';

interface ProductIdProps { value: string }

export class ProductId extends ValueObject<ProductIdProps> {
  get value() { return this.props.value; }
  static create(value: string): ProductId { return new ProductId({ value }); }
}

interface CategoryIdProps { value: string }

export class CategoryId extends ValueObject<CategoryIdProps> {
  get value() { return this.props.value; }
  static create(value: string): CategoryId { return new CategoryId({ value }); }
}
