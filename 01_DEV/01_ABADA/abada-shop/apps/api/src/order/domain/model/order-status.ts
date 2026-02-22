export enum OrderStatus {
  DRAFT = 'DRAFT',           // 장바구니/주문서 작성 중
  CONFIRMED = 'CONFIRMED',   // 주문 확정 (재고 예약)
  PAID = 'PAID',             // 결제 완료
  SHIPPING = 'SHIPPING',     // 배송 중
  DELIVERED = 'DELIVERED',   // 배송 완료
  CANCELLED = 'CANCELLED',   // 취소
  REFUNDED = 'REFUNDED',     // 환불 완료
}

export const CANCELLABLE_STATUSES = new Set([
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
]);
