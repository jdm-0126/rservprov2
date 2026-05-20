import { useAuth } from '@/context/AuthContext';
import { useVillas } from '@/context/VillaContext';
import { Villa, VillaPackage } from '@/constants/villaData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function listToText(arr?: string[]) { return (arr ?? []).join('\n'); }
function textToList(text: string)   { return text.split('\n').map((s) => s.trim()).filter(Boolean); }

const BLANK_VILLA: Omit<Villa, 'id'> = {
  name: '', location: '', address: '', price: 0, guests: 10, bedrooms: 3,
  description: '', image: '', amenities: [], adminId: '',
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Labelled input ───────────────────────────────────────────────────────────
function Field({
  label, value, onChangeText, placeholder, multiline = false,
  keyboardType = 'default', hint,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url'; hint?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {hint && <Text style={s.hint}>{hint}</Text>}
      <TextInput
        style={[s.input, multiline && s.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Package row editor ───────────────────────────────────────────────────────
function PackageRow({ pkg, index, onChange, onRemove }: {
  pkg: VillaPackage; index: number;
  onChange: (updated: VillaPackage) => void;
  onRemove: () => void;
}) {
  const set = (key: keyof VillaPackage) => (val: string) => onChange({ ...pkg, [key]: val });
  return (
    <View style={s.pkgRow}>
      <View style={s.pkgRowHeader}>
        <Text style={s.pkgRowTitle}>Package {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} style={s.pkgRemoveBtn}>
          <Ionicons name="trash-outline" size={15} color="#dc2626" />
        </TouchableOpacity>
      </View>
      <View style={s.pkgGrid}>
        <View style={s.pkgHalf}>
          <Text style={s.pkgLabel}>Name</Text>
          <TextInput style={s.pkgInput} value={pkg.name} onChangeText={set('name')} placeholder="Package 1" placeholderTextColor="#9ca3af" />
        </View>
        <View style={s.pkgHalf}>
          <Text style={s.pkgLabel}>Capacity</Text>
          <TextInput style={s.pkgInput} value={pkg.groupCapacity} onChangeText={set('groupCapacity')} placeholder="6–7 pax" placeholderTextColor="#9ca3af" />
        </View>
        <View style={s.pkgHalf}>
          <Text style={s.pkgLabel}>Weekday Rate</Text>
          <TextInput style={s.pkgInput} value={pkg.weekdayRate} onChangeText={set('weekdayRate')} placeholder="₱10,000" placeholderTextColor="#9ca3af" />
        </View>
        <View style={s.pkgHalf}>
          <Text style={s.pkgLabel}>Weekend Rate</Text>
          <TextInput style={s.pkgInput} value={pkg.weekendRate} onChangeText={set('weekendRate')} placeholder="₱12,000" placeholderTextColor="#9ca3af" />
        </View>
        <View style={{ width: '100%' }}>
          <Text style={s.pkgLabel}>Rooms Included</Text>
          <TextInput style={s.pkgInput} value={pkg.roomsIncluded} onChangeText={set('roomsIncluded')} placeholder="Room 1 & Room 2" placeholderTextColor="#9ca3af" />
        </View>
        <View style={{ width: '100%' }}>
          <Text style={s.pkgLabel}>Bed Types</Text>
          <TextInput style={s.pkgInput} value={pkg.bedTypes} onChangeText={set('bedTypes')} placeholder="1 Queen, 2 Double" placeholderTextColor="#9ca3af" />
        </View>
        <View style={{ width: '100%' }}>
          <Text style={s.pkgLabel}>Extra Bed Capacity</Text>
          <TextInput style={s.pkgInput} value={pkg.extraBedCapacity ?? ''} onChangeText={set('extraBedCapacity')} placeholder="6 extra beds" placeholderTextColor="#9ca3af" />
        </View>
      </View>
    </View>
  );
}

// ─── Villa form (create + edit) ───────────────────────────────────────────────
function VillaForm({ villa, isNew, onSave, onCancel }: {
  villa: Villa;
  isNew: boolean;
  onSave: (updated: Villa) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [name, setName]           = useState(villa.name);
  const [location, setLocation]   = useState(villa.location);
  const [address, setAddress]     = useState(villa.address ?? '');
  const [price, setPrice]         = useState(villa.price > 0 ? String(villa.price) : '');
  const [guests, setGuests]       = useState(villa.guests > 0 ? String(villa.guests) : '');
  const [bedrooms, setBedrooms]   = useState(villa.bedrooms > 0 ? String(villa.bedrooms) : '');
  const [description, setDesc]    = useState(villa.description);
  const [image, setImage]         = useState(villa.image);

  const [amenities, setAmenities]         = useState(listToText(villa.amenities));
  const [entertainment, setEntertainment] = useState(listToText(villa.entertainment));
  const [kitchen, setKitchen]             = useState(listToText(villa.kitchenSupplies));
  const [services, setServices]           = useState(listToText(villa.additionalServices));
  const [promos, setPromos]               = useState(listToText(villa.promos));

  const [checkIn, setCheckIn]           = useState(villa.policies?.checkIn ?? '3:00 PM');
  const [checkOut, setCheckOut]         = useState(villa.policies?.checkOut ?? '12:00 NN');
  const [extraFee, setExtraFee]         = useState(villa.policies?.extraGuestFee ?? '');
  const [childPolicy, setChildPolicy]   = useState(villa.policies?.childPolicy ?? '');
  const [petPolicy, setPetPolicy]       = useState(villa.policies?.petPolicy ?? '');
  const [parking, setParking]           = useState(villa.policies?.parking ?? '');
  const [extension, setExtension]       = useState(villa.policies?.extension ?? '');
  const [cancellation, setCancellation] = useState(villa.policies?.cancellation ?? '');

  const [packages, setPackages] = useState<VillaPackage[]>(villa.packages ?? []);

  const addPackage = () => setPackages((prev) => [...prev, {
    id: `p${Date.now()}`, name: `Package ${prev.length + 1}`,
    roomsIncluded: '', groupCapacity: '', bedTypes: '', weekdayRate: '', weekendRate: '',
  }]);

  const handleSave = async () => {
    if (!name.trim())     { Alert.alert('Required', 'Villa name is required.');     return; }
    if (!location.trim()) { Alert.alert('Required', 'Location is required.');       return; }
    if (!image.trim())    { Alert.alert('Required', 'Image URL is required.');      return; }
    const priceNum = parseInt(price, 10);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Invalid', 'Price must be a valid number.'); return; }

    const updated: Villa = {
      ...villa,
      name:        name.trim(),
      location:    location.trim(),
      address:     address.trim() || undefined,
      price:       priceNum,
      guests:      parseInt(guests, 10) || 10,
      bedrooms:    parseInt(bedrooms, 10) || 1,
      description: description.trim(),
      image:       image.trim(),
      amenities:   textToList(amenities),
      entertainment:      textToList(entertainment).length ? textToList(entertainment) : undefined,
      kitchenSupplies:    textToList(kitchen).length ? textToList(kitchen) : undefined,
      additionalServices: textToList(services).length ? textToList(services) : undefined,
      promos:      textToList(promos).length ? textToList(promos) : undefined,
      packages:    packages.length ? packages : undefined,
      policies: {
        checkIn:       checkIn.trim(),
        checkOut:      checkOut.trim(),
        extraGuestFee: extraFee.trim() || undefined,
        childPolicy:   childPolicy.trim() || undefined,
        petPolicy:     petPolicy.trim() || undefined,
        parking:       parking.trim() || undefined,
        extension:     extension.trim() || undefined,
        cancellation:  cancellation.trim() || undefined,
      },
    };

    setSaving(true);
    try {
      await onSave(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save villa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.formBody} showsVerticalScrollIndicator={false}>

        <SectionHeader title="Basic Info" />
        <Field label="Villa Name *"  value={name}        onChangeText={setName}     placeholder="Casa Luna Suites & Villas" />
        <Field label="Location *"    value={location}    onChangeText={setLocation} placeholder="Angeles City, Pampanga" />
        <Field label="Full Address"  value={address}     onChangeText={setAddress}  placeholder="Lot 24 Blk 51 Fresno St..." />
        <Field label="Image URL *"   value={image}       onChangeText={setImage}    placeholder="https://..." keyboardType="url" />
        <Field label="Description"   value={description} onChangeText={setDesc}     placeholder="Describe the villa..." multiline />

        <View style={s.row3}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Base Price (₱) *</Text>
            <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor="#9ca3af" placeholder="5000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Max Guests</Text>
            <TextInput style={s.input} value={guests} onChangeText={setGuests} keyboardType="numeric" placeholderTextColor="#9ca3af" placeholder="20" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Bedrooms</Text>
            <TextInput style={s.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" placeholderTextColor="#9ca3af" placeholder="5" />
          </View>
        </View>

        <SectionHeader title="Amenities" />
        <Field label="Amenities" value={amenities} onChangeText={setAmenities} multiline hint="One item per line" placeholder={'Private Pool with Safety Rails\n10-Seater Dining Table'} />

        <SectionHeader title="Entertainment" />
        <Field label="Entertainment" value={entertainment} onChangeText={setEntertainment} multiline hint="One item per line" placeholder={'300 Mbps Hi-Speed WiFi\nNetflix Access'} />

        <SectionHeader title="Kitchen Supplies" />
        <Field label="Kitchen Items" value={kitchen} onChangeText={setKitchen} multiline hint="One item per line" placeholder={'Electric Stove\nMicrowave Oven'} />

        <SectionHeader title="Policies" />
        <View style={s.row2}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Check-in</Text>
            <TextInput style={s.input} value={checkIn} onChangeText={setCheckIn} placeholder="3:00 PM" placeholderTextColor="#9ca3af" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Check-out</Text>
            <TextInput style={s.input} value={checkOut} onChangeText={setCheckOut} placeholder="12:00 NN" placeholderTextColor="#9ca3af" />
          </View>
        </View>
        <Field label="Extra Guest Fee"  value={extraFee}     onChangeText={setExtraFee}     placeholder="₱500 per head beyond 15 pax" />
        <Field label="Child Policy"     value={childPolicy}  onChangeText={setChildPolicy}  placeholder="Children 7 & below stay free" />
        <Field label="Pet Policy"       value={petPolicy}    onChangeText={setPetPolicy}    placeholder="Up to 2 pets free" />
        <Field label="Parking"          value={parking}      onChangeText={setParking}      placeholder="Accommodates 5–6 cars" />
        <Field label="Time Extension"   value={extension}    onChangeText={setExtension}    placeholder="ARO/hour if no next booking" />
        <Field label="Cancellation"     value={cancellation} onChangeText={setCancellation} placeholder="Penalties apply on confirmed bookings" />

        <SectionHeader title="Additional Services" />
        <Field label="Services" value={services} onChangeText={setServices} multiline hint="One item per line" placeholder={'Massage Services (additional cost)\nNail Spa Services (additional cost)'} />

        <SectionHeader title="Promos" />
        <Field label="Promos" value={promos} onChangeText={setPromos} multiline hint="One item per line" placeholder="Birthday Promo: ₱300 + complimentary cake" />

        <SectionHeader title="Packages (optional)" />
        <Text style={s.pkgNote}>For multi-package villas. Leave empty for single-rate villas.</Text>
        {packages.map((pkg, i) => (
          <PackageRow
            key={pkg.id} pkg={pkg} index={i}
            onChange={(u) => setPackages((prev) => prev.map((p, idx) => idx === i ? u : p))}
            onRemove={() => setPackages((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <TouchableOpacity style={s.addPkgBtn} onPress={addPackage}>
          <Ionicons name="add-circle-outline" size={18} color="#2E7D32" />
          <Text style={s.addPkgText}>Add Package</Text>
        </TouchableOpacity>

        <View style={s.formActions}>
          <TouchableOpacity style={s.cancelFormBtn} onPress={onCancel}>
            <Text style={s.cancelFormText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtn, saving && s.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            <Ionicons name={isNew ? 'add-circle-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : isNew ? 'Add Villa' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type Mode = { type: 'list' } | { type: 'edit'; villa: Villa } | { type: 'create' };

export default function AdminVillasPage() {
  const { user } = useAuth();
  const { villas, addVilla, updateVilla, deleteVilla } = useVillas();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ type: 'list' });

  // Only show villas owned by this admin (or unassigned static ones)
  const myVillas = villas.filter((v) => !v.adminId || v.adminId === user?.id);

  const handleDelete = (villa: Villa) => {
    Alert.alert(
      'Delete Villa',
      `Are you sure you want to delete "${villa.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVilla(villa.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Could not delete villa.');
            }
          },
        },
      ]
    );
  };

  // ── Form view (create or edit) ───────────────────────────────────────────
  if (mode.type === 'edit' || mode.type === 'create') {
    const isNew = mode.type === 'create';
    const villa: Villa = isNew
      ? { ...BLANK_VILLA, id: '', adminId: user?.id ?? '' } as Villa
      : mode.villa;

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => setMode({ type: 'list' })}>
            <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>
            {isNew ? 'Add New Villa' : `Edit: ${mode.villa.name}`}
          </Text>
        </View>
        <VillaForm
          villa={villa}
          isNew={isNew}
          onSave={async (updated) => {
            if (!user?.id) {
              Alert.alert('Error', 'You must be signed in to save a villa.');
              return;
            }
            if (isNew) {
              const { id: _id, ...rest } = updated;
              await addVilla({ ...rest, adminId: user.id });
              Alert.alert('Added', `${updated.name} has been added.`);
            } else {
              // Always stamp adminId — static villas don't have one yet
              await updateVilla({ ...updated, adminId: user.id });
              Alert.alert('Saved', `${updated.name} has been updated.`);
            }
            setMode({ type: 'list' });
          }}
          onCancel={() => setMode({ type: 'list' })}
        />
      </SafeAreaView>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Villas</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setMode({ type: 'create' })}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add Villa</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.listBody} showsVerticalScrollIndicator={false}>
        {myVillas.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="home-outline" size={48} color="#d1d5db" />
            <Text style={s.emptyText}>No villas yet. Tap "Add Villa" to create one.</Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={() => setMode({ type: 'create' })}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.emptyAddText}>Add Villa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myVillas.map((villa) => (
            <View key={villa.id} style={s.villaCard}>
              <View style={s.villaCardInfo}>
                <Text style={s.villaCardName}>{villa.name}</Text>
                <Text style={s.villaCardLoc}>{villa.location}</Text>
                <View style={s.villaCardMeta}>
                  <Text style={s.metaChip}>👥 {villa.guests} guests</Text>
                  <Text style={s.metaChip}>🛏 {villa.bedrooms} rooms</Text>
                  <Text style={s.metaChip}>₱{(villa.price ?? 0).toLocaleString()}/night</Text>
                </View>
                {villa.packages && villa.packages.length > 0 && (
                  <Text style={s.pkgCount}>{villa.packages.length} packages</Text>
                )}
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity style={s.editBtn} onPress={() => setMode({ type: 'edit', villa })}>
                  <Ionicons name="pencil-outline" size={16} color="#6366f1" />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(villa)}>
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f9fafb' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // List
  listBody:   { padding: 16, gap: 14, paddingBottom: 60 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:  { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  emptyAddBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2E7D32', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  emptyAddText:{ fontSize: 13, fontWeight: '700', color: '#fff' },

  villaCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  villaCardInfo: { flex: 1, gap: 4 },
  villaCardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  villaCardLoc:  { fontSize: 12, color: '#6b7280' },
  villaCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaChip:      { fontSize: 11, color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pkgCount:      { fontSize: 11, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  cardActions:   { flexDirection: 'column', gap: 8, alignItems: 'center' },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  editBtnText:   { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  deleteBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },

  // Form
  formBody:      { padding: 16, gap: 4, paddingBottom: 60 },
  sectionHeader: { backgroundColor: '#1a1a2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 16, marginBottom: 4 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 },
  field:         { gap: 4, marginBottom: 8 },
  label:         { fontSize: 12, fontWeight: '700', color: '#374151' },
  hint:          { fontSize: 11, color: '#9ca3af' },
  input:         { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', minHeight: 42 },
  inputMulti:    { minHeight: 100, textAlignVertical: 'top', paddingTop: 10 },
  row2:          { flexDirection: 'row', gap: 10, marginBottom: 8 },
  row3:          { flexDirection: 'row', gap: 8, marginBottom: 8 },

  // Packages
  pkgNote:       { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  pkgRow:        { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  pkgRowHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkgRowTitle:   { fontSize: 13, fontWeight: '700', color: '#111827' },
  pkgRemoveBtn:  { padding: 4 },
  pkgGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pkgHalf:       { width: '48%' },
  pkgLabel:      { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 3 },
  pkgInput:      { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#111827' },
  addPkgBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#bbf7d0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f0fdf4', marginBottom: 8 },
  addPkgText:    { fontSize: 13, fontWeight: '700', color: '#2E7D32' },

  // Form actions
  formActions:    { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelFormBtn:  { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  cancelFormText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  saveBtn:        { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2E7D32' },
  saveBtnDisabled:{ backgroundColor: '#9ca3af' },
  saveBtnText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
});
