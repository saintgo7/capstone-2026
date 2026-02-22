'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import type { Product, ApiResponse } from '@/types';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '판매중',
  INACTIVE: '비활성',
  OUT_OF_STOCK: '품절',
};

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Product[]>>('/products')
        .then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) =>
      apiClient.delete(`/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const handleDelete = (productId: string, name: string) => {
    if (!confirm(`"${name}" 상품을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(productId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          상품 추가
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">불러오는 중...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">등록된 상품이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상품명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">가격</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">재고</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">상태</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.productId} className="border-t">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3">{product.finalPrice.toLocaleString()}원</td>
                  <td className="px-4 py-3">{product.stockAvailable}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                      {STATUS_LABEL[product.status] ?? product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/products/${product.productId}/edit`}
                        className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => handleDelete(product.productId, product.name)}
                        className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                      >
                        삭제
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
