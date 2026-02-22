import { PrismaClient } from '@prisma/client';
import { Payment, PaymentId, PaymentStatus } from '../../domain/model/payment.js';
import { Money } from '../../../order/domain/value-object/money.js';
import { PaymentRepository } from '../../domain/repository/payment-repository.js';

// Map Prisma PaymentStatus enum values to domain PaymentStatus
function mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'COMPLETED': return PaymentStatus.COMPLETED;
    case 'FAILED': return PaymentStatus.FAILED;
    case 'REFUNDED': return PaymentStatus.REFUNDED;
    default: return PaymentStatus.INITIATED;
  }
}

function reconstitute(row: any): Payment {
  const money = Money.create(Number(row.requestedAmount), 'KRW');
  return (Payment as any).reconstitute({
    id: row.id,
    orderId: row.orderId,
    amount: money,
    method: row.method,
    status: mapStatus(row.status),
    failureReason: row.failReason ?? null,
    pgTransactionId: row.paymentKey ?? null,
    createdAt: row.createdAt,
  });
}

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(payment: Payment): Promise<void> {
    const db = this.db as any;

    // Map domain status to Prisma enum
    const statusMap: Record<string, string> = {
      INITIATED: 'PENDING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REFUNDED: 'REFUNDED',
    };
    const prismaStatus = statusMap[payment.status] ?? 'PENDING';

    // Map domain method to Prisma enum
    const methodMap: Record<string, string> = {
      CARD: 'CARD',
      VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
      BANK_TRANSFER: 'TRANSFER',
      KAKAO_PAY: 'KAKAO_PAY',
      NAVER_PAY: 'NAVER_PAY',
      POINT: 'POINT',
    };
    const prismaMethod = methodMap[payment.method] ?? 'CARD';

    await db.payment.upsert({
      where: { id: payment.id.value },
      create: {
        id: payment.id.value,
        orderId: payment.orderId,
        method: prismaMethod,
        status: prismaStatus,
        requestedAmount: BigInt(payment.amount.amount),
        paidAmount: payment.status === 'COMPLETED' ? BigInt(payment.amount.amount) : null,
        paymentKey: payment.pgTransactionId,
        failReason: payment.failureReason,
        paidAt: payment.status === 'COMPLETED' ? new Date() : null,
        failedAt: payment.status === 'FAILED' ? new Date() : null,
      },
      update: {
        status: prismaStatus,
        paidAmount: payment.status === 'COMPLETED' ? BigInt(payment.amount.amount) : null,
        paymentKey: payment.pgTransactionId,
        failReason: payment.failureReason,
        paidAt: payment.status === 'COMPLETED' ? new Date() : null,
        failedAt: payment.status === 'FAILED' ? new Date() : null,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    const db = this.db as any;
    const row = await db.payment.findUnique({ where: { id } });
    if (!row) return null;
    return reconstitute(row);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const db = this.db as any;
    const row = await db.payment.findUnique({ where: { orderId } });
    if (!row) return null;
    return reconstitute(row);
  }
}
