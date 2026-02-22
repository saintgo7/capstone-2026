import type { Product, ApiResponse } from '@/types';
import { ProductCard } from './_components/ProductCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/products?status=ACTIVE`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json: ApiResponse<Product[]> = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">전체 상품</h1>
      {!products.length ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <p>등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
