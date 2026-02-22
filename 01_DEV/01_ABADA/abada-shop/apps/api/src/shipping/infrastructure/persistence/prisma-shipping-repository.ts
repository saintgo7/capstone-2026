import { PrismaClient } from '@prisma/client';
import { Shipping, ShippingStatus, CarrierCode, ShippingAddress } from '../../domain/model/shipping.js';
import { ShippingRepository } from '../../domain/repository/shipping-repository.js';

function toDomain(row: any): Shipping {
  return Shipping.reconstitute({
    id: row.id,
    orderId: row.orderId,
    address: {
      recipientName: row.recipientName,
      phone: row.recipientPhone,
      zipCode: row.zipcode,
      address1: row.address1,
      address2: row.address2 ?? undefined,
    } as ShippingAddress,
    status: row.status as ShippingStatus,
    carrier: row.carrierCode as CarrierCode | undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    deliveryNote: row.deliveryNote ?? undefined,
    shippedAt: row.shippedAt ?? undefined,
    deliveredAt: row.deliveredAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaShippingRepository implements ShippingRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(shipping: Shipping): Promise<void> {
    const db = this.db as any;
    await db.shipment.upsert({
      where: { id: shipping.id.value },
      create: {
        id: shipping.id.value,
        orderId: shipping.orderId,
        recipientName: shipping.address.recipientName,
        recipientPhone: shipping.address.phone,
        zipcode: shipping.address.zipCode,
        address1: shipping.address.address1,
        address2: shipping.address.address2 ?? null,
        status: shipping.status,
        carrierCode: shipping.carrier ?? null,
        trackingNumber: shipping.trackingNumber ?? null,
        deliveryNote: shipping.deliveryNote ?? null,
        shippedAt: shipping.shippedAt ?? null,
        deliveredAt: shipping.deliveredAt ?? null,
      },
      update: {
        status: shipping.status,
        carrierCode: shipping.carrier ?? null,
        trackingNumber: shipping.trackingNumber ?? null,
        shippedAt: shipping.shippedAt ?? null,
        deliveredAt: shipping.deliveredAt ?? null,
        updatedAt: shipping.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Shipping | null> {
    const db = this.db as any;
    const row = await db.shipment.findUnique({ where: { id } });
    if (!row) return null;
    return toDomain(row);
  }

  async findByOrderId(orderId: string): Promise<Shipping | null> {
    const db = this.db as any;
    const row = await db.shipment.findUnique({ where: { orderId } });
    if (!row) return null;
    return toDomain(row);
  }
}
