import { describe, it, expect } from 'vitest';
import { Product } from '../../../src/product/domain/model/product.js';
import { Price } from '../../../src/product/domain/value-object/price.js';
import { Stock } from '../../../src/product/domain/value-object/stock.js';
import { ProductStatus } from '../../../src/product/domain/model/product-status.js';

describe('Product', () => {
  const makeProduct = () => Product.create({
    categoryId: '550e8400-e29b-41d4-a716-446655440001',
    name: '테스트 상품',
    description: '설명',
    priceAmount: 29000,
    initialStock: 100,
  });

  it('creates a DRAFT product', () => {
    const p = makeProduct();
    expect(p.status).toBe(ProductStatus.DRAFT);
    expect(p.name).toBe('테스트 상품');
    expect(p.stock.quantity).toBe(100);
    expect(p.price.amount).toBe(29000);
  });

  it('activates product', () => {
    const p = makeProduct();
    p.collectEvents(); // clear ProductCreated
    p.activate();
    expect(p.status).toBe(ProductStatus.ACTIVE);
    const events = p.collectEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.constructor.name).toBe('ProductActivated');
  });

  it('deactivates active product', () => {
    const p = makeProduct();
    p.activate();
    p.collectEvents(); // clear
    p.deactivate();
    expect(p.status).toBe(ProductStatus.INACTIVE);
  });

  it('changes price', () => {
    const p = makeProduct();
    p.collectEvents(); // clear initial
    p.changePrice(35000);
    expect(p.price.amount).toBe(35000);
    const events = p.collectEvents();
    expect(events[0]!.constructor.name).toBe('ProductPriceChanged');
  });

  it('sets discount rate', () => {
    const p = makeProduct();
    p.setDiscount(10);
    expect(p.price.discountRate).toBe(10);
    expect(p.price.finalAmount).toBe(26100); // 29000 * 0.9
  });

  it('adds stock', () => {
    const p = makeProduct();
    p.collectEvents(); // clear
    p.addStock(50);
    expect(p.stock.quantity).toBe(150);
    const events = p.collectEvents();
    expect(events[0]!.constructor.name).toBe('ProductStockUpdated');
  });

  it('validates price non-negative', () => {
    expect(() => Price.create(-1)).toThrow();
  });

  it('validates stock quantity', () => {
    expect(() => Stock.create(-1)).toThrow();
    expect(() => Stock.create(10, 11)).toThrow();
  });

  it('limits image count to 10', () => {
    const p = makeProduct();
    for (let i = 0; i < 10; i++) p.addImage(`https://example.com/img${i}.jpg`);
    expect(() => p.addImage('https://example.com/overflow.jpg')).toThrow();
  });
});
