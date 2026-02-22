import { describe, it, expect } from 'vitest';
import { Order } from '../../../src/order/domain/model/order.js';
import { OrderStatus } from '../../../src/order/domain/model/order-status.js';
import { DomainError } from '../../../src/shared/domain/errors.js';

describe('Order', () => {
  const makeOrder = () => Order.create({
    customerId: 'customer-001',
    shippingAddress: '서울시 강남구 테헤란로 123',
  });

  const addItem = (order: Order) => order.addItem({
    productId: 'product-001',
    productName: 'MacBook Pro',
    quantity: 1,
    unitPriceAmount: 3_500_000,
  });

  describe('create', () => {
    it('DRAFT 상태로 생성된다', () => {
      expect(makeOrder().status).toBe(OrderStatus.DRAFT);
    });

    it('OrderCreated 이벤트를 발행한다', () => {
      const order = makeOrder();
      const events = order.collectEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('OrderCreated');
    });
  });

  describe('addItem', () => {
    it('아이템 추가 후 itemCount가 증가한다', () => {
      const order = makeOrder();
      addItem(order);
      expect(order.itemCount).toBe(1);
    });

    it('아이템 추가 후 total이 계산된다', () => {
      const order = makeOrder();
      addItem(order);
      expect(order.total.amount).toBe(3_500_000);
    });

    it('DRAFT가 아닌 주문에 아이템 추가 시 DomainError', () => {
      const order = makeOrder();
      addItem(order);
      order.confirm();
      expect(() => addItem(order)).toThrow(DomainError);
    });
  });

  describe('confirm', () => {
    it('아이템이 있는 주문을 확정할 수 있다', () => {
      const order = makeOrder();
      addItem(order);
      order.confirm();
      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('빈 주문 확정 시 DomainError', () => {
      const order = makeOrder();
      expect(() => order.confirm()).toThrow(DomainError);
    });

    it('OrderConfirmed 이벤트를 발행한다', () => {
      const order = makeOrder();
      addItem(order);
      order.collectEvents();
      order.confirm();
      const events = order.collectEvents();
      expect(events.some(e => e.eventType === 'OrderConfirmed')).toBe(true);
    });
  });

  describe('cancel', () => {
    it('DRAFT 주문을 취소할 수 있다', () => {
      const order = makeOrder();
      order.cancel('변심');
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('CONFIRMED 주문을 취소할 수 있다', () => {
      const order = makeOrder();
      addItem(order);
      order.confirm();
      order.cancel('재고 부족');
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('PAID 주문은 취소할 수 없다', () => {
      const order = makeOrder();
      addItem(order);
      order.confirm();
      order.markAsPaid('payment-001');
      expect(() => order.cancel('환불')).toThrow(DomainError);
    });
  });

  describe('total 계산', () => {
    it('여러 아이템의 합계를 계산한다', () => {
      const order = makeOrder();
      order.addItem({ productId: 'p1', productName: 'A', quantity: 2, unitPriceAmount: 100_000 });
      order.addItem({ productId: 'p2', productName: 'B', quantity: 1, unitPriceAmount: 50_000 });
      expect(order.total.amount).toBe(250_000);
    });
  });
});
