'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

export default function PointsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/mypage/points');
    }
  }, [isAuthenticated, router]);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mypage" className="text-gray-500 hover:text-gray-700">
          &larr;
        </Link>
        <h1 className="text-xl font-bold text-gray-900">포인트 내역</h1>
      </div>

      {/* Points summary */}
      <div className="bg-blue-50 rounded-2xl p-6 text-center mb-6">
        <p className="text-sm text-blue-500 font-medium mb-2">보유 포인트</p>
        <p className="text-4xl font-bold text-blue-700">
          {user.points.toLocaleString()} P
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 text-center text-gray-400 text-sm py-16">
        포인트 내역 기능은 준비 중입니다
      </div>
    </div>
  );
}
