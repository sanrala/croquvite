import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { firebaseConfig, firebaseConfigured } from './firebaseConfig';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let cached: FirebaseServices | null = null;

/** Retourne les services Firebase, ou null tant que firebaseConfig.ts n'est pas rempli. */
export function getServices(): FirebaseServices | null {
  if (!firebaseConfigured) return null;
  if (cached) return cached;

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  let auth: Auth;
  try {
    if (Platform.OS === 'web') {
      auth = getAuth(app);
    } else {
      // Sur mobile, la session est conservée dans AsyncStorage.
      // getReactNativePersistence n'est pas dans les types « web » de firebase/auth.
      const { getReactNativePersistence } = require('firebase/auth') as {
        getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
      };
      auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
  } catch {
    auth = getAuth(app); // déjà initialisé (rechargement à chaud)
  }

  let db: Firestore;
  try {
    db =
      Platform.OS === 'web'
        ? initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            // Cache hors ligne dans le navigateur (IndexedDB), partagé entre les onglets.
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
          })
        : initializeFirestore(app, {
            ignoreUndefinedProperties: true,
            experimentalAutoDetectLongPolling: true,
          });
  } catch {
    db = getFirestore(app); // déjà initialisé
  }

  cached = { app, auth, db };
  return cached;
}
