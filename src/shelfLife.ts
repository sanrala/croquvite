import { categoryForKind, guessKind } from './productKind';
import { hasKeyword, normalize } from './text';
import { Category, Location } from './types';

const NAME_KEYWORDS: [Category, string[]][] = [
  ['plat', ['lasagne', 'lasagnes', 'pizza', 'quiche', 'soupe', 'sandwich', 'tarte', 'plat cuisine']],
  // Épicerie sèche AVANT les fruits & légumes : « Torti Tomates & Épinards » reste des pâtes.
  ['epicerie', ['pates', 'torti', 'penne', 'fusilli', 'spaghetti', 'capellini', 'tagliatelle', 'linguine', 'macaroni', 'coquillettes', 'farfalle', 'riz', 'semoule', 'boulgour', 'quinoa', 'lentilles', 'farine']],
  ['poisson', ['poisson', 'saumon', 'cabillaud', 'thon', 'colin', 'truite', 'crevette', 'merlu', 'dorade', 'lieu noir']],
  ['viande', ['poulet', 'boeuf', 'porc', 'jambon', 'lardon', 'saucisse', 'steak', 'viande', 'dinde', 'veau', 'agneau', 'saucisson', 'bacon', 'merguez', 'canard', 'volaille', 'escalope']],
  ['laitier', ['lait', 'yaourt', 'yogourt', 'fromage', 'emmental', 'gruyere', 'comte', 'mozzarella', 'camembert', 'brie', 'chevre', 'parmesan', 'creme', 'beurre', 'skyr', 'reblochon', 'raclette', 'cheddar', 'petit suisse', 'oeuf']],
  ['fruits-legumes', ['pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'carotte', 'tomate', 'courgette', 'poivron', 'salade', 'laitue', 'oignon', 'ail', 'champignon', 'aubergine', 'concombre', 'brocoli', 'chou', 'chou fleur', 'poireau', 'epinard', 'avocat', 'raisin', 'kiwi', 'mangue', 'pomme de terre', 'haricot vert', 'mesclun']],
  ['boisson', ['jus', 'soda', 'eau', 'biere', 'vin', 'limonade', 'boisson']],
];

/**
 * Tags Open Food Facts (sans le préfixe « en: »), comparés EXACTEMENT :
 * « beverages » ne doit pas trouver « en:plant-based-foods-and-beverages », présent sur toutes les pâtes.
 * L'ordre compte : la première règle qui correspond l'emporte.
 */
const TAG_RULES: [Category, string[]][] = [
  ['plat', ['meals', 'pizzas', 'quiches', 'soups', 'sandwiches']],
  ['poisson', ['fishes', 'seafood']],
  ['viande', ['meats', 'poultry', 'sausages', 'charcuteries', 'hams']],
  ['laitier', ['dairies', 'cheeses', 'yogurts', 'eggs', 'milk-and-dairy-products']],
  ['boisson', ['beverages', 'waters', 'fruit-juices']],
  ['fruits-legumes', ['fruits', 'vegetables', 'fresh-fruits', 'fresh-vegetables', 'fruits-and-vegetables', 'potatoes']],
  ['epicerie', ['pastas', 'dry-pastas', 'rices', 'cereals-and-potatoes', 'cereals-and-their-products', 'flours', 'legumes']],
];

/**
 * Déduit une catégorie : type de produit fini, puis catégories Open Food Facts (fiables),
 * puis mots du nom (le nom décrit souvent un parfum : « Torti Tomates & Épinards »).
 */
export function guessCategory(name: string, offTags: string[] = []): Category {
  // Un produit fini (yaourt aux fraises, compote…) prime sur le reste.
  const kind = guessKind(name, offTags);
  if (kind) return categoryForKind(kind);

  const tags = new Set(offTags.map((t) => t.toLowerCase()));
  for (const [category, parts] of TAG_RULES) {
    if (parts.some((p) => tags.has(`en:${p}`))) return category;
  }

  const text = normalize(name);
  for (const [category, keywords] of NAME_KEYWORDS) {
    if (keywords.some((k) => hasKeyword(text, k))) return category;
  }
  return offTags.length > 0 ? 'epicerie' : 'autre';
}

/** Durées indicatives (jours) une fois le produit ouvert ou acheté frais — à ajuster d'après l'emballage. */
const FRIDGE_OVERRIDES: [string, number][] = [
  ['oeuf', 28],
  ['beurre', 45],
  ['fromage', 21],
  ['emmental', 21],
  ['yaourt', 14],
  ['lait', 7],
  ['creme', 10],
  ['jambon', 5],
  ['saucisson', 30],
  ['salade', 4],
  ['laitue', 4],
  ['mesclun', 3],
  ['tomate', 6],
  ['banane', 4],
  ['pomme', 21],
  ['carotte', 14],
  ['poulet', 3],
  ['steak', 3],
  ['saumon', 2],
  ['champignon', 5],
  ['courgette', 7],
  ['poivron', 7],
];

const FRIDGE_DEFAULT: Record<Category, number> = {
  laitier: 10,
  viande: 3,
  poisson: 2,
  'fruits-legumes': 7,
  plat: 4,
  boisson: 7,
  epicerie: 30,
  autre: 7,
};

/** Produits conservés hors du frigo (placard, corbeille de fruits, cave…). */
const PANTRY_OVERRIDES: [string, number][] = [
  ['pomme de terre', 30],
  ['pommes de terre', 30],
  ['oignon', 30],
  ['ail', 30],
  ['pomme', 14],
  ['orange', 14],
  ['citron', 14],
  ['banane', 5],
  ['tomate', 5],
  ['pain', 3],
  ['pates', 365],
  ['spaghetti', 365],
  ['riz', 365],
  ['farine', 180],
  ['sucre', 730],
  ['huile', 365],
  ['conserve', 730],
  ['biscuit', 120],
  ['cereale', 180],
  ['jus', 180],
  ['biere', 180],
];

const PANTRY_DEFAULT: Record<Category, number> = {
  laitier: 60,
  viande: 90,
  poisson: 365,
  'fruits-legumes': 7,
  plat: 365,
  boisson: 180,
  epicerie: 180,
  autre: 90,
};

export function suggestExpiryDays(name: string, location: Location, category: Category): number {
  const text = normalize(name);
  if (location === 'placard') {
    const found = PANTRY_OVERRIDES.find(([kw]) => hasKeyword(text, kw));
    return found ? found[1] : PANTRY_DEFAULT[category];
  }
  const match = FRIDGE_OVERRIDES.find(([kw]) => hasKeyword(text, kw));
  return match ? match[1] : FRIDGE_DEFAULT[category];
}