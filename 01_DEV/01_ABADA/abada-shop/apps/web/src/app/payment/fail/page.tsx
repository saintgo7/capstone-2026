'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '결제가 실패했습니다.';

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-red-600 mb-2">결제 실패</h1>
      <p className="text-gray-500 mb-2">{message}</p>
      {code && <p className="text-gray-400 text-sm mb-8">오류 코드: {code}</p>}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/cart')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          장바구니
        </button>
      </div>
    </div>
  );
}
