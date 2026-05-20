import { useAuth } from '@/context/AuthContext';
import { useVillas } from '@/context/VillaContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VillaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { villas } = useVillas();
  const router = useRouter();
  const villa = villas.find((v) => v.id === id);

  if (!villa) return null;

  const handleBook = () => {
    if (!user) router.push('/login');
    else router.push(`/booking/${villa.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <Image source={{ uri: villa.image }} style={styles.image} />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.body}>
          <Text style={styles.name}>{villa.name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={15} color="#666" />
            <Text style={styles.location}>{villa.location}</Text>
          </View>
          <View style={styles.statsRow}>
            {[
              { icon: 'people-outline', val: villa.guests, label: 'Guests' },
              { icon: 'bed-outline', val: villa.bedrooms, label: 'Bedrooms' },
              { icon: 'cash-outline', val: `₱${villa.price.toLocaleString()}`, label: 'Per Night' },
            ].map((s) => (
              <View key={s.label} style={styles.stat}>
                <Ionicons name={s.icon as any} size={20} color="#2E7D32" />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{villa.description}</Text>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {villa.amenities.map((a) => (
              <View key={a} style={styles.amenityChip}>
                <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                <Text style={styles.amenityText}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.footerPrice}>₱{villa.price.toLocaleString()}<Text style={styles.perNight}>/night</Text></Text>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Text style={styles.bookBtnText}>{user ? 'Book Now' : 'Sign In to Book'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  image: { width: '100%', height: 280 },
  backBtn: { position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  location: { fontSize: 14, color: '#666' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f5f5f5', borderRadius: 16, padding: 16, marginTop: 20 },
  stat: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginTop: 24, marginBottom: 8 },
  description: { fontSize: 14, color: '#555', lineHeight: 22 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  amenityText: { fontSize: 13, color: '#2E7D32' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderTopWidth: 1, borderColor: '#eee' },
  footerPrice: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  perNight: { fontSize: 14, fontWeight: '400', color: '#888' },
  bookBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
