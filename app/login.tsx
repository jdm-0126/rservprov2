import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator, Image, ImageBackground,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  // Already authenticated — redirect immediately, don't show login UI
  if (user) return <Redirect href="/(guest)" />;

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=900' }}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']} style={styles.topGradient} />
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your villa bookings</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#2E7D32" style={{ marginVertical: 32 }} />
          ) : (
            <>
              <TouchableOpacity style={styles.googleBtn} onPress={signInWithGoogle} activeOpacity={0.85}>
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/480px-Google_%22G%22_logo.svg.png' }}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity style={styles.guestBtn} onPress={() => router.replace('/(guest)')} activeOpacity={0.8}>
                <Ionicons name="eye-outline" size={18} color="#2E7D32" />
                <Text style={styles.guestText}>Browse as Guest</Text>
              </TouchableOpacity>
              <Text style={styles.terms}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  topGradient: { ...StyleSheet.absoluteFill },
  safe: { flex: 1, justifyContent: 'flex-end' },
  backBtn: { position: 'absolute', top: 56, left: 20, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20, padding: 8 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 28 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14, paddingVertical: 15, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  googleIcon: { width: 22, height: 22 },
  googleText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f3f4f6' },
  dividerText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  guestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 14, paddingVertical: 15, backgroundColor: '#f0fdf4' },
  guestText: { fontSize: 15, fontWeight: '600', color: '#2E7D32' },
  terms: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20, lineHeight: 18 },
  termsLink: { color: '#2E7D32', fontWeight: '600' },
});
