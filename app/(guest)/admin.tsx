import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Confirmed', bg: '#E8F5E9', color: '#2E7D32' },
  pending:   { label: 'Pending',   bg: '#FFF3E0', color: '#E65100' },
  cancelled: { label: 'Cancelled', bg: '#F5F5F5', color: '#9E9E9E' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
  ));
}

// ─── Booking row card ─────────────────────────────────────────────────────────
function BookingRow({ booking, onConfirm, onCancel }: {
  booking: Booking;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg    = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardLeft}>
          <Text style={s.villaName} numberOfLines={1}>{booking.villaName ?? booking.villaId}</Text>
          <Text style={s.refNum}>{booking.referenceNumber}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={s.guestRow}>
        <Ionicons name="person-outline" size={13} color="#6b7280" />
        <Text style={s.guestText}>{booking.guestName ?? booking.guestId}</Text>
        {booking.guestEmail ? <Text style={s.guestEmail}>· {booking.guestEmail}</Text> : null}
      </View>

      <View style={s.datesRow}>
        <View style={s.dateBox}>
          <Text style={s.dateLabel}>CHECK-IN</Text>
          <Text style={s.dateVal}>{formatDate(booking.checkIn)}</Text>
        </View>
        <View style={s.dateArrow}>
          <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
          <Text style={s.nightsText}>{nights}n</Text>
        </View>
        <View style={[s.dateBox, { alignItems: 'flex-end' }]}>
          <Text style={s.dateLabel}>CHECK-OUT</Text>
          <Text style={s.dateVal}>{formatDate(booking.checkOut)}</Text>
        </View>
      </View>

      <View style={s.cardBottom}>
        <Text style={s.amount}>₱{(booking.totalAmount ?? 0).toLocaleString()}</Text>
        {booking.status === 'pending' && (
          <View style={s.actions}>
            <TouchableOpacity style={s.confirmBtn} onPress={() => onConfirm(booking.id)}>
              <Ionicons name="checkmark-outline" size={14} color="#fff" />
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(booking.id)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main admin tab ───────────────────────────────────────────────────────────
export default function AdminTab() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { bookings, loading, loadAdminBookings, confirmBooking, cancelBooking } = useBookings();
  const { villas } = useVillas();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  // Start real-time listener when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const unsub: () => void = loadAdminBookings(user.id);
      return unsub;
    }, [user?.id])
  );

  const handleRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    loadAdminBookings(user.id);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleConfirm = (id: string) => {
    // Find booking to verify ownership before showing the dialog
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    if (booking.adminId !== user?.id) {
      Alert.alert('Permission Denied', 'You can only confirm bookings for your own villas.');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Confirm booking ${booking.referenceNumber} for ${booking.villaName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await confirmBooking(id, user!.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not confirm booking.');
            }
          },
        },
      ]
    );
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelBooking(id) },
    ]);
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="lock-closed-outline" size={48} color="#d1d5db" />
        <Text style={s.emptyTitle}>Admin access only</Text>
      </SafeAreaView>
    );
  }

  // Stats
  const myBookings  = bookings.filter((b) => b.adminId === user?.id);
  const pending     = myBookings.filter((b) => b.status === 'pending').length;
  const confirmed   = myBookings.filter((b) => b.status === 'confirmed').length;
  const revenue     = myBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  const myVillas = villas.filter((v) => v.adminId === user?.id);

  const filtered = myBookings
    .filter((b) => filter === 'all' || b.status === filter)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2E7D32" />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.headerTitle}>Admin Dashboard</Text>
                <Text style={s.headerSub}>{user?.name}</Text>
              </View>
              <View style={s.roleBadge}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#2E7D32" />
                <Text style={s.roleText}>{user?.role}</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statVal}>{myBookings.length}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={[s.statVal, { color: '#E65100' }]}>{pending}</Text>
                <Text style={s.statLabel}>Pending</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={[s.statVal, { color: '#2E7D32' }]}>{confirmed}</Text>
                <Text style={s.statLabel}>Confirmed</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statBox}>
                <Text style={[s.statVal, { color: '#1a1a2e', fontSize: 14 }]}>₱{(revenue / 1000).toFixed(0)}k</Text>
                <Text style={s.statLabel}>Revenue</Text>
              </View>
            </View>

            {/* My villas */}
            {myVillas.length > 0 && (
              <View style={s.villasCard}>
                <Text style={s.sectionTitle}>My Villas</Text>
                {myVillas.map((v) => (
                  <View key={v.id} style={s.villaRow}>
                    <Ionicons name="home-outline" size={16} color="#2E7D32" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.villaRowName}>{v.name}</Text>
                      <Text style={s.villaRowLoc}>{v.location} · ₱{(v.price ?? 0).toLocaleString()}/night</Text>
                    </View>
                    <Text style={s.villaBookingCount}>
                      {myBookings.filter((b) => b.villaId === v.id && b.status !== 'cancelled').length} bookings
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Filter tabs */}
            <View style={s.filterRow}>
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterBtn, filter === f && s.filterBtnActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.sectionTitle}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={s.emptyTitle}>Loading bookings…</Text>
            </View>
          ) : (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={s.emptyTitle}>No bookings yet</Text>
              <Text style={s.emptySub}>Bookings for your villas will appear here</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <BookingRow booking={item} onConfirm={handleConfirm} onCancel={handleCancel} />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f9fafb' },
  list:         { padding: 20, gap: 14, paddingBottom: 100 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub:     { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub:    { fontSize: 13, color: '#6b7280', marginTop: 2 },
  roleBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  roleText:     { fontSize: 12, fontWeight: '600', color: '#166534', textTransform: 'capitalize' },
  // Stats
  statsRow:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statBox:      { flex: 1, alignItems: 'center', gap: 3 },
  statVal:      { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel:    { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statDivider:  { width: 1, height: 32, backgroundColor: '#f3f4f6' },
  // Villas card
  villasCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  villaRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  villaRowName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  villaRowLoc:  { fontSize: 12, color: '#6b7280' },
  villaBookingCount: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  // Filter
  filterRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  filterText:   { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  // Booking card
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardLeft:     { flex: 1, gap: 2 },
  villaName:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  refNum:       { fontSize: 11, color: '#9ca3af' },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  guestRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  guestText:    { fontSize: 13, color: '#374151', fontWeight: '500' },
  guestEmail:   { fontSize: 12, color: '#9ca3af' },
  datesRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, padding: 10 },
  dateBox:      { flex: 1, gap: 2 },
  dateLabel:    { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  dateVal:      { fontSize: 12, fontWeight: '600', color: '#111827' },
  dateArrow:    { alignItems: 'center', gap: 2, paddingHorizontal: 8 },
  nightsText:   { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  cardBottom:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:       { fontSize: 16, fontWeight: '800', color: '#111827' },
  actions:      { flexDirection: 'row', gap: 8 },
  confirmBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  confirmText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  cancelBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cancelText:   { fontSize: 12, fontWeight: '600', color: '#dc2626' },
});
