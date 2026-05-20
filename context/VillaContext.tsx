import { firebaseAuth, firestore } from '@/services/firebase.config';
import { VILLAS, Villa } from '@/constants/villaData';
import {
  collection, doc, onSnapshot,
  setDoc, deleteDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

type VillaContextType = {
  villas: Villa[];
  loading: boolean;
  addVilla: (villa: Omit<Villa, 'id'>) => Promise<void>;
  updateVilla: (villa: Villa) => Promise<void>;
  deleteVilla: (id: string) => Promise<void>;
};

const VillaContext = createContext<VillaContextType>({} as VillaContextType);
const VILLAS_COL = 'villas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strip undefined values and the `id` field before writing to Firestore.
// Firestore rejects documents containing undefined values, and storing `id`
// inside the document body is redundant (it's already the document key).
// NOTE: empty strings and empty arrays are kept — they are valid Firestore values
// and some are required by validVillaData (e.g. image, amenities).
function toFirestoreDoc(villa: Villa | Omit<Villa, 'id'>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(villa)) {
    if (k === 'id') continue;
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      out[k] = v.filter((item) => item !== undefined);
    } else if (v !== null && typeof v === 'object') {
      // Recursively strip undefined from nested objects (e.g. policies)
      const nested: Record<string, unknown> = {};
      for (const [nk, nv] of Object.entries(v as object)) {
        if (nv !== undefined) nested[nk] = nv;
      }
      out[k] = nested;
    } else {
      out[k] = v; // includes empty strings — do NOT skip them
    }
  }
  return out;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function VillaProvider({ children }: { children: React.ReactNode }) {
  const [villas, setVillas]   = useState<Villa[]>(VILLAS);
  const [loading, setLoading] = useState(false);

  // Real-time listener — waits for Firebase Auth to initialise before
  // subscribing so the request always carries auth credentials.
  //
  // Strategy: static VILLAS from villaData.ts are always the base.
  // Firestore docs are merged on top (Firestore wins on id collision).
  // If the snapshot errors we silently keep the static data.
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(firebaseAuth, () => {
      unsubAuth(); // one-shot

      setLoading(true);
      unsubFirestore = onSnapshot(
        collection(firestore, VILLAS_COL),
        (snap) => {
          if (snap.empty) {
            setVillas(VILLAS);
          } else {
            const firestoreMap = new Map<string, Villa>();
            snap.docs.forEach((d) => {
              const raw = d.data() as any;
              // Normalize packages — Firestore may return an object instead of array
              const packages = Array.isArray(raw.packages)
                ? raw.packages
                : raw.packages && typeof raw.packages === 'object'
                  ? Object.values(raw.packages)
                  : undefined;
              firestoreMap.set(d.id, {
                ...raw,
                id: d.id,
                // Normalize pricePerNight → price
                price: raw.price ?? raw.pricePerNight ?? 0,
                packages,
              } as Villa);
            });

            const staticNotInFirestore = VILLAS.filter((v) => !firestoreMap.has(v.id));
            setVillas([...staticNotInFirestore, ...Array.from(firestoreMap.values())]);
          }
          setLoading(false);
        },
        (_error) => {
          // Snapshot failed (rules not deployed, offline) — keep static data
          setVillas(VILLAS);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, []);

  const addVilla = async (villa: Omit<Villa, 'id'>) => {
    const id  = Date.now().toString();
    const ref = doc(firestore, VILLAS_COL, id);
    // Ensure required fields always present so validVillaData passes
    const data = { amenities: [], image: '', ...villa, id };
    await setDoc(ref, toFirestoreDoc(data));
  };

  const updateVilla = async (villa: Villa) => {
    const ref = doc(firestore, VILLAS_COL, villa.id);
    // Ensure required fields always present so validVillaData passes
    const data = { amenities: [], image: '', ...villa };
    await setDoc(ref, toFirestoreDoc(data), { merge: true });
  };

  const deleteVilla = async (id: string) => {
    await deleteDoc(doc(firestore, VILLAS_COL, id));
  };

  return (
    <VillaContext.Provider value={{ villas, loading, addVilla, updateVilla, deleteVilla }}>
      {children}
    </VillaContext.Provider>
  );
}

export const useVillas = () => useContext(VillaContext);
