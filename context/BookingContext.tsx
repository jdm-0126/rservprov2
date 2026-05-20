import { firestore } from '@/services/firebase.config';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

/** Matches the Firestore bookings document schema exactly */
export type Booking = {
  id: string;              // Firestore auto-generated doc ID
  villaId: string;         // ref → villas
  villaName: string;       // denormalised for display
  villaLocation?: string;  // denormalised for display
  guestId: string;         // ref → users (guest)
  adminId: string;         // ref → users (admin)
  checkIn: string;         // ISO date "YYYY-MM-DD"
  checkOut: string;        // ISO date "YYYY-MM-DD"
  totalAmount: number;     // total cost
  status: BookingStatus;
  referenceNumber: string; // unique booking ref e.g. CL-20260518-A3F2
  createdAt: string;       // ISO timestamp
  // Package info (for multi-package villas like Silang)
  packageId?: string;
  packageName?: string;
  // UI-only extras (not stored in Firestore)
  guestName?: string;
  guestEmail?: string;
  guests?: number;
};

export type BlockedRange = {
  id: string;
  villaId: string;
  adminId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export type AdminNotification = {
  id: string;
  bookingId: string;
  referenceNumber: string;
  villaName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  read: boolean;
  createdAt: string;
};

type BookingContextType = {
  bookings: Booking[];
  blockedRanges: BlockedRange[];
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  loadGuestBookings: (guestId: string) => Promise<void>;
  loadAdminBookings: (adminId: string) => () => void;
  addBooking: (booking: Omit<Booking, 'id' | 'referenceNumber' | 'createdAt'>) => Promise<Booking>;
  confirmBooking: (id: string, callerUid: string) => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  addBlockedRange: (range: Omit<BlockedRange, 'id'>) => Promise<void>;
  removeBlockedRange: (id: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  getBookedDatesForVilla: (villaId: string) => string[];
  getBlockedDatesForVilla: (villaId: string) => string[];
  isDateRangeAvailable: (villaId: string, checkIn: string, checkOut: string) => boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function expandDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function generateRefNumber(): string {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `CL-${datePart}-${rand}`;
}

function toISOString(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return String(value);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BookingContext = createContext<BookingContextType>({} as BookingContextType);

const BOOKINGS_COL    = 'bookings';
const BLOCKED_COL     = 'availability'; // reuses availability collection
const NOTIFS_COL      = 'notifications';

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings]           = useState<Booking[]>([]);
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading]             = useState(false);

  // ── Load guest's own bookings (one-time fetch) ──────────────────────────
  const loadGuestBookings = async (guestId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(firestore, BOOKINGS_COL),
        where('guestId', '==', guestId)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Booking, 'id'>),
        createdAt: toISOString(d.data().createdAt),
      }));
      // Merge with any optimistically added bookings not yet in Firestore
      setBookings((prev) => {
        const ids = new Set(data.map((b) => b.id));
        const optimistic = prev.filter((b) => !ids.has(b.id) && b.guestId === guestId);
        return [...data, ...optimistic];
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Real-time listener for admin bookings ───────────────────────────────
  const loadAdminBookings = useCallback((adminId: string): (() => void) => {
    const q = query(
      collection(firestore, BOOKINGS_COL),
      where('adminId', '==', adminId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Booking, 'id'>),
        createdAt: toISOString(d.data().createdAt),
      }));
      setBookings(data);
    });
    return unsub;
  }, []);

  // ── Create booking ──────────────────────────────────────────────────────
  const addBooking = async (
    booking: Omit<Booking, 'id' | 'referenceNumber' | 'createdAt'>
  ): Promise<Booking> => {
    // Guard: Firestore rejects undefined values — fail fast with a clear message
    if (!booking.guestId) throw new Error('guestId is required — user may not be fully loaded yet.');
    if (!booking.villaId) throw new Error('villaId is required.');
    if (!booking.checkIn || !booking.checkOut) throw new Error('checkIn and checkOut are required.');

    const referenceNumber = generateRefNumber();
    const createdAt = new Date().toISOString();

    // Only store Firestore schema fields — strip undefined UI extras
    const firestoreDoc: Record<string, unknown> = {
      villaId:         booking.villaId,
      guestId:         booking.guestId,
      adminId:         booking.adminId ?? 'unassigned',
      checkIn:         booking.checkIn,
      checkOut:        booking.checkOut,
      totalAmount:     booking.totalAmount,
      status:          booking.status,
      referenceNumber,
      createdAt,
      ...(booking.packageId   && { packageId:   booking.packageId }),
      ...(booking.packageName && { packageName: booking.packageName }),
      ...(booking.villaLocation && { villaLocation: booking.villaLocation }),
    };

    const ref = await addDoc(collection(firestore, BOOKINGS_COL), firestoreDoc);

    const newBooking: Booking = {
      villaId:       booking.villaId,
      guestId:       booking.guestId,
      adminId:       booking.adminId ?? 'unassigned',
      checkIn:       booking.checkIn,
      checkOut:      booking.checkOut,
      totalAmount:   booking.totalAmount,
      status:        booking.status,
      villaName:     booking.villaName,
      villaLocation: booking.villaLocation,
      packageId:     booking.packageId,
      packageName:   booking.packageName,
      guestName:     booking.guestName,
      guestEmail:    booking.guestEmail,
      guests:        booking.guests,
      id:            ref.id,
      referenceNumber,
      createdAt,
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Create in-app notification
    const notif: AdminNotification = {
      id:              `n-${ref.id}`,
      bookingId:       ref.id,
      referenceNumber,
      villaName:       booking.villaName ?? '',
      guestName:       booking.guestName ?? '',
      checkIn:         booking.checkIn,
      checkOut:        booking.checkOut,
      totalAmount:     booking.totalAmount,
      read:            false,
      createdAt,
    };
    setNotifications((prev) => [notif, ...prev]);

    return newBooking;
  };

  // ── Cancel booking (guest: status only) ────────────────────────────────
  const cancelBooking = async (id: string) => {
    await updateDoc(doc(firestore, BOOKINGS_COL, id), { status: 'cancelled' });
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
    );
  };

  // ── Confirm booking — only the owning admin may confirm ─────────────────
  const confirmBooking = async (id: string, callerUid: string) => {
    // Find the booking in local state first for a fast ownership check
    const booking = bookings.find((b) => b.id === id);

    if (!booking) throw new Error('Booking not found.');
    if (booking.adminId !== callerUid) {
      throw new Error('Permission denied — you can only confirm bookings for your own villas.');
    }
    if (booking.status !== 'pending') {
      throw new Error(`Cannot confirm a booking with status "${booking.status}".`);
    }

    await updateDoc(doc(firestore, BOOKINGS_COL, id), { status: 'confirmed' });
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b))
    );
  };

  // ── Blocked ranges (availability collection) ────────────────────────────
  const addBlockedRange = async (range: Omit<BlockedRange, 'id'>) => {
    const ref = await addDoc(collection(firestore, BLOCKED_COL), {
      adminId:   range.adminId,
      villaId:   range.villaId,
      date:      range.startDate, // single-date entries; expand on read
      status:    'blocked',
      reason:    range.reason ?? '',
    });
    setBlockedRanges((prev) => [...prev, { ...range, id: ref.id }]);
  };

  const removeBlockedRange = async (id: string) => {
    await updateDoc(doc(firestore, BLOCKED_COL, id), { status: 'available' });
    setBlockedRanges((prev) => prev.filter((r) => r.id !== id));
  };

  // ── Notifications ───────────────────────────────────────────────────────
  const markNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // ── Availability helpers ────────────────────────────────────────────────
  const getBookedDatesForVilla = useCallback((villaId: string): string[] => {
    return bookings
      .filter((b) => b.villaId === villaId && b.status !== 'cancelled')
      .flatMap((b) => expandDateRange(b.checkIn, b.checkOut));
  }, [bookings]);

  const getBlockedDatesForVilla = useCallback((villaId: string): string[] => {
    return blockedRanges
      .filter((r) => r.villaId === villaId)
      .flatMap((r) => expandDateRange(r.startDate, r.endDate));
  }, [blockedRanges]);

  const isDateRangeAvailable = useCallback(
    (villaId: string, checkIn: string, checkOut: string): boolean => {
      const requested = expandDateRange(checkIn, checkOut);
      const booked    = new Set(getBookedDatesForVilla(villaId));
      const blocked   = new Set(getBlockedDatesForVilla(villaId));
      return requested.every((d) => !booked.has(d) && !blocked.has(d));
    },
    [getBookedDatesForVilla, getBlockedDatesForVilla]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <BookingContext.Provider value={{
      bookings, blockedRanges, notifications, unreadCount, loading,
      loadGuestBookings, loadAdminBookings,
      addBooking, confirmBooking, cancelBooking,
      addBlockedRange, removeBlockedRange, markNotificationsRead,
      getBookedDatesForVilla, getBlockedDatesForVilla, isDateRangeAvailable,
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBookings = () => useContext(BookingContext);
