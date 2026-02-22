'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
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

const TABS = [
  { key: '', label: '전체' },
  { key: 'CONFIRMED', label: '주문 확인' },
  { key: 'PAID', label: '결제 완료' },
  { key: 'SHIPPING', label: '배송중' },
  { key: 'DELIVERED', label: '배송 완료' },
  { key: 'CANCELLED', label: '취소됨' },
];

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  CONFIRMED: { status: 'SHIPPING', label: '배송 시작' },
  PAID: { status: 'SHIPPING', label: '배송 시작' },
  SHIPPING: { status: 'DELIVERED', label: '배송 완료' },
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Order[]>>('/orders')
        .then((r) => r.data.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiClient.patch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });

  const filtered = activeTab
    ? orders.filter((o) => o.status === activeTab)
    : orders;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">주문 관리</h1>

      <div className="flex gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">주문이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">주문번호</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">고객 ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">금액</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">날짜</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <tr key={order.orderId} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      #{order.orderId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {order.customerId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {order.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      {next && (
                        <button
                          onClick={() =>
                            statusMutation.mutate({
                              orderId: order.orderId,
                              status: next.status,
                            })
                          }
                          disabled={statusMutation.isPending}
                          className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          {next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
