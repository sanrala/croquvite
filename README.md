# Croqu'Vite

Application (site web, Android, iOS) pour suivre le contenu du frigo et des produits hors frigo (placard, fruits, conserves), dans l'esprit de Friio.

## Fonctions

- **Scan du code-barres** : nom, marque, photo et catégorie via [Open Food Facts](https://world.openfoodfacts.org) (gratuit, sans clé API). Les produits déjà scannés ou renommés sont mémorisés, même hors ligne. Sur le site web, le scan utilise la caméra du navigateur, avec saisie manuelle du code en secours.
- **Produits frais / sans code-barres** : saisie à la main avec une **date d'expiration suggérée** selon le type de produit (modifiable).
- **Frigo et hors frigo**, triés par urgence : rouge = périmé, orange = à consommer sous 3 jours, vert = ok.
- **Rappels d'expiration** sur téléphone (notifications locales) : frigo → 3 jours et 1 jour avant, hors frigo → 7 jours et 1 jour avant, à 9 h. Réglable dans `src/notifications.ts` (`REMINDER_DAYS`). Un navigateur ne peut pas planifier ces rappels.
- **86 recettes** à partir de ce que vous avez, les produits qui expirent bientôt en premier. Vos propres recettes : `src/recipesExtra.ts`.
- **Liste de courses**, alimentée en un clic par les ingrédients manquants d'une recette.
- **Compte gratuit et synchronisation** (Firebase) : retrouvez vos produits et vos courses sur tous vos appareils. Connexion par e-mail, ou par Google sur le site web. Suppression du compte et des données intégrée (RGPD) et politique de confidentialité.
- **Sans compte**, tout reste sur l'appareil. Sans Firebase configuré, les boutons de connexion sont masqués.

## Compte et synchronisation (Firebase), pas à pas

À faire une seule fois (environ 15 minutes). Le plan gratuit **Spark** suffit et ne demande **aucune carte bancaire** : en cas de dépassement des quotas, Firebase coupe le service au lieu de facturer. **Ne passez pas au plan « Blaze »** et ne liez pas de compte de facturation.

1. Ouvrez <https://console.firebase.google.com>, **Ajouter un projet**, nom au choix (ex. `croquvite`). Vous pouvez désactiver Google Analytics.
2. **Build > Authentication > Commencer**, onglet **Méthode de connexion** : activez **E-mail/Mot de passe**, puis **Google** (choisissez votre e-mail d'assistance).
3. **Authentication > Paramètres > Domaines autorisés** : ajoutez le domaine de votre site Vercel (ex. `croquvite.vercel.app`) et votre domaine personnalisé s'il y en a un. Sans cela, la connexion Google échoue (`auth/unauthorized-domain`).
4. **Build > Firestore Database > Créer une base de données** : mode **production**, région **eur3 (Europe)** ou **europe-west9 (Paris)**. La région ne peut plus être changée ensuite.
5. **Firestore > Règles** : remplacez tout par le contenu du fichier `firestore.rules` du projet, puis **Publier**. Ce sont elles qui garantissent que chacun ne voit que ses propres produits.
6. **Paramètres du projet** (roue dentée) **> Général > Vos applications > icône Web `</>`** : donnez un nom, **ne cochez pas** Firebase Hosting, puis copiez l'objet `firebaseConfig` affiché.
7. Collez ses valeurs dans **`src/firebaseConfig.ts`** (`apiKey`, `authDomain`, `projectId`, `appId`, et les deux autres si présentes). Ces valeurs ne sont pas secrètes.
8. Remplissez **`src/config.ts`** : votre nom (ou raison sociale) et votre e-mail de contact, affichés dans la politique de confidentialité.
9. Commit et push : Vercel redéploie. Ouvrez le site, touchez **Se connecter**, créez votre compte, puis connectez-vous avec le même compte sur un autre appareil.

### Comment ça marche

- Vos données sont dans `users/{votre identifiant}/items` et `.../shopping`.
- Les produits déjà présents sur un appareil sont **ajoutés au compte à la première connexion**, puis tout est synchronisé en direct.
- Hors connexion, l'appli reste utilisable ; les changements sont envoyés au retour du réseau (dans le navigateur, grâce au cache de Firebase ; sur téléphone, tant que l'appli n'est pas fermée avant le retour du réseau).
- **Se déconnecter** vide l'appareil (les produits restent dans le compte), pour ne pas mélanger les données si le téléphone est partagé.
- Les **rappels** sont planifiés sur chaque téléphone, y compris pour les produits ajoutés depuis un autre appareil.
- La connexion Google est disponible sur le **site web** ; dans l'appli mobile, utilisez l'e-mail.

### Quotas du plan gratuit

Le stockage n'est pas le problème (quelques centaines d'octets par produit). Le quota qui limite est celui des **lectures** (environ 50 000 par jour d'après la page des tarifs Firebase consultée en novembre 2026) : chaque ouverture de l'appli relit les produits de la personne. Avec une cinquantaine de produits par personne, comptez de l'ordre de **mille ouvertures par jour**, un peu plus sur le web grâce au cache du navigateur. Au-delà, le plan Spark coupe le service au lieu de facturer. Surveillez **Firebase > Utilisation** après le lancement ; les quotas peuvent évoluer, vérifiez-les sur la page des tarifs.

### À savoir avant d'ouvrir au public

- La **politique de confidentialité** est un modèle de départ, pas un avis juridique : relisez-la et adaptez-la.
- Pas de vérification de l'e-mail à l'inscription (réglable plus tard) ni d'application mobile avec Google : voir « Pistes d'évolution ».

## Installer et lancer en local

1. **Node.js 20 ou plus récent** (<https://nodejs.org>, version LTS) et un éditeur comme **Visual Studio Code**.
2. Dans le dossier du projet :

```bash
npm install
npm run typecheck
npx expo start --web
```

Le site s'ouvre sur `http://localhost:8081`.

## Publier le site sur Vercel

- Importez le dépôt GitHub dans Vercel.
- Réglages (Settings > Build & Development) : **Build Command** `npx expo export --platform web`, **Output Directory** `dist`.
- À chaque push sur `main`, Vercel redéploie. Ajoutez le domaine obtenu aux **domaines autorisés** de Firebase (étape 3).
- Sur iPhone : ouvrez le site dans Safari, puis **Partager > Sur l'écran d'accueil** pour l'avoir comme une application.

## Version mobile (Android / iOS)

Le projet est en **Expo SDK 53**. L'application **Expo Go** des stores n'ouvre que la version la plus récente d'Expo : pour tester sur téléphone avec Expo Go, il faut soit mettre le projet à niveau (`npx expo install expo@latest`, puis `npx expo install --fix`, puis `npm run typecheck`), soit créer un build de développement. Cette mise à niveau n'a pas été testée avec Firebase.

Build installable :

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview   # APK
eas build --platform ios                          # compte Apple Developer requis (99 €/an)
```

Avant le build, adaptez dans `app.json` : `ios.bundleIdentifier` et `android.package` (actuellement `fr.nextgen.croquvite`).

## Structure

```
App.tsx                      onglets, état global, synchronisation avec le compte
metro.config.js              réglage nécessaire à Firebase avec Expo SDK 53
firestore.rules              règles de sécurité à publier dans Firebase
src/firebaseConfig.ts        VOS identifiants Firebase (à remplir)
src/config.ts                VOS informations pour la politique de confidentialité
src/firebase.ts              initialisation Firebase (web et mobile)
src/auth.ts                  connexion, déconnexion, suppression de compte, messages d'erreur
src/cloud.ts                 lecture / écriture / écoute Firestore
src/syncLogic.ts             logique pure de synchronisation et de rappels
src/notifications.ts         rappels d'expiration, par appareil
src/recipes.ts, recipesExtra.ts   moteur et base de recettes
src/shelfLife.ts             catégories et dates d'expiration suggérées
src/openFoodFacts.ts         identification d'un produit par code-barres
src/storage.ts               stockage local
src/dialog.ts                alertes et confirmations (web + mobile)
src/screens/                 Scanner (+ version web), Ajout, Inventaire, Recettes, Courses, Compte, Confidentialité
```

## Pistes d'évolution

- **Frigo partagé** entre plusieurs personnes (invitation par lien) : même base Firebase, avec un identifiant de « foyer ».
- **Recettes par IA** via une petite fonction côté serveur (la clé API ne doit jamais être dans l'appli).
- **Notifications sur iPhone depuis le site** : nécessite un serveur d'envoi (Firebase Cloud Functions, plan payant) ; en attendant, rappels sur l'appli mobile.
- Connexion Google dans l'appli mobile, vérification de l'e-mail à l'inscription.
- Lecture de la date d'expiration par la caméra (OCR).
