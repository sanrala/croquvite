export type Location = 'frigo' | 'congelo';

export const LOCATION_LABEL: Record<Location, string> = {
  frigo: 'Frigo',
  congelo: 'Congélateur',
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
  quantity: number;
  location: Location;
  /** Date d'expiration au format AAAA-MM-JJ (heure locale) */
  expiryDate: string;
  addedAt: string;
  /** Identifiants des notifications planifiées pour cet article */
  notificationIds: string[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  done: boolean;
}
