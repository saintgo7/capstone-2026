'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product, ApiResponse } from '@/types';

interface InventoryAdjust {
  productId: string;
  quantity: number;
}

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [adjusting, setAdjusting] = useState<Record<string, number>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin', 'inventory'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Product[]>>('/products')
        .then((r) => r.data.data),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ productId, quantity }: InventoryAdjust) =>
      apiClient.put(`/inventory/${productId}`, { quantity }),
    onSuccess: (_, { productId }) => {
      setAdjusting((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] });
    },
  });

  const handleAdjust = (productId: string) => {
    const quantity = adjusting[productId];
    if (quantity === undefined) return;
    adjustMutation.mutate({ productId, quantity });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">재고 관리</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">상품이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상품명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">현재 재고</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">재고 조정</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.productId} className="border-t">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.stockAvailable === 0
                          ? 'text-red-600 font-semibold'
                          : product.stockAvailable < 10
                          ? 'text-yellow-600 font-semibold'
                          : ''
                      }
                    >
                      {product.stockAvailable}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {product.stockAvailable === 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-600">품절</span>
                    ) : product.stockAvailable < 10 ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-600">부족</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-600">정상</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={adjusting[product.productId] ?? ''}
                        onChange={(e) =>
                          setAdjusting((prev) => ({
                            ...prev,
                            [product.productId]: Number(e.target.value),
                          }))
                        }
                        placeholder="수량 입력"
                        min={0}
                        className="w-24 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAdjust(product.productId)}
                        disabled={
                          adjusting[product.productId] === undefined ||
                          adjustMutation.isPending
                        }
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        적용
                      </button>
                    </div>
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
