import { firebaseAuth, firestore } from '@/services/firebase.config';
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'admin' | 'guest';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  photo: string;
  role: UserRole;
  adminId?: string;   // links a guest to their admin
  createdAt?: string; // ISO timestamp
};

type AuthContextType = {
  user: AppUser | null;
  isGuest: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the Firestore /users/{uid} document.
 * If it doesn't exist yet (first sign-in), create it with role = 'guest'.
 */
async function getOrCreateUserDoc(fbUser: FirebaseUser): Promise<AppUser> {
  const ref  = doc(firestore, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    return {
      id:        fbUser.uid,
      name:      data.name      ?? fbUser.displayName ?? 'Guest',
      email:     data.email     ?? fbUser.email ?? '',
      photo:     fbUser.photoURL ?? '',
      role:      (data.role     ?? 'guest') as UserRole,
      adminId:   data.adminId,
      createdAt: data.createdAt,
    };
  }

  // First sign-in — create the document
  const newUser = {
    name:      fbUser.displayName ?? 'Guest',
    email:     fbUser.email ?? '',
    role:      'guest' as UserRole,
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, newUser);

  return {
    id:    fbUser.uid,
    photo: fbUser.photoURL ?? '',
    ...newUser,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isGuest      = user?.role === 'guest';
  const isAdmin      = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  useEffect(() => {
    // On web, check for a pending redirect result first (signInWithRedirect flow).
    // This runs once on mount — if the user was redirected back from Google,
    // onAuthStateChanged will fire with the user automatically, but we still
    // call getRedirectResult to surface any errors.
    if (Platform.OS === 'web') {
      getRedirectResult(firebaseAuth).catch(() => {
        // Ignore — errors are surfaced via onAuthStateChanged or the sign-in call
      });
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        const appUser = await getOrCreateUserDoc(fbUser);
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    if (Platform.OS === 'web') {
      // signInWithRedirect avoids the COOP/popup cross-origin issues on
      // deployed web apps. The user is redirected to Google and back;
      // onAuthStateChanged picks up the result automatically on return.
      await signInWithRedirect(firebaseAuth, provider);
    } else {
      try {
        const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const result  = await GoogleSignin.signIn();
        const idToken = result.data?.idToken ?? (result as any).idToken;
        if (!idToken) throw new Error('No ID token returned from Google Sign-In');
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(firebaseAuth, credential);
      } catch (error: any) {
        if (error.code === '12501' || error.message?.includes('SIGN_IN_CANCELLED')) return;
        throw error;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, isAdmin, isSuperAdmin, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
