import { randomUUID } from 'crypto';
import { DomainError } from '../../../shared/domain/index.js';

export interface CartItemProps {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export class CartItem {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _productName: string;
  private readonly _price: number;
  private _quantity: number;

  private constructor(props: CartItemProps) {
    this._id = props.id;
    this._productId = props.productId;
    this._productName = props.productName;
    this._price = props.price;
    this._quantity = props.quantity;
  }

  static create(props: Omit<CartItemProps, 'id'>): CartItem {
    if (props.price < 0) throw new DomainError('Price must be non-negative');
    if (props.quantity <= 0) throw new DomainError('Quantity must be positive');
    return new CartItem({ ...props, id: randomUUID() });
  }

  static reconstitute(props: CartItemProps): CartItem {
    return new CartItem(props);
  }

  increaseQuantity(amount: number): CartItem {
    if (amount <= 0) throw new DomainError('Amount must be positive');
    return new CartItem({
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      price: this._price,
      quantity: this._quantity + amount,
    });
  }

  updateQuantity(quantity: number): CartItem {
    if (quantity <= 0) throw new DomainError('Quantity must be positive');
    return new CartItem({
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      price: this._price,
      quantity,
    });
  }

  get id(): string { return this._id; }
  get productId(): string { return this._productId; }
  get productName(): string { return this._productName; }
  get price(): number { return this._price; }
  get quantity(): number { return this._quantity; }
  get subtotal(): number { return this._price * this._quantity; }
}
