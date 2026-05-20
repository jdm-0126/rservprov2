import { useAuth } from '@/context/AuthContext';
import { useBookings, expandDateRange } from '@/context/BookingContext';
import { useVillas } from '@/context/VillaContext';
import { Villa } from '@/constants/villaData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, Modal,
  Platform, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import BookingConfirmationModal from '@/components/BookingConfirmationModal';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'bot' | 'user';
interface Message {
  id: string;
  role: Role;
  text: string;
  chips?: string[];
  bookingVillaId?: string;
}

// ─── Bot brain ────────────────────────────────────────────────────────────────
function getBotReply(input: string, villas: Villa[]): { text: string; chips?: string[]; bookingVillaId?: string } {
  const msg = input.toLowerCase().trim();

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmt = (n: number) => n.toLocaleString();

  // Build a short summary line for a villa
  const villaSummary = (v: Villa) => {
    const pkgs = Array.isArray(v.packages) ? v.packages : [];
    const basePrice = pkgs.length
      ? `Packages from ₱${fmt(Math.min(...pkgs.map((p) => parseInt(p.weekdayRate.replace(/[₱,]/g, ''), 10) || v.price)))}`
      : `₱${fmt(v.price)}/night`;
    return `🏡 ${v.name}\n📍 ${v.location}\n👥 Up to ${v.guests} guests · ${v.bedrooms} bedrooms\n💰 ${basePrice}`;
  };

  // Find a villa by keyword (location-based)
  const findVilla = (keywords: string[]) =>
    villas.find((v) =>
      keywords.some((k) => v.name.toLowerCase().includes(k) || v.location.toLowerCase().includes(k))
    );

  const pampangaVilla = findVilla(['pampanga', 'angeles']);
  const silangVilla   = findVilla(['silang', 'cavite', 'tagaytay']);

  // ── Greetings ────────────────────────────────────────────────────────────────
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|kumusta|musta)/.test(msg)) {
    return {
      text: `Hi there! 👋 I'm Luna, your booking assistant for Casa Luna. We have ${villas.length} beautiful private villa${villas.length !== 1 ? 's' : ''} — ${villas.map((v) => v.location).join(' and ')}. How can I help you today?`,
      chips: ['View villas', ...villas.map((v) => v.location.split(',')[0] + ' villa'), 'Pricing', 'Amenities'],
    };
  }

  // ── List all villas ──────────────────────────────────────────────────────────
  if (/villa|property|properties|list|available|show|view/.test(msg)) {
    return {
      text: `We have ${villas.length} beautiful private villa${villas.length !== 1 ? 's' : ''}:\n\n` +
        villas.map(villaSummary).join('\n\n') +
        '\n\nWhich one interests you?',
      chips: [...villas.map((v) => v.location.split(',')[0] + ' villa'), 'Compare pricing'],
    };
  }

  // ── Pampanga villa ───────────────────────────────────────────────────────────
  if (/book.*pampanga|pampanga.*book/.test(msg) && pampangaVilla) {
    return { text: `Great choice! 🎉 Here's the booking form for ${pampangaVilla.name}. Select your dates:`, chips: [], bookingVillaId: pampangaVilla.id };
  }
  if (/pampanga|angeles/.test(msg) && pampangaVilla) {
    return {
      text: villaSummary(pampangaVilla) + '\n\nFully equipped private villa with pool, unlimited entertainment, and pet-friendly policy.',
      chips: ['Book Pampanga', 'Amenities', 'Policies', 'Entertainment'],
    };
  }

  // ── Silang villa ─────────────────────────────────────────────────────────────
  if (/book.*silang|silang.*book|book.*cavite|cavite.*book|book.*tagaytay|tagaytay.*book/.test(msg) && silangVilla) {
    return { text: `Great choice! 🎉 Here's the booking form for ${silangVilla.name}. Select your dates:`, chips: [], bookingVillaId: silangVilla.id };
  }
  if (/silang|cavite|tagaytay/.test(msg) && silangVilla) {
    const pkgs = Array.isArray(silangVilla.packages) ? silangVilla.packages : [];
    return {
      text: villaSummary(silangVilla) + (silangVilla.address ? `\n📌 ${silangVilla.address}` : '') +
        (pkgs.length ? `\n\n${pkgs.length} flexible packages for groups of ${pkgs[0].groupCapacity} to ${pkgs[pkgs.length - 1].groupCapacity}. Perfect for reunions and events!` : ''),
      chips: ['Book Silang', 'View packages', 'Silang pricing'],
    };
  }

  // ── Packages ─────────────────────────────────────────────────────────────────
  if (/package|packages/.test(msg)) {
    const villaWithPkgs = villas.find((v) => Array.isArray(v.packages) && v.packages.length > 0);
    if (!villaWithPkgs?.packages) {
      return { text: `Our villas use a simple nightly rate. Ask about pricing for details!`, chips: ['Pricing', 'Book Pampanga', 'Book Silang'] };
    }
    const pkgs = Array.isArray(villaWithPkgs.packages) ? villaWithPkgs.packages : [];
    const lines = pkgs.map(
      (p) => `📦 ${p.name} · ${p.groupCapacity} · ${p.weekdayRate} / ${p.weekendRate}`
    ).join('\n');
    return {
      text: `${villaWithPkgs.name} offers ${pkgs.length} packages:\n\n${lines}\n\n(Weekday / Weekend & Holiday rates)`,
      chips: ['Book Silang', 'Book Pampanga'],
    };
  }

  // ── Generic book intent ───────────────────────────────────────────────────────
  if (/book|reserve|reservation/.test(msg)) {
    return { text: `Which villa would you like to book? 🏡`, chips: ['Book Pampanga', 'Book Silang', 'View villas'] };
  }

  // ── Pricing ───────────────────────────────────────────────────────────────────
  if (/price|pricing|rate|cost|how much|magkano|compare|silang.*pric|pric.*silang/.test(msg)) {
    const lines = villas.map((v) => {
      const pkgs = Array.isArray(v.packages) ? v.packages : [];
      if (pkgs.length) {
        const rates = pkgs.map((p) => parseInt(p.weekdayRate.replace(/[₱,]/g, ''), 10) || 0).filter(Boolean);
        const min = Math.min(...rates), max = Math.max(...rates);
        return `🏡 ${v.name}\nFrom ₱${fmt(min)} (weekday) to ₱${fmt(max)} (weekend/full resort)\n${pkgs.length} packages for ${pkgs[0].groupCapacity}–${pkgs[pkgs.length - 1].groupCapacity} guests`;
      }
      return `🏡 ${v.name}\n₱${fmt(v.price)}/night · Up to ${v.guests} guests${v.policies?.extraGuestFee ? `\n+${v.policies.extraGuestFee}` : ''}`;
    }).join('\n\n');
    const promoVilla = villas.find((v) => v.promos?.length);
    const promoLine = promoVilla?.promos?.[0] ? `\n\n🎂 ${promoVilla.promos[0]}` : '';
    return {
      text: `💰 Pricing Overview:\n\n${lines}${promoLine}`,
      chips: ['Book Pampanga', 'Book Silang', 'View packages'],
    };
  }

  // ── Amenities / entertainment / kitchen ───────────────────────────────────────
  if (/entertain|netflix|karaoke|ps4|billiard|wifi|game/.test(msg)) {
    const ent = villas[0]?.entertainment ?? [];
    return {
      text: `All entertainment is unlimited and FREE at both villas:\n\n${ent.map((e) => `• ${e}`).join('\n')}`,
      chips: ['Book Pampanga', 'Book Silang', 'Amenities'],
    };
  }
  if (/amenities|amenity|facilities|pool|parking|pet/.test(msg)) {
    const amenities = villas[0]?.amenities ?? [];
    return {
      text: `Both villas include:\n\n${amenities.map((a) => `• ${a}`).join('\n')}`,
      chips: ['Entertainment', 'Kitchen', 'Book Pampanga', 'Book Silang'],
    };
  }
  if (/kitchen|cook|food|grill|samgyup/.test(msg)) {
    const kitchen = villas[0]?.kitchenSupplies ?? [];
    return {
      text: `Both kitchens are fully stocked:\n\n${kitchen.map((k) => `• ${k}`).join('\n')}`,
      chips: ['Amenities', 'Book Pampanga', 'Book Silang'],
    };
  }

  // ── Policies ──────────────────────────────────────────────────────────────────
  if (/check.?in|check.?out|time|policy|policies|extension|hour/.test(msg)) {
    const p = villas[0]?.policies;
    if (!p) return { text: `Please contact us for policy details.`, chips: ['Book Pampanga', 'Book Silang'] };
    const lines = [
      p.checkIn      && `⏰ Check-in: ${p.checkIn}`,
      p.checkOut     && `🏁 Check-out: ${p.checkOut}`,
      p.childPolicy  && `👶 ${p.childPolicy}`,
      p.extraGuestFee && `👥 Extra guests: ${p.extraGuestFee}`,
      p.petPolicy    && `🐾 ${p.petPolicy}`,
      p.extension    && `⏱ Extension: ${p.extension}`,
      p.cancellation && `⚠️ ${p.cancellation}`,
    ].filter(Boolean).join('\n');
    return { text: `📋 Policies (both villas):\n\n${lines}`, chips: ['Pricing', 'Book Pampanga', 'Book Silang'] };
  }

  // ── Location ──────────────────────────────────────────────────────────────────
  if (/location|where|address|direction/.test(msg)) {
    const lines = villas.map((v) => `📍 ${v.name}:\n${v.address ?? v.location}`).join('\n\n');
    return { text: `${lines}\n\nExact directions shared upon booking confirmation.`, chips: ['Book Pampanga', 'Book Silang'] };
  }

  // ── Other ─────────────────────────────────────────────────────────────────────
  if (/pet|dog|cat|animal/.test(msg)) {
    const petPolicy = villas[0]?.policies?.petPolicy ?? 'Up to 2 pets allowed free of charge';
    return { text: `🐾 Both villas are pet-friendly! ${petPolicy} 🐶🐱`, chips: ['Book Pampanga', 'Book Silang', 'Amenities'] };
  }
  if (/birthday|promo|celebration|party/.test(msg)) {
    const promo = villas.flatMap((v) => v.promos ?? []).join(' · ');
    return { text: `🎂 ${promo || 'Birthday Promo available — contact us for details!'}\n\nMassage and nail spa services also available at additional cost.`, chips: ['Pricing', 'Book Pampanga', 'Book Silang'] };
  }
  if (/capacity|how many|people|pax|guest/.test(msg)) {
    const lines = villas.map((v) => `🏡 ${v.name.split('—')[0].trim()}: Up to ${v.guests} guests · ${v.bedrooms} bedrooms`).join('\n');
    const extraFee = villas[0]?.policies?.extraGuestFee;
    return {
      text: `${lines}\n\nBoth villas: children 7 & below FREE${extraFee ? `, extra guests ${extraFee}` : ''}.`,
      chips: ['Book Pampanga', 'Book Silang', 'View packages'],
    };
  }
  if (/thank|thanks|salamat/.test(msg)) {
    return { text: `You're welcome! 😊 Feel free to ask anything else about Casa Luna!`, chips: ['View villas', 'Book Pampanga', 'Book Silang'] };
  }

  return { text: `I'm happy to help with anything about Casa Luna! We have villas in ${villas.map((v) => v.location.split(',')[0]).join(' and ')}. 🏡`, chips: ['View villas', 'Pricing', 'Amenities', 'Book now'] };
}

// ─── Inline booking form ──────────────────────────────────────────────────────
function InlineBookingForm({ villaId, onClose }: { villaId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { villas } = useVillas();
  const { addBooking, getBookedDatesForVilla, getBlockedDatesForVilla, isDateRangeAvailable } = useBookings();
  const router = useRouter();

  const villa = villas.find((v) => v.id === villaId);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [confirmedBooking, setConfirmedBooking] = useState<import('@/context/BookingContext').Booking | null>(null);

  const bookedDates  = useMemo(() => new Set(getBookedDatesForVilla(villaId)), [villaId, getBookedDatesForVilla]);
  const blockedDates = useMemo(() => new Set(getBlockedDatesForVilla(villaId)), [villaId, getBlockedDatesForVilla]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    bookedDates.forEach((d) => {
      marks[d] = { disabled: true, disableTouchEvent: true, customStyles: { container: { backgroundColor: '#ef4444', borderRadius: 6 }, text: { color: '#fff', fontWeight: '600' } } };
    });
    blockedDates.forEach((d) => {
      if (!marks[d]) marks[d] = { disabled: true, disableTouchEvent: true, customStyles: { container: { backgroundColor: '#f97316', borderRadius: 6 }, text: { color: '#fff', fontWeight: '600' } } };
    });

    if (checkIn && checkOut) {
      expandDateRange(checkIn, checkOut).forEach((d, i, arr) => {
        const isStart = i === 0, isEnd = i === arr.length - 1, isMid = !isStart && !isEnd;
        marks[d] = { customStyles: { container: { backgroundColor: isMid ? '#e8e8f0' : '#1a1a2e', borderRadius: isStart || isEnd ? 20 : 0 }, text: { color: isMid ? '#1a1a2e' : '#fff', fontWeight: '700' } } };
      });
    } else if (checkIn) {
      marks[checkIn] = { customStyles: { container: { backgroundColor: '#1a1a2e', borderRadius: 20 }, text: { color: '#fff', fontWeight: '700' } } };
    }
    return marks;
  }, [bookedDates, blockedDates, checkIn, checkOut]);

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    if (bookedDates.has(date) || blockedDates.has(date)) return;
    if (!checkIn || (checkIn && checkOut) || date < checkIn) {
      setCheckIn(date); setCheckOut(null); return;
    }
    const range = expandDateRange(checkIn, date);
    if (range.some((d) => bookedDates.has(d) || blockedDates.has(d))) {
      Alert.alert('Unavailable Dates', 'Your range includes unavailable dates. Please choose again.');
      setCheckIn(date); setCheckOut(null); return;
    }
    setCheckOut(date);
  };

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  }, [checkIn, checkOut]);

  const total = nights * (villa?.price ?? 0);

  const handleConfirm = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to complete your booking.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => { onClose(); router.push('/login'); } },
      ]);
      return;
    }
    if (!villa || !checkIn || !checkOut || nights <= 0) {
      Alert.alert('Select Dates', 'Please select check-in and check-out dates.');
      return;
    }
    if (!isDateRangeAvailable(villa.id, checkIn, checkOut)) {
      Alert.alert('Unavailable', 'Some dates are no longer available. Please choose different dates.');
      return;
    }
    const booking = await addBooking({
      villaId:     villa.id,
      villaName:   villa.name,
      villaLocation: villa.location,
      guestId:     user.id,
      adminId:     villa.adminId ?? 'unassigned',
      checkIn,
      checkOut,
      guests,
      totalAmount: total,
      status:      'pending',
      guestName:   user.name,
      guestEmail:  user.email,
    });
    setConfirmedBooking(booking);
  };

  if (!villa) return null;

  // Auth gate — show sign-in prompt instead of calendar
  if (!user) {
    return (
      <View style={bStyles.container}>
        <View style={bStyles.villaHeader}>
          <Text style={bStyles.villaName}>{villa.name}</Text>
          <Text style={bStyles.villaPrice}>₱{villa.price.toLocaleString()}/night</Text>
        </View>
        <View style={bStyles.authGate}>
          <Ionicons name="lock-closed-outline" size={36} color="#1a1a2e" />
          <Text style={bStyles.authTitle}>Sign in to Book</Text>
          <Text style={bStyles.authSubtitle}>You need to be signed in to make a reservation.</Text>
          <TouchableOpacity style={bStyles.authBtn} onPress={() => { onClose(); router.push('/login'); }}>
            <Ionicons name="logo-google" size={16} color="#fff" />
            <Text style={bStyles.authBtnText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
    <View style={bStyles.container}>
      {/* Villa header */}
      <View style={bStyles.villaHeader}>
        <Text style={bStyles.villaName}>{villa.name}</Text>
        <Text style={bStyles.villaPrice}>₱{villa.price.toLocaleString()}/night</Text>
      </View>

      {/* Legend */}
      <View style={bStyles.legend}>
        {[{ color: '#1a1a2e', label: 'Selected' }, { color: '#ef4444', label: 'Booked' }, { color: '#f97316', label: 'Unavailable' }].map((l) => (
          <View key={l.label} style={bStyles.legendItem}>
            <View style={[bStyles.legendDot, { backgroundColor: l.color }]} />
            <Text style={bStyles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar */}
      <View style={bStyles.calendarWrap}>
        <Calendar
          markingType="custom"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          minDate={today}
          enableSwipeMonths
          theme={{
            calendarBackground: '#fff',
            textSectionTitleColor: '#9ca3af',
            todayTextColor: '#2E7D32',
            dayTextColor: '#1a1a1a',
            textDisabledColor: '#d1d5db',
            arrowColor: '#1a1a2e',
            monthTextColor: '#1a1a1a',
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 13,
            textMonthFontSize: 15,
          }}
        />
      </View>

      {/* Date selection display */}
      <View style={bStyles.selectionRow}>
        <View style={bStyles.selectionBox}>
          <Text style={bStyles.selectionLabel}>CHECK-IN</Text>
          <Text style={[bStyles.selectionDate, !checkIn && bStyles.placeholder]}>{checkIn ?? 'Tap a date'}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#ccc" />
        <View style={bStyles.selectionBox}>
          <Text style={bStyles.selectionLabel}>CHECK-OUT</Text>
          <Text style={[bStyles.selectionDate, !checkOut && bStyles.placeholder]}>{checkOut ?? 'Tap a date'}</Text>
        </View>
      </View>

      {/* Guests stepper */}
      <View style={bStyles.guestsRow}>
        <Text style={bStyles.guestsLabel}>Guests</Text>
        <View style={bStyles.stepper}>
          <TouchableOpacity style={bStyles.stepBtn} onPress={() => setGuests((g) => Math.max(1, g - 1))}>
            <Ionicons name="remove" size={16} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={bStyles.stepCount}>{guests}</Text>
          <TouchableOpacity style={bStyles.stepBtn} onPress={() => setGuests((g) => Math.min(villa.guests, g + 1))}>
            <Ionicons name="add" size={16} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={bStyles.guestsMax}>/ {villa.guests} max</Text>
        </View>
      </View>

      {/* Price summary */}
      {nights > 0 && (
        <View style={bStyles.summary}>
          <Text style={bStyles.summaryText}>₱{villa.price.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</Text>
          <Text style={bStyles.summaryTotal}>₱{total.toLocaleString()}</Text>
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[bStyles.confirmBtn, (!checkIn || !checkOut) && bStyles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!checkIn || !checkOut}
      >
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={bStyles.confirmText}>
          {nights > 0 ? `Confirm · ₱${total.toLocaleString()}` : 'Select dates to book'}
        </Text>
      </TouchableOpacity>
    </View>
    <BookingConfirmationModal
      booking={confirmedBooking}
      visible={!!confirmedBooking}
      onViewBookings={() => { setConfirmedBooking(null); onClose(); router.replace('/(tabs)/bookings'); }}
      onClose={() => { setConfirmedBooking(null); onClose(); }}
    />
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ message, onChip, onCloseBooking }: { message: Message; onChip: (c: string) => void; onCloseBooking: () => void }) {
  const isBot = message.role === 'bot';
  return (
    <View style={[styles.bubbleRow, isBot ? styles.bubbleRowBot : styles.bubbleRowUser]}>
      {isBot && <View style={styles.avatar}><Text style={styles.avatarText}>🌙</Text></View>}
      <View style={message.bookingVillaId ? styles.bubbleFullWidth : styles.bubbleMaxWidth}>
        <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
          <Text style={[styles.bubbleText, isBot ? styles.bubbleTextBot : styles.bubbleTextUser]}>{message.text}</Text>
        </View>
        {isBot && message.bookingVillaId && (
          <View style={styles.bookingFormWrap}>
            <InlineBookingForm villaId={message.bookingVillaId} onClose={onCloseBooking} />
          </View>
        )}
        {isBot && message.chips && message.chips.length > 0 && (
          <View style={styles.chipsRow}>
            {message.chips.map((chip) => (
              <TouchableOpacity key={chip} style={styles.chip} onPress={() => onChip(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ChatAssistant() {
  const { villas } = useVillas();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [villasSeeded, setVillasSeeded] = useState(false);
  const listRef = useRef<FlatList>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Seed the initial greeting once villas are available.
  // Uses a ref-guard so it only runs once even if villas array reference changes.
  useMemo(() => {
    if (villasSeeded || villas.length === 0) return;
    setMessages([{
      id: '0',
      role: 'bot',
      text: `Hi! 👋 I'm Luna, your Casa Luna booking assistant. We have ${villas.length} private villa${villas.length !== 1 ? 's' : ''} — ${villas.map((v) => v.location.split(',')[0]).join(' and ')}. How can I help you today?`,
      chips: ['View villas', ...villas.map((v) => v.location.split(',')[0] + ' villa'), 'Pricing', 'How to book'],
    }]);
    setVillasSeeded(true);
  }, [villas, villasSeeded]);

  const pulseButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user' as Role, text: trimmed }]);
    setTimeout(() => {
      const reply = getBotReply(trimmed, villas);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot' as Role,
        text: reply.text,
        chips: reply.chips,
        bookingVillaId: reply.bookingVillaId,
      }]);
      scrollToEnd();
    }, 400);
  };

  return (
    <>
      {/* Floating button */}
      <Animated.View style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity onPress={() => { pulseButton(); setOpen(true); }} style={styles.fabInner} activeOpacity={0.85}>
          <Text style={styles.fabEmoji}>🌙</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Chat modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}><Text style={styles.headerAvatarText}>🌙</Text></View>
              <View>
                <Text style={styles.headerName}>Luna</Text>
                <Text style={styles.headerStatus}>● Online · Casa Luna Assistant</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <Bubble message={item} onChip={handleSend} onCloseBooking={() => setOpen(false)} />
            )}
          />

          {/* Input bar */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask me anything..."
                placeholderTextColor="#aaa"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => handleSend(input)}
                returnKeyType="send"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                onPress={() => handleSend(input)}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  fab:             { position: 'absolute', bottom: 90, right: 20, zIndex: 999, elevation: 8, shadowColor: '#1a1a2e', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  fabInner:        { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  fabEmoji:        { fontSize: 26 },
  modal:           { flex: 1, backgroundColor: '#f0f2f5' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText:{ fontSize: 20 },
  headerName:      { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerStatus:    { fontSize: 11, color: '#a0e8a0', marginTop: 1 },
  closeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  messageList:     { padding: 16, gap: 12, paddingBottom: 8 },
  bubbleRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowBot:    { justifyContent: 'flex-start' },
  bubbleRowUser:   { justifyContent: 'flex-end' },
  avatar:          { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText:      { fontSize: 16 },
  bubble:          { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleBot:       { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleUser:      { backgroundColor: '#1a1a2e', borderBottomRightRadius: 4 },
  bubbleText:      { fontSize: 14, lineHeight: 20 },
  bubbleTextBot:   { color: '#1a1a1a' },
  bubbleTextUser:  { color: '#fff' },
  bubbleMaxWidth:  { maxWidth: '82%' },
  bubbleFullWidth: { flex: 1 },
  bookingFormWrap: { marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingLeft: 4 },
  chip:            { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#1a1a2e', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText:        { fontSize: 12, color: '#1a1a2e', fontWeight: '600' },
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e4e4e4' },
  textInput:       { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', maxHeight: 100 },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
});

const bStyles = StyleSheet.create({
  container:      { backgroundColor: '#f8f8f8', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8f0' },
  villaHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 12 },
  villaName:      { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  villaPrice:     { fontSize: 13, fontWeight: '700', color: '#a0e8a0' },
  legend:         { flexDirection: 'row', gap: 10, padding: 10, backgroundColor: '#fff', flexWrap: 'wrap' },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendText:     { fontSize: 11, color: '#666' },
  calendarWrap:   { backgroundColor: '#fff' },
  selectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#f0f0f0' },
  selectionBox:   { flex: 1, alignItems: 'center', gap: 2 },
  selectionLabel: { fontSize: 10, color: '#aaa', fontWeight: '700', letterSpacing: 0.5 },
  selectionDate:  { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  placeholder:    { color: '#ccc', fontWeight: '400' },
  guestsRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: '#f0f0f0' },
  guestsLabel:    { fontSize: 13, fontWeight: '600', color: '#555' },
  stepper:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn:        { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f8', alignItems: 'center', justifyContent: 'center' },
  stepCount:      { fontSize: 16, fontWeight: '700', color: '#1a1a2e', minWidth: 20, textAlign: 'center' },
  guestsMax:      { fontSize: 12, color: '#aaa' },
  summary:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 12, borderTopWidth: 1, borderColor: '#f0f0f0' },
  summaryText:    { fontSize: 13, color: '#555' },
  summaryTotal:   { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  confirmBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', padding: 14, margin: 10, borderRadius: 12 },
  confirmBtnDisabled: { backgroundColor: '#ccc' },
  confirmText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Auth gate inside chat
  authGate:       { padding: 24, alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  authTitle:      { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  authSubtitle:   { fontSize: 13, color: '#888', textAlign: 'center' },
  authBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a1a2e', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  authBtnText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
});
