import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>아바다 쇼핑몰</Text>
        <Text style={styles.subtitle}>최고의 상품을 합리적인 가격에</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/products')}>
          <Text style={styles.buttonText}>쇼핑 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  hero: {
    backgroundColor: '#ea580c',
    padding: 32,
    alignItems: 'center',
    margin: 16,
    borderRadius: 16,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#fed7aa', marginBottom: 24 },
  button: { backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#ea580c', fontWeight: '600', fontSize: 16 },
});
