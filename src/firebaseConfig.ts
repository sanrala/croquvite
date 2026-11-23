/**
 * Configuration Firebase de Croqu'Vite.
 *
 * Ces valeurs ne sont pas secrètes : ce sont des identifiants publics. La sécurité repose sur les
 * règles Firestore (firestore.rules) et sur la liste des domaines autorisés dans Firebase.
 *
 * Tant que les valeurs valent encore « COLLER_ICI », l'application fonctionne normalement, sans compte :
 * les produits restent sur l'appareil et les boutons de connexion sont masqués.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAYjg8P1dZ-ddJH_YQwwu6-P1Da_JTISn4',
  authDomain: 'croquvite.firebaseapp.com',
  projectId: 'croquvite',
  storageBucket: 'croquvite.firebasestorage.app',
  messagingSenderId: '876409094058',
  appId: '1:876409094058:web:91ab6e9fd391d7da6fb5d3',
  measurementId: 'G-6PSFMP87ZX',
};

// Vrai dès que les valeurs ci-dessus ont été remplacées (ne pas modifier ces trois lignes).
export const firebaseConfigured: boolean =
  !firebaseConfig.apiKey.startsWith('COLLER') &&
  !firebaseConfig.projectId.startsWith('COLLER') &&
  !firebaseConfig.appId.startsWith('COLLER');