'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const itemCount = useCartStore(s => s.itemCount());

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-brand-600">
          아바다
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-gray-600">
          <Link href="/products" className="hover:text-brand-600 transition-colors">상품</Link>
          <Link href="/orders" className="hover:text-brand-600 transition-colors">주문내역</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative">
            <span className="text-2xl">🛒</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/mypage" className="text-sm text-gray-600 hover:text-brand-600">
                {user?.name}님
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
