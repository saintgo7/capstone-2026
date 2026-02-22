'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/types';

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = () => {
    addItem({
      productId: product.productId,
      name: product.name,
      price: product.finalPrice,
      imageUrl: product.imageUrls[0] ?? '',
    });
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.productId,
      name: product.name,
      price: product.finalPrice,
      imageUrl: product.imageUrls[0] ?? '',
    });
    router.push('/checkout');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← 목록으로
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
          {product.imageUrls[0] ? (
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-400 text-6xl">📦</span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">{product.categoryId}</p>
            <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
          </div>

          <div>
            {product.discountRate > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold text-lg">{product.discountRate}%</span>
                <span className="text-gray-400 line-through text-sm">
                  {product.price.toLocaleString()}원
                </span>
              </div>
            )}
            <p className="text-3xl font-bold text-blue-600">
              {product.finalPrice.toLocaleString()}원
            </p>
          </div>

          <p className="text-gray-600">{product.description}</p>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>재고:</span>
            <span className={product.stockAvailable > 0 ? 'text-green-600' : 'text-red-500'}>
              {product.stockAvailable > 0 ? `${product.stockAvailable}개` : '품절'}
            </span>
          </div>

          {product.stockAvailable > 0 ? (
            <div className="space-y-2 pt-4">
              <button
                onClick={handleBuyNow}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                바로 구매
              </button>
              <button
                onClick={handleAddToCart}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                장바구니 담기
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full py-3 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed mt-4"
            >
              품절
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
