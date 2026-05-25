import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking, type BookingStatus } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatusFilter = 'all' | BookingStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmed', bg: '#E8F5E9', color: '#2E7D32', icon: 'checkmark-circle-outline' },
  pending:   { label: 'Pending',   bg: '#FFF3E0', color: '#E65100', icon: 'time-outline' },
  cancelled: { label: 'Cancelled', bg: '#FAFAFA', color: '#9E9E9E', icon: 'close-circle-outline' },
};
function nightsBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── House Rules ──────────────────────────────────────────────────────────────
const HOUSE_RULES = [
  { icon: 'time-outline',         rule: 'Check-in: 3:00 PM · Check-out: 12:00 NN' },
  { icon: 'people-outline',       rule: 'Extra guests beyond 15 pax: ₱500/head. Children 7 & below: FREE.' },
  { icon: 'paw-outline',          rule: 'Pets allowed — up to 2 pets free of charge.' },
  { icon: 'car-outline',          rule: 'Parking available for 5–6 cars.' },
  { icon: 'volume-mute-outline',  rule: 'Respect quiet hours. No excessive noise after 10:00 PM.' },
  { icon: 'flame-outline',        rule: 'No open fires outside designated BBQ areas.' },
  { icon: 'trash-outline',        rule: 'Leave the villa clean. Dispose of trash properly.' },
  { icon: 'water-outline',        rule: 'Pool use is at your own risk. Supervise children at all times.' },
  { icon: 'warning-outline',      rule: 'Any damages to property will be charged to the guest.' },
  { icon: 'close-circle-outline', rule: 'Confirmed bookings are non-refundable. Cancellation penalties apply.' },
  { icon: 'time-outline',         rule: 'Time extension is subject to availability and charged at hourly rate (ARO).' },
];

function HouseRulesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.rulesWrap} edges={['top', 'bottom']}>
        <View style={s.rulesHeader}>
          <View>
            <Text style={s.rulesTitle}>House Rules</Text>
            <Text style={s.rulesSub}>Casa Luna Suites & Villas</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#555" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.rulesList} showsVerticalScrollIndicator={false}>
          <View style={s.rulesNotice}>
            <Ionicons name="document-text-outline" size={15} color="#1d4ed8" />
            <Text style={s.rulesNoticeText}>
              By completing your booking you agree to these rules. A digital or printed copy will be required at check-in.
            </Text>
          </View>
          {HOUSE_RULES.map((r, i) => (
            <View key={i} style={s.ruleRow}>
              <View style={s.ruleIcon}><Ionicons name={r.icon as any} size={15} color="#1a1a2e" /></View>
              <Text style={s.ruleText}>{r.rule}</Text>
            </View>
          ))}
          <View style={s.signNote}>
            <Ionicons name="pencil-outline" size={13} color="#7c3aed" />
            <Text style={s.signNoteText}>Digital signature or printed acknowledgment required upon check-in.</Text>
          </View>
        </ScrollView>
        <View style={s.rulesFooter}>
          <TouchableOpacity style={s.agreeBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={s.agreeBtnText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────
const BookingDetailModal = memo(function BookingDetailModal({ booking, onClose, onCancel }: {
  booking: Booking | null;
  onClose: () => void;
  onCancel: (id: string) => void;
}) {
  const [showRules, setShowRules] = useState(false);
  if (!booking) return null;
  const cfg    = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return (
    <>
      <Modal visible={!!booking} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={s.detailWrap} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={s.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.detailTitle} numberOfLines={1}>{booking.villaName}</Text>
              {booking.villaLocation && <Text style={s.detailLocation}>{booking.villaLocation}</Text>}
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.detailBody} showsVerticalScrollIndicator={false}>
            {/* Reference + status */}
            <View style={s.refCard}>
              <Text style={s.refLabel}>REFERENCE NUMBER</Text>
              <Text style={s.refNumber}>{booking.referenceNumber}</Text>
              <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            {/* Package */}
            {booking.packageName && (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>Package</Text>
                <View style={s.infoRow}>
                  <Ionicons name="cube-outline" size={15} color="#2E7D32" />
                  <Text style={s.infoValue}>{booking.packageName}</Text>
                </View>
              </View>
            )}

            {/* Dates */}
            <View style={s.infoCard}>
              <Text style={s.infoCardTitle}>Stay Details</Text>
              <View style={s.datesRow}>
                <View style={s.dateBox}>
                  <Text style={s.dateLabel}>CHECK-IN</Text>
                  <Text style={s.dateValue}>{formatDate(booking.checkIn)}</Text>
                  <Text style={s.dateTime}>3:00 PM</Text>
                </View>
                <View style={s.dateArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
                  <Text style={s.nightsText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[s.dateBox, { alignItems: 'flex-end' }]}>
                  <Text style={s.dateLabel}>CHECK-OUT</Text>
                  <Text style={s.dateValue}>{formatDate(booking.checkOut)}</Text>
                  <Text style={s.dateTime}>12:00 NN</Text>
                </View>
              </View>
            </View>

            {/* Amount */}
            <View style={s.infoCard}>
              <Text style={s.infoCardTitle}>Payment</Text>
              <View style={s.infoRow}>
                <Ionicons name="cash-outline" size={15} color="#2E7D32" />
                <Text style={s.infoLabel}>Total Amount</Text>
                <Text style={s.amountValue}>₱{(booking.totalAmount ?? 0).toLocaleString()}</Text>
              </View>
              <View style={s.infoRow}>
                <Ionicons name="calendar-outline" size={15} color="#6b7280" />
                <Text style={s.infoLabel}>Booked on</Text>
                <Text style={s.infoValueSm}>{formatDateShort(booking.createdAt)}</Text>
              </View>
            </View>

            {/* Guest info */}
            {(booking.guestName || booking.guestEmail) && (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>Guest</Text>
                {booking.guestName && (
                  <View style={s.infoRow}>
                    <Ionicons name="person-outline" size={15} color="#6b7280" />
                    <Text style={s.infoValue}>{booking.guestName}</Text>
                  </View>
                )}
                {booking.guestEmail && (
                  <View style={s.infoRow}>
                    <Ionicons name="mail-outline" size={15} color="#6b7280" />
                    <Text style={s.infoValue}>{booking.guestEmail}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Confirmed penalty notice */}
            {booking.status === 'confirmed' && (
              <View style={s.penaltyCard}>
                <Ionicons name="warning-outline" size={15} color="#92400e" />
                <Text style={s.penaltyText}>
                  This booking is confirmed. To cancel, please contact us directly. Cancellation penalties apply.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer actions */}
          <View style={s.detailFooter}>
            <TouchableOpacity style={s.rulesBtn} onPress={() => setShowRules(true)}>
              <Ionicons name="document-text-outline" size={16} color="#1a1a2e" />
              <Text style={s.rulesBtnText}>House Rules</Text>
            </TouchableOpacity>
            {booking.status === 'pending' && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => { onClose(); onCancel(booking.id); }}>
                <Text style={s.cancelBtnText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
      <HouseRulesModal visible={showRules} onClose={() => setShowRules(false)} />
    </>
  );
});

// ─── Booking list card ────────────────────────────────────────────────────────
const BookingCard = memo(function BookingCard({ booking, onPress }: { booking: Booking; onPress: (b: Booking) => void }) {
  const cfg    = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  return (
    <TouchableOpacity style={s.card} onPress={() => onPress(booking)} activeOpacity={0.85}>
      <View style={s.cardTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.villaName} numberOfLines={1}>{booking.villaName ?? booking.villaId}</Text>
          <Text style={s.refNum}>{booking.referenceNumber}</Text>
          {booking.packageName && <Text style={s.pkgName}>{booking.packageName}</Text>}
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <View style={s.datesRowSmall}>
        <View style={s.dateBoxSm}>
          <Text style={s.dateLabelSm}>CHECK-IN</Text>
          <Text style={s.dateValSm}>{formatDateShort(booking.checkIn)}</Text>
        </View>
        <View style={s.dateArrowSm}>
          <Ionicons name="arrow-forward" size={13} color="#9ca3af" />
          <Text style={s.nightsSm}>{nights}n</Text>
        </View>
        <View style={[s.dateBoxSm, { alignItems: 'flex-end' }]}>
          <Text style={s.dateLabelSm}>CHECK-OUT</Text>
          <Text style={s.dateValSm}>{formatDateShort(booking.checkOut)}</Text>
        </View>
      </View>
      <View style={s.cardBottom}>
        <Text style={s.amount}>₱{(booking.totalAmount ?? 0).toLocaleString()}</Text>
        <View style={s.tapHint}>
          <Text style={s.tapHintText}>View details</Text>
          <Ionicons name="chevron-forward" size={13} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────
const FILTERS: StatusFilter[] = ['all', 'pending', 'confirmed', 'cancelled'];
const keyExtractor = (item: Booking) => item.id;

export default function GuestBookingsPage() {
  const { user } = useAuth();
  const { bookings, loading, loadGuestBookings, cancelBooking } = useBookings();
  const { villas } = useVillas();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState<Booking | null>(null);
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [search, setSearch]         = useState('');

  // Build a villaId → name lookup from the villas list so we can patch
  // bookings that were saved without a villaName (or with a stale one).
  const villaNameMap = useMemo(() => {
    const map = new Map<string, string>();
    villas.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [villas]);

  // Enrich bookings with villaName if it's missing or is just the raw ID
  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const resolvedName = villaNameMap.get(b.villaId);
      if (resolvedName && (!b.villaName || b.villaName === b.villaId)) {
        return { ...b, villaName: resolvedName };
      }
      return b;
    });
  }, [bookings, villaNameMap]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadGuestBookings(user.id);
    }, [user?.id])
  );

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await loadGuestBookings(user.id);
    setRefreshing(false);
  }, [user?.id]);

  const handleCancel = useCallback((id: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure?\n\nCancellation penalties may apply if the booking was already confirmed. This cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try { await cancelBooking(id); }
            catch (err: any) { Alert.alert('Error', err?.message ?? 'Could not cancel. Please try again.'); }
          },
        },
      ]
    );
  }, [cancelBooking]);

  const openDetail = useCallback((b: Booking) => setSelected(b), []);
  const closeDetail = useCallback(() => setSelected(null), []);

  const { myBookings, counts, filtered } = useMemo(() => {
    const mine = user?.id
      ? enrichedBookings.filter((b) => b.guestId === user.id).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      : [];
    const c = { all: mine.length, pending: 0, confirmed: 0, cancelled: 0 } as Record<StatusFilter, number>;
    for (const b of mine) c[b.status] = (c[b.status] ?? 0) + 1;
    const byStatus = filter === 'all' ? mine : mine.filter((b) => b.status === filter);
    const q = search.trim().toLowerCase();
    const f = !q
      ? byStatus
      : byStatus.filter((b) =>
          (b.referenceNumber ?? '').toLowerCase().includes(q) ||
          (b.villaName ?? '').toLowerCase().includes(q) ||
          (b.packageName ?? '').toLowerCase().includes(q),
        );
    return { myBookings: mine, counts: c, filtered: f };
  }, [bookings, user?.id, filter, search]);

  const renderItem = useCallback(
    ({ item }: { item: Booking }) => <BookingCard booking={item} onPress={openDetail} />,
    [openDetail]
  );

  if (!user) {
    return (
      <SafeAreaView style={s.center}>
        <Ionicons name="lock-closed-outline" size={52} color="#d1d5db" />
        <Text style={s.emptyTitle}>Sign in to view bookings</Text>
        <Text style={s.emptySub}>Your booking history will appear here once you sign in.</Text>
        <TouchableOpacity style={s.signInBtn} onPress={() => router.push('/login')}>
          <Ionicons name="logo-google" size={16} color="#fff" />
          <Text style={s.signInText}>Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading && enrichedBookings.length === 0) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={s.emptySub}>Loading your bookings…</Text>
      </SafeAreaView>
    );
  }

  if (myBookings.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Bookings</Text>
          <Text style={s.headerSub}>0 bookings</Text>
        </View>
        <View style={s.center}>
          <Ionicons name="calendar-outline" size={52} color="#d1d5db" />
          <Text style={s.emptyTitle}>No bookings yet</Text>
          <Text style={s.emptySub}>Browse our villas and make your first reservation.</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.replace('/(guest)')}>
            <Ionicons name="home-outline" size={16} color="#fff" />
            <Text style={s.browseBtnText}>Browse Villas</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <View style={s.stickyHeader}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Bookings</Text>
        <Text style={s.headerSub}>{myBookings.length} booking{myBookings.length !== 1 ? 's' : ''}</Text>
      </View>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reference, villa, or package"
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          const count = counts[f] ?? 0;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, active && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {count > 0 && f !== 'all' ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2E7D32" />}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        ListEmptyComponent={
          <View style={s.centerInline}>
            <Ionicons name={search ? 'search-outline' : 'filter-outline'} size={44} color="#d1d5db" />
            <Text style={s.emptyTitle}>
              {search ? 'No matching bookings' : `No ${filter} bookings`}
            </Text>
            <Text style={s.emptySub}>
              {search ? 'Try a different search term.' : 'Try a different filter.'}
            </Text>
          </View>
        }
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />

      <BookingDetailModal
        booking={selected}
        onClose={closeDetail}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#f9fafb' },
  list:        { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100, gap: 12 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, backgroundColor: '#f9fafb' },
  centerInline:{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },

  // Sticky header (header + search + filter chips)
  stickyHeader: { backgroundColor: '#f9fafb', paddingBottom: 6 },

  // Header
  header:      { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSub:   { fontSize: 13, color: '#6b7280' },

  // Search
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginHorizontal: 16, marginBottom: 8, height: 40 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 0, includeFontPadding: false, outlineStyle: 'none' as any },

  // Filter chips
  filterRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  filterBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', minHeight: 36, justifyContent: 'center' },
  filterBtnActive:  { backgroundColor: '#1a1a2e', borderColor: '#1a1a2e' },
  filterText:       { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },

  // Empty states
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  signInBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2E7D32', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  signInText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  browseBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a1a2e', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  browseBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Card
  card:          { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  villaName:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  refNum:        { fontSize: 11, color: '#9ca3af' },
  pkgName:       { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText:     { fontSize: 11, fontWeight: '700' },
  datesRowSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 10, padding: 10 },
  dateBoxSm:     { flex: 1, gap: 2 },
  dateLabelSm:   { fontSize: 9, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  dateValSm:     { fontSize: 12, fontWeight: '600', color: '#111827' },
  dateArrowSm:   { alignItems: 'center', gap: 2, paddingHorizontal: 8 },
  nightsSm:      { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  cardBottom:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount:        { fontSize: 16, fontWeight: '800', color: '#111827' },
  tapHint:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tapHintText:   { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  // Detail modal
  detailWrap:     { flex: 1, backgroundColor: '#f9fafb' },
  detailHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  detailTitle:    { fontSize: 18, fontWeight: '800', color: '#111827' },
  detailLocation: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  detailBody:     { padding: 20, gap: 14, paddingBottom: 40 },

  refCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 6, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  refLabel:       { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.6 },
  refNumber:      { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  statusText:     { fontSize: 12, fontWeight: '700' },

  infoCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  infoCardTitle:  { fontSize: 12, fontWeight: '800', color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel:      { flex: 1, fontSize: 13, color: '#6b7280' },
  infoValue:      { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  infoValueSm:    { fontSize: 12, color: '#374151', fontWeight: '500' },
  amountValue:    { fontSize: 15, fontWeight: '800', color: '#111827' },

  datesRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 },
  dateBox:        { flex: 1, gap: 2 },
  dateLabel:      { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
  dateValue:      { fontSize: 13, fontWeight: '700', color: '#111827' },
  dateTime:       { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  dateArrow:      { alignItems: 'center', gap: 2, paddingHorizontal: 8 },
  nightsText:     { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  penaltyCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fef3c7', borderRadius: 12, padding: 12 },
  penaltyText:    { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  detailFooter:   { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rulesBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f3f4f6' },
  rulesBtnText:   { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  cancelBtn:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  cancelBtnText:  { fontSize: 13, fontWeight: '700', color: '#dc2626' },

  // House rules modal
  rulesWrap:        { flex: 1, backgroundColor: '#f9fafb' },
  rulesHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rulesTitle:       { fontSize: 18, fontWeight: '800', color: '#111827' },
  rulesSub:         { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rulesList:        { padding: 20, gap: 10, paddingBottom: 40 },
  rulesNotice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#dbeafe', borderRadius: 12, padding: 12, marginBottom: 6 },
  rulesNoticeText:  { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 17 },
  ruleRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  ruleIcon:         { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  ruleText:         { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  signNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, marginTop: 6 },
  signNoteText:     { flex: 1, fontSize: 12, color: '#7c3aed', lineHeight: 17 },
  rulesFooter:      { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  agreeBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2E7D32' },
  agreeBtnText:     { fontSize: 14, fontWeight: '700', color: '#fff' },
});
