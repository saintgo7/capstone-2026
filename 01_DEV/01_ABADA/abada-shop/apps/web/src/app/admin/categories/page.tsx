'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Category, ApiResponse } from '@/types';

interface CategoryInput {
  name: string;
  slug: string;
  parentId: string | null;
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryInput>({ name: '', slug: '', parentId: null });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<Category[]>>('/categories')
        .then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryInput) => apiClient.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      setShowForm(false);
      setForm({ name: '', slug: '', parentId: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => apiClient.delete(`/categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });

  const handleDelete = (categoryId: string, name: string) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(categoryId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  // Separate root and child categories
  const rootCategories = categories.filter((c) => c.parentId === null);
  const childMap = categories.reduce<Record<string, Category[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = [...(acc[c.parentId] ?? []), c];
    }
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          카테고리 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 max-w-md">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리명</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">슬러그</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상위 카테고리</label>
              <select
                value={form.parentId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, parentId: e.target.value || null }))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">없음 (최상위)</option>
                {rootCategories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-500">등록에 실패했습니다.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border text-sm rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        {isLoading ? (
          <div className="py-8 text-center text-gray-400">불러오는 중...</div>
        ) : rootCategories.length === 0 ? (
          <div className="py-8 text-center text-gray-400">카테고리가 없습니다.</div>
        ) : (
          <ul className="space-y-1">
            {rootCategories.map((root) => (
              <li key={root.categoryId}>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                  <span className="font-medium text-sm">{root.name}</span>
                  <button
                    onClick={() => handleDelete(root.categoryId, root.name)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </div>
                {childMap[root.categoryId]?.map((child) => (
                  <div
                    key={child.categoryId}
                    className="flex items-center justify-between px-3 py-2 ml-4 rounded-lg hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-600">
                      <span className="text-gray-300 mr-1">└</span>
                      {child.name}
                    </span>
                    <button
                      onClick={() => handleDelete(child.categoryId, child.name)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
