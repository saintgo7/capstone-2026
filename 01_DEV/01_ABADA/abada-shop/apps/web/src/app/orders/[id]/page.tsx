'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { Order, ApiResponse } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '임시 저장',
  CONFIRMED: '주문 확인',
  SHIPPED: '배송중',
  DELIVERED: '배송 완료',
  CANCELLED: '주문 취소',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () =>
      apiClient.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.post(`/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-500">
        주문 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const order = data;
  const canCancel = order.status === 'DRAFT' || order.status === 'CONFIRMED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← 주문 내역
      </button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">주문 상세</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="space-y-4">
        {/* Order ID */}
        <section className="border rounded-xl p-4">
          <p className="text-xs text-gray-400">주문 번호</p>
          <p className="font-mono text-sm mt-1">{order.orderId}</p>
          <p className="text-xs text-gray-400 mt-2">주문 일시</p>
          <p className="text-sm mt-1">
            {new Date(order.createdAt).toLocaleString('ko-KR')}
          </p>
        </section>

        {/* Items */}
        <section className="border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">주문 상품</h2>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-gray-400">수량: {item.quantity}</p>
              </div>
              <p className="font-medium">
                {(item.unitPrice * item.quantity).toLocaleString()}원
              </p>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t pt-2">
            <span>합계</span>
            <span className="text-blue-600">{order.totalAmount.toLocaleString()}원</span>
          </div>
        </section>

        {/* Shipping */}
        {order.shippingAddress && (
          <section className="border rounded-xl p-4 space-y-2">
            <h2 className="font-semibold">배송 정보</h2>
            <p className="text-sm text-gray-600">{order.recipientName}</p>
            <p className="text-sm text-gray-600">{order.recipientPhone}</p>
            <p className="text-sm text-gray-600">{order.shippingAddress}</p>
          </section>
        )}

        {/* Actions */}
        {canCancel && (
          <button
            onClick={() => {
              if (window.confirm('주문을 취소하시겠습니까?')) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
            className="w-full py-3 border border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {cancelMutation.isPending ? '취소 처리 중...' : '주문 취소'}
          </button>
        )}

        <Link
          href="/products"
          className="block w-full py-3 text-center bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          계속 쇼핑하기
        </Link>
      </div>
    </div>
  );
}
