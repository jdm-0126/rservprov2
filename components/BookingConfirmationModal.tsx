import { Booking } from '@/context/BookingContext';
import { Ionicons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  booking: Booking | null;
  visible: boolean;
  onViewBookings: () => void;
  onClose: () => void;
};

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon as any} size={16} color="#6366f1" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingConfirmationModal({ booking, visible, onViewBookings, onClose }: Props) {
  if (!booking) return null;

  const nights = Math.max(0, Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  ));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

          {/* Success icon */}
          <View style={s.iconWrap}>
            <View style={s.iconCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
          </View>

          <Text style={s.title}>Booking Confirmed!</Text>
          <Text style={s.subtitle}>Your reservation has been successfully placed.</Text>

          {/* Reference number */}
          <View style={s.refCard}>
            <Text style={s.refLabel}>REFERENCE NUMBER</Text>
            <Text style={s.refNumber}>{booking.referenceNumber}</Text>
            <Text style={s.refHint}>Please save this number for your records</Text>
          </View>

          {/* Booking details */}
          <View style={s.detailsCard}>
            <Text style={s.sectionTitle}>Booking Summary</Text>

            <Row icon="home-outline"     label="Villa"     value={booking.villaName ?? ''} />
            <View style={s.divider} />
            <Row icon="person-outline"   label="Guest"     value={booking.guestName ?? ''} />
            <View style={s.divider} />
            <Row icon="log-in-outline"   label="Check-in"  value={booking.checkIn} />
            <View style={s.divider} />
            <Row icon="log-out-outline"  label="Check-out" value={booking.checkOut} />
            <View style={s.divider} />
            <Row icon="moon-outline"     label="Duration"  value={`${nights} night${nights !== 1 ? 's' : ''}`} />
            <View style={s.divider} />
            <Row icon="people-outline"   label="Guests"    value={`${booking.guests ?? 1} guest${(booking.guests ?? 1) !== 1 ? 's' : ''}`} />
          </View>

          {/* Price breakdown */}
          <View style={s.priceCard}>
            <Text style={s.sectionTitle}>Payment Summary</Text>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Rate per night</Text>
              <Text style={s.priceVal}>₱{((booking.totalAmount ?? 0) / (nights || 1)).toLocaleString()}</Text>
            </View>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>Nights</Text>
              <Text style={s.priceVal}>{nights}</Text>
            </View>
            <View style={[s.priceRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total Amount</Text>
              <Text style={s.totalVal}>₱{(booking.totalAmount ?? 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* Note */}
          <View style={s.noteCard}>
            <Ionicons name="information-circle-outline" size={18} color="#6366f1" />
            <Text style={s.noteText}>
              A confirmation has been recorded. Our team will reach out to you for payment and final details.
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.primaryBtn} onPress={onViewBookings}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>View My Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={onClose}>
            <Text style={s.secondaryBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f8f8' },
  body:        { padding: 24, gap: 16, paddingBottom: 8 },

  iconWrap:    { alignItems: 'center', marginTop: 8 },
  iconCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#2E7D32', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  title:       { fontSize: 26, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  subtitle:    { fontSize: 14, color: '#888', textAlign: 'center', marginTop: -8 },

  refCard:     { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6 },
  refLabel:    { fontSize: 11, color: '#a0a8c0', fontWeight: '700', letterSpacing: 1.5 },
  refNumber:   { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  refHint:     { fontSize: 12, color: '#6b7280', marginTop: 2 },

  detailsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 0, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  sectionTitle:{ fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon:     { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  rowLabel:    { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue:    { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginTop: 1 },
  divider:     { height: 1, backgroundColor: '#f3f4f6', marginLeft: 44 },

  priceCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  priceRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel:  { fontSize: 14, color: '#6b7280' },
  priceVal:    { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  totalRow:    { borderTopWidth: 1, borderColor: '#f3f4f6', paddingTop: 10, marginTop: 2 },
  totalLabel:  { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  totalVal:    { fontSize: 18, fontWeight: '800', color: '#2E7D32' },

  noteCard:    { flexDirection: 'row', gap: 10, backgroundColor: '#eef2ff', borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  noteText:    { flex: 1, fontSize: 13, color: '#4338ca', lineHeight: 19 },

  footer:         { padding: 16, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', padding: 16, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn:   { alignItems: 'center', padding: 12 },
  secondaryBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
});
