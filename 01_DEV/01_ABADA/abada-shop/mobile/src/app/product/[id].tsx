import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface ProductDetail {
  productId: string;
  name: string;
  price: number;
  finalPrice: number;
  discountRate: number;
  stockAvailable: number;
  description?: string;
  imageUrls: string[];
  status: string;
}

async function fetchProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`${API_URL}/api/v1/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  const json = await res.json();
  return json.data;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });

  const handleAddToCart = async () => {
    if (!product) return;

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      Alert.alert('로그인 필요', '로그인 후 장바구니에 담을 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.productId,
          productName: product.name,
          price: product.finalPrice,
          quantity,
        }),
      });

      if (!res.ok) throw new Error('Failed to add to cart');
      Alert.alert('장바구니 담기', '장바구니에 추가되었습니다.', [
        { text: '계속 쇼핑' },
        { text: '장바구니 보기', onPress: () => router.push('/(tabs)/cart') },
      ]);
    } catch {
      Alert.alert('오류', '장바구니 담기에 실패했습니다.');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      Alert.alert('로그인 필요', '로그인 후 구매할 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    // Add to cart first, then navigate to cart for checkout
    await handleAddToCart();
    router.push('/(tabs)/cart');
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>상품을 불러올 수 없습니다</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOutOfStock = product.stockAvailable === 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Product Image */}
        <View style={styles.imageBox}>
          {product.imageUrls[0] ? (
            <Image
              source={{ uri: product.imageUrls[0] }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.imageIcon}>📦</Text>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoBox}>
          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.priceRow}>
            {product.discountRate > 0 && (
              <>
                <Text style={styles.originalPrice}>
                  {product.price.toLocaleString()}원
                </Text>
                <Text style={styles.discountRate}>{product.discountRate}%</Text>
              </>
            )}
            <Text style={styles.finalPrice}>
              {product.finalPrice.toLocaleString()}원
            </Text>
          </View>

          {isOutOfStock ? (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>품절</Text>
            </View>
          ) : (
            <Text style={styles.stockText}>재고: {product.stockAvailable}개</Text>
          )}

          {product.description && (
            <View style={styles.descBox}>
              <Text style={styles.descTitle}>상품 설명</Text>
              <Text style={styles.descText}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {!isOutOfStock && (
        <View style={styles.actionBar}>
          {/* Quantity Selector */}
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
            >
              <Text style={styles.quantityBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={() => setQuantity(q => Math.min(product.stockAvailable, q + 1))}
            >
              <Text style={styles.quantityBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
              <Text style={styles.cartBtnText}>장바구니</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
              <Text style={styles.buyBtnText}>바로 구매</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContent: { paddingBottom: 200 },

  imageBox: {
    height: 300,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imageIcon: { fontSize: 80 },

  infoBox: { padding: 20 },
  productName: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  originalPrice: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountRate: { fontSize: 14, color: '#ef4444', fontWeight: 'bold' },
  finalPrice: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },

  stockText: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  outOfStockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  outOfStockText: { color: '#9ca3af', fontWeight: '600' },

  descBox: { marginTop: 20 },
  descTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  descText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityBtnText: { fontSize: 20, color: '#1f2937', lineHeight: 24 },
  quantityValue: { fontSize: 18, fontWeight: '600', color: '#1f2937', minWidth: 30, textAlign: 'center' },

  btnRow: { flexDirection: 'row', gap: 12 },
  cartBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cartBtnText: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  buyBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  errorText: { color: '#ef4444', marginBottom: 12, fontSize: 14 },
  backBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: { color: '#1f2937', fontWeight: '600' },
});
