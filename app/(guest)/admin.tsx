import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

/**
 * This tab entry exists so the "Admin" tab appears in the bottom nav for
 * admin/superadmin users. It immediately redirects to the full admin panel
 * at /(admin) where villa CRUD, bookings, and availability management live.
 */
export default function AdminTabRedirect() {
  const { loading, isAdmin, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (isAdmin || isSuperAdmin) {
    return <Redirect href="/(admin)" />;
  }

  // Fallback — should never reach here since the tab is hidden for non-admins
  return <Redirect href="/(guest)" />;
}
