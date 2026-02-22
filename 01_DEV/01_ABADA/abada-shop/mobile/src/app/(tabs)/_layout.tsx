import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#ea580c' }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarLabel: '홈' }} />
      <Tabs.Screen name="products" options={{ title: '상품', tabBarLabel: '상품' }} />
      <Tabs.Screen name="cart" options={{ title: '장바구니', tabBarLabel: '장바구니' }} />
      <Tabs.Screen name="orders" options={{ title: '주문내역', tabBarLabel: '주문' }} />
      <Tabs.Screen name="mypage" options={{ title: '마이페이지', tabBarLabel: '마이' }} />
    </Tabs>
  );
}
