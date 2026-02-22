import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

type PaymentMethod = 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CARD', label: '신용카드' },
  { key: 'VIRTUAL_ACCOUNT', label: '가상계좌' },
  { key: 'TRANSFER', label: '계좌이체' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('cart'),
      AsyncStorage.getItem('user'),
    ]).then(([cart, user]) => {
      if (cart) setItems(JSON.parse(cart));
      if (user) {
        const u = JSON.parse(user);
        setRecipientName(u.name ?? '');
      }
    });
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!recipientName.trim() || !recipientPhone.trim() || !address.trim()) {
      Alert.alert('알림', '모든 배송 정보를 입력해주세요');
      return;
    }
    if (items.length === 0) {
      Alert.alert('알림', '장바구니가 비어있습니다');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. 주문 생성
      const orderRes = await fetch(`${API_URL}/api/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shippingAddress: address,
          recipientName,
          recipientPhone,
        }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderJson.message ?? '주문 생성 실패');
      const orderId: string = orderJson.data.orderId;

      // 2. 주문 상품 추가
      for (const item of items) {
        await fetch(`${API_URL}/api/v1/orders/${orderId}/items`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: item.productId,
            productName: item.name,
            unitPrice: item.price,
            quantity: item.quantity,
          }),
        });
      }

      // 3. 주문 확인
      await fetch(`${API_URL}/api/v1/orders/${orderId}/confirm`, {
        method: 'POST',
        headers,
      });

      // 4. 결제 생성 (Mock)
      const paymentRes = await fetch(`${API_URL}/api/v1/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, amount: total, method: paymentMethod }),
      });
      const paymentJson = await paymentRes.json();
      const paymentId: string | undefined = paymentJson.data?.paymentId;

      // 5. 결제 승인 (Mock)
      if (paymentId) {
        await fetch(`${API_URL}/api/v1/payments/${paymentId}/complete`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pgPaymentKey: `mock_${Date.now()}` }),
        });
      }

      // 6. 장바구니 비우기
      await AsyncStorage.removeItem('cart');

      // 7. 주문 상세로 이동
      router.replace(`/order/${orderId}` as any);
    } catch (error: any) {
      Alert.alert('오류', error.message ?? '결제 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>주문 결제</Text>

        {/* 주문 상품 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주문 상품</Text>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>장바구니가 비어있습니다</Text>
          ) : (
            items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name} x {item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  {(item.price * item.quantity).toLocaleString()}원
                </Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>합계</Text>
            <Text style={styles.totalAmount}>{total.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 배송 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>배송 정보</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>수령인</Text>
            <TextInput
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="수령인 이름"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>연락처</Text>
            <TextInput
              style={styles.input}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              placeholder="010-0000-0000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>배송 주소</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="주소를 입력하세요"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* 결제 수단 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 수단</Text>
          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.methodBtn,
                  paymentMethod === method.key && styles.methodBtnActive,
                ]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    paymentMethod === method.key && styles.methodBtnTextActive,
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 결제 버튼 */}
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>
              {total.toLocaleString()}원 결제하기
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },

  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#1f2937' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  totalAmount: { fontSize: 15, fontWeight: '700', color: '#2563eb' },

  field: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },

  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  methodBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  methodBtnText: { fontSize: 13, color: '#6b7280' },
  methodBtnTextActive: { color: '#2563eb', fontWeight: '600' },

  payBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
