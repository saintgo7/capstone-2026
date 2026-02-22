import { AggregateRoot, DomainError } from '../../../shared/domain/index.js';
import { CartId } from '../value-object/cart-id.js';
import { CartItem } from './cart-item.js';

export class Cart extends AggregateRoot<CartId> {
  private _userId: string;
  private _items: Map<string, CartItem>; // keyed by productId

  private constructor(id: CartId, userId: string) {
    super(id);
    this._userId = userId;
    this._items = new Map();
  }

  static create(userId: string): Cart {
    return new Cart(CartId.create(), userId);
  }

  static reconstitute(props: {
    id: string;
    userId: string;
    items: CartItem[];
  }): Cart {
    const cart = new Cart(CartId.create(props.id), props.userId);
    for (const item of props.items) {
      cart._items.set(item.productId, item);
    }
    return cart;
  }

  addItem(props: {
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }): void {
    if (props.quantity <= 0) throw new DomainError('Quantity must be positive');

    const existing = this._items.get(props.productId);
    if (existing) {
      this._items.set(props.productId, existing.increaseQuantity(props.quantity));
    } else {
      this._items.set(props.productId, CartItem.create(props));
    }
  }

  removeItem(productId: string): void {
    if (!this._items.has(productId)) {
      throw new DomainError(`Item with productId ${productId} not in cart`);
    }
    this._items.delete(productId);
  }

  updateItemQuantity(productId: string, quantity: number): void {
    const existing = this._items.get(productId);
    if (!existing) {
      throw new DomainError(`Item with productId ${productId} not in cart`);
    }
    if (quantity <= 0) {
      this._items.delete(productId);
    } else {
      this._items.set(productId, existing.updateQuantity(quantity));
    }
  }

  clear(): void {
    this._items.clear();
  }

  get userId(): string { return this._userId; }
  get items(): ReadonlyArray<CartItem> { return Array.from(this._items.values()); }
  get totalAmount(): number {
    return Array.from(this._items.values()).reduce((sum, item) => sum + item.subtotal, 0);
  }
  get totalQuantity(): number {
    return Array.from(this._items.values()).reduce((sum, item) => sum + item.quantity, 0);
  }
  get isEmpty(): boolean { return this._items.size === 0; }
}
