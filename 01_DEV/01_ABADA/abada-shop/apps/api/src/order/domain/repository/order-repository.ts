import { Order } from '../model/order.js';
import { OrderId } from '../value-object/order-ids.js';

export const ORDER_REPOSITORY = Symbol('OrderRepository');

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  findAll(options?: { status?: string; limit?: number; offset?: number }): Promise<Order[]>;
  countAll(options?: { status?: string }): Promise<number>;
}
