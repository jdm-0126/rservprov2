import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Image, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon as any} size={16} color="#2E7D32" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ value, label, color = '#111827' }: { value: number; label: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GuestProfilePage() {
  const { user, signOut } = useAuth();
  const { bookings, loadGuestBookings } = useBookings();
  const router = useRouter();

  // Reload bookings when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadGuestBookings(user.id);
    }, [user?.id])
  );

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="person-circle-outline" size={72} color="#d1d5db" />
        <Text style={styles.guestTitle}>You're browsing as a guest</Text>
        <Text style={styles.guestSubtitle}>Sign in to manage bookings and view your profile</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/login')}>
          <Ionicons name="logo-google" size={16} color="#fff" />
          <Text style={styles.signInText}>Sign In with Google</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Booking stats ────────────────────────────────────────────────────────
  const myBookings  = bookings.filter((b) => b.guestId === user.id);
  const confirmed   = myBookings.filter((b) => b.status === 'confirmed').length;
  const pending     = myBookings.filter((b) => b.status === 'pending').length;
  const cancelled   = myBookings.filter((b) => b.status === 'cancelled').length;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : 'Recently joined';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Avatar + name ── */}
        <View style={styles.heroCard}>
          {user.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={12} color="#2E7D32" />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>

        {/* ── Booking stats ── */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          <View style={styles.statsRow}>
            <StatBox value={myBookings.length} label="Total" />
            <View style={styles.statDivider} />
            <StatBox value={confirmed}  label="Confirmed" color="#2E7D32" />
            <View style={styles.statDivider} />
            <StatBox value={pending}    label="Pending"   color="#E65100" />
            <View style={styles.statDivider} />
            <StatBox value={cancelled}  label="Cancelled" color="#9E9E9E" />
          </View>
        </View>

        {/* ── Account info ── */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <InfoRow icon="person-outline"      label="Full Name"     value={user.name} />
          <View style={styles.divider} />
          <InfoRow icon="mail-outline"         label="Email"         value={user.email} />
          <View style={styles.divider} />
          <InfoRow icon="shield-outline"       label="Role"          value={user.role.charAt(0).toUpperCase() + user.role.slice(1)} />
          <View style={styles.divider} />
          <InfoRow icon="calendar-outline"     label="Member Since"  value={memberSince} />
          {user.adminId && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="business-outline" label="Managed By"    value={user.adminId} />
            </>
          )}
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(guest)/bookings')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar-outline" size={18} color="#2E7D32" />
            </View>
            <Text style={styles.actionText}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/(guest)')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="home-outline" size={18} color="#2E7D32" />
            </View>
            <Text style={styles.actionText}>Browse Villas</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#f9fafb' },
  scroll:             { padding: 20, gap: 16, paddingBottom: 40 },
  center:             { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32, backgroundColor: '#f9fafb' },
  guestTitle:         { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  guestSubtitle:      { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  signInBtn:          { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a2e', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  signInText:         { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Hero
  heroCard:           { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar:             { width: 88, height: 88, borderRadius: 44, marginBottom: 4 },
  avatarPlaceholder:  { width: 88, height: 88, borderRadius: 44, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarInitial:      { color: '#fff', fontSize: 36, fontWeight: '700' },
  name:               { fontSize: 20, fontWeight: '800', color: '#111827' },
  email:              { fontSize: 14, color: '#6b7280' },
  roleBadge:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  roleText:           { fontSize: 12, fontWeight: '600', color: '#166534', textTransform: 'capitalize' },
  // Stats
  statsCard:          { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statsRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  statBox:            { flex: 1, alignItems: 'center', gap: 4 },
  statValue:          { fontSize: 22, fontWeight: '800' },
  statLabel:          { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statDivider:        { width: 1, height: 36, backgroundColor: '#f3f4f6' },
  // Info card
  infoCard:           { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle:       { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoIcon:           { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  infoText:           { flex: 1 },
  infoLabel:          { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue:          { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 1 },
  divider:            { height: 1, backgroundColor: '#f3f4f6', marginLeft: 46 },
  // Actions
  actionsCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  actionRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionIcon:         { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  actionText:         { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  // Sign out
  signOutBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, borderColor: '#fecaca' },
  signOutText:        { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
