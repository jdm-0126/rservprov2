import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function GuestLayout() {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2E7D32' }}>
      {/* Always visible — the villas browse page */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Villas',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />

      {/* Only visible when signed in */}
      <Tabs.Screen
        name="bookings"
        options={
          user
            ? {
                title: 'Bookings',
                tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="profile"
        options={
          user
            ? {
                title: 'Profile',
                tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
              }
            : { href: null }
        }
      />

      {/* Only visible for admin / superadmin */}
      <Tabs.Screen
        name="admin"
        options={
          isAdmin || isSuperAdmin
            ? {
                title: 'Admin',
                tabBarIcon: ({ color, size }) => <Ionicons name="shield-outline" size={size} color={color} />,
              }
            : { href: null }
        }
      />
    </Tabs>
  );
}
