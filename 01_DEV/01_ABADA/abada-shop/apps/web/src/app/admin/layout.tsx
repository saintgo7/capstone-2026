import { ReactNode } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/products', label: '상품 관리' },
  { href: '/admin/orders', label: '주문 관리' },
  { href: '/admin/users', label: '회원 관리' },
  { href: '/admin/inventory', label: '재고 관리' },
  { href: '/admin/categories', label: '카테고리' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-bold text-lg">ABADA Admin</h1>
        </div>
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white mb-1"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
