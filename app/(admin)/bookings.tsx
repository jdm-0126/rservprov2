import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking } from '@/context/BookingContext';
import { confirmAction, notify } from '@/utils/confirm';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmed', bg: '#E8F5E9', color: '#2E7D32',  icon: 'checkmark-circle-outline' },
  pending:   { label: 'Pending',   bg: '#FFF3E0', color: '#E65100',  icon: 'time-outline' },
  cancelled: { label: 'Cancelled', bg: '#F5F5F5', color: '#9E9E9E',  icon: 'close-circle-outline' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nightsBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

// ─── Booking card ─────────────────────────────────────────────────────────────
const BookingCard = memo(function BookingCard({ booking, onConfirm, onCancel }: {
  booking: Booking;
  onConfirm: (b: Booking) => void;
  onCancel: (b: Booking) => void;
}) {
  const cfg    = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <View style={s.card}>
      {/* Top */}
      <View style={s.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.villaName} numberOfLines={1}>{booking.villaName ?? booking.villaId}</Text>
          <Text style={s.refNum}>{booking.referenceNumber}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Guest */}
      <View style={s.guestRow}>
        <Ionicons name="person-outline" size={13} color="#6b7280" />
        <Text style={s.guestName}>{booking.guestName ?? booking.guestId}</Text>
        {booking.guestEmail ? <Text style={s.guestEmail}>· {booking.guestEmail}</Text> : null}
      </View>

      {/* Dates */}
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

      {/* Footer */}
      <View style={s.cardBottom}>
        <Text style={s.amount}>₱{(booking.totalAmount ?? 0).toLocaleString()}</Text>
        {booking.status === 'pending' && (
          <View style={s.actions}>
            <TouchableOpacity style={s.confirmBtn} onPress={() => onConfirm(booking)}>
              <Ionicons name="checkmark-outline" size={14} color="#fff" />
              <Text style={s.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(booking)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

const FILTERS = ['all', 'pending', 'confirmed', 'cancelled'] as const;
type AdminStatusFilter = typeof FILTERS[number];
const keyExtractor = (item: Booking) => item.id;

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const { user } = useAuth();
  const { bookings, loading, loadAdminBookings, confirmBooking, cancelBooking } = useBookings();
  const router = useRouter();
  const [filter, setFilter] = useState<AdminStatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const unsub: () => void = loadAdminBookings(user.id);
      return unsub;
    }, [user?.id])
  );

  const handleRefresh = useCallback(() => {
    if (!user?.id) return;
    setRefreshing(true);
    const unsub = loadAdminBookings(user.id);
    setTimeout(() => { setRefreshing(false); if (typeof unsub === 'function') unsub(); }, 1000);
  }, [user?.id, loadAdminBookings]);

  const handleConfirm = useCallback((booking: Booking) => {
    if (booking.adminId !== user?.id) {
      notify('Permission Denied', 'You can only confirm bookings for your own villas.');
      return;
    }
    confirmAction({
      title: 'Confirm Booking',
      message: `Confirm ${booking.referenceNumber} for ${booking.villaName}?\n\nGuest: ${booking.guestName ?? booking.guestId}\n${booking.checkIn} → ${booking.checkOut}`,
      confirmLabel: 'Confirm',
      onConfirm: async () => {
        try {
          await confirmBooking(booking.id, user!.id);
        } catch (err: any) {
          notify('Error', err?.message ?? 'Could not confirm booking.');
        }
      },
    });
  }, [user?.id, confirmBooking]);

  const handleCancel = useCallback((booking: Booking) => {
    confirmAction({
      title: 'Cancel Booking',
      message: `Cancel ${booking.referenceNumber}? This cannot be undone.`,
      confirmLabel: 'Cancel Booking',
      destructive: true,
      onConfirm: async () => {
        try {
          await cancelBooking(booking.id);
        } catch (err: any) {
          notify('Error', err?.message ?? 'Could not cancel booking.');
        }
      },
    });
  }, [cancelBooking]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(admin)');
  }, [router]);

  const { myBookings, pending, confirmed, revenue, filtered } = useMemo(() => {
    const mine = bookings.filter((b) => b.adminId === user?.id);
    let p = 0, c = 0, rev = 0;
    for (const b of mine) {
      if (b.status === 'pending') p++;
      else if (b.status === 'confirmed') c++;
      if (b.status !== 'cancelled') rev += b.totalAmount ?? 0;
    }
    const byStatus = filter === 'all' ? mine : mine.filter((b) => b.status === filter);
    const q = search.trim().toLowerCase();
    const matched = !q
      ? byStatus
      : byStatus.filter((b) =>
          (b.referenceNumber ?? '').toLowerCase().includes(q) ||
          (b.villaName ?? '').toLowerCase().includes(q) ||
          (b.guestName ?? '').toLowerCase().includes(q) ||
          (b.guestEmail ?? '').toLowerCase().includes(q),
        );
    const sorted = matched.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return { myBookings: mine, pending: p, confirmed: c, revenue: rev, filtered: sorted };
  }, [bookings, user?.id, filter, search]);

  const renderItem = useCallback(
    ({ item }: { item: Booking }) => (
      <BookingCard booking={item} onConfirm={handleConfirm} onCancel={handleCancel} />
    ),
    [handleConfirm, handleCancel],
  );

  const TopHeader = (
    <>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Bookings</Text>
          <Text style={s.headerSub}>Manage your villa reservations</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statVal}>{myBookings.length}</Text>
          <Text style={s.statLabel}>Total</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: '#E65100' }]}>{pending}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: '#2E7D32' }]}>{confirmed}</Text>
          <Text style={s.statLabel}>Confirmed</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { fontSize: 14 }]}>₱{(revenue / 1000).toFixed(0)}k</Text>
          <Text style={s.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Pending alert banner */}
      {pending > 0 && (
        <View style={s.pendingBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#92400e" />
          <Text style={s.pendingBannerText}>
            {pending} booking{pending > 1 ? 's' : ''} waiting for your confirmation
          </Text>
        </View>
      )}
    </>
  );

  const StickyControls = (
    <View style={s.stickyControls}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search ref, villa, or guest"
          placeholderTextColor="#9ca3af"
          style={s.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          const count = f === 'pending' ? pending : f === 'confirmed' ? confirmed : 0;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, active && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && (f === 'pending' || f === 'confirmed') ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {StickyControls}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2E7D32" />}
        ListHeaderComponent={<>{TopHeader}</>}
        ListEmptyComponent={
          loading ? (
            <View style={s.centerInline}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={s.emptyText}>Loading bookings…</Text>
            </View>
          ) : (
            <View style={s.centerInline}>
              <Ionicons name={search ? 'search-outline' : 'calendar-outline'} size={48} color="#d1d5db" />
              <Text style={s.emptyTitle}>
                {search ? 'No matching bookings' : `No ${filter === 'all' ? '' : filter} bookings`}
              </Text>
              <Text style={s.emptyText}>
                {search ? 'Try a different search term.' : 'Bookings for your villas will appear here'}
              </Text>
            </View>
          )
        }
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#f9fafb' },
  list:         { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100, gap: 12 },
  center:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  centerInline: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  stickyControls: { backgroundColor: '#f9fafb', paddingBottom: 6, marginHorizontal: -16, paddingHorizontal: 0 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginHorizontal: 16, marginBottom: 8, height: 40 },
  searchInput:  { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 0, includeFontPadding: false, outlineStyle: 'none' as any },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub:    { fontSize: 13, color: '#6b7280' },
  statsRow:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statBox:      { flex: 1, alignItems: 'center', gap: 3 },
  statVal:      { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel:    { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statDiv:      { width: 1, height: 32, backgroundColor: '#f3f4f6' },
  pendingBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 12 },
  pendingBannerText: { fontSize: 13, color: '#92400e', fontWeight: '600', flex: 1 },
  filterRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  filterBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 36, justifyContent: 'center' },
  filterBtnActive: { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  filterText:   { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText:    { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  // Card
  card:         { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  villaName:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  refNum:       { fontSize: 11, color: '#9ca3af' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  guestRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  guestName:    { fontSize: 13, color: '#374151', fontWeight: '500' },
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
  confirmBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2E7D32', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  confirmText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  cancelBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cancelText:   { fontSize: 12, fontWeight: '600', color: '#dc2626' },
});
