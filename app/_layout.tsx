import { AuthProvider } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { VillaProvider } from '@/context/VillaContext';
import ChatAssistant from '@/components/ChatAssistant';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <VillaProvider>
        <BookingProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(guest)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="screens/AuthScreen" options={{ headerShown: false }} />
            <Stack.Screen name="screens/WelcomeScreen" options={{ headerShown: false }} />
            <Stack.Screen name="villa/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <ChatAssistant />
          <StatusBar style="auto" />
        </BookingProvider>
      </VillaProvider>
    </AuthProvider>
  );
}
