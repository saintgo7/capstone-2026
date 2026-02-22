'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Order } from '@/types';

const GRADE_LABEL: Record<string, string> = {
  NORMAL: '일반',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
  VVIP: 'VVIP',
};

const GRADE_COLOR: Record<string, string> = {
  NORMAL: '#6b7280',
  SILVER: '#9ca3af',
  GOLD: '#d97706',
  VIP: '#7c3aed',
  VVIP: '#1d4ed8',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '장바구니',
  CONFIRMED: '주문확인',
  PAID: '결제완료',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불완료',
};

export default function MypagePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/mypage');
    }
  }, [isAuthenticated, router]);

  const { data: recentOrders } = useQuery({
    queryKey: ['orders', user?.userId, 'recent'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Order[]>>(`/orders?customerId=${user!.userId}`)
        .then((r) => r.data.data.slice(0, 3)),
    enabled: !!user?.userId,
  });

  if (!user) return null;

  const gradeColor = GRADE_COLOR[user.grade] ?? '#6b7280';
  const gradeLabel = GRADE_LABEL[user.grade] ?? user.grade;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ backgroundColor: gradeColor }}
        >
          {user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <span
            className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: gradeColor }}
          >
            {gradeLabel}
          </span>
        </div>
      </div>

      {/* Points & Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-2xl p-5 text-center">
          <p className="text-xs text-blue-500 font-medium mb-1">보유 포인트</p>
          <p className="text-2xl font-bold text-blue-700">
            {user.points.toLocaleString()} P
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-5 text-center">
          <p className="text-xs text-gray-500 font-medium mb-1">누적 구매액</p>
          <p className="text-2xl font-bold text-gray-700">
            {user.totalSpent.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* Quick Menu */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <span className="text-lg mr-3">📋</span>
          <span className="flex-1 text-sm font-medium text-gray-800">주문 내역</span>
          <span className="text-gray-400">›</span>
        </Link>
        <Link
          href="/mypage/addresses"
          className="flex items-center px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <span className="text-lg mr-3">📍</span>
          <span className="flex-1 text-sm font-medium text-gray-800">배송지 관리</span>
          <span className="text-gray-400">›</span>
        </Link>
        <Link
          href="/mypage/points"
          className="flex items-center px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <span className="text-lg mr-3">💎</span>
          <span className="flex-1 text-sm font-medium text-gray-800">포인트 내역</span>
          <span className="text-gray-400">›</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-5 py-4 hover:bg-red-50 transition-colors"
        >
          <span className="text-lg mr-3">🚪</span>
          <span className="flex-1 text-left text-sm font-medium text-red-500">로그아웃</span>
        </button>
      </div>

      {/* Recent Orders */}
      {recentOrders && recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">최근 주문</h2>
            <Link href="/orders" className="text-xs text-blue-600 hover:underline">
              전체 보기
            </Link>
          </div>
          <ul className="space-y-3">
            {recentOrders.map((order) => (
              <li key={order.orderId}>
                <Link
                  href={`/orders/${order.orderId}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {order.totalAmount.toLocaleString()}원
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
