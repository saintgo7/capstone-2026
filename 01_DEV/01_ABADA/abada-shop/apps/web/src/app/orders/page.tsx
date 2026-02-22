'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { Order, ApiResponse } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '임시',
  CONFIRMED: '주문 확인',
  PAID: '결제 완료',
  SHIPPING: '배송중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불됨',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  CONFIRMED: 'bg-blue-100 text-blue-600',
  PAID: 'bg-indigo-100 text-indigo-600',
  SHIPPING: 'bg-yellow-100 text-yellow-600',
  DELIVERED: 'bg-green-100 text-green-600',
  CANCELLED: 'bg-red-100 text-red-600',
  REFUNDED: 'bg-orange-100 text-orange-600',
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Hooks must be called before any conditional return
  const { data, isLoading } = useQuery({
    queryKey: ['orders', user?.userId],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Order[]>>(`/orders?customerId=${user!.userId}`)
        .then((r) => r.data.data),
    enabled: isAuthenticated && !!user?.userId,
  });

  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">주문 내역</h1>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse border rounded-xl p-4 h-24 bg-gray-50" />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">주문 내역이 없습니다.</p>
          <Link
            href="/products"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            쇼핑 시작하기
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((order) => (
          <Link
            key={order.orderId}
            href={`/orders/${order.orderId}`}
            className="block border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-400 font-mono">#{order.orderId.slice(0, 8)}</p>
                <p className="font-medium mt-1">
                  {order.items.length > 0
                    ? `${order.items[0]!.productName}${order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ''}`
                    : '상품 없음'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
                <p className="font-bold mt-2">{order.totalAmount.toLocaleString()}원</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
