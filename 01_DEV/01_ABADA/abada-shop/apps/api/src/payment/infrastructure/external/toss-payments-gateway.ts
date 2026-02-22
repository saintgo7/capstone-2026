import { ApplicationError } from '../../../shared/domain/index.js';

export interface PaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface PaymentConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  totalAmount: number;
  method: string;
  approvedAt: string;
  card?: {
    number: string;
    company: string;
    installmentPlanMonths: number;
  };
  receipt?: {
    url: string;
  };
}

export interface PaymentCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}

export interface PaymentCancelResponse {
  paymentKey: string;
  status: string;
  cancels: Array<{
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  }>;
}

export class TossPaymentsError extends ApplicationError {
  constructor(
    message: string,
    public readonly pgCode: string,
  ) {
    super(message, 'PG_ERROR');
    this.name = 'TossPaymentsError';
  }
}

export class TossPaymentsGateway {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env['TOSS_API_BASE_URL'] ?? 'https://api.tosspayments.com/v1';
    this.secretKey = process.env['TOSS_SECRET_KEY'] ?? 'test_sk_mock';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  private isTestMode(): boolean {
    return this.secretKey === 'test_sk_mock' || this.secretKey.startsWith('test_');
  }

  async confirmPayment(req: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
    if (this.isTestMode()) {
      return this.mockConfirm(req);
    }

    const response = await fetch(`${this.baseUrl}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: 'Unknown error' })) as { code: string; message: string };
      throw new TossPaymentsError(
        error.message ?? 'Payment confirmation failed',
        error.code ?? 'UNKNOWN',
      );
    }

    return response.json() as Promise<PaymentConfirmResponse>;
  }

  async cancelPayment(req: PaymentCancelRequest): Promise<PaymentCancelResponse> {
    if (this.isTestMode()) {
      return this.mockCancel(req);
    }

    const response = await fetch(`${this.baseUrl}/payments/${req.paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason: req.cancelReason,
        cancelAmount: req.cancelAmount,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: 'Unknown error' })) as { code: string; message: string };
      throw new TossPaymentsError(
        error.message ?? 'Payment cancellation failed',
        error.code ?? 'UNKNOWN',
      );
    }

    return response.json() as Promise<PaymentCancelResponse>;
  }

  private mockConfirm(req: PaymentConfirmRequest): PaymentConfirmResponse {
    return {
      paymentKey: req.paymentKey,
      orderId: req.orderId,
      status: 'DONE',
      totalAmount: req.amount,
      method: 'CARD',
      approvedAt: new Date().toISOString(),
      card: {
        number: '4330****1234',
        company: 'SHINHAN',
        installmentPlanMonths: 0,
      },
      receipt: {
        url: `https://mock-receipt.tosspayments.com/${req.paymentKey}`,
      },
    };
  }

  private mockCancel(req: PaymentCancelRequest): PaymentCancelResponse {
    return {
      paymentKey: req.paymentKey,
      status: 'CANCELED',
      cancels: [
        {
          cancelAmount: req.cancelAmount ?? 0,
          cancelReason: req.cancelReason,
          canceledAt: new Date().toISOString(),
        },
      ],
    };
  }
}
