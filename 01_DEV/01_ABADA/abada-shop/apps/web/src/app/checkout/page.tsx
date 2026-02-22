'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import type { ApiResponse } from '@/types';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? 'test_ck_mock';

interface CreateOrderResponse {
  orderId: string;
}

interface InitiatePaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  status: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [shippingAddr, setShippingAddr] = useState('');
  const [recipientName, setRecipientName] = useState(user?.name ?? '');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const tossPaymentsRef = useRef<any>(null);

  // Load TossPayments SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (TOSS_CLIENT_KEY === 'test_ck_mock') return; // Skip in mock mode

    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => {
      tossPaymentsRef.current = (window as any).TossPayments(TOSS_CLIENT_KEY);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const orderMutation = useMutation({
    mutationFn: async () => {
      // 1. Create order
      const orderRes = await apiClient.post<ApiResponse<CreateOrderResponse>>('/orders', {
        shippingAddress: shippingAddr,
        recipientName,
        recipientPhone,
      });
      const orderId = orderRes.data.data.orderId;

      // 2. Add items
      for (const item of items) {
        await apiClient.post(`/orders/${orderId}/items`, {
          productId: item.productId,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
        });
      }

      // 3. Confirm order
      await apiClient.post(`/orders/${orderId}/confirm`);

      // 4. Initiate payment
      const paymentRes = await apiClient.post<ApiResponse<InitiatePaymentResponse>>('/payments', {
        orderId,
        amount: total(),
        method: paymentMethod,
      });

      const amount = paymentRes.data.data.amount;
      const firstName = items[0]?.name ?? '상품';
      const orderName = items.length === 1
        ? firstName
        : `${firstName} 외 ${items.length - 1}건`;

      // 5. Redirect to TossPayments
      if (tossPaymentsRef.current) {
        // Real TossPayments SDK flow
        await tossPaymentsRef.current.requestPayment(paymentMethod === 'CARD' ? '카드' : paymentMethod, {
          amount,
          orderId,
          orderName,
          customerName: recipientName,
          successUrl: `${window.location.origin}/payment/success`,
          failUrl: `${window.location.origin}/payment/fail`,
        });
      } else {
        // Mock mode: simulate TossPayments redirect
        clearCart();
        const mockPaymentKey = `toss_mock_${Date.now()}`;
        router.push(
          `/payment/success?paymentKey=${mockPaymentKey}&orderId=${orderId}&amount=${amount}`,
        );
      }

      return orderId;
    },
    onError: () => {
      // Error is shown in UI
    },
  });

  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">장바구니가 비어있습니다.</p>
        <button
          onClick={() => router.push('/products')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          쇼핑 계속하기
        </button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddr || !recipientName || !recipientPhone) return;
    orderMutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">주문 결제</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Items */}
        <section className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">주문 상품</h2>
          {items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span>
                {item.name} x {item.quantity}
              </span>
              <span className="font-medium">
                {(item.price * item.quantity).toLocaleString()}원
              </span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>합계</span>
            <span className="text-blue-600">{total().toLocaleString()}원</span>
          </div>
        </section>

        {/* Payment Method */}
        <section className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">결제 수단</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'CARD', label: '신용카드' },
              { value: 'BANK_TRANSFER', label: '계좌이체' },
              { value: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  paymentMethod === method.value
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </section>

        {/* Shipping Info */}
        <section className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">배송 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">수령인</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
              placeholder="수령인 이름"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">연락처</label>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              required
              placeholder="010-0000-0000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">배송 주소</label>
            <textarea
              value={shippingAddr}
              onChange={(e) => setShippingAddr(e.target.value)}
              required
              rows={3}
              placeholder="배송 받으실 주소를 입력하세요"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </section>

        {orderMutation.isError && (
          <p className="text-red-500 text-sm text-center">
            주문 처리 중 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
        )}

        <button
          type="submit"
          disabled={orderMutation.isPending}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {orderMutation.isPending ? '결제 진행 중...' : `${total().toLocaleString()}원 결제하기`}
        </button>
      </form>
    </div>
  );
}
