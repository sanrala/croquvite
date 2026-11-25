import type { ProductKind } from './productKind';

export type Location = 'frigo' | 'placard';

export const LOCATION_LABEL: Record<Location, string> = {
  frigo: 'Frigo',
  placard: 'Hors frigo',
};

export type Category =
  | 'laitier'
  | 'viande'
  | 'poisson'
  | 'fruits-legumes'
  | 'plat'
  | 'boisson'
  | 'epicerie'
  | 'autre';

export const CATEGORY_LABEL: Record<Category, string> = {
  laitier: 'Laitiers & œufs',
  viande: 'Viandes & charcuterie',
  poisson: 'Poissons',
  'fruits-legumes': 'Fruits & légumes',
  plat: 'Plats préparés',
  boisson: 'Boissons',
  epicerie: 'Épicerie',
  autre: 'Autre',
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  laitier: '🧀',
  viande: '🥩',
  poisson: '🐟',
  'fruits-legumes': '🥕',
  plat: '🍲',
  boisson: '🥤',
  epicerie: '🥫',
  autre: '🍽️',
};

export interface FoodItem {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  category?: Category;
  /** Type de produit fini (yaourt, compote, jus…), absent pour un produit brut. Voir productKind.ts. */
  kind?: ProductKind;
  quantity: number;
  location: Location;
  /** Date d'expiration au format AAAA-MM-JJ (heure locale) */
  expiryDate: string;
  addedAt: string;
  /** Date de rappel choisie (AAAA-MM-JJ) : remplace les rappels automatiques. */
  reminderDate?: string;
  /**
   * Ancien champ (versions précédentes) : rappels planifiés sur CET appareil.
   * Il n'est plus synchronisé ; les rappels sont maintenant gérés par appareil (voir notifications.ts).
   */
  notificationIds?: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  done: boolean;
  createdAt?: number;
}

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'offline' | 'error';

export const SYNC_LABEL: Record<SyncStatus, string> = {
  off: 'Non connecté',
  syncing: 'Synchronisation…',
  ok: 'Synchronisé',
  offline: 'En attente de connexion',
  error: 'Erreur de synchronisation',
};
