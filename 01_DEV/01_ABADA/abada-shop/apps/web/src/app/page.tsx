import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <section className="bg-brand-600 text-white rounded-2xl p-12 mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">아바다 쇼핑몰</h1>
        <p className="text-xl mb-8 text-brand-100">최고의 상품을 합리적인 가격에</p>
        <Link
          href="/products"
          className="inline-block bg-white text-brand-600 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition-colors"
        >
          쇼핑 시작하기
        </Link>
      </section>

      {/* Featured categories */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">카테고리</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['패션', '뷰티', '생활', '식품'].map((category) => (
            <div
              key={category}
              className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="text-3xl mb-2">🛍️</div>
              <div className="font-medium text-gray-700">{category}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
