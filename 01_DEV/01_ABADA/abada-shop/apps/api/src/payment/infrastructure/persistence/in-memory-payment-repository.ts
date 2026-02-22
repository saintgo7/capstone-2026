import { Payment } from '../../domain/model/payment.js';
import { PaymentRepository } from '../../domain/repository/payment-repository.js';

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly store = new Map<string, Payment>();

  async save(payment: Payment): Promise<void> {
    this.store.set(payment.id.value, payment);
  }

  async findById(id: string): Promise<Payment | null> {
    return this.store.get(id) ?? null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    for (const payment of this.store.values()) {
      if (payment.orderId === orderId) return payment;
    }
    return null;
  }
}
