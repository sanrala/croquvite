import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { confirmAction, notify } from '../dialog';
import { addDays, formatFR, parseISODate, startOfToday, toISODate } from '../dates';
import { lookupBarcode } from '../openFoodFacts';
import { guessKind, ProductKind } from '../productKind';
import { guessCategory, suggestExpiryDays } from '../shelfLife';
import { getKnownProduct } from '../storage';
import { useTheme } from '../theme';
import { CATEGORY_EMOJI, CATEGORY_LABEL, Category, FoodItem, Location, LOCATION_LABEL } from '../types';

export interface ItemFormData {
  name: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  category: Category;
  categoryTags: string[];
  kind?: ProductKind;
  quantity: number;
  location: Location;
  expiryDate: string;
}

interface Props {
  barcode?: string;
  editing?: FoodItem;
  defaultLocation: Location;
  onSave: (data: ItemFormData) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

type LookupState = 'idle' | 'loading' | 'found' | 'notfound';

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

const PRESETS: Record<Location, { label: string; apply: (d: Date) => Date }[]> = {
  frigo: [
    { label: '3 jours', apply: (d) => addDays(d, 3) },
    { label: '1 semaine', apply: (d) => addDays(d, 7) },
    { label: '2 semaines', apply: (d) => addDays(d, 14) },
    { label: '1 mois', apply: (d) => addMonths(d, 1) },
  ],
  placard: [
    { label: '1 semaine', apply: (d) => addDays(d, 7) },
    { label: '1 mois', apply: (d) => addMonths(d, 1) },
    { label: '6 mois', apply: (d) => addMonths(d, 6) },
    { label: '1 an', apply: (d) => addMonths(d, 12) },
  ],
};

export function AddItemScreen({ barcode, editing, defaultLocation, onSave, onDelete, onCancel }: Props) {
  const theme = useTheme();
  const code = editing?.barcode ?? barcode;

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const [offTags, setOffTags] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [location, setLocation] = useState<Location>(editing?.location ?? defaultLocation);
  const [dateTouched, setDateTouched] = useState(Boolean(editing));
  const [date, setDate] = useState<Date>(() =>
    editing
      ? parseISODate(editing.expiryDate)
      : addDays(startOfToday(), suggestExpiryDays('', defaultLocation, 'autre')),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [lookup, setLookup] = useState<LookupState>('idle');

  const category: Category =
    editing && name.trim() === editing.name
      ? (editing.category ?? guessCategory(name))
      : guessCategory(name, offTags);

  // Date d'expiration suggérée tant que l'utilisateur ne l'a pas choisie lui-même.
  useEffect(() => {
    if (dateTouched) return;
    setDate(addDays(startOfToday(), suggestExpiryDays(name, location, category)));
  }, [name, location, category, dateTouched]);

  useEffect(() => {
    if (!barcode || editing) return;
    let cancelled = false;

    (async () => {
      setLookup('loading');
      const known = await getKnownProduct(barcode);
      if (cancelled) return;
      if (known) {
        setName((prev) => prev || known.name);
        setBrand(known.brand ?? '');
        setImageUrl(known.imageUrl);
        setOffTags(known.categoryTags ?? []);
        setLookup('found');
        return;
      }
      const info = await lookupBarcode(barcode);
      if (cancelled) return;
      if (info) {
        setName((prev) => prev || info.name);
        setBrand(info.brand ?? '');
        setImageUrl(info.imageUrl);
        setOffTags(info.categoryTags);
        setLookup('found');
      } else {
        setLookup('notfound');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [barcode, editing]);

  const chooseDate = (d: Date) => {
    setDate(d);
    setDateTouched(true);
  };

  const onChangeDate = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && selected) chooseDate(selected);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notify('Nom manquant', 'Indiquez le nom du produit.');
      return;
    }
    onSave({
      name: trimmed,
      brand: brand.trim() || undefined,
      barcode: code,
      imageUrl,
      category,
      categoryTags: offTags,
      kind: guessKind(trimmed, offTags),
      quantity,
      location,
      expiryDate: toISODate(date),
    });
  };

  const confirmDelete = () => {
    if (!onDelete) return;
    confirmAction('Supprimer ce produit ?', editing?.name, 'Supprimer', onDelete);
  };

  const inputStyle = [styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: theme.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</Text>

        <View style={styles.hero}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 40 }}>{CATEGORY_EMOJI[category]}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.muted }}>{CATEGORY_LABEL[category]}</Text>
            {code ? <Text style={{ color: theme.muted, fontSize: 12 }}>Code-barres : {code}</Text> : null}
            {lookup === 'loading' && <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: 'flex-start' }} />}
          </View>
        </View>

        {lookup === 'found' && !editing && (
          <Text style={{ color: theme.ok }}>Produit reconnu — vérifiez le nom si besoin.</Text>
        )}
        {lookup === 'notfound' && (
          <Text style={{ color: theme.warn }}>
            Produit introuvable (ou hors ligne). Saisissez son nom : il sera mémorisé pour la prochaine fois.
          </Text>
        )}

        <Text style={[styles.label, { color: theme.muted }]}>Nom</Text>
        <TextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholder="Ex. Yaourt nature"
          placeholderTextColor={theme.muted}
        />

        <Text style={[styles.label, { color: theme.muted }]}>Marque (facultatif)</Text>
        <TextInput
          style={inputStyle}
          value={brand}
          onChangeText={setBrand}
          placeholder="Ex. Danone"
          placeholderTextColor={theme.muted}
        />

        <Text style={[styles.label, { color: theme.muted }]}>Emplacement</Text>
        <View style={styles.row}>
          {(Object.keys(LOCATION_LABEL) as Location[]).map((loc) => (
            <Button
              key={loc}
              title={LOCATION_LABEL[loc]}
              variant={location === loc ? 'primary' : 'secondary'}
              onPress={() => setLocation(loc)}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: theme.muted }]}>Quantité</Text>
        <View style={styles.row}>
          <Button title="−" variant="secondary" onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.stepper} />
          <Text style={[styles.qty, { color: theme.text }]}>{quantity}</Text>
          <Button title="+" variant="secondary" onPress={() => setQuantity((q) => q + 1)} style={styles.stepper} />
        </View>

        <Text style={[styles.label, { color: theme.muted }]}>Date d’expiration</Text>
        {Platform.OS === 'web' ? (
          React.createElement('input', {
            type: 'date',
            value: toISODate(date),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              if (e.target.value) chooseDate(parseISODate(e.target.value));
            },
            style: {
              padding: 12,
              fontSize: 16,
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              backgroundColor: theme.card,
              color: theme.text,
            },
          })
        ) : Platform.OS === 'ios' ? (
          <View style={styles.dateIos}>
            <DateTimePicker value={date} mode="date" display="compact" locale="fr-FR" onChange={onChangeDate} />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setShowPicker(true)}
              style={[styles.input, styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>{formatFR(toISODate(date))}</Text>
            </Pressable>
            {showPicker && <DateTimePicker value={date} mode="date" onChange={onChangeDate} />}
          </>
        )}
        {!dateTouched && (
          <Text style={[styles.hintLabel, { color: theme.muted }]}>
            Date suggérée d’après le type de produit — remplacez-la par celle de l’emballage.
          </Text>
        )}

        <View style={styles.presets}>
          {PRESETS[location].map((p) => (
            <Pressable
              key={p.label}
              onPress={() => chooseDate(p.apply(startOfToday()))}
              style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={{ color: theme.text }}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Button title="Enregistrer" onPress={save} />
          <Button title="Annuler" variant="secondary" onPress={onCancel} />
          {editing && onDelete ? <Button title="Supprimer" variant="danger" onPress={confirmDelete} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photo: { width: 96, height: 96, borderRadius: 16 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, textTransform: 'uppercase' },
  hintLabel: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { width: 56, paddingHorizontal: 0 },
  qty: { fontSize: 22, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  dateIos: { alignItems: 'flex-start' },
  dateButton: { justifyContent: 'center' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  actions: { marginTop: 24, gap: 10 },
});
