import { Villa } from '@/constants/villaData';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { villas, deleteVilla } = useVillas();
  const { bookings, loadAdminBookings, notifications, unreadCount, markNotificationsRead } = useBookings();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const unsub: () => void = loadAdminBookings(user.id);
      return unsub;
    }, [user?.id])
  );

  const myBookings = bookings.filter((b) => b.adminId === user?.id);
  const pending    = myBookings.filter((b) => b.status === 'pending').length;

  const confirmDelete = (villa: Villa) => {
    Alert.alert('Delete Villa', `Are you sure you want to delete "${villa.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteVilla(villa.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={villas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Admin Panel</Text>
                <Text style={styles.subtitle}>Manage villa listings</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(admin)/villas')}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.addBtnText}>Add Villa</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Total Villas', value: villas.length, icon: 'home-outline', color: '#6366f1' },
                { label: 'Avg. Price', value: `₱${villas.length ? Math.round(villas.reduce((s, v) => s + v.price, 0) / villas.length).toLocaleString() : 0}`, icon: 'cash-outline', color: '#2E7D32' },
                { label: 'Total Capacity', value: villas.reduce((s, v) => s + v.guests, 0), icon: 'people-outline', color: '#f59e0b' },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Quick action — Bookings */}
            <TouchableOpacity style={styles.bookingsCard} onPress={() => router.push('/(admin)/bookings')}>
              <View style={styles.bookingsCardLeft}>
                <Ionicons name="calendar-outline" size={22} color="#fff" />
                <View>
                  <Text style={styles.bookingsCardTitle}>Manage Bookings</Text>
                  <Text style={styles.bookingsCardSub}>View, confirm or cancel reservations</Text>
                </View>
              </View>
              {pending > 0 && (
                <View style={styles.pendingPill}>
                  <Text style={styles.pendingPillText}>{pending} pending</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Quick action — Villas */}
            <TouchableOpacity style={styles.villasCard} onPress={() => router.push('/(admin)/villas')}>
              <View style={styles.bookingsCardLeft}>
                <Ionicons name="home-outline" size={22} color="#1a1a2e" />
                <View>
                  <Text style={styles.villasCardTitle}>Manage Villas</Text>
                  <Text style={styles.villasCardSub}>Edit villa details, pricing & packages</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </TouchableOpacity>

            {/* Notifications */}
            {notifications.slice(0, 5).length > 0 && (
              <View style={styles.notifsSection}>
                <View style={styles.notifHeader}>
                  <View style={styles.notifTitleRow}>
                    <Text style={styles.sectionTitle}>Recent Bookings</Text>
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  {unreadCount > 0 && (
                    <TouchableOpacity onPress={markNotificationsRead}>
                      <Text style={styles.markRead}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {notifications.slice(0, 5).map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[styles.notifCard, !n.read && styles.notifCardUnread]}
                    onPress={() => router.push('/(admin)/bookings')}
                  >
                    {!n.read && <View style={styles.unreadDot} />}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.notifTopRow}>
                        <Text style={styles.notifRef}>{n.referenceNumber}</Text>
                        <Text style={styles.notifPrice}>₱{(n.totalAmount ?? 0).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.notifVilla}>{n.villaName}</Text>
                      <Text style={styles.notifMeta}>👤 {n.guestName}</Text>
                      <Text style={styles.notifDates}>📅 {n.checkIn} → {n.checkOut}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle2}>Villa Listings</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No villas yet. Add one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={13} color="#9ca3af" />
                <Text style={styles.cardMeta}>{item.location}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="people-outline" size={13} color="#9ca3af" />
                <Text style={styles.cardMeta}>{item.guests} guests</Text>
                <Ionicons name="bed-outline" size={13} color="#9ca3af" style={{ marginLeft: 8 }} />
                <Text style={styles.cardMeta}>{item.bedrooms} beds</Text>
              </View>
              <Text style={styles.cardPrice}>₱{item.price.toLocaleString()}<Text style={styles.perNight}>/night</Text></Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.availBtn} onPress={() => router.push('/(admin)/availability')}>
                <Ionicons name="calendar-outline" size={18} color="#2E7D32" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(admin)/villas')}>
                <Ionicons name="pencil-outline" size={18} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  title:        { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle:     { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow:     { flexDirection: 'row', gap: 10, padding: 16 },
  statCard:     { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  statValue:    { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel:    { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  list:         { gap: 12, paddingBottom: 32 },

  // Bookings card
  bookingsCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16 },
  bookingsCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookingsCardTitle:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  bookingsCardSub:  { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  villasCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  villasCardTitle:  { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  villasCardSub:    { fontSize: 12, color: '#6b7280', marginTop: 1 },
  pendingPill:      { backgroundColor: '#E65100', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingPillText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  // Notifications
  notifsSection:  { marginHorizontal: 16, marginBottom: 8, gap: 8 },
  notifHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionTitle2:  { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 4 },
  badge:          { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  markRead:       { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  notifCard:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  notifCardUnread:{ borderLeftWidth: 3, borderLeftColor: '#6366f1' },
  unreadDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 4 },
  notifTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifRef:       { fontSize: 13, fontWeight: '800', color: '#1a1a2e', letterSpacing: 0.5 },
  notifPrice:     { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  notifVilla:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  notifMeta:      { fontSize: 12, color: '#9ca3af' },
  notifDates:     { fontSize: 12, color: '#9ca3af' },

  // Villa cards
  empty:        { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText:    { fontSize: 15, color: '#9ca3af' },
  card:         { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, marginHorizontal: 16 },
  cardImage:    { width: 90, height: 110 },
  cardBody:     { flex: 1, padding: 12, gap: 4, justifyContent: 'center' },
  cardName:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta:     { fontSize: 12, color: '#9ca3af' },
  cardPrice:    { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginTop: 4 },
  perNight:     { fontSize: 12, fontWeight: '400', color: '#9ca3af' },
  actions:      { justifyContent: 'center', gap: 8, paddingRight: 12 },
  editBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  availBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
});
