import { PrismaClient } from '@prisma/client';
import { Order } from '../../domain/model/order.js';
import { OrderId } from '../../domain/value-object/order-ids.js';
import { OrderRepository } from '../../domain/repository/order-repository.js';
import { OrderItem } from '../../domain/model/order-item.js';
import { OrderStatus } from '../../domain/model/order-status.js';

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(order: Order): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.order.upsert({
        where: { id: order.id.value },
        create: {
          id: order.id.value,
          orderNumber: `ORD-${order.id.value.slice(0, 8).toUpperCase()}`,
          userId: order.customerId,
          status: order.status as any,
          subtotal: BigInt(order.total.amount),
          totalAmount: BigInt(order.total.amount),
          shippingName: 'N/A',
          shippingPhone: '000-0000-0000',
          shippingZipcode: '00000',
          shippingAddress1: order.shippingAddress,
        },
        update: {
          status: order.status as any,
          subtotal: BigInt(order.total.amount),
          totalAmount: BigInt(order.total.amount),
        },
      });

      // Delete existing items and re-insert (simple approach)
      await tx.orderItem.deleteMany({ where: { orderId: order.id.value } });
      for (const item of order.items) {
        await tx.orderItem.create({
          data: {
            id: item.id.value,
            orderId: order.id.value,
            productId: item.productId,
            skuId: item.productId, // simplified: use productId as skuId
            productName: item.productName,
            skuCode: item.productId.slice(0, 8),
            unitPrice: BigInt(item.unitPrice.amount),
            quantity: item.quantity,
            totalPrice: BigInt(item.subtotal.amount),
          },
        });
      }
    });
  }

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.db.order.findUnique({
      where: { id: id.value },
      include: { items: true },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const rows = await this.db.order.findMany({
      where: { userId: customerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this.toDomain(r));
  }

  private toDomain(row: any): Order {
    const items = (row.items ?? []).map((i: any) =>
      OrderItem.reconstitute({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPriceAmount: Number(i.unitPrice),
        currency: 'KRW',
      })
    );

    return Order.reconstitute({
      id: row.id,
      customerId: row.userId ?? '',
      status: row.status as OrderStatus,
      items,
      shippingAddress: row.shippingAddress1,
      couponDiscountAmount: 0,
      pointDiscountAmount: 0,
      currency: 'KRW',
      createdAt: row.createdAt,
    });
  }
}
