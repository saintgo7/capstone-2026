import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Product {
  productId: string;
  name: string;
  price: number;
  finalPrice: number;
  discountRate: number;
  stockAvailable: number;
  imageUrls: string[];
  status: string;
}

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/v1/products?status=ACTIVE`);
  const json = await res.json();
  return json.data ?? [];
}

export default function ProductsScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>상품을 불러올 수 없습니다</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.productId}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/product/${item.productId}` as any)}
        >
          <View style={styles.imageBox}>
            {item.imageUrls[0] ? (
              <Image source={{ uri: item.imageUrls[0] }} style={styles.image} resizeMode="cover" />
            ) : (
              <Text style={styles.imageIcon}>📦</Text>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            {item.discountRate > 0 && (
              <Text style={styles.discount}>{item.discountRate}% 할인</Text>
            )}
            <Text style={styles.price}>{item.finalPrice.toLocaleString()}원</Text>
            {item.stockAvailable === 0 && (
              <Text style={styles.soldOut}>품절</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>등록된 상품이 없습니다</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  list: { padding: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageBox: {
    height: 140,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  imageIcon: { fontSize: 40 },
  cardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '500', color: '#1f2937', marginBottom: 4 },
  discount: { fontSize: 12, color: '#ef4444', fontWeight: 'bold' },
  price: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  soldOut: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  errorText: { color: '#ef4444', marginBottom: 12 },
  retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#6b7280' },
});
