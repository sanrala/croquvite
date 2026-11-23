import AsyncStorage from '@react-native-async-storage/async-storage';
import { upgradeItem } from './productKind';
import { FoodItem, Location, ShoppingItem } from './types';

const ITEMS_KEY = 'frigo:items:v1';
const PRODUCTS_KEY = 'frigo:known-products:v1';
const SHOPPING_KEY = 'frigo:shopping:v1';

export async function loadItems(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as (Omit<FoodItem, 'location'> & { location: Location | 'congelo' })[])
      : [];
    // Les anciens produits « congélateur » deviennent « hors frigo ».
    return parsed
      .map((i) => ({ ...i, location: i.location === 'congelo' ? 'placard' : i.location }) as FoodItem)
      .map(upgradeItem);
  } catch {
    return [];
  }
}

export async function saveItems(items: FoodItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function loadShopping(): Promise<ShoppingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SHOPPING_KEY);
    return raw ? (JSON.parse(raw) as ShoppingItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveShopping(items: ShoppingItem[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(items));
}

// --- Compte et synchronisation -------------------------------------------------

const MERGE_KEY = 'frigo:merge-pending:v1';
const BANNER_KEY = 'frigo:banner-dismissed:v1';

/** Vrai entre le début d'une connexion et la fin de la fusion « produits de l'appareil → compte ». */
export async function isMergePending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MERGE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setMergePending(pending: boolean): Promise<void> {
  try {
    if (pending) await AsyncStorage.setItem(MERGE_KEY, '1');
    else await AsyncStorage.removeItem(MERGE_KEY);
  } catch {
    // sans importance
  }
}

export async function isBannerDismissed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BANNER_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function dismissBanner(): Promise<void> {
  try {
    await AsyncStorage.setItem(BANNER_KEY, '1');
  } catch {
    // sans importance
  }
}

export interface KnownProduct {
  name: string;
  brand?: string;
  imageUrl?: string;
  categoryTags?: string[];
}

type KnownProducts = Record<string, KnownProduct>;

async function loadKnownProducts(): Promise<KnownProducts> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as KnownProducts) : {};
  } catch {
    return {};
  }
}

/** Produit déjà scanné (et éventuellement renommé par l'utilisateur). Fonctionne hors ligne. */
export async function getKnownProduct(barcode: string): Promise<KnownProduct | null> {
  const all = await loadKnownProducts();
  return all[barcode] ?? null;
}

export async function rememberProduct(barcode: string, product: KnownProduct): Promise<void> {
  const all = await loadKnownProducts();
  all[barcode] = product;
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(all));
}
