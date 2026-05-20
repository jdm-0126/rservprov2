import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking } from '@/context/BookingContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookingConfirmationPage() {
  const params = useSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, loadGuestBookings } = useBookings();
  const [loading, setLoading] = useState(false);

  const booking = useMemo(
    () => (bookingId ? bookings.find((b) => b.id === bookingId) : undefined),
    [bookingId, bookings]
  );

  useEffect(() => {
    if (!booking && bookingId && user?.id) {
      setLoading(true);
      loadGuestBookings(user.id).finally(() => setLoading(false));
    }
  }, [booking, bookingId, user?.id, loadGuestBookings]);

  const nights = booking
    ? Math.max(0, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000))
    : 0;

  const statusLabel = booking?.status === 'confirmed'
    ? 'Booking Confirmed'
    : booking?.status === 'pending'
      ? 'Booking Received'
      : 'Booking Cancelled';

  const statusColor = booking?.status === 'confirmed'
    ? '#2E7D32'
    : booking?.status === 'pending'
      ? '#E65100'
      : '#6b7280';

  const handleViewBookings = () => router.replace('/(guest)/bookings');
  const handleBackHome = () => router.replace('/(guest)');

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Missing Booking</Text>
          <Text style={styles.messageText}>No booking reference was provided. Please try again from your booking confirmation email or your bookings list.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackHome}>
            <Text style={styles.primaryBtnText}>Back to Villas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#1a1a1a" />
          <Text style={styles.loaderText}>Loading booking details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Booking Not Found</Text>
          <Text style={styles.messageText}>We couldn't find the booking you're looking for. If you just made a reservation, please check your bookings list or try again shortly.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleViewBookings}>
            <Text style={styles.primaryBtnText}>Go to My Bookings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}> 
          <View style={styles.statusBadge}> 
            <Ionicons name={booking.status === 'confirmed' ? 'checkmark-circle' : booking.status === 'pending' ? 'time-outline' : 'close-circle'} size={18} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.title}>Booking Confirmation</Text>
          <Text style={styles.subtitle}>Here's your booking summary for {booking.villaName}</Text>
        </View>

        <View style={styles.refCard}>
          <Text style={styles.refLabel}>REFERENCE NUMBER</Text>
          <Text style={styles.refNumber}>{booking.referenceNumber}</Text>
          <Text style={styles.refHint}>Keep this for verification and check-in.</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          <InfoRow icon="home-outline" label="Villa" value={booking.villaName ?? booking.villaId} />
          <Divider />
          <InfoRow icon="location-outline" label="Location" value={booking.villaLocation ?? 'N/A'} />
          <Divider />
          {booking.packageName ? <><InfoRow icon="cube-outline" label="Package" value={booking.packageName} /><Divider /></> : null}
          <InfoRow icon="person-outline" label="Guest" value={booking.guestName ?? 'Guest'} />
          <Divider />
          <InfoRow icon="log-in-outline" label="Check-in" value={booking.checkIn} />
          <Divider />
          <InfoRow icon="log-out-outline" label="Check-out" value={booking.checkOut} />
          <Divider />
          <InfoRow icon="moon-outline" label="Duration" value={`${nights} night${nights !== 1 ? 's' : ''}`} />
          <Divider />
          <InfoRow icon="people-outline" label="Guests" value={`${booking.guests ?? 1} guest${(booking.guests ?? 1) !== 1 ? 's' : ''}`} />
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <PriceRow label="Total Amount" value={`₱${(booking.totalAmount ?? 0).toLocaleString()}`} />
          {nights > 0 && (
            <PriceRow label="Rate per night" value={`₱${Math.round((booking.totalAmount ?? 0) / nights).toLocaleString()}`} />
          )}
          <PriceRow label="Nights" value={`${nights}`} />
        </View>

        <View style={styles.noteCard}>
          <Ionicons name={booking.status === 'confirmed' ? 'shield-checkmark-outline' : 'information-circle-outline'} size={18} color="#1a1a1a" />
          <Text style={styles.noteText}>
            {booking.status === 'confirmed'
              ? 'This booking is confirmed. Cancellation penalties may apply. Please bring your reference number when you arrive.'
              : booking.status === 'pending'
                ? 'Your booking request has been submitted. The villa admin will review and confirm it shortly.'
                : 'This booking has been cancelled. Contact us if you think this is a mistake.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleViewBookings}>
          <Text style={styles.primaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackHome}>
          <Text style={styles.secondaryBtnText}>Back to Villas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={16} color="#6366f1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  body: { padding: 24, gap: 18, paddingBottom: 12 },

  header: { gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#f3f4fd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  statusText: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  refCard: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 20, alignItems: 'center', gap: 6 },
  refLabel: { fontSize: 11, color: '#a0a8c0', fontWeight: '700', letterSpacing: 1.3 },
  refNumber: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 1.4 },
  refHint: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

  detailsCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: 15, color: '#1a1a1a', fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 46 },

  priceCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  noteCard: { flexDirection: 'row', gap: 10, backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 13, color: '#1a1a1a', lineHeight: 20 },

  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', gap: 10 },
  primaryBtn: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: { alignItems: 'center', padding: 14 },
  secondaryBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 15 },

  messageCard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  messageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  messageText: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loaderText: { fontSize: 14, color: '#6b7280' },
});
