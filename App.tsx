import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from './src/components/Button';
import { makeId } from './src/id';
import {
  cancelNotifications,
  ensureNotificationPermission,
  scheduleExpiryNotifications,
} from './src/notifications';
import { AddItemScreen, ItemFormData } from './src/screens/AddItemScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import { loadItems, loadShopping, rememberProduct, saveItems, saveShopping } from './src/storage';
import { useTheme } from './src/theme';
import { FoodItem, Location, ShoppingItem } from './src/types';

type Tab = Location | 'recettes' | 'courses';

type Mode =
  | { type: 'list' }
  | { type: 'scan' }
  | { type: 'add'; barcode?: string; editing?: FoodItem };

export default function App() {
  const theme = useTheme();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('frigo');
  const [mode, setMode] = useState<Mode>({ type: 'list' });

  useEffect(() => {
    (async () => {
      const [storedItems, storedShopping] = await Promise.all([loadItems(), loadShopping()]);
      setItems(storedItems);
      setShopping(storedShopping);
      setLoaded(true);
      await ensureNotificationPermission();
    })();
  }, []);

  const persist = async (next: FoodItem[]) => {
    setItems(next);
    await saveItems(next);
  };

  const persistShopping = (next: ShoppingItem[]) => {
    setShopping(next);
    void saveShopping(next);
  };

  const schedule = async (item: FoodItem): Promise<string[]> => {
    try {
      return await scheduleExpiryNotifications(item);
    } catch {
      return [];
    }
  };

  const handleSave = async (data: ItemFormData) => {
    const editing = mode.type === 'add' ? mode.editing : undefined;
    await ensureNotificationPermission();

    if (data.barcode) {
      await rememberProduct(data.barcode, {
        name: data.name,
        brand: data.brand,
        imageUrl: data.imageUrl,
        categoryTags: data.categoryTags,
      });
    }

    // Même produit, même emplacement, même date : on additionne simplement les quantités.
    if (!editing && data.barcode) {
      const same = items.find(
        (i) => i.barcode === data.barcode && i.location === data.location && i.expiryDate === data.expiryDate,
      );
      if (same) {
        await persist(items.map((i) => (i.id === same.id ? { ...i, quantity: i.quantity + data.quantity } : i)));
        setTab(data.location);
        setMode({ type: 'list' });
        return;
      }
    }

    if (editing) await cancelNotifications(editing.notificationIds);

    const item: FoodItem = {
      id: editing?.id ?? makeId(),
      barcode: data.barcode,
      name: data.name,
      brand: data.brand,
      imageUrl: data.imageUrl,
      category: data.category,
      quantity: data.quantity,
      location: data.location,
      expiryDate: data.expiryDate,
      addedAt: editing?.addedAt ?? new Date().toISOString(),
      notificationIds: [],
    };
    item.notificationIds = await schedule(item);

    await persist(editing ? items.map((i) => (i.id === editing.id ? item : i)) : [item, ...items]);
    setTab(data.location);
    setMode({ type: 'list' });
  };

  const removeItem = async (item: FoodItem) => {
    await cancelNotifications(item.notificationIds);
    await persist(items.filter((i) => i.id !== item.id));
  };

  const handleUse = async (item: FoodItem) => {
    if (item.quantity > 1) {
      await persist(items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)));
    } else {
      await removeItem(item);
    }
  };

  const handleDelete = async (item: FoodItem) => {
    await removeItem(item);
    setMode({ type: 'list' });
  };

  const addToShopping = (labels: string[]) => {
    const pending = new Set(shopping.filter((s) => !s.done).map((s) => s.name.toLowerCase()));
    const toAdd: ShoppingItem[] = labels
      .filter((l) => !pending.has(l.toLowerCase()))
      .map((name) => ({ id: makeId(), name, done: false }));

    if (toAdd.length === 0) {
      Alert.alert('Déjà dans la liste', 'Ces produits sont déjà dans votre liste de courses.');
      return;
    }
    persistShopping([...toAdd, ...shopping]);
    Alert.alert('Liste de courses', `${toAdd.length} produit${toAdd.length > 1 ? 's' : ''} ajouté${toAdd.length > 1 ? 's' : ''}.`);
  };

  if (!loaded) return null;

  const topPadding = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;

  if (mode.type === 'scan') {
    return (
      <>
        <StatusBar style="light" />
        <ScannerScreen
          onScanned={(barcode) => setMode({ type: 'add', barcode })}
          onManual={() => setMode({ type: 'add' })}
          onClose={() => setMode({ type: 'list' })}
        />
      </>
    );
  }

  if (mode.type === 'add') {
    const editing = mode.editing;
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg, paddingTop: topPadding }]}>
        <StatusBar style="auto" />
        <AddItemScreen
          barcode={mode.barcode}
          editing={editing}
          defaultLocation={tab === 'placard' ? 'placard' : 'frigo'}
          onSave={(data) => void handleSave(data)}
          onDelete={editing ? () => void handleDelete(editing) : undefined}
          onCancel={() => setMode({ type: 'list' })}
        />
      </SafeAreaView>
    );
  }

  const count = (loc: Location) => items.filter((i) => i.location === loc).length;
  const toBuy = shopping.filter((s) => !s.done).length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'frigo', label: `Frigo (${count('frigo')})` },
    { key: 'placard', label: `Hors frigo (${count('placard')})` },
    { key: 'recettes', label: 'Recettes' },
    { key: 'courses', label: toBuy > 0 ? `Courses (${toBuy})` : 'Courses' },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg, paddingTop: topPadding }]}>
      <StatusBar style="auto" />
      <Text style={[styles.header, { color: theme.text }]}>Croqu'Vite</Text>

      <View style={styles.tabs}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.border },
              ]}
            >
              <Text style={{ color: active ? theme.onPrimary : theme.text, fontWeight: '600', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'recettes' ? (
          <RecipesScreen items={items} onAddToShopping={addToShopping} />
        ) : tab === 'courses' ? (
          <ShoppingScreen items={shopping} onChange={persistShopping} />
        ) : (
          <InventoryScreen
            items={items.filter((i) => i.location === tab)}
            emptyText={
              tab === 'frigo'
                ? 'Votre frigo est vide. Scannez un produit pour commencer.'
                : 'Rien en dehors du frigo pour le moment (placard, fruits, conserves…). Scannez un produit pour commencer.'
            }
            onEdit={(item) => setMode({ type: 'add', editing: item })}
            onUse={(item) => void handleUse(item)}
          />
        )}
      </View>

      {(tab === 'frigo' || tab === 'placard') && (
        <View style={[styles.bottom, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <Button title="Scanner un produit" onPress={() => setMode({ type: 'scan' })} />
          <Button title="Ajouter à la main" variant="secondary" onPress={() => setMode({ type: 'add' })} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { fontSize: 26, fontWeight: '800', paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  bottom: { padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
