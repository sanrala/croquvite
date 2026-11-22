# Croqu'Vite

Application mobile (Android + iOS) pour suivre le contenu du frigo et des produits hors frigo (placard, fruits, conserves), dans l'esprit de Friio.

## Fonctions

- **Scan du code-barres** : le nom, la marque, la photo et la catégorie viennent d'[Open Food Facts](https://world.openfoodfacts.org) (gratuit, sans clé API). Les produits déjà scannés ou renommés sont mémorisés, même hors ligne.
- **Produits frais / sans code-barres** : saisie à la main avec une **date d'expiration suggérée** selon le type de produit (modifiable, à remplacer par la date de l'emballage).
- **Frigo et hors frigo** triés par urgence, avec code couleur : rouge = périmé, orange = à consommer sous 3 jours, vert = ok.
- **Notifications locales** : frigo → 3 jours et 1 jour avant ; hors frigo → 7 jours et 1 jour avant (à 9 h). Réglable dans `src/notifications.ts` (`REMINDER_DAYS`).
- **Recettes** à partir du frigo (option : inclure les produits hors frigo, comme les pâtes ou le riz). Les recettes qui utilisent les produits proches de la date limite passent en premier ; les produits périmés sont ignorés.
- **Liste de courses** : ajout à la main, ou en un clic depuis une recette (« Ajouter les manquants aux courses »).
- Données **100 % locales** sur le téléphone, aucun compte.

Pas encore inclus (par rapport à Friio) : frigo partagé entre plusieurs personnes (nécessite un serveur, ex. Supabase) et recettes générées par IA (nécessite un petit backend pour ne pas exposer de clé API).

## Marche à suivre

### 1. Installer les outils (une seule fois)

1. **Node.js 20 ou plus récent** : <https://nodejs.org> (version LTS). Vérifiez avec `node -v`.
2. **Expo Go** sur votre téléphone : App Store (iPhone) ou Google Play (Android).
3. Un éditeur de code (VS Code, par exemple).

### 2. Installer le projet

```bash
cd croquvite
npm install
```

### 3. Mettre le projet à la version actuelle d'Expo

Le projet a été écrit pour Expo SDK 53, alors que l'application Expo Go des stores n'ouvre que la version récente (SDK 58 à ce jour). Alignez donc le projet :

```bash
npx expo install expo@latest
npx expo install --fix
npm run typecheck
```

`expo install --fix` met à jour toutes les bibliothèques (caméra, notifications, stockage, calendrier) vers les versions compatibles. Si `npm run typecheck` signale des erreurs après la mise à jour, c'est qu'une API a changé : corrigez les lignes indiquées (en général un changement de nom de propriété).

### 4. Lancer l'application

```bash
npx expo start
```

- **iPhone** : ouvrez l'appareil photo et scannez le QR code affiché dans le terminal, puis ouvrez le lien dans Expo Go.
- **Android** : ouvrez Expo Go, touchez « Scan QR code » et scannez le QR code.
- Le téléphone et l'ordinateur doivent être sur le **même Wi-Fi**. Si la connexion échoue : `npx expo start --tunnel`.

### 5. Configurer sur le téléphone

1. Acceptez l'accès à la **caméra** (scan) et aux **notifications** (rappels d'expiration) quand l'application le demande. Si vous avez refusé, réactivez-les dans Réglages > Expo Go.
2. Touchez **Scanner un produit** et visez un code-barres (EAN-13 / EAN-8 / UPC).
3. Vérifiez le nom, choisissez Frigo ou Hors frigo, ajustez la quantité et la date d'expiration, puis **Enregistrer**.
4. Ouvrez l'onglet **Recettes** pour voir les idées, et **Courses** pour la liste.

Test rapide des notifications : ajoutez un produit qui expire demain, il doit déclencher un rappel le jour même à 9 h.

> Dans Expo Go, les notifications **locales** (celles de cette application) fonctionnent, mais Expo Go peut afficher un avertissement sur les notifications push distantes : ignorez-le. Pour un usage quotidien, faites un vrai build (étape 6).

### 6. Installer l'application « pour de vrai » (sans Expo Go)

```bash
npm install -g eas-cli
eas login                 # compte gratuit sur expo.dev
eas build:configure
eas build --platform android --profile preview   # génère un APK à installer directement
eas build --platform ios                          # nécessite un compte Apple Developer (99 €/an)
```

Avant le build, adaptez dans `app.json` : `ios.bundleIdentifier` et `android.package` (actuellement `fr.nextgen.croquvite`), et le nom de l'application.

Pour publier sur les stores : `eas submit --platform android` / `eas submit --platform ios`.

## Structure

```
App.tsx                      onglets Frigo / Hors frigo / Recettes / Courses, état global
src/types.ts                 modèles FoodItem, ShoppingItem, catégories
src/storage.ts               stockage local + mémoire des codes-barres connus
src/openFoodFacts.ts         identification d'un produit (nom, photo, catégorie)
src/shelfLife.ts             catégories et dates d'expiration suggérées
src/notifications.ts         planification / annulation des rappels
src/recipes.ts               base de recettes et moteur de suggestion
src/screens/                 Scanner, Ajout/édition, Inventaire, Recettes, Courses
```

## Pistes d'évolution

- **Frigo partagé** : Supabase (auth + base temps réel) et un lien d'invitation par foyer
- **Recettes par IA** : petit backend qui appelle l'API Claude avec la liste des produits (priorité à ceux qui expirent)
- Lecture de la date d'expiration par la caméra (OCR)
- Ajout de vos propres recettes dans `src/recipes.ts`
