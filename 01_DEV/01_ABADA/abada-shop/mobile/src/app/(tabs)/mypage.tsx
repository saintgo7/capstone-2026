import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface UserInfo {
  userId: string;
  name: string;
  email: string;
  grade: string;
  points: number;
}

const GRADE_LABEL: Record<string, string> = {
  BRONZE: '브론즈',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
  DIAMOND: '다이아몬드',
};

const GRADE_COLOR: Record<string, string> = {
  BRONZE: '#92400e',
  SILVER: '#6b7280',
  GOLD: '#d97706',
  PLATINUM: '#0891b2',
  DIAMOND: '#7c3aed',
};

export default function MypageScreen() {
  const router = useRouter();
  const [user, setUser] = React.useState<UserInfo | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('user').then((val) => {
      if (val) setUser(JSON.parse(val));
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['user', 'accessToken', 'cart']);
          setUser(null);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.loginPrompt}>로그인이 필요합니다</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginBtnText}>로그인하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradeColor = GRADE_COLOR[user.grade] ?? '#374151';
  const gradeLabel = GRADE_LABEL[user.grade] ?? user.grade;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeText}>{gradeLabel}</Text>
          </View>
        </View>
      </View>

      {/* Points */}
      <View style={styles.pointsCard}>
        <Text style={styles.pointsLabel}>보유 포인트</Text>
        <Text style={styles.pointsAmount}>{user.points.toLocaleString()} P</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <MenuItem label="주문 내역" icon="📋" onPress={() => {}} />
        <MenuItem label="배송지 관리" icon="📍" onPress={() => {}} />
        <MenuItem label="찜 목록" icon="♡" onPress={() => {}} />
        <MenuItem label="리뷰 관리" icon="⭐" onPress={() => {}} />
        <MenuItem label="고객센터" icon="💬" onPress={() => {}} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loginPrompt: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  loginBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  profileInfo: { gap: 4 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  email: { fontSize: 13, color: '#6b7280' },
  gradeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  gradeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  pointsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  pointsLabel: { fontSize: 13, color: '#3b82f6', marginBottom: 8 },
  pointsAmount: { fontSize: 28, fontWeight: 'bold', color: '#1e40af' },

  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: { flex: 1, fontSize: 15, color: '#1f2937' },
  menuArrow: { fontSize: 20, color: '#9ca3af' },

  logoutBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
