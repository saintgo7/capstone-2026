'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
}

const addressSchema = z.object({
  label: z.string().min(1, '별칭을 입력하세요').max(20),
  recipientName: z.string().min(1, '수령인을 입력하세요'),
  phone: z.string().min(10, '연락처를 입력하세요'),
  zipCode: z.string().length(5, '우편번호 5자리를 입력하세요'),
  address1: z.string().min(1, '주소를 입력하세요'),
  address2: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/mypage/addresses');
    }
  }, [isAuthenticated, router]);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses', user?.userId],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Address[]>>('/users/me/addresses')
        .then((r) => r.data.data),
    enabled: !!user?.userId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: false },
  });

  const addMutation = useMutation({
    mutationFn: (data: AddressForm) =>
      apiClient.post('/users/me/addresses', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.userId] });
      reset();
      setShowForm(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (addressId: string) =>
      apiClient.delete(`/users/me/addresses/${addressId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', user?.userId] });
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/mypage" className="text-gray-500 hover:text-gray-700">
          &larr;
        </Link>
        <h1 className="text-xl font-bold text-gray-900">배송지 관리</h1>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">불러오는 중...</p>
      ) : (
        <ul className="space-y-3">
          {addresses?.map((addr) => (
            <li key={addr.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {addr.recipientName} · {addr.phone}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    [{addr.zipCode}] {addr.address1} {addr.address2}
                  </p>
                </div>
                <button
                  onClick={() => removeMutation.mutate(addr.id)}
                  disabled={removeMutation.isPending}
                  className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
          {!addresses?.length && (
            <li className="text-center py-10 text-gray-400">등록된 배송지가 없습니다</li>
          )}
        </ul>
      )}

      {showForm ? (
        <form
          onSubmit={handleSubmit((data) => addMutation.mutate(data))}
          className="bg-white rounded-xl shadow-sm p-5 space-y-4"
        >
          <h2 className="font-semibold text-gray-900">새 배송지 추가</h2>
          {[
            { name: 'label' as const, label: '별칭 (예: 집, 회사)' },
            { name: 'recipientName' as const, label: '수령인' },
            { name: 'phone' as const, label: '연락처' },
            { name: 'zipCode' as const, label: '우편번호 (5자리)' },
            { name: 'address1' as const, label: '기본 주소' },
            { name: 'address2' as const, label: '상세 주소 (선택)' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                {...register(name)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors[name] && (
                <p className="text-xs text-red-500 mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('isDefault')} className="rounded" />
            기본 배송지로 설정
          </label>
          {addMutation.isError && (
            <p className="text-sm text-red-600">저장에 실패했습니다. 다시 시도하세요.</p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); reset(); }}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || addMutation.isPending}
              className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + 새 배송지 추가
        </button>
      )}
    </div>
  );
}
