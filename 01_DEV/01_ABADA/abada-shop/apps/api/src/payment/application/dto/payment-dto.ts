export interface PaymentDTO {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  pgTransactionId: string | null;
  failureReason: string | null;
  createdAt: Date;
}
