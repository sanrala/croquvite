import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { deleteAllUserData } from './cloud';
import { getServices } from './firebase';

/** La connexion Google passe par une fenêtre du navigateur : disponible sur le site web uniquement. */
export const canUseGoogle = Platform.OS === 'web';

function needAuth() {
  const services = getServices();
  if (!services) throw new Error('Firebase non configuré');
  return services.auth;
}

/** Suit l'état de connexion. Retourne la fonction pour arrêter l'écoute. */
export function watchAuth(callback: (user: User | null) => void): () => void {
  const services = getServices();
  if (!services) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(services.auth, callback);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(needAuth(), email.trim(), password);
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(needAuth(), email.trim(), password);
}

export async function signInWithGoogle(): Promise<void> {
  if (!canUseGoogle) throw { code: 'app/google-web-only' };
  await signInWithPopup(needAuth(), new GoogleAuthProvider());
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(needAuth(), email.trim());
}

export async function logOut(): Promise<void> {
  await signOut(needAuth());
}

export function usesPassword(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password');
}

/**
 * Supprime le compte ET toutes ses données.
 * Firebase exige une connexion récente : on se ré-authentifie d'abord (mot de passe, ou fenêtre Google).
 */
export async function deleteAccount(password?: string): Promise<void> {
  const user = needAuth().currentUser;
  if (!user) throw { code: 'app/not-signed-in' };

  if (usesPassword(user)) {
    if (!password) throw { code: 'app/password-required' };
    if (!user.email) throw { code: 'app/not-signed-in' };
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  } else if (canUseGoogle) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }

  await deleteAllUserData(user.uid);
  await deleteUser(user);
}

/** Message en français pour une erreur Firebase. Chaîne vide = ne rien afficher (fenêtre fermée). */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/missing-email':
      return 'Saisissez votre adresse e-mail.';
    case 'auth/missing-password':
    case 'app/password-required':
      return 'Saisissez votre mot de passe.';
    case 'auth/weak-password':
      return 'Mot de passe trop court : 6 caractères minimum.';
    case 'auth/email-already-in-use':
      return 'Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/network-request-failed':
      return 'Pas de connexion internet. Réessayez.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Le navigateur a bloqué la fenêtre de connexion Google. Autorisez les pop-ups pour ce site.';
    case 'auth/operation-not-allowed':
      return "Ce mode de connexion n'est pas activé dans la console Firebase.";
    case 'auth/unauthorized-domain':
      return "Ce site n'est pas autorisé dans Firebase (Authentication > Paramètres > Domaines autorisés).";
    case 'auth/requires-recent-login':
      return 'Pour des raisons de sécurité, reconnectez-vous puis réessayez.';
    case 'app/google-web-only':
      return 'La connexion Google est disponible sur le site web. Utilisez votre e-mail ici.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return "Accès refusé : vérifiez que les règles Firestore du README sont publiées.";
    default:
      return `Une erreur est survenue${code ? ` (${code})` : ''}.`;
  }
}
