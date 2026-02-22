import { Cart } from '../model/cart.js';

export const CART_REPOSITORY = Symbol('CartRepository');

export interface CartRepository {
  save(cart: Cart): Promise<void>;
  findByUserId(userId: string): Promise<Cart | null>;
  deleteByUserId(userId: string): Promise<void>;
}
