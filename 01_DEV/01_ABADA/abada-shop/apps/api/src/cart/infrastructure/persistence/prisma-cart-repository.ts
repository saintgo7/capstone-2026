import { PrismaClient } from '@prisma/client';
import { Cart } from '../../domain/model/cart.js';
import { CartItem } from '../../domain/model/cart-item.js';
import { CartRepository } from '../../domain/repository/cart-repository.js';

export class PrismaCartRepository implements CartRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(cart: Cart): Promise<void> {
    const db = this.db as any;
    await db.$transaction(async (tx: any) => {
      // Upsert the cart record
      await tx.cart.upsert({
        where: { userId: cart.userId },
        create: {
          id: cart.id.value,
          userId: cart.userId,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      // Get the actual cart id from DB
      const dbCart = await tx.cart.findUnique({ where: { userId: cart.userId } });
      if (!dbCart) return;

      // Delete all existing items and re-insert
      await tx.cartItem.deleteMany({ where: { cartId: dbCart.id } });

      if (cart.items.length > 0) {
        await tx.cartItem.createMany({
          data: cart.items.map((item: CartItem) => ({
            id: item.id,
            cartId: dbCart.id,
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.price,
            quantity: item.quantity,
          })),
        });
      }
    });
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const db = this.db as any;
    const row = await db.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!row) return null;

    const items = (row.items as any[]).map(item =>
      CartItem.reconstitute({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: Number(item.unitPrice),
        quantity: item.quantity,
      })
    );

    return Cart.reconstitute({
      id: row.id,
      userId: row.userId as string,
      items,
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    const db = this.db as any;
    await db.cart.deleteMany({ where: { userId } });
  }
}
