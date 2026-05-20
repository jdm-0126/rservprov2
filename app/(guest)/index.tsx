import BookingConfirmationModal from '@/components/BookingConfirmationModal';
import { useAuth } from '@/context/AuthContext';
import { useBookings, expandDateRange, type Booking } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Villa } from '@/constants/villaData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  Alert, FlatList, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';

// ─── Villa list card ──────────────────────────────────────────────────────────
function VillaListCard({ villa, onPress }: { villa: Villa; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: villa.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{villa.name}</Text>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={13} color="#6b7280" />
          <Text style={styles.cardLocation}>{villa.location}</Text>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color="#6b7280" />
            <Text style={styles.metaText}>Up to {villa.guests} guests</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="bed-outline" size={13} color="#6b7280" />
            <Text style={styles.metaText}>{villa.bedrooms} bedrooms</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            ₱{villa.price?.toLocaleString() ?? '0'}
            <Text style={styles.cardPriceUnit}>/night</Text>
          </Text>
          <View style={styles.viewBadge}>
            <Text style={styles.viewBadgeText}>View Details</Text>
            <Ionicons name="arrow-forward" size={12} color="#2E7D32" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Amenity pill ─────────────────────────────────────────────────────────────
function AmenityPill({ label }: { label: string }) {
  const icons: Record<string, string> = {
    'Private Pool': 'water-outline', 'WiFi': 'wifi-outline',
    'Air Conditioning': 'snow-outline', 'BBQ': 'flame-outline',
    'Parking': 'car-outline', 'Garden': 'leaf-outline',
    'Outdoor Dining': 'restaurant-outline', 'Karaoke': 'musical-notes-outline',
  };
  return (
    <View style={styles.pill}>
      <Ionicons name={(icons[label] ?? 'checkmark-outline') as any} size={12} color="#2E7D32" />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

// ─── Inline booking form (authenticated users) ────────────────────────────────
function BookingForm({ villa, onDone }: { villa: Villa; onDone: () => void }) {
  const { user } = useAuth();
  const { addBooking, getBookedDatesForVilla, isDateRangeAvailable, bookings } = useBookings();
  const [checkIn, setCheckIn]       = useState<string | null>(null);
  const [checkOut, setCheckOut]     = useState<string | null>(null);
  const [guests, setGuests]         = useState(2);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(
    villa.packages?.length ? villa.packages[0].id : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed]   = useState<Booking | null>(null);

  // Resolve selected package object
  const activePkg = villa.packages?.find((p) => p.id === selectedPkg) ?? null;

  // Price: use package weekday rate if available, else villa base price
  const parseRate = (rate: string) =>
    parseInt(rate.replace(/[₱,]/g, ''), 10) || villa.price;

  const nightlyRate = activePkg ? parseRate(activePkg.weekdayRate) : villa.price;

  const bookedDates = useMemo(
    () => new Set(getBookedDatesForVilla(villa.id)),
    [villa.id, getBookedDatesForVilla]
  );

  // Also get confirmed bookings to show in green on calendar
  
  const confirmedDates = useMemo(() => {
    const confirmed = bookings.filter(
      (b) => b.villaId === villa.id && b.status === 'confirmed'
    );
    return new Set(confirmed.flatMap((b) => expandDateRange(b.checkIn, b.checkOut)));
  }, [bookings, villa.id]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    // Confirmed bookings — green
    confirmedDates.forEach((d) => {
      marks[d] = { disabled: true, disableTouchEvent: true,
        customStyles: { container: { backgroundColor: '#2E7D32', borderRadius: 6 }, text: { color: '#fff', fontWeight: '600' } } };
    });
    // Pending/booked — red
    bookedDates.forEach((d) => {
      if (!marks[d]) marks[d] = { disabled: true, disableTouchEvent: true,
        customStyles: { container: { backgroundColor: '#ef4444', borderRadius: 6 }, text: { color: '#fff' } } };
    });
    // Selected range
    if (checkIn && checkOut) {
      expandDateRange(checkIn, checkOut).forEach((d, i, arr) => {
        const isStart = i === 0, isEnd = i === arr.length - 1;
        marks[d] = { customStyles: {
          container: { backgroundColor: (!isStart && !isEnd) ? '#e8e8f0' : '#1a1a2e', borderRadius: isStart || isEnd ? 20 : 0 },
          text: { color: (!isStart && !isEnd) ? '#1a1a2e' : '#fff', fontWeight: '700' },
        }};
      });
    } else if (checkIn) {
      marks[checkIn] = { customStyles: { container: { backgroundColor: '#1a1a2e', borderRadius: 20 }, text: { color: '#fff', fontWeight: '700' } } };
    }
    return marks;
  }, [confirmedDates, bookedDates, checkIn, checkOut]);

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    if (bookedDates.has(date)) return;
    if (!checkIn || (checkIn && checkOut) || date < checkIn) {
      setCheckIn(date); setCheckOut(null); return;
    }
    const range = expandDateRange(checkIn, date);
    if (range.some((d) => bookedDates.has(d))) {
      Alert.alert('Unavailable Dates', 'Your range includes booked dates. Please choose again.');
      setCheckIn(date); setCheckOut(null); return;
    }
    setCheckOut(date);
  };

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  }, [checkIn, checkOut]);

  const total = nights * nightlyRate;

  const handleConfirm = async () => {
    // Use firebaseAuth.currentUser as the authoritative UID source —
    // avoids stale closure issues where user.id might not be set yet
    const { firebaseAuth } = await import('@/services/firebase.config');
    const uid = firebaseAuth.currentUser?.uid ?? user?.id;

    if (!uid) {
      Alert.alert('Not signed in', 'Please sign in to complete your booking.');
      return;
    }
    if (!checkIn || !checkOut || nights <= 0) {
      Alert.alert('Select Dates', 'Please select check-in and check-out dates.');
      return;
    }
    if (!isDateRangeAvailable(villa.id, checkIn, checkOut)) {
      Alert.alert('Unavailable', 'Some dates are no longer available. Please choose different dates.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await addBooking({
        villaId:     villa.id,
        villaName:   villa.name,
        guestId:     uid,
        adminId:     villa.adminId ?? 'unassigned',
        checkIn,
        checkOut,
        totalAmount: total,
        status:      'pending',
        guestName:   user?.name ?? '',
        guestEmail:  user?.email ?? '',
        guests,
      });
      setConfirmed(booking);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <View style={styles.bookingForm}>
        {/* Package selector — only for villas with packages */}
        {villa.packages && villa.packages.length > 0 && (
          <View style={styles.pkgSection}>
            <Text style={styles.pkgSectionTitle}>Select Package</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pkgScroll}>
              {villa.packages.map((pkg) => {
                const isActive = selectedPkg === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.pkgCard, isActive && styles.pkgCardActive]}
                    onPress={() => setSelectedPkg(pkg.id)}
                  >
                    <Text style={[styles.pkgCardName, isActive && styles.pkgCardNameActive]}>{pkg.name}</Text>
                    <Text style={[styles.pkgCardCap, isActive && styles.pkgCardCapActive]}>{pkg.groupCapacity}</Text>
                    <Text style={[styles.pkgCardRate, isActive && styles.pkgCardRateActive]}>{pkg.weekdayRate}</Text>
                    <Text style={[styles.pkgCardRateSub, isActive && styles.pkgCardRateSubActive]}>weekday</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {activePkg && (
              <View style={styles.pkgDetail}>
                <Ionicons name="bed-outline" size={13} color="#6b7280" />
                <Text style={styles.pkgDetailText}>{activePkg.bedTypes}</Text>
                {activePkg.extraBedCapacity && activePkg.extraBedCapacity !== 'Not specified' && (
                  <Text style={styles.pkgDetailExtra}>+{activePkg.extraBedCapacity}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#1a1a2e', label: 'Selected' },
            { color: '#2E7D32', label: 'Confirmed' },
            { color: '#ef4444', label: 'Pending/Booked' },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Compact calendar — fixed height, no scroll */}
        <View style={styles.calendarContainer}>
          <Calendar
            markingType="custom"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={today}
            enableSwipeMonths
            style={styles.calendar}
            theme={{
              calendarBackground: '#fff',
              todayTextColor: '#2E7D32',
              dayTextColor: '#1a1a1a',
              textDisabledColor: '#d1d5db',
              arrowColor: '#1a1a2e',
              monthTextColor: '#1a1a1a',
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayFontSize: 12,
              textMonthFontSize: 14,
              textDayHeaderFontSize: 11,
            }}
          />
        </View>

        {/* Date selection */}
        <View style={styles.selectionRow}>
          <View style={styles.selectionBox}>
            <Text style={styles.selectionLabel}>CHECK-IN</Text>
            <Text style={[styles.selectionDate, !checkIn && styles.placeholder]}>{checkIn ?? 'Tap a date'}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#ccc" />
          <View style={[styles.selectionBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.selectionLabel}>CHECK-OUT</Text>
            <Text style={[styles.selectionDate, !checkOut && styles.placeholder]}>{checkOut ?? 'Tap a date'}</Text>
          </View>
        </View>

        {/* Guests stepper */}
        <View style={styles.guestsRow}>
          <Text style={styles.guestsLabel}>Guests</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setGuests((g) => Math.max(1, g - 1))}>
              <Ionicons name="remove" size={16} color="#1a1a2e" />
            </TouchableOpacity>
            <Text style={styles.stepCount}>{guests}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setGuests((g) => Math.min(villa.guests, g + 1))}>
              <Ionicons name="add" size={16} color="#1a1a2e" />
            </TouchableOpacity>
            <Text style={styles.guestsMax}>/ {villa.guests} max</Text>
          </View>
        </View>

        {/* Summary */}
        {nights > 0 && (
          <View style={styles.summary}>
            <View style={{ gap: 2 }}>
              {activePkg && (
                <Text style={styles.summaryPkg}>{activePkg.name}</Text>
              )}
              <Text style={styles.summaryText}>₱{nightlyRate.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</Text>
            </View>
            <Text style={styles.summaryTotal}>₱{total.toLocaleString()}</Text>
          </View>
        )}

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, (!checkIn || !checkOut || submitting) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!checkIn || !checkOut || submitting}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.confirmText}>
            {submitting ? 'Submitting…' : nights > 0 ? `Confirm · ₱${total.toLocaleString()}` : 'Select dates to book'}
          </Text>
        </TouchableOpacity>
      </View>

      <BookingConfirmationModal
        booking={confirmed}
        visible={!!confirmed}
        onViewBookings={() => { setConfirmed(null); onDone(); }}
        onClose={() => { setConfirmed(null); onDone(); }}
      />
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GuestVillasPage() {
  const { villas } = useVillas();
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Villa | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return villas.filter((v) => {
      const name = v.name?.toLowerCase() ?? '';
      const location = v.location?.toLowerCase() ?? '';
      return query === '' || name.includes(query) || location.includes(query);
    });
  }, [villas, search]);

  // ── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelected(null)}>
          <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
          <Text style={styles.backText}>All Villas</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: selected.image }} style={styles.detailImage} resizeMode="cover" />
            <View style={styles.detailBody}>
              <Text style={styles.detailName}>{selected.name}</Text>
              <View style={styles.cardRow}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.cardLocation}>{selected.location}</Text>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { icon: 'people-outline', label: `${selected.guests} guests` },
                  { icon: 'bed-outline', label: `${selected.bedrooms} bedrooms` },
                  { icon: 'cash-outline', label: `₱${selected.price.toLocaleString()}/night` },
                ].map((s) => (
                  <View key={s.label} style={styles.statBox}>
                    <Ionicons name={s.icon as any} size={20} color="#2E7D32" />
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{selected.description}</Text>

              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.pillsWrap}>
                {selected.amenities.map((a) => <AmenityPill key={a} label={a} />)}
              </View>

              {/* {selected.entertainment?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Entertainment</Text>
                  <View style={styles.pillsWrap}>
                    {selected.entertainment.map((e) => <AmenityPill key={e} label={e} />)}
                  </View>
                </>
              )} */}

              {selected.policies && (
                <>
                  <Text style={styles.sectionTitle}>Policies</Text>
                  <View style={styles.policyCard}>
                    {[
                      { icon: 'log-in-outline',    label: 'Check-in',    value: selected.policies.checkIn },
                      { icon: 'log-out-outline',   label: 'Check-out',   value: selected.policies.checkOut },
                      selected.policies.extraGuestFee && { icon: 'people-outline',  label: 'Extra Guests', value: selected.policies.extraGuestFee },
                      selected.policies.childPolicy  && { icon: 'happy-outline',    label: 'Children',     value: selected.policies.childPolicy },
                      selected.policies.petPolicy    && { icon: 'paw-outline',      label: 'Pets',         value: selected.policies.petPolicy },
                      selected.policies.parking      && { icon: 'car-outline',      label: 'Parking',      value: selected.policies.parking },
                      selected.policies.extension    && { icon: 'time-outline',     label: 'Extension',    value: selected.policies.extension },
                    ].filter(Boolean).map((p: any) => (
                      <View key={p.label} style={styles.policyRow}>
                        <Ionicons name={p.icon as any} size={14} color="#2E7D32" />
                        <Text style={styles.policyLabel}>{p.label}:</Text>
                        <Text style={styles.policyValue}>{p.value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* {selected.promos?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Promos</Text>
                  {selected.promos.map((p) => (
                    <View key={p} style={styles.promoBadge}>
                      <Ionicons name="gift-outline" size={14} color="#7c3aed" />
                      <Text style={styles.promoText}>{p}</Text>
                    </View>
                  ))}
                </>
              )} */}

              {/* Packages table — Silang resort */}
              {selected.packages && selected.packages.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Packages & Rates</Text>
                  <View style={styles.packageNote}>
                    <Ionicons name="information-circle-outline" size={14} color="#1d4ed8" />
                    <Text style={styles.packageNoteText}>
                      Select the package that fits your group. Weekday = Mon–Thu · Weekend/Holiday = Fri–Sun & Holidays
                    </Text>
                  </View>
                  {/* Table header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Package</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Capacity</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Weekday</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.1 }]}>Weekend</Text>
                  </View>
                  {selected.packages.map((pkg, i) => (
                    <View key={pkg.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.tablePkgName}>{pkg.name}</Text>
                        <Text style={styles.tablePkgRooms} numberOfLines={2}>{pkg.roomsIncluded}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tableCapacity}>{pkg.groupCapacity}</Text>
                        {pkg.extraBedCapacity && pkg.extraBedCapacity !== 'Not specified' && (
                          <Text style={styles.tableExtra}>+{pkg.extraBedCapacity}</Text>
                        )}
                      </View>
                      <Text style={[styles.tableRate, { flex: 1.1 }]}>{pkg.weekdayRate}</Text>
                      <Text style={[styles.tableRate, styles.tableRateWeekend, { flex: 1.1 }]}>{pkg.weekendRate}</Text>
                    </View>
                  ))}
                  <View style={styles.tableBedNote}>
                    <Ionicons name="bed-outline" size={12} color="#6b7280" />
                    <Text style={styles.tableBedNoteText}>
                      Bed types vary per package. Contact us for specific room configurations.
                    </Text>
                  </View>
                </>
              )}

              {/* Booking section */}
              <Text style={styles.sectionTitle}>Book This Villa</Text>

              {user ? (
                <BookingForm villa={selected} onDone={() => setSelected(null)} />
              ) : (
                <View style={styles.loginPrompt}>
                  <Ionicons name="lock-closed-outline" size={20} color="#2E7D32" />
                  <Text style={styles.loginPromptText}>Sign in to book this villa</Text>
                  <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Our Villas</Text>
          <Text style={styles.headerSub}>{villas.length} properties available</Text>
        </View>
        {!user && (
          <TouchableOpacity style={styles.signInChip} onPress={() => router.push('/login')}>
            <Ionicons name="person-outline" size={14} color="#2E7D32" />
            <Text style={styles.signInChipText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {!user && (
        <View style={styles.guestBanner}>
          <Ionicons name="eye-outline" size={15} color="#92400e" />
          <Text style={styles.guestBannerText}>Browsing as guest — sign in to make bookings</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No villas match your search</Text>
          </View>
        }
        renderItem={({ item }) => (
          <VillaListCard villa={item} onPress={() => setSelected(item)} />
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#f9fafb' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle:      { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSub:        { fontSize: 13, color: '#6b7280', marginTop: 2 },
  signInChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  signInChipText:   { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput:      { flex: 1, fontSize: 14, color: '#111827' },
  guestBanner:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', marginHorizontal: 20, marginBottom: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  guestBannerText:  { fontSize: 12, color: '#92400e', fontWeight: '500', flex: 1 },
  list:             { paddingHorizontal: 20, paddingBottom: 100, gap: 16 },
  empty:            { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:        { fontSize: 15, color: '#9ca3af' },
  // List card
  card:             { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardImage:        { width: '100%', height: 180 },
  cardBody:         { padding: 14, gap: 6 },
  cardName:         { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLocation:     { fontSize: 13, color: '#6b7280' },
  cardMeta:         { flexDirection: 'row', gap: 14 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:         { fontSize: 12, color: '#6b7280' },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice:        { fontSize: 17, fontWeight: '800', color: '#111827' },
  cardPriceUnit:    { fontSize: 13, fontWeight: '400', color: '#6b7280' },
  viewBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  viewBadgeText:    { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  // Detail
  backBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 14 },
  backText:         { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  detailImage:      { width: '100%', height: 260 },
  detailBody:       { padding: 20, gap: 10, paddingBottom: 40 },
  detailName:       { fontSize: 22, fontWeight: '800', color: '#111827' },
  statsRow:         { flexDirection: 'row', gap: 10, marginVertical: 6 },
  statBox:          { flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 12, paddingVertical: 12 },
  statLabel:        { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  description:      { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  pillsWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:             { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:         { fontSize: 12, color: '#166534', fontWeight: '500' },
  loginPrompt:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 14, padding: 16, marginTop: 4 },
  loginPromptText:  { flex: 1, fontSize: 14, color: '#166534', fontWeight: '500' },
  loginBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2E7D32', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  loginBtnText:     { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Policy card
  policyCard:       { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  policyRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  policyLabel:      { fontSize: 12, fontWeight: '700', color: '#374151', minWidth: 80 },
  policyValue:      { flex: 1, fontSize: 12, color: '#4b5563', lineHeight: 18 },
  // Promo badge
  promoBadge:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  promoText:        { fontSize: 13, color: '#7c3aed', fontWeight: '600' },
  // Package table
  packageNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, marginBottom: 8 },
  packageNoteText:  { flex: 1, fontSize: 11, color: '#1d4ed8', lineHeight: 16 },
  tableHeader:      { flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 2 },
  tableHeaderCell:  { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow:         { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  tableRowAlt:      { backgroundColor: '#f9fafb' },
  tablePkgName:     { fontSize: 12, fontWeight: '700', color: '#111827' },
  tablePkgRooms:    { fontSize: 10, color: '#6b7280', marginTop: 1 },
  tableCapacity:    { fontSize: 12, fontWeight: '600', color: '#374151' },
  tableExtra:       { fontSize: 10, color: '#2E7D32', fontWeight: '500' },
  tableRate:        { fontSize: 12, fontWeight: '700', color: '#111827' },
  tableRateWeekend: { color: '#E65100' },
  tableBedNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 5, backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, marginTop: 4 },
  tableBedNoteText: { flex: 1, fontSize: 10, color: '#6b7280', lineHeight: 15 },
  bookingForm:      { backgroundColor: '#f8f8f8', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8f0', marginTop: 4 },
  // Package selector
  pkgSection:       { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pkgSectionTitle:  { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pkgScroll:        { gap: 8, paddingBottom: 4 },
  pkgCard:          { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, minWidth: 100, alignItems: 'center', gap: 2, backgroundColor: '#f9fafb' },
  pkgCardActive:    { borderColor: '#1a1a2e', backgroundColor: '#1a1a2e' },
  pkgCardName:      { fontSize: 11, fontWeight: '700', color: '#374151' },
  pkgCardNameActive:{ color: '#fff' },
  pkgCardCap:       { fontSize: 10, color: '#6b7280' },
  pkgCardCapActive: { color: 'rgba(255,255,255,0.7)' },
  pkgCardRate:      { fontSize: 13, fontWeight: '800', color: '#2E7D32', marginTop: 2 },
  pkgCardRateActive:{ color: '#a0e8a0' },
  pkgCardRateSub:   { fontSize: 9, color: '#9ca3af' },
  pkgCardRateSubActive: { color: 'rgba(255,255,255,0.5)' },
  pkgDetail:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: '#f9fafb', borderRadius: 8, padding: 8 },
  pkgDetailText:    { flex: 1, fontSize: 11, color: '#6b7280' },
  pkgDetailExtra:   { fontSize: 11, fontWeight: '600', color: '#2E7D32' },
  summaryPkg:       { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  legend:           { flexDirection: 'row', gap: 12, padding: 10, backgroundColor: '#fff', flexWrap: 'wrap' },
  legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:        { width: 10, height: 10, borderRadius: 5 },
  legendText:       { fontSize: 10, color: '#666' },
  calendarContainer:{ backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f0f0f0' },
  calendar:         { height: 320 },
  selectionRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#f0f0f0' },
  selectionBox:     { flex: 1, gap: 2 },
  selectionLabel:   { fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.5 },
  selectionDate:    { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  placeholder:      { color: '#ccc', fontWeight: '400' },
  guestsRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: '#f0f0f0' },
  guestsLabel:      { fontSize: 13, fontWeight: '600', color: '#555' },
  stepper:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn:          { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f8', alignItems: 'center', justifyContent: 'center' },
  stepCount:        { fontSize: 16, fontWeight: '700', color: '#1a1a2e', minWidth: 20, textAlign: 'center' },
  guestsMax:        { fontSize: 12, color: '#aaa' },
  summary:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  summaryText:      { fontSize: 13, color: '#555' },
  summaryTotal:     { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  confirmBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', padding: 14, margin: 10, borderRadius: 12 },
  confirmBtnDisabled: { backgroundColor: '#ccc' },
  confirmText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
});
