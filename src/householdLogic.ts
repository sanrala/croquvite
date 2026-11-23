/** Logique pure du foyer (sans Firebase) : codes d'invitation, noms des membres, droits. */

export interface Household {
  id: string;
  ownerUid: string;
  /** Code d'invitation actuellement valide, ex. « K7QM-4XW9 ». */
  code: string;
  members: string[];
  /** Nom affiché de chaque membre (identifiant → nom). */
  memberNames: Record<string, string>;
}

/** Pas de 0/O, 1/I/L : on évite les confusions quand on dicte ou recopie un code. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 8;
export const MAX_MEMBERS = 10;

/** Tire un entier dans [0, max[. Utilise crypto si le moteur le fournit. */
function randomInt(max: number): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    // Rejet des valeurs qui fausseraient la répartition (biais du modulo).
    const limit = Math.floor(0x100000000 / max) * max;
    for (;;) {
      c.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % max;
    }
  }
  return Math.floor(Math.random() * max);
}

export function newCode(rand: (max: number) => number = randomInt): string {
  let raw = '';
  for (let i = 0; i < CODE_LENGTH; i++) raw += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Met en forme ce que la personne a saisi. Retourne null si ce ne peut pas être un code. */
export function normalizeCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== CODE_LENGTH) return null;
  if ([...raw].some((ch) => !CODE_ALPHABET.includes(ch))) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Nom montré aux autres membres : le prénom/pseudo Google, sinon la partie avant le @ de l'e-mail. */
export function memberLabel(user: { displayName?: string | null; email?: string | null }): string {
  const name = user.displayName?.trim();
  if (name) return name.slice(0, 40);
  const local = user.email?.split('@')[0]?.trim();
  return (local || 'Membre').slice(0, 40);
}

export function isOwner(h: Household, uid: string): boolean {
  return h.ownerUid === uid;
}

/** Membres affichables : l'administrateur d'abord, puis les autres par nom. */
export function listMembers(h: Household, myUid: string): { uid: string; name: string; owner: boolean; me: boolean }[] {
  return h.members
    .map((uid) => ({
      uid,
      name: h.memberNames[uid] ?? 'Membre',
      owner: uid === h.ownerUid,
      me: uid === myUid,
    }))
    .sort((a, b) => Number(b.owner) - Number(a.owner) || a.name.localeCompare(b.name, 'fr'));
}

/** Le propriétaire ne peut quitter que s'il est seul (le foyer est alors supprimé). */
export function canLeave(h: Household, uid: string): boolean {
  return !isOwner(h, uid) || h.members.length <= 1;
}

/** Convertit un document Firestore en Household (tolérant : un champ manquant ne fait pas planter). */
export function parseHousehold(id: string, data: Record<string, unknown> | undefined): Household | null {
  if (!data) return null;
  const members = Array.isArray(data.members) ? data.members.filter((m): m is string => typeof m === 'string') : [];
  const names = data.memberNames && typeof data.memberNames === 'object' ? (data.memberNames as Record<string, unknown>) : {};
  const memberNames: Record<string, string> = {};
  for (const [k, v] of Object.entries(names)) if (typeof v === 'string') memberNames[k] = v;
  return {
    id,
    ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : '',
    code: typeof data.code === 'string' ? data.code : '',
    members,
    memberNames,
  };
}
