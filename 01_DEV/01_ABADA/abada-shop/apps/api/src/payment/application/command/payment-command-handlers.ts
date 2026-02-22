import { PaymentRepository } from '../../domain/repository/payment-repository.js';
import { Payment } from '../../domain/model/payment.js';
import { Money } from '../../../order/domain/value-object/money.js';
import { NotFoundError, ValidationError } from '../../../shared/domain/index.js';
import { PaymentDTO } from '../dto/payment-dto.js';
import { TossPaymentsGateway } from '../../infrastructure/external/toss-payments-gateway.js';

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

export class PaymentCommandHandlers {
  private readonly tossGateway: TossPaymentsGateway;

  constructor(private readonly paymentRepo: PaymentRepository) {
    this.tossGateway = new TossPaymentsGateway();
  }

  async initiatePayment(cmd: {
    orderId: string;
    amount: number;
    currency?: string;
    method: string;
  }): Promise<PaymentDTO> {
    const money = Money.create(cmd.amount, cmd.currency ?? 'KRW');
    const payment = Payment.initiate(cmd.orderId, money, cmd.method);
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }

  async completePayment(cmd: {
    paymentId: string;
    pgTransactionId?: string;
  }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findById(cmd.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', cmd.paymentId);
    }
    payment.complete(cmd.pgTransactionId);
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }

  /** Confirm payment via TossPayments PG */
  async confirmTossPayment(cmd: {
    paymentKey: string;
    orderId: string;
    amount: number;
  }): Promise<PaymentDTO> {
    // Find existing payment by orderId
    const payment = await this.paymentRepo.findByOrderId(cmd.orderId);
    if (!payment) {
      throw new NotFoundError('Payment for order', cmd.orderId);
    }

    // Validate amount matches
    if (payment.amount.amount !== cmd.amount) {
      throw new ValidationError(
        `Amount mismatch: expected ${payment.amount.amount}, got ${cmd.amount}`,
      );
    }

    // Call TossPayments confirm API
    const pgResult = await this.tossGateway.confirmPayment({
      paymentKey: cmd.paymentKey,
      orderId: cmd.orderId,
      amount: cmd.amount,
    });

    // Complete the domain payment with PG transaction ID
    payment.complete(pgResult.paymentKey);
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }

  /** Cancel payment via TossPayments PG */
  async cancelTossPayment(cmd: {
    paymentId: string;
    reason: string;
    cancelAmount?: number;
  }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findById(cmd.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', cmd.paymentId);
    }

    if (!payment.pgTransactionId) {
      throw new ValidationError('No PG transaction ID found for this payment');
    }

    // Call TossPayments cancel API
    await this.tossGateway.cancelPayment({
      paymentKey: payment.pgTransactionId,
      cancelReason: cmd.reason,
      cancelAmount: cmd.cancelAmount,
    });

    // Refund the domain payment
    payment.refund();
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }

  async failPayment(cmd: {
    paymentId: string;
    reason: string;
  }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findById(cmd.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', cmd.paymentId);
    }
    payment.fail(cmd.reason);
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }

  async refundPayment(cmd: { paymentId: string }): Promise<PaymentDTO> {
    const payment = await this.paymentRepo.findById(cmd.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment', cmd.paymentId);
    }
    payment.refund();
    await this.paymentRepo.save(payment);
    return toPaymentDTO(payment);
  }
}
