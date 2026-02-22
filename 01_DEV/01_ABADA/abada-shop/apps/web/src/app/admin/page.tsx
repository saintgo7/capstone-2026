import type { Order, Product, User, ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getStats() {
  try {
    const [ordersRes, productsRes] = await Promise.allSettled([
      fetch(`${API_URL}/api/v1/orders`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/v1/products`, { cache: 'no-store' }),
    ]);

    let orders: Order[] = [];
    let products: Product[] = [];

    if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
      const json: ApiResponse<Order[]> = await ordersRes.value.json();
      orders = json.data ?? [];
    }
    if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
      const json: ApiResponse<Product[]> = await productsRes.value.json();
      products = json.data ?? [];
    }

    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const recentOrders = orders.slice(0, 5);

    return {
      orderCount: orders.length,
      revenue,
      productCount: products.length,
      recentOrders,
    };
  } catch {
    return { orderCount: 0, revenue: 0, productCount: 0, recentOrders: [] };
  }
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '임시',
  CONFIRMED: '주문 확인',
  PAID: '결제 완료',
  SHIPPING: '배송중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불됨',
};

export default async function AdminDashboard() {
  const stats = await getStats();

  const statCards = [
    { label: '총 주문', value: stats.orderCount },
    { label: '총 매출', value: `${stats.revenue.toLocaleString()}원` },
    { label: '상품 수', value: stats.productCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">최근 주문</h2>
        {stats.recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">주문 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-left pb-2 font-medium">주문번호</th>
                <th className="text-left pb-2 font-medium">고객 ID</th>
                <th className="text-left pb-2 font-medium">금액</th>
                <th className="text-left pb-2 font-medium">상태</th>
                <th className="text-left pb-2 font-medium">날짜</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.orderId} className="border-b last:border-0">
                  <td className="py-3 font-mono text-xs text-gray-400">
                    #{order.orderId.slice(0, 8)}
                  </td>
                  <td className="py-3 font-mono text-xs text-gray-400">
                    {order.customerId.slice(0, 8)}
                  </td>
                  <td className="py-3 font-medium">
                    {order.totalAmount.toLocaleString()}원
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR')}
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
