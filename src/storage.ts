import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, ShoppingItem } from './types';

const ITEMS_KEY = 'frigo:items:v1';
const PRODUCTS_KEY = 'frigo:known-products:v1';
const SHOPPING_KEY = 'frigo:shopping:v1';

export async function loadItems(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    return raw ? (JSON.parse(raw) as FoodItem[]) : [];
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
