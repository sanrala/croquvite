import {
  collection,
  doc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  writeBatch,
  Firestore,
  WriteBatch,
} from 'firebase/firestore';
import { getServices } from './firebase';
import { diffById } from './syncLogic';

/**
 * Un « espace » est le chemin où vivent les données : `users/{uid}` (compte seul)
 * ou `households/{id}` (foyer partagé). Dedans : items et shopping.
 */
export type CloudCollection = 'items' | 'shopping';

type Strip<T> = (t: T) => Record<string, unknown>;

function needDb(): Firestore {
  const services = getServices();
  if (!services) throw new Error('Firebase non configuré');
  return services.db;
}

const colRef = (db: Firestore, space: string, name: CloudCollection) =>
  collection(db, `${space}/${name}`);

export const personalSpace = (uid: string) => `users/${uid}`;
export const householdSpace = (id: string) => `households/${id}`;

async function commit(db: Firestore, ops: ((batch: WriteBatch) => void)[]): Promise<void> {
  // Un lot Firestore accepte 500 opérations au maximum.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => op(batch));
    await batch.commit();
  }
}

/** Lecture directe sur le serveur (échoue hors connexion, ce qui est voulu pour la fusion initiale). */
export async function fetchCollection<T>(space: string, name: CloudCollection): Promise<T[]> {
  const snap = await getDocsFromServer(colRef(needDb(), space, name));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
}

export async function uploadAll<T extends { id: string }>(
  space: string,
  name: CloudCollection,
  items: T[],
  strip: Strip<T>,
): Promise<void> {
  const db = needDb();
  const col = colRef(db, space, name);
  await commit(
    db,
    items.map((item) => (batch: WriteBatch) => batch.set(doc(col, item.id), strip(item))),
  );
}

/** Envoie uniquement ce qui a changé entre deux versions de la liste. */
export async function pushDiff<T extends { id: string }>(
  space: string,
  name: CloudCollection,
  prev: T[],
  next: T[],
  strip: Strip<T>,
): Promise<void> {
  const { upserts, deletes } = diffById(prev, next, strip);
  if (upserts.length === 0 && deletes.length === 0) return;
  const db = needDb();
  const col = colRef(db, space, name);
  await commit(db, [
    ...upserts.map((u) => (batch: WriteBatch) => batch.set(doc(col, u.id), u.data)),
    ...deletes.map((id) => (batch: WriteBatch) => batch.delete(doc(col, id))),
  ]);
}

/** Écoute en direct une collection. fromCache = true tant que la donnée vient du cache local. */
export function subscribe<T>(
  space: string,
  name: CloudCollection,
  onData: (list: T[], fromCache: boolean) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    colRef(needDb(), space, name),
    { includeMetadataChanges: true },
    (snap) => onData(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T), snap.metadata.fromCache),
    onError,
  );
}

/** Supprime tous les produits et la liste de courses d'un espace. */
export async function deleteSpaceData(space: string): Promise<void> {
  const db = needDb();
  for (const name of ['items', 'shopping'] as CloudCollection[]) {
    const snap = await getDocs(colRef(db, space, name));
    await commit(
      db,
      snap.docs.map((d) => (batch: WriteBatch) => batch.delete(d.ref)),
    );
  }
}

/** Supprime toutes les données d'un utilisateur (suppression de compte). */
export const deleteAllUserData = (uid: string): Promise<void> => deleteSpaceData(personalSpace(uid));
