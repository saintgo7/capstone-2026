import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Simple cart state using AsyncStorage for mobile
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export function useCart() {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    AsyncStorage.getItem('cart').then((val) => {
      if (val) setItems(JSON.parse(val));
    });
  }, []);

  const save = (newItems: CartItem[]) => {
    setItems(newItems);
    AsyncStorage.setItem('cart', JSON.stringify(newItems));
  };

  return {
    items,
    removeItem: (productId: string) => save(items.filter(i => i.productId !== productId)),
    updateQuantity: (productId: string, quantity: number) => {
      if (quantity <= 0) {
        save(items.filter(i => i.productId !== productId));
      } else {
        save(items.map(i => i.productId === productId ? { ...i, quantity } : i));
      }
    },
    clearCart: () => save([]),
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, total } = useCart();

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>장바구니가 비어있습니다</Text>
        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.push('/(tabs)/products' as any)}
        >
          <Text style={styles.shopBtnText}>쇼핑 시작하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{item.price.toLocaleString()}원</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('삭제', '이 상품을 장바구니에서 제거하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    { text: '제거', style: 'destructive', onPress: () => removeItem(item.productId) },
                  ]);
                }}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtotal}>
              소계: {(item.price * item.quantity).toLocaleString()}원
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>합계</Text>
          <Text style={styles.totalAmount}>{total.toLocaleString()}원</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout' as any)}
        >
          <Text style={styles.checkoutBtnText}>주문하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  shopBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  shopBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  itemInfo: { marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  itemPrice: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: '#374151' },
  qty: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  deleteBtn: { marginLeft: 'auto' as any },
  deleteBtnText: { color: '#9ca3af', fontSize: 16 },
  subtotal: { fontSize: 13, color: '#374151', fontWeight: '600', marginTop: 8, textAlign: 'right' },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  checkoutBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
