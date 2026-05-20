import { useAuth } from '@/context/AuthContext';
import { Redirect, Stack } from 'expo-router';

export default function AdminLayout() {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();

  if (loading) return null;
  if (!user || (!isAdmin && !isSuperAdmin)) return <Redirect href="/(guest)" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="villas" />
      <Stack.Screen name="availability" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
