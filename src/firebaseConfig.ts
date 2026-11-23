/**
 * Configuration Firebase — à remplir une seule fois (voir README, section « Compte et synchronisation »).
 *
 * Firebase console > Paramètres du projet > Général > Vos applications > application Web > « Configuration ».
 * Ces valeurs ne sont pas secrètes : ce sont des identifiants publics. La sécurité repose sur les
 * règles Firestore (firestore.rules) et sur la liste des domaines autorisés.
 *
 * Tant que ces valeurs ne sont pas remplies, l'application fonctionne normalement, sans compte :
 * les produits restent sur l'appareil et les boutons de connexion sont masqués.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAYjg8P1dZ-ddJH_YQwwu6-P1Da_JTISn4",
  authDomain: "croquvite.firebaseapp.com",
  projectId: "croquvite",
  storageBucket: "croquvite.firebasestorage.app",
  messagingSenderId: "876409094058",
  appId: "1:876409094058:web:91ab6e9fd391d7da6fb5d3",
  measurementId: "G-6PSFMP87ZX"
};

export const firebaseConfigured: boolean =
  !firebaseConfig.apiKey.startsWith('AIzaSyAYjg8P1dZ-ddJH_YQwwu6-P1Da_JTISn4') &&
  !firebaseConfig.projectId.startsWith('croquvite') &&
  !firebaseConfig.appId.startsWith('1:876409094058:web:91ab6e9fd391d7da6fb5d3');
