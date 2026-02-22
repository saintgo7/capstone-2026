import { ShippingRepository } from '../../domain/repository/shipping-repository.js';
import { Shipping } from '../../domain/model/shipping.js';
import { ShippingDTO } from '../dto/shipping-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';

function toShippingDTO(s: Shipping): ShippingDTO {
  return {
    id: s.id.value,
    orderId: s.orderId,
    address: s.address,
    status: s.status,
    carrier: s.carrier,
    trackingNumber: s.trackingNumber,
    deliveryNote: s.deliveryNote,
    shippedAt: s.shippedAt?.toISOString(),
    deliveredAt: s.deliveredAt?.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export class ShippingQueryHandlers {
  constructor(private readonly shippingRepo: ShippingRepository) {}

  async getShipping(query: { id: string }): Promise<ShippingDTO> {
    const shipping = await this.shippingRepo.findById(query.id);
    if (!shipping) throw new NotFoundError('Shipping', query.id);
    return toShippingDTO(shipping);
  }

  async getShippingByOrder(query: { orderId: string }): Promise<ShippingDTO> {
    const shipping = await this.shippingRepo.findByOrderId(query.orderId);
    if (!shipping) throw new NotFoundError('Shipping for order', query.orderId);
    return toShippingDTO(shipping);
  }
}
