import { Payment } from '../model/payment.js';

export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');

export interface PaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
}
