import { Shipping } from '../model/shipping.js';

export const SHIPPING_REPOSITORY = Symbol('ShippingRepository');

export interface ShippingRepository {
  save(shipping: Shipping): Promise<void>;
  findById(id: string): Promise<Shipping | null>;
  findByOrderId(orderId: string): Promise<Shipping | null>;
}
