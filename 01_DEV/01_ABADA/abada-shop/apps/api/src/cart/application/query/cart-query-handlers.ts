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

export class CartQueryHandlers {
  constructor(private readonly cartRepo: CartRepository) {}

  async getCart(query: { userId: string }): Promise<CartDTO> {
    const cart = await this.cartRepo.findByUserId(query.userId);
    if (!cart) {
      // Return empty cart representation
      return {
        userId: query.userId,
        items: [],
        totalAmount: 0,
        totalQuantity: 0,
      };
    }
    return toCartDTO(cart);
  }
}
