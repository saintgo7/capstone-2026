'use client';

import { useCartStore } from '@/store/cart-store';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore();

  if (items.length === 0) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-xl font-bold mb-2">장바구니가 비어있습니다</h2>
      <p className="text-gray-500 mb-6">관심 있는 상품을 담아보세요</p>
      <Link href="/products" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors">
        쇼핑 계속하기
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">장바구니</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          {items.map(item => (
            <div key={item.productId} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="bg-gray-100 w-16 h-16 rounded-lg flex items-center justify-center text-2xl">📦</div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-brand-600 font-bold">{item.price.toLocaleString()}원</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-8 h-8 border rounded-full flex items-center justify-center hover:bg-gray-50">-</button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="w-8 h-8 border rounded-full flex items-center justify-center hover:bg-gray-50">+</button>
              </div>
              <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          ))}
        </div>

        <div className="lg:w-80">
          <div className="bg-white rounded-xl p-6 shadow-sm sticky top-20">
            <h2 className="font-bold text-lg mb-4">주문 요약</h2>
            <div className="flex justify-between mb-2 text-gray-600">
              <span>상품 금액</span>
              <span>{total().toLocaleString()}원</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>배송비</span>
              <span>{total() >= 50000 ? '무료' : '3,000원'}</span>
            </div>
            <div className="border-t pt-4 flex justify-between font-bold text-lg mb-6">
              <span>총 결제금액</span>
              <span className="text-brand-600">{(total() + (total() >= 50000 ? 0 : 3000)).toLocaleString()}원</span>
            </div>
            <Link href="/checkout"
              className="block w-full bg-brand-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors">
              주문하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
