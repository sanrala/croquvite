import { upgradeItem } from './productKind';
import type { FoodItem, Location, ShoppingItem } from './types';

/** Logique pure de synchronisation (sans Firebase ni React Native), donc facile à tester. */

export function stripItem(item: FoodItem): Record<string, unknown> {
  const { notificationIds: _local, ...rest } = item;
  return rest;
}

export function stripShopping(item: ShoppingItem): Record<string, unknown> {
  return { ...item };
}

export interface Diff {
  upserts: { id: string; data: Record<string, unknown> }[];
  deletes: string[];
}

/** Différences entre deux listes : éléments à écrire (nouveaux ou modifiés) et à supprimer. */
export function diffById<T extends { id: string }>(
  prev: T[],
  next: T[],
  strip: (t: T) => Record<string, unknown>,
): Diff {
  const prevJson = new Map(prev.map((p) => [p.id, JSON.stringify(strip(p))]));
  const nextIds = new Set(next.map((n) => n.id));
  const upserts: Diff['upserts'] = [];
  for (const n of next) {
    const data = strip(n);
    if (prevJson.get(n.id) !== JSON.stringify(data)) upserts.push({ id: n.id, data });
  }
  const deletes = prev.filter((p) => !nextIds.has(p.id)).map((p) => p.id);
  return { upserts, deletes };
}

const LOCATIONS: string[] = ['frigo', 'placard', 'congelo'];

function isValidItem(x: unknown): x is FoodItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.expiryDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.expiryDate) &&
    typeof o.location === 'string' &&
    LOCATIONS.includes(o.location)
  );
}

/** Nettoie et trie les produits reçus du cloud (plus récents d'abord). */
export function normalizeRemoteItems(list: unknown[]): FoodItem[] {
  return list
    .filter(isValidItem)
    .map((i) => ({
      ...i,
      location: ((i.location as string) === 'congelo' ? 'placard' : i.location) as Location,
      quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
      addedAt: typeof i.addedAt === 'string' ? i.addedAt : '',
    }))
    .map(upgradeItem)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id));
}

export function normalizeRemoteShopping(list: unknown[]): ShoppingItem[] {
  return list
    .filter((x): x is ShoppingItem => {
      if (!x || typeof x !== 'object') return false;
      const o = x as Record<string, unknown>;
      return typeof o.id === 'string' && typeof o.name === 'string';
    })
    .map((i) => ({ ...i, done: Boolean(i.done) }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.id.localeCompare(b.id));
}

export function sameJSON(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Rappels d'expiration : planifiés localement, appareil par appareil.
// ---------------------------------------------------------------------------

export type NotifMap = Record<string, { sig: string; ids: string[] }>;

export function notifSignature(item: FoodItem): string {
  // La date de rappel n'est ajoutée que si elle existe : les signatures déjà enregistrées restent valables.
  return `${item.expiryDate}|${item.location}|${item.name}${item.reminderDate ? `|r:${item.reminderDate}` : ''}`;
}

export interface NotifPlan {
  /** Identifiants de notifications à annuler. */
  cancel: string[];
  /** Produits dont il faut (re)planifier les rappels. */
  schedule: FoodItem[];
  /** Anciens rappels (versions précédentes) à reprendre tels quels dans la table. */
  seed: NotifMap;
  /** Produits à retirer de la table (supprimés ou modifiés). */
  drop: string[];
}

export function planNotifications(items: FoodItem[], map: NotifMap): NotifPlan {
  const plan: NotifPlan = { cancel: [], schedule: [], seed: {}, drop: [] };
  const seen = new Set<string>();

  for (const item of items) {
    seen.add(item.id);
    const sig = notifSignature(item);
    const entry = map[item.id];

    if (entry && entry.sig === sig) continue;

    if (entry) {
      plan.cancel.push(...entry.ids);
      plan.drop.push(item.id);
      plan.schedule.push(item);
    } else if (item.notificationIds && item.notificationIds.length > 0) {
      plan.seed[item.id] = { sig, ids: item.notificationIds };
    } else {
      plan.schedule.push(item);
    }
  }

  for (const [id, entry] of Object.entries(map)) {
    if (!seen.has(id)) {
      plan.cancel.push(...entry.ids);
      plan.drop.push(id);
    }
  }
  return plan;
}
