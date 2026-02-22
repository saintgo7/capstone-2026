'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/types';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore(s => s.addItem);

  const handleAddToCart = () => {
    addItem({
      productId: product.productId,
      name: product.name,
      price: product.finalPrice,
      imageUrl: product.imageUrls[0],
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.productId}`}>
        <div className="bg-gray-100 h-48 flex items-center justify-center">
          {product.imageUrls[0] ? (
            <img src={product.imageUrls[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">📦</span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link href={`/products/${product.productId}`}>
          <h3 className="font-medium text-gray-800 mb-1 truncate hover:text-blue-600">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-2 mb-3">
          {product.discountRate > 0 && (
            <span className="text-red-500 font-bold text-sm">{product.discountRate}%</span>
          )}
          <span className="font-bold text-gray-900">
            {product.finalPrice.toLocaleString()}원
          </span>
          {product.discountRate > 0 && (
            <span className="text-gray-400 text-sm line-through">
              {product.price.toLocaleString()}원
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stockAvailable === 0}
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          {product.stockAvailable === 0 ? '품절' : '장바구니 담기'}
        </button>
      </div>
    </div>
  );
}
