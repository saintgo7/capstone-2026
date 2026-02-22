import { ShippingRepository } from '../../domain/repository/shipping-repository.js';
import { Shipping, CarrierCode, ShippingAddress } from '../../domain/model/shipping.js';
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

export class ShippingCommandHandlers {
  constructor(private readonly shippingRepo: ShippingRepository) {}

  async createShipping(cmd: {
    orderId: string;
    address: ShippingAddress;
    deliveryNote?: string;
  }): Promise<ShippingDTO> {
    const existing = await this.shippingRepo.findByOrderId(cmd.orderId);
    if (existing) {
      return toShippingDTO(existing);
    }

    const shipping = Shipping.create({
      orderId: cmd.orderId,
      address: cmd.address,
      deliveryNote: cmd.deliveryNote,
    });

    await this.shippingRepo.save(shipping);
    return toShippingDTO(shipping);
  }

  async shipOrder(cmd: {
    id: string;
    carrier: CarrierCode;
    trackingNumber: string;
  }): Promise<ShippingDTO> {
    const shipping = await this.shippingRepo.findById(cmd.id);
    if (!shipping) throw new NotFoundError('Shipping', cmd.id);

    shipping.ship({ carrier: cmd.carrier, trackingNumber: cmd.trackingNumber });
    await this.shippingRepo.save(shipping);
    return toShippingDTO(shipping);
  }

  async deliverOrder(cmd: { id: string }): Promise<ShippingDTO> {
    const shipping = await this.shippingRepo.findById(cmd.id);
    if (!shipping) throw new NotFoundError('Shipping', cmd.id);

    shipping.deliver();
    await this.shippingRepo.save(shipping);
    return toShippingDTO(shipping);
  }
}
