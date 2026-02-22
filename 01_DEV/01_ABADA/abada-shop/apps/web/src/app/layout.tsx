import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: {
    default: '아바다 쇼핑몰',
    template: '%s | 아바다',
  },
  description: '아바다 쇼핑몰 - 최고의 상품을 최저가에',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <Header />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
