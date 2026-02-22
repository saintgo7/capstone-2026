import { ShippingStatus, CarrierCode, ShippingAddress } from '../../domain/model/shipping.js';

export interface ShippingDTO {
  id: string;
  orderId: string;
  address: ShippingAddress;
  status: ShippingStatus;
  carrier?: CarrierCode;
  trackingNumber?: string;
  deliveryNote?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}
