import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED';

interface Order {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '주문 대기',
  CONFIRMED: '주문 확인',
  PREPARING: '상품 준비중',
  SHIPPING: '배송중',
  DELIVERED: '배송 완료',
  CANCELLED: '취소됨',
  REFUNDING: '환불 처리중',
  REFUNDED: '환불 완료',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PREPARING: '#8b5cf6',
  SHIPPING: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#6b7280',
  REFUNDING: '#ef4444',
  REFUNDED: '#9ca3af',
};

async function fetchOrders(): Promise<Order[]> {
  const [token, userStr] = await Promise.all([
    AsyncStorage.getItem('accessToken'),
    AsyncStorage.getItem('user'),
  ]);

  if (!token) return [];

  const res = await fetch(`${API_URL}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export default function OrdersScreen() {
  const router = useRouter();
  const [hasToken, setHasToken] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('accessToken').then(token => {
      setHasToken(!!token);
    });
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    enabled: hasToken === true,
  });

  if (hasToken === null || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!hasToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.promptText}>로그인이 필요합니다</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginBtnText}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>주문 내역을 불러올 수 없습니다</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={item => item.orderId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const statusColor = STATUS_COLOR[item.status] ?? '#6b7280';
        const statusLabel = STATUS_LABEL[item.status] ?? item.status;
        const date = new Date(item.createdAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/order/${item.orderId}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.dateText}>{date}</Text>
              <Text style={styles.itemCount}>{item.itemCount}개 상품</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.totalLabel}>결제 금액</Text>
              <Text style={styles.totalAmount}>
                {item.totalAmount.toLocaleString()}원
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>주문 내역이 없습니다</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateText: { fontSize: 13, color: '#6b7280' },
  itemCount: { fontSize: 13, color: '#6b7280' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  totalLabel: { fontSize: 13, color: '#6b7280' },
  totalAmount: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  promptText: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  loginBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  errorText: { color: '#ef4444', marginBottom: 12, fontSize: 14 },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#6b7280', fontSize: 14 },
});
