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
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { NutriScoreBadge } from '../components/NutriScoreBadge';
import type { InfoTab } from './InfoScreen';
import { confirmAction, notify } from '../dialog';
import { addDays, formatFR, parseISODate, startOfToday, toISODate } from '../dates';
import { lookupBarcode, NutriScore } from '../openFoodFacts';
import { offerCalendarFile } from '../calendarFile';
import { guessKind, ProductKind } from '../productKind';
import { buildReminderIcs, icsFileName, REMINDER_DAYS } from '../reminderLogic';
import { guessCategory, suggestExpiryDays } from '../shelfLife';
import { getKnownProduct } from '../storage';
import { fonts, MAX_WIDTH, radius, useTheme } from '../theme';
import { CATEGORY_EMOJI, CATEGORY_LABEL, Category, FoodItem, Location, LOCATION_LABEL } from '../types';

export interface ItemFormData {
  name: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  category: Category;
  categoryTags: string[];
  kind?: ProductKind;
  /** Nutri-Score Open Food Facts (A à E), absent si non noté. */
  nutriscore?: NutriScore;
  reminderDate?: string;
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
  /** Ouvre la page « Bon à savoir » (dates et Nutri-Score). */
  onOpenInfo?: (tab?: InfoTab) => void;
}

type LookupState = 'idle' | 'loading' | 'found' | 'notfound';

/** Sélecteur de date : champ HTML sur le web, sélecteurs natifs sur iOS et Android. */
function DateField({ value, onChange, min, max }: { value: Date; onChange: (d: Date) => void; min?: Date; max?: Date }) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value: toISODate(value),
      min: min ? toISODate(min) : undefined,
      max: max ? toISODate(max) : undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) onChange(parseISODate(e.target.value));
      },
      style: {
        minHeight: 52,
        padding: '0 16px',
        fontSize: 16,
        borderRadius: radius.control,
        border: `1px solid ${theme.border}`,
        backgroundColor: theme.card,
        color: theme.text,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: 260,
      },
    });
  }
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.dateIos}>
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          locale="fr-FR"
          minimumDate={min}
          maximumDate={max}
          onChange={(_e: DateTimePickerEvent, selected?: Date) => selected && onChange(selected)}
        />
      </View>
    );
  }
  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.input, styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>{formatFR(toISODate(value))}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={min}
          maximumDate={max}
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            setShow(false);
            if (event.type === 'set' && selected) onChange(selected);
          }}
        />
      )}
    </>
  );
}

export function AddItemScreen({ barcode, editing, defaultLocation, onSave, onDelete, onCancel, onOpenInfo }: Props) {
  const theme = useTheme();
  const code = editing?.barcode ?? barcode;

  const [name, setName] = useState(editing?.name ?? '');
  const [brand, setBrand] = useState(editing?.brand ?? '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(editing?.imageUrl);
  const [offTags, setOffTags] = useState<string[]>([]);
  const [nutriscore, setNutriscore] = useState<NutriScore | undefined>(editing?.nutriscore);
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [location, setLocation] = useState<Location>(editing?.location ?? defaultLocation);
  const [dateTouched, setDateTouched] = useState(Boolean(editing));
  const [date, setDate] = useState<Date>(() =>
    editing
      ? parseISODate(editing.expiryDate)
      : addDays(startOfToday(), suggestExpiryDays('', defaultLocation, 'autre')),
  );
  const [reminder, setReminder] = useState<Date | null>(() =>
    editing?.reminderDate ? parseISODate(editing.reminderDate) : null,
  );
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
        // Produit déjà mémorisé : on récupère son Nutri-Score (et des catégories à jour) en arrière-plan.
        lookupBarcode(barcode).then((info) => {
          if (cancelled || !info) return;
          if (info.nutriscore) setNutriscore(info.nutriscore);
          if (info.categoryTags.length > 0) setOffTags(info.categoryTags);
        });
        return;
      }
      const info = await lookupBarcode(barcode);
      if (cancelled) return;
      if (info) {
        setName((prev) => prev || info.name);
        setBrand(info.brand ?? '');
        setImageUrl(info.imageUrl);
        setOffTags(info.categoryTags);
        setNutriscore(info.nutriscore);
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

  const addToCalendar = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notify('Nom manquant', 'Indiquez le nom du produit.');
      return;
    }
    const ics = buildReminderIcs({
      id: editing?.id,
      name: trimmed,
      location,
      expiryDate: toISODate(date),
      reminderDate: reminder ? toISODate(reminder) : undefined,
    });
    offerCalendarFile(icsFileName(trimmed), ics);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notify('Nom manquant', 'Indiquez le nom du produit.');
      return;
    }
    if (reminder) {
      const changed = toISODate(reminder) !== editing?.reminderDate;
      if (changed && reminder < startOfToday()) {
        notify('Rappel déjà passé', 'Choisissez une date de rappel à partir d’aujourd’hui.');
        return;
      }
      if (reminder > date) {
        notify('Rappel trop tardif', 'Le rappel doit être au plus tard le jour de l’expiration.');
        return;
      }
    }
    onSave({
      name: trimmed,
      brand: brand.trim() || undefined,
      barcode: code,
      imageUrl,
      category,
      categoryTags: offTags,
      kind: guessKind(trimmed, offTags),
      nutriscore,
      reminderDate: reminder ? toISODate(reminder) : undefined,
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
        <Text display style={[styles.title, { color: theme.text }]}>
          {editing ? 'Modifier le produit' : 'Nouveau produit'}
        </Text>

        <View style={[styles.hero, { backgroundColor: theme.card }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: theme.fill }]}>
              <Text style={{ fontSize: 40 }}>{CATEGORY_EMOJI[category]}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text display style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>
              {CATEGORY_LABEL[category]}
            </Text>
            {code ? <Text style={{ color: theme.muted, fontSize: 12 }}>Code-barres : {code}</Text> : null}
            {nutriscore ? (
              <Pressable onPress={() => onOpenInfo?.('nutriscore')} disabled={!onOpenInfo} accessibilityRole="button" accessibilityHint="Ouvre l'explication du Nutri-Score">
                <NutriScoreBadge grade={nutriscore} />
              </Pressable>
            ) : null}
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
        <DateField value={date} onChange={chooseDate} />
        {!dateTouched && (
          <Text style={[styles.hintLabel, { color: theme.muted }]}>
            Date suggérée d’après le type de produit — remplacez-la par celle de l’emballage.
          </Text>
        )}
        {onOpenInfo ? (
          <Pressable
            onPress={() => onOpenInfo('dates')}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.infoCard,
              { backgroundColor: theme.primarySoft, borderColor: theme.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.infoIcon}>💡</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
                « Jusqu’au » ou « de préférence » ?
              </Text>
              <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 18 }}>
                L’un est un risque pour la santé, l’autre non. Touchez pour savoir lequel.
              </Text>
            </View>
            <Text style={{ color: theme.primary, fontSize: 22, fontWeight: '800' }}>›</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.label, { color: theme.muted }]}>Rappel</Text>
        {reminder ? (
          <>
            <DateField value={reminder} onChange={setReminder} min={startOfToday()} max={date} />
            <Text style={[styles.hintLabel, { color: theme.muted }]}>Vous serez prévenu ce jour-là à 9 h.</Text>
            <Button title="Revenir aux rappels automatiques" variant="secondary" onPress={() => setReminder(null)} />
          </>
        ) : (
          <>
            <Text style={[styles.hintLabel, { color: theme.muted }]}>
              Rappels automatiques à 9 h : {REMINDER_DAYS[location].map((d) => (d === 1 ? 'la veille' : `${d} jours avant`)).join(' et ')}.
            </Text>
            <Button
              title="Choisir une date de rappel"
              variant="secondary"
              onPress={() => setReminder(date > startOfToday() ? addDays(date, -1) : startOfToday())}
            />
          </>
        )}
        {Platform.OS === 'web' && (
          <>
            <Button title="Ajouter à mon calendrier (iPhone, ordinateur)" variant="secondary" onPress={addToCalendar} />
            <Text style={[styles.hintLabel, { color: theme.muted }]}>
              Sur iPhone, un site ne peut pas envoyer de notification : le calendrier le fait à votre place, avec une alerte.
            </Text>
          </>
        )}

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
  content: { padding: 20, gap: 8, paddingBottom: 56, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: radius.sheet },
  photo: { width: 88, height: 88, borderRadius: radius.thumb + 2 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 2 },
  hintLabel: { fontSize: 13, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: radius.control, paddingHorizontal: 16, minHeight: 52, fontSize: 16, fontFamily: fonts.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { width: 56, paddingHorizontal: 0 },
  qty: { fontSize: 26, fontWeight: '800', minWidth: 48, textAlign: 'center', fontFamily: fonts.display },
  dateIos: { alignItems: 'flex-start' },
  dateButton: { justifyContent: 'center' },
  actions: { marginTop: 28, gap: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8, borderRadius: radius.sheet, borderWidth: 1 },
  infoIcon: { fontSize: 26 },
});