'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { User, ApiResponse } from '@/types';

const GRADE_LABEL: Record<string, string> = {
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
};

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<User[]>>('/users')
        .then((r) => r.data.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">회원 관리</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">회원이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">이름</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">이메일</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">등급</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">포인트</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">가입일</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-600">
                      {GRADE_LABEL[user.grade] ?? user.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">{user.points.toLocaleString()}P</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-600'
                          : user.status === 'SUSPENDED'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABEL[user.status] ?? user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
