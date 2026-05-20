import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

const FEATURES = [
  { icon: 'home-outline', label: 'Luxury Villas' },
  { icon: 'calendar-outline', label: 'Easy Booking' },
  { icon: 'shield-checkmark-outline', label: 'Secure Stays' },
];

export default function GetStarted() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Still resolving auth state — show nothing to avoid flash
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  // Already signed in — go straight to the main app
  if (user) return <Redirect href="/(guest)" />;

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900' }}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.badge}>
            <Ionicons name="home" size={14} color="#fff" />
            <Text style={styles.badgeText}>Villa Reserve</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.headline}>Find Your{'\n'}Perfect Villa</Text>
            <Text style={styles.subheadline}>
              Discover and book handpicked luxury villas in the world's most beautiful destinations.
            </Text>
            <View style={styles.pills}>
              {FEATURES.map((f) => (
                <View key={f.label} style={styles.pill}>
                  <Ionicons name={f.icon as any} size={14} color="#fff" />
                  <Text style={styles.pillText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/login')}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/(guest)')}>
              <Text style={styles.ghostBtnText}>Browse as Guest</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, height },
  gradient: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hero: { gap: 16 },
  headline: { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 54, letterSpacing: -1 },
  subheadline: { fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 24, maxWidth: '85%' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  actions: { gap: 12, paddingBottom: 16 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', paddingVertical: 17, borderRadius: 16 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ghostBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  ghostBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
});
