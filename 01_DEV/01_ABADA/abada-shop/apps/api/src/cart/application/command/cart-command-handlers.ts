import { CartRepository } from '../../domain/repository/cart-repository.js';
import { Cart } from '../../domain/model/cart.js';
import { CartDTO } from '../dto/cart-dto.js';

function toCartDTO(cart: Cart): CartDTO {
  return {
    userId: cart.userId,
    items: cart.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
    totalAmount: cart.totalAmount,
    totalQuantity: cart.totalQuantity,
  };
}

export class CartCommandHandlers {
  constructor(private readonly cartRepo: CartRepository) {}

  async addItem(cmd: {
    userId: string;
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }): Promise<CartDTO> {
    let cart = await this.cartRepo.findByUserId(cmd.userId);
    if (!cart) {
      cart = Cart.create(cmd.userId);
    }

    cart.addItem({
      productId: cmd.productId,
      productName: cmd.productName,
      price: cmd.price,
      quantity: cmd.quantity,
    });

    await this.cartRepo.save(cart);
    return toCartDTO(cart);
  }

  async removeItem(cmd: { userId: string; productId: string }): Promise<CartDTO> {
    let cart = await this.cartRepo.findByUserId(cmd.userId);
    if (!cart) {
      cart = Cart.create(cmd.userId);
    }

    cart.removeItem(cmd.productId);
    await this.cartRepo.save(cart);
    return toCartDTO(cart);
  }

  async updateItemQuantity(cmd: {
    userId: string;
    productId: string;
    quantity: number;
  }): Promise<CartDTO> {
    let cart = await this.cartRepo.findByUserId(cmd.userId);
    if (!cart) {
      cart = Cart.create(cmd.userId);
    }

    cart.updateItemQuantity(cmd.productId, cmd.quantity);
    await this.cartRepo.save(cart);
    return toCartDTO(cart);
  }

  async clearCart(cmd: { userId: string }): Promise<void> {
    const cart = await this.cartRepo.findByUserId(cmd.userId);
    if (!cart) return;
    cart.clear();
    await this.cartRepo.save(cart);
  }
}
