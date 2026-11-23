import { StatusBar } from 'expo-status-bar';
import type { User } from 'firebase/auth';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { deleteAccount, logOut, watchAuth } from './src/auth';
import { fetchCollection, householdSpace, personalSpace, pushDiff, subscribe, uploadAll } from './src/cloud';
import { Button } from './src/components/Button';
import { confirmAction, notify } from './src/dialog';
import { firebaseConfigured } from './src/firebaseConfig';
import {
  cachedHouseholdId,
  createHousehold,
  findMyHousehold,
  joinHousehold,
  leaveHousehold,
  regenerateCode,
  rememberHouseholdId,
  removeMember,
  subscribeHousehold,
} from './src/household';
import { Household, memberLabel } from './src/householdLogic';
import { makeId } from './src/id';
import { ensureNotificationPermission, syncNotifications } from './src/notifications';
import { AccountScreen } from './src/screens/AccountScreen';
import { AddItemScreen, ItemFormData } from './src/screens/AddItemScreen';
import { InventoryScreen } from './src/screens/InventoryScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { RecipesScreen } from './src/screens/RecipesScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import {
  dismissBanner,
  isBannerDismissed,
  isMergePending,
  loadItems,
  loadShopping,
  rememberProduct,
  saveItems,
  saveShopping,
  setMergePending,
} from './src/storage';
import { describeSyncError } from './src/syncErrors';
import {
  normalizeRemoteItems,
  normalizeRemoteShopping,
  sameJSON,
  stripItem,
  stripShopping,
} from './src/syncLogic';
import { useTheme } from './src/theme';
import { FoodItem, Location, ShoppingItem, SYNC_LABEL, SyncStatus } from './src/types';

type Tab = Location | 'recettes' | 'courses';

type Mode =
  | { type: 'list' }
  | { type: 'scan' }
  | { type: 'add'; barcode?: string; editing?: FoodItem }
  | { type: 'account' }
  | { type: 'privacy'; from: 'list' | 'account' };

export default function App() {
  const theme = useTheme();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('frigo');
  const [mode, setMode] = useState<Mode>({ type: 'list' });
  const [user, setUser] = useState<User | null>(null);
  const [sync, setSync] = useState<SyncStatus>('off');
  const [syncDetail, setSyncDetail] = useState<string | null>(null);
  const [bannerHidden, setBannerHidden] = useState(true);
  // undefined = pas encore connu, null = aucun foyer.
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  // Incrémenté pour relancer la synchronisation après création / arrivée / départ d'un foyer.
  const [syncNonce, setSyncNonce] = useState(0);

  // Les références évitent de lire une valeur périmée dans les callbacks de synchronisation.
  const itemsRef = useRef<FoodItem[]>([]);
  const shoppingRef = useRef<ShoppingItem[]>([]);
  const userRef = useRef<User | null>(null);
  /** Où écrire dans le cloud : users/{uid} ou households/{id}. null tant que non déterminé. */
  const spaceRef = useRef<string | null>(null);
  /** Vrai pendant un départ volontaire du foyer (pour ne pas afficher « vous avez été retiré »). */
  const leavingRef = useRef(false);

  const applyItems = (next: FoodItem[]) => {
    itemsRef.current = next;
    setItems(next);
  };
  const applyShopping = (next: ShoppingItem[]) => {
    shoppingRef.current = next;
    setShopping(next);
  };

  // --- Démarrage -------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const [storedItems, storedShopping, dismissed] = await Promise.all([
        loadItems(),
        loadShopping(),
        isBannerDismissed(),
      ]);
      applyItems(storedItems);
      applyShopping(storedShopping);
      setBannerHidden(dismissed);
      setLoaded(true);
      if (Platform.OS !== 'web') await ensureNotificationPermission().catch(() => false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Rappels d'expiration (par appareil, y compris pour les produits venus du cloud) ---
  useEffect(() => {
    if (loaded) void syncNotifications(items);
  }, [items, loaded]);

  // --- État de connexion -----------------------------------------------------
  useEffect(
    () =>
      watchAuth((u) => {
        userRef.current = u;
        setUser(u);
      }),
    [],
  );

  // --- Synchronisation avec le compte ---------------------------------------
  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !loaded) {
      spaceRef.current = null;
      setHousehold(undefined);
      setSync('off');
      setSyncDetail(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribers: (() => void)[] = [];
    const stale = () => cancelled || userRef.current?.uid !== uid;

    // À la connexion : envoie au compte les produits présents seulement sur cet appareil.
    const mergeIfNeeded = async (space: string): Promise<{ ok: true } | { ok: false; error: unknown }> => {
      if (!(await isMergePending())) return { ok: true };
      try {
        const [remoteItems, remoteShopping] = await Promise.all([
          fetchCollection<FoodItem>(space, 'items'),
          fetchCollection<ShoppingItem>(space, 'shopping'),
        ]);
        const remoteItemIds = new Set(remoteItems.map((i) => i.id));
        const remoteShoppingIds = new Set(remoteShopping.map((i) => i.id));
        await uploadAll(space, 'items', itemsRef.current.filter((i) => !remoteItemIds.has(i.id)), stripItem);
        await uploadAll(space, 'shopping', shoppingRef.current.filter((i) => !remoteShoppingIds.has(i.id)), stripShopping);
        await setMergePending(false);
        return { ok: true };
      } catch (error) {
        return { ok: false, error }; // on réessaie plus tard, sans écraser les données de l'appareil
      }
    };

    const report = (error: unknown) => {
      const problem = describeSyncError(error);
      setSync(problem.kind === 'network' ? 'offline' : 'error');
      setSyncDetail(problem.message);
      return problem;
    };

    // Trouve le foyer de l'utilisateur. Hors connexion, on se fie à la dernière valeur connue.
    const resolveHousehold = async (): Promise<{ ok: true; hid: string | null } | { ok: false; error: unknown }> => {
      try {
        const found = await findMyHousehold(uid);
        await rememberHouseholdId(uid, found?.id ?? null);
        if (!stale()) setHousehold(found);
        return { ok: true, hid: found?.id ?? null };
      } catch (error) {
        const problem = describeSyncError(error);
        const cached = await cachedHouseholdId(uid);
        if (cached !== undefined && problem.kind === 'network') return { ok: true, hid: cached };
        // Règles pas encore republiées : le compte seul continue de fonctionner, le foyer apparaîtra ensuite.
        // (Si les règles du compte seul manquent aussi, la fusion juste après affichera l'erreur.)
        if (problem.code === 'permission-denied') {
          if (!stale()) setHousehold(null);
          return { ok: true, hid: null };
        }
        return { ok: false, error };
      }
    };

    // Plus membre (retiré, foyer supprimé) : on garde une copie sur l'appareil et on repart sur le compte seul.
    const handleLost = () => {
      void (async () => {
        await setMergePending(true);
        if (stale()) return;
        if (leavingRef.current) return;
        notify('Foyer', 'Vous ne faites plus partie de ce foyer. Vos produits restent sur cet appareil et sont ajoutés à votre compte.');
        setSyncNonce((n) => n + 1);
      })();
    };

    let householdWatched = false;
    const start = async () => {
      setSync('syncing');
      const resolved = await resolveHousehold();
      if (stale()) return;
      if (!resolved.ok) {
        const problem = report(resolved.error);
        timer = setTimeout(() => void start(), problem.kind === 'network' ? 15000 : 30000);
        return;
      }
      const hid = resolved.hid;
      const space = hid ? householdSpace(hid) : personalSpace(uid);
      spaceRef.current = space;

      if (hid && !householdWatched) {
        householdWatched = true;
        unsubscribers.push(
          subscribeHousehold(
            hid,
            (h, fromCache) => {
              if (stale()) return;
              if (!h) {
                if (!fromCache) handleLost();
                return;
              }
              setHousehold(h);
            },
            (error) => {
              if (stale()) return;
              if ((error as { code?: string } | null)?.code === 'permission-denied') handleLost();
            },
          ),
        );
      }

      const merged = await mergeIfNeeded(space);
      if (stale()) return;
      if (!merged.ok) {
        const problem = report(merged.error);
        // Une erreur de configuration (règles, base absente) se corrige dans Firebase : on réessaie toute seule.
        timer = setTimeout(() => void start(), problem.kind === 'network' ? 15000 : 30000);
        return;
      }
      setSyncDetail(null);

      unsubscribers.push(
        subscribe<FoodItem>(
          space,
          'items',
          (list, fromCache) => {
            if (stale()) return;
            setSync(fromCache ? 'offline' : 'ok');
            if (!fromCache) setSyncDetail(null);
            // Hors connexion au démarrage, le cache peut être vide : on garde alors les données de l'appareil.
            if (fromCache && list.length === 0) return;
            const next = normalizeRemoteItems(list);
            if (sameJSON(next, itemsRef.current)) return;
            applyItems(next);
            void saveItems(next);
          },
          (error) => !stale() && report(error),
        ),
      );
      unsubscribers.push(
        subscribe<ShoppingItem>(
          space,
          'shopping',
          (list, fromCache) => {
            if (stale()) return;
            if (fromCache && list.length === 0) return;
            const next = normalizeRemoteShopping(list);
            if (sameJSON(next, shoppingRef.current)) return;
            applyShopping(next);
            void saveShopping(next);
          },
          (error) => !stale() && report(error),
        ),
      );
    };

    void start();
    return () => {
      cancelled = true;
      spaceRef.current = null;
      if (timer) clearTimeout(timer);
      unsubscribers.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, loaded, syncNonce]);

  // --- Sauvegardes (local, puis cloud si connecté) ---------------------------------
  const persist = async (next: FoodItem[]) => {
    const prev = itemsRef.current;
    applyItems(next);
    await saveItems(next);
    const space = spaceRef.current;
    if (space) pushDiff(space, 'items', prev, next, stripItem).catch(() => setSync('error'));
    else if (userRef.current) void setMergePending(true); // espace pas encore connu : envoyé au prochain démarrage
  };

  const persistShopping = (next: ShoppingItem[]) => {
    const prev = shoppingRef.current;
    applyShopping(next);
    void saveShopping(next);
    const space = spaceRef.current;
    if (space) pushDiff(space, 'shopping', prev, next, stripShopping).catch(() => setSync('error'));
    else if (userRef.current) void setMergePending(true);
  };

  const clearLocalData = async () => {
    applyItems([]);
    applyShopping([]);
    await Promise.all([saveItems([]), saveShopping([])]);
  };

  // --- Produits ----------------------------------------------------------------
  const handleSave = async (data: ItemFormData) => {
    const editing = mode.type === 'add' ? mode.editing : undefined;

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
    };

    await persist(editing ? items.map((i) => (i.id === editing.id ? item : i)) : [item, ...items]);
    setTab(data.location);
    setMode({ type: 'list' });
  };

  const handleUse = async (item: FoodItem) => {
    if (item.quantity > 1) {
      await persist(items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)));
    } else {
      await persist(items.filter((i) => i.id !== item.id));
    }
  };

  const handleDelete = async (item: FoodItem) => {
    await persist(items.filter((i) => i.id !== item.id));
    setMode({ type: 'list' });
  };

  const addToShopping = (labels: string[]) => {
    const pending = new Set(shopping.filter((s) => !s.done).map((s) => s.name.toLowerCase()));
    const toAdd: ShoppingItem[] = labels
      .filter((l) => !pending.has(l.toLowerCase()))
      .map((name) => ({ id: makeId(), name, done: false, createdAt: Date.now() }));

    if (toAdd.length === 0) {
      notify('Déjà dans la liste', 'Ces produits sont déjà dans votre liste de courses.');
      return;
    }
    persistShopping([...toAdd, ...shopping]);
    notify('Liste de courses', `${toAdd.length} produit${toAdd.length > 1 ? 's' : ''} ajouté${toAdd.length > 1 ? 's' : ''}.`);
  };

  // --- Compte --------------------------------------------------------------------
  const handleSignOut = () => {
    confirmAction(
      'Se déconnecter ?',
      'Vos produits restent dans votre compte. Cet appareil sera vidé et les retrouvera à la prochaine connexion.',
      'Se déconnecter',
      () => {
        void (async () => {
          userRef.current = null; // coupe tout envoi ou réception de données pendant la déconnexion
          spaceRef.current = null;
          await logOut().catch(() => {});
          await setMergePending(false);
          await clearLocalData();
          setMode({ type: 'list' });
        })();
      },
      false,
    );
  };

  const handleDeleteAccount = async (password?: string) => {
    await deleteAccount(password);
    userRef.current = null;
    spaceRef.current = null;
    await setMergePending(false);
    await clearLocalData();
    setMode({ type: 'list' });
    notify('Compte supprimé', 'Votre compte et vos données en ligne ont été supprimés.');
  };

  // --- Foyer ---------------------------------------------------------------------
  const requireUser = (): User => {
    const u = userRef.current;
    if (!u) throw { code: 'app/not-signed-in' };
    return u;
  };

  /** Les produits de cet appareil sont ajoutés au nouvel espace au redémarrage de la synchronisation. */
  const switchSpace = async (action: () => Promise<unknown>) => {
    await setMergePending(true);
    try {
      await action();
    } catch (e) {
      await setMergePending(false);
      throw e;
    }
    setSyncNonce((n) => n + 1);
  };

  const handleCreateHousehold = () => {
    const u = requireUser();
    return switchSpace(() => createHousehold(u.uid, memberLabel(u)));
  };
  const handleJoinHousehold = (code: string) => {
    const u = requireUser();
    return switchSpace(() => joinHousehold(u.uid, memberLabel(u), code));
  };
  const handleLeaveHousehold = (h: Household) => {
    const u = requireUser();
    leavingRef.current = true;
    return switchSpace(() => leaveHousehold(u.uid, h)).finally(() => {
      leavingRef.current = false;
    });
  };
  const handleRemoveMember = (h: Household, uid: string) => removeMember(h, uid);
  const handleRegenerateCode = (h: Household) => regenerateCode(h);

  const hideBanner = () => {
    setBannerHidden(true);
    void dismissBanner();
  };

  if (!loaded) return null;

  const topPadding = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0;
  const screen = (child: React.ReactNode) => (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg, paddingTop: topPadding }]}>
      <StatusBar style="auto" />
      {child}
    </SafeAreaView>
  );

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
    return screen(
      <AddItemScreen
        barcode={mode.barcode}
        editing={editing}
        defaultLocation={tab === 'placard' ? 'placard' : 'frigo'}
        onSave={(data) => void handleSave(data)}
        onDelete={editing ? () => void handleDelete(editing) : undefined}
        onCancel={() => setMode({ type: 'list' })}
      />,
    );
  }

  if (mode.type === 'account') {
    return screen(
      <AccountScreen
        user={user}
        sync={sync}
        syncDetail={syncDetail}
        household={household}
        onCreateHousehold={handleCreateHousehold}
        onJoinHousehold={handleJoinHousehold}
        onLeaveHousehold={handleLeaveHousehold}
        onRemoveMember={handleRemoveMember}
        onRegenerateCode={handleRegenerateCode}
        onBack={() => setMode({ type: 'list' })}
        onPrivacy={() => setMode({ type: 'privacy', from: 'account' })}
        onAuthStart={() => setMergePending(true)}
        onAuthFail={() => setMergePending(false)}
        onSignedIn={() => setMode({ type: 'list' })}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
      />,
    );
  }

  if (mode.type === 'privacy') {
    const from = mode.from;
    return screen(<PrivacyScreen onBack={() => setMode(from === 'account' ? { type: 'account' } : { type: 'list' })} />);
  }

  const count = (loc: Location) => items.filter((i) => i.location === loc).length;
  const toBuy = shopping.filter((s) => !s.done).length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'frigo', label: `Frigo (${count('frigo')})` },
    { key: 'placard', label: `Hors frigo (${count('placard')})` },
    { key: 'recettes', label: 'Recettes' },
    { key: 'courses', label: toBuy > 0 ? `Courses (${toBuy})` : 'Courses' },
  ];
  const inventoryTab = tab === 'frigo' || tab === 'placard';

  return screen(
    <>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.text }]}>Croqu'Vite</Text>
        {firebaseConfigured && (
          <Pressable
            onPress={() => setMode({ type: 'account' })}
            accessibilityLabel={user ? 'Mon compte' : 'Se connecter'}
            style={[styles.account, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <Text style={{ color: user ? theme.primary : theme.text, fontWeight: '600', fontSize: 13 }}>
              {user ? `☁ ${SYNC_LABEL[sync]}` : 'Se connecter'}
            </Text>
          </Pressable>
        )}
      </View>

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
              <Text
                style={{ color: active ? theme.onPrimary : theme.text, fontWeight: '600', fontSize: 12, textAlign: 'center' }}
                numberOfLines={2}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {firebaseConfigured && !user && !bannerHidden && inventoryTab && (
        <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>Retrouvez vos produits partout</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              Compte gratuit : synchronisez votre frigo entre votre téléphone et votre ordinateur.
            </Text>
            <Pressable onPress={() => setMode({ type: 'account' })} hitSlop={8}>
              <Text style={{ color: theme.primary, fontWeight: '700', marginTop: 4 }}>Créer mon compte</Text>
            </Pressable>
          </View>
          <Pressable onPress={hideBanner} accessibilityLabel="Masquer" hitSlop={10}>
            <Text style={{ color: theme.muted, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
      )}

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

      {inventoryTab && (
        <View style={[styles.bottom, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
          <Button title="Scanner un produit" onPress={() => setMode({ type: 'scan' })} />
          <Button title="Ajouter à la main" variant="secondary" onPress={() => setMode({ type: 'add' })} />
          <Pressable onPress={() => setMode({ type: 'privacy', from: 'list' })} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>
              Politique de confidentialité
            </Text>
          </Pressable>
        </View>
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  header: { fontSize: 26, fontWeight: '800' },
  account: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  bottom: { padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
