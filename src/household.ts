import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteSpaceData, householdSpace } from './cloud';
import { getServices } from './firebase';
import { Household, MAX_MEMBERS, newCode, normalizeCode, parseHousehold } from './householdLogic';

/**
 * Données Firestore :
 *   households/{id}            { ownerUid, members[], memberNames{}, code, joinCode, createdAt }
 *   households/{id}/items|shopping   les produits et la liste de courses partagés
 *   invites/{code}             { hid, ownerUid }  → permet de retrouver un foyer à partir d'un code
 */

function needDb() {
  const services = getServices();
  if (!services) throw new Error('Firebase non configuré');
  return services.db;
}

// --- Mémorisation locale (pour démarrer hors connexion) ---------------------------------

const CACHE_KEY = 'frigo:household-id:v1';

/** undefined = jamais enregistré pour cet utilisateur ; null = enregistré « pas de foyer ». */
export async function cachedHouseholdId(uid: string): Promise<string | null | undefined> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { uid: string; hid: string | null };
    return parsed.uid === uid ? parsed.hid : undefined;
  } catch {
    return undefined;
  }
}

export async function rememberHouseholdId(uid: string, hid: string | null): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ uid, hid }));
  } catch {
    // sans importance
  }
}

// --- Lecture ---------------------------------------------------------------------------

/** Le foyer dont l'utilisateur est membre (un seul possible), ou null. */
export async function findMyHousehold(uid: string): Promise<Household | null> {
  const db = needDb();
  const snap = await getDocs(query(collection(db, 'households'), where('members', 'array-contains', uid)));
  const first = snap.docs[0];
  return first ? parseHousehold(first.id, first.data()) : null;
}

/** Suit un foyer en direct. h = null si le document n'existe pas (ou plus). */
export function subscribeHousehold(
  id: string,
  onData: (h: Household | null, fromCache: boolean) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(needDb(), 'households', id),
    { includeMetadataChanges: true },
    (snap) => onData(snap.exists() ? parseHousehold(snap.id, snap.data()) : null, snap.metadata.fromCache),
    onError,
  );
}

// --- Actions ---------------------------------------------------------------------------

export async function createHousehold(uid: string, label: string): Promise<string> {
  const db = needDb();
  const ref = doc(collection(db, 'households'));
  const code = newCode();
  const batch = writeBatch(db);
  batch.set(ref, {
    ownerUid: uid,
    members: [uid],
    memberNames: { [uid]: label },
    code,
    joinCode: code,
    createdAt: Date.now(),
  });
  batch.set(doc(db, 'invites', code), { hid: ref.id, ownerUid: uid });
  await batch.commit();
  return ref.id;
}

/** Rejoint un foyer avec son code. Lance { code: 'app/invalid-code' } si le code ne correspond à rien. */
export async function joinHousehold(uid: string, label: string, input: string): Promise<string> {
  const code = normalizeCode(input);
  if (!code) throw { code: 'app/invalid-code' };
  const db = needDb();

  let hid: string;
  try {
    const invite = await getDoc(doc(db, 'invites', code));
    if (!invite.exists()) throw { code: 'app/invalid-code' };
    hid = String((invite.data() as { hid?: unknown }).hid ?? '');
    if (!hid) throw { code: 'app/invalid-code' };
  } catch (e) {
    if ((e as { code?: string }).code === 'permission-denied') throw { code: 'app/invalid-code' };
    throw e;
  }

  try {
    await updateDoc(doc(db, 'households', hid), {
      members: arrayUnion(uid),
      [`memberNames.${uid}`]: label,
      joinCode: code,
    });
  } catch (e) {
    // Refusé : code périmé (foyer supprimé / code renouvelé) ou foyer complet.
    if ((e as { code?: string }).code === 'permission-denied' || (e as { code?: string }).code === 'not-found') {
      throw { code: 'app/cannot-join' };
    }
    throw e;
  }
  return hid;
}

/**
 * Quitte le foyer. Le propriétaire ne peut partir que s'il est seul : le foyer est alors supprimé.
 * Lance { code: 'app/owner-has-members' } sinon.
 */
export async function leaveHousehold(uid: string, h: Household): Promise<void> {
  const db = needDb();
  if (h.ownerUid === uid) {
    if (h.members.some((m) => m !== uid)) throw { code: 'app/owner-has-members' };
    await dissolveHousehold(h);
    return;
  }
  await updateDoc(doc(db, 'households', h.id), {
    members: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
  });
}

/** Supprime le foyer, ses produits, sa liste et son code. Réservé au propriétaire, resté seul. */
export async function dissolveHousehold(h: Household): Promise<void> {
  const db = needDb();
  await deleteSpaceData(householdSpace(h.id)); // d'abord : les règles lisent le foyer pour autoriser
  const batch = writeBatch(db);
  if (h.code) batch.delete(doc(db, 'invites', h.code));
  batch.delete(doc(db, 'households', h.id));
  await batch.commit();
}

/** Génère un nouveau code et invalide l'ancien. */
export async function regenerateCode(h: Household): Promise<string> {
  const db = needDb();
  const code = newCode();
  const batch = writeBatch(db);
  if (h.code) batch.delete(doc(db, 'invites', h.code));
  batch.set(doc(db, 'invites', code), { hid: h.id, ownerUid: h.ownerUid });
  batch.update(doc(db, 'households', h.id), { code, joinCode: code });
  await batch.commit();
  return code;
}

/** Retire un membre ET change le code, pour qu'il ne puisse pas revenir avec l'ancien. */
export async function removeMember(h: Household, memberUid: string): Promise<void> {
  const db = needDb();
  const code = newCode();
  const batch = writeBatch(db);
  if (h.code) batch.delete(doc(db, 'invites', h.code));
  batch.set(doc(db, 'invites', code), { hid: h.id, ownerUid: h.ownerUid });
  batch.update(doc(db, 'households', h.id), {
    members: arrayRemove(memberUid),
    [`memberNames.${memberUid}`]: deleteField(),
    code,
    joinCode: code,
  });
  await batch.commit();
}

export { MAX_MEMBERS };
