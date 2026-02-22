import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderDetail {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  carrier?: string;
  trackingNumber?: string;
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

async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(`${API_URL}/api/v1/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Order not found');
  const json = await res.json();
  return json.data;
}

async function cancelOrder(id: string): Promise<void> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(`${API_URL}/api/v1/orders/${id}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Failed to cancel order');
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderDetail(id),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('완료', '주문이 취소되었습니다.');
    },
    onError: () => {
      Alert.alert('오류', '주문 취소에 실패했습니다.');
    },
  });

  const handleCancel = () => {
    Alert.alert('주문 취소', '정말로 주문을 취소하시겠습니까?', [
      { text: '아니오', style: 'cancel' },
      {
        text: '취소하기',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>주문을 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;
  const createdDate = new Date(order.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canCancel = order.status === 'CONFIRMED' || order.status === 'PENDING';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Header */}
      <View style={styles.section}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{createdDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>주문 상품</Text>
        {order.items.map((item, index) => (
          <View
            key={item.productId}
            style={[
              styles.itemRow,
              index < order.items.length - 1 && styles.itemDivider,
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <Text style={styles.itemQty}>{item.quantity}개</Text>
            </View>
            <Text style={styles.itemSubtotal}>{item.subtotal.toLocaleString()}원</Text>
          </View>
        ))}
      </View>

      {/* Shipping Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>배송 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>수령인</Text>
          <Text style={styles.infoValue}>{order.recipientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>연락처</Text>
          <Text style={styles.infoValue}>{order.recipientPhone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>주소</Text>
          <Text style={[styles.infoValue, styles.addressValue]}>{order.shippingAddress}</Text>
        </View>
        {order.trackingNumber && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>택배사</Text>
              <Text style={styles.infoValue}>{order.carrier ?? '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>운송장</Text>
              <Text style={styles.infoValue}>{order.trackingNumber}</Text>
            </View>
          </>
        )}
      </View>

      {/* Payment Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>결제 금액</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>총 결제 금액</Text>
          <Text style={styles.totalAmount}>{order.totalAmount.toLocaleString()}원</Text>
        </View>
      </View>

      {/* Cancel Button */}
      {canCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, cancelMutation.isPending && styles.cancelBtnDisabled]}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.cancelBtnText}>주문 취소</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  orderDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
  itemQty: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#6b7280', width: 60 },
  infoValue: { fontSize: 13, color: '#1f2937', flex: 1, textAlign: 'right' },
  addressValue: { flexShrink: 1 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#6b7280' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },

  cancelBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },

  errorText: { color: '#ef4444', marginBottom: 12, fontSize: 14 },
  backBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: { color: '#1f2937', fontWeight: '600' },
});
