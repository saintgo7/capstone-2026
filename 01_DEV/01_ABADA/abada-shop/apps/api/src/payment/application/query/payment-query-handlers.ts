import { PaymentRepository } from '../../domain/repository/payment-repository.js';
import { Payment } from '../../domain/model/payment.js';
import { NotFoundError } from '../../../shared/domain/index.js';
import { PaymentDTO } from '../dto/payment-dto.js';

function toPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: payment.id.value,
    orderId: payment.orderId,
    amount: payment.amount.amount,
    currency: payment.amount.currency,
    method: payment.method,
    status: payment.status,
    pgTransactionId: payment.pgTransactionId,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
  };
}

export class PaymentQueryHandlers {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async getPayment(query: { paymentId: string }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findById(query.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', query.paymentId);
    }
    return toPaymentDTO(payment);
  }

  async getPaymentByOrderId(query: { orderId: string }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findByOrderId(query.orderId);
    if (!payment) {
      throw new NotFoundError('Payment for order', query.orderId);
    }
    return toPaymentDTO(payment);
  }
}
