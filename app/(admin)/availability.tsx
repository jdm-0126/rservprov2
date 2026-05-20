import { useBookings, expandDateRange, BlockedRange } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';

type RangeSelection = { start: string | null; end: string | null };

export default function AvailabilityScreen() {
  const { id: villaId } = useLocalSearchParams<{ id: string }>();
  const { villas } = useVillas();
  const { blockedRanges, bookings, addBlockedRange, removeBlockedRange, getBookedDatesForVilla } = useBookings();
  const router = useRouter();

  const villa = villas.find((v) => v.id === villaId);
  const [selection, setSelection] = useState<RangeSelection>({ start: null, end: null });

  const bookedDates  = useMemo(() => new Set(villaId ? getBookedDatesForVilla(villaId) : []), [villaId, getBookedDatesForVilla]);
  const myBlocked    = blockedRanges.filter((r) => r.villaId === villaId);
  const blockedDates = useMemo(() => new Set(myBlocked.flatMap((r) => expandDateRange(r.startDate, r.endDate))), [myBlocked]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    bookedDates.forEach((d) => {
      marks[d] = { disabled: true, customStyles: { container: { backgroundColor: '#ef4444', borderRadius: 6 }, text: { color: '#fff', fontWeight: '600' } } };
    });

    blockedDates.forEach((d) => {
      if (!marks[d]) {
        marks[d] = { disabled: true, customStyles: { container: { backgroundColor: '#f97316', borderRadius: 6 }, text: { color: '#fff', fontWeight: '600' } } };
      }
    });

    const { start, end } = selection;
    if (start && end) {
      expandDateRange(start, end).forEach((d, i, arr) => {
        const isStart = i === 0, isEnd = i === arr.length - 1, isMid = !isStart && !isEnd;
        marks[d] = {
          customStyles: {
            container: {
              backgroundColor: isMid ? '#fef3c7' : '#f59e0b',
              borderRadius: isStart || isEnd ? 20 : 0,
            },
            text: { color: isMid ? '#92400e' : '#fff', fontWeight: '700' },
          },
        };
      });
    } else if (start) {
      marks[start] = { customStyles: { container: { backgroundColor: '#f59e0b', borderRadius: 20 }, text: { color: '#fff', fontWeight: '700' } } };
    }

    return marks;
  }, [bookedDates, blockedDates, selection]);

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    const { start, end } = selection;
    if (!start || (start && end) || date < start) {
      setSelection({ start: date, end: null });
    } else {
      setSelection({ start, end: date });
    }
  };

  const handleBlock = async () => {
    if (!selection.start || !selection.end || !villaId) {
      Alert.alert('Select Range', 'Tap a start date then an end date to block.');
      return;
    }
    await addBlockedRange({ villaId, startDate: selection.start, endDate: selection.end, reason: 'Admin blocked' });
    setSelection({ start: null, end: null });
    Alert.alert('Blocked', `Dates ${selection.start} → ${selection.end} are now blocked.`);
  };

  const handleRemove = (range: BlockedRange) => {
    Alert.alert('Remove Block', `Unblock ${range.startDate} → ${range.endDate}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBlockedRange(range.id) },
    ]);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.villaName}>{villa?.name}</Text>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#ef4444', label: 'Booked by guest' },
            { color: '#f97316', label: 'Blocked by admin' },
            { color: '#f59e0b', label: 'Your selection' },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            markingType="custom"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            minDate={today}
            enableSwipeMonths
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#9ca3af',
              todayTextColor: '#2E7D32',
              dayTextColor: '#111827',
              textDisabledColor: '#d1d5db',
              arrowColor: '#111827',
              monthTextColor: '#111827',
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
          />
        </View>

        {/* Selection */}
        <View style={styles.selectionRow}>
          <View style={styles.selectionBox}>
            <Text style={styles.selectionLabel}>Block From</Text>
            <Text style={[styles.selectionDate, !selection.start && styles.placeholder]}>
              {selection.start ?? 'Tap start'}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#d1d5db" />
          <View style={styles.selectionBox}>
            <Text style={styles.selectionLabel}>Block To</Text>
            <Text style={[styles.selectionDate, !selection.end && styles.placeholder]}>
              {selection.end ?? 'Tap end'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.blockBtn, (!selection.start || !selection.end) && styles.blockBtnDisabled]}
          onPress={handleBlock}
          disabled={!selection.start || !selection.end}
        >
          <Ionicons name="ban-outline" size={18} color="#fff" />
          <Text style={styles.blockBtnText}>Block Selected Dates</Text>
        </TouchableOpacity>

        {/* Blocked ranges list */}
        {myBlocked.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Blocked Ranges</Text>
            {myBlocked.map((r) => (
              <View key={r.id} style={styles.rangeCard}>
                <View style={styles.rangeInfo}>
                  <Ionicons name="ban-outline" size={16} color="#f97316" />
                  <Text style={styles.rangeText}>{r.startDate} → {r.endDate}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemove(r)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Upcoming bookings */}
        {bookings.filter((b) => b.villaId === villaId && b.status !== 'cancelled').length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Guest Bookings</Text>
            {bookings
              .filter((b) => b.villaId === villaId && b.status !== 'cancelled')
              .map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName}>{b.userName}</Text>
                    <Text style={styles.bookingDates}>{b.checkIn} → {b.checkOut} · {b.guests} guests</Text>
                  </View>
                  <Text style={styles.bookingPrice}>₱{b.totalPrice.toLocaleString()}</Text>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: '#111827' },
  body:         { padding: 16, gap: 16, paddingBottom: 40 },
  villaName:    { fontSize: 20, fontWeight: '700', color: '#111827' },

  legend:       { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:    { width: 12, height: 12, borderRadius: 6 },
  legendText:   { fontSize: 12, color: '#6b7280' },

  calendarCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },

  selectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  selectionBox:  { flex: 1, alignItems: 'center', gap: 4 },
  selectionLabel:{ fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectionDate: { fontSize: 15, fontWeight: '700', color: '#111827' },
  placeholder:   { color: '#d1d5db', fontWeight: '400' },

  blockBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', padding: 14, borderRadius: 14 },
  blockBtnDisabled: { backgroundColor: '#d1d5db' },
  blockBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },

  rangeCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  rangeInfo:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeText:  { fontSize: 14, color: '#374151', fontWeight: '500' },
  removeBtn:  { padding: 4 },

  bookingCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  bookingDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  bookingName:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  bookingDates: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
});
