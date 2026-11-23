import { hasKeyword, normalize } from './text';
import type { Category, FoodItem } from './types';

/**
 * Un « produit fini » (yaourt aux fruits, compote, jus, biscuit…) ne doit pas être pris pour son ingrédient :
 * « Perle de Lait Mangue Pêche » n'est ni du lait, ni de la mangue, ni de la pêche.
 * On détecte donc son TYPE au moment de l'ajout (nom + catégories Open Food Facts), et les recettes
 * ne l'utilisent que pour les ingrédients de ce type (un yaourt pour « Yaourt nature », par exemple).
 */
export type ProductKind = 'yaourt' | 'dessert' | 'compote' | 'boisson' | 'glace' | 'biscuit' | 'plat' | 'tartinable';

interface KindRule {
  kind: ProductKind;
  /** Mots du nom (normalisé) qui identifient ce type. */
  names: string[];
  /** Fragments de catégories Open Food Facts (ex. « en:yogurts »). */
  tags: string[];
  /** Mots-clés d'ingrédients de recette que ce type de produit peut remplacer. */
  satisfies: string[];
}

const RULES: KindRule[] = [
  {
    kind: 'yaourt',
    names: ['yaourt', 'yogourt', 'yoghourt', 'perle de lait', 'skyr', 'fromage blanc', 'petit suisse', 'faisselle', 'gervita', 'gervais', 'yoplait', 'yop', 'activia', 'actimel', 'danone'],
    tags: ['en:yogurts', 'en:fermented-milks', 'en:dairy-desserts', 'en:fromage-blanc', 'en:fromages-blancs'],
    satisfies: ['yaourt', 'yogourt'],
  },
  {
    kind: 'dessert',
    names: ['creme dessert', 'danette', 'flan', 'liegeois', 'riz au lait', 'semoule au lait', 'panna cotta', 'ile flottante', 'dessert', 'gelee', 'mousse au chocolat'],
    tags: ['en:desserts'],
    satisfies: ['dessert'],
  },
  { kind: 'compote', names: ['compote', 'puree de fruits'], tags: ['en:compotes'], satisfies: ['compote'] },
  {
    kind: 'boisson',
    names: ['jus', 'soda', 'limonade', 'boisson', 'sirop', 'smoothie', 'nectar', 'cola', 'ice tea', 'the glace'],
    tags: ['en:sodas', 'en:fruit-juices', 'en:juices-and-nectars', 'en:sweetened-beverages'],
    satisfies: ['jus', 'boisson'],
  },
  { kind: 'glace', names: ['glace', 'sorbet', 'esquimau', 'cornet'], tags: ['en:ice-creams'], satisfies: ['glace'] },
  {
    kind: 'biscuit',
    names: ['biscuit', 'gateau', 'cookie', 'madeleine', 'brownie', 'muffin', 'cereales', 'barre', 'chips', 'bonbon', 'sucette'],
    tags: ['en:biscuits', 'en:cakes', 'en:snacks', 'en:confectioneries'],
    satisfies: ['biscuit', 'gateau'],
  },
  {
    kind: 'plat',
    names: ['plat cuisine', 'lasagne', 'pizza', 'quiche', 'soupe', 'sandwich', 'burger', 'nuggets', 'cordon bleu', 'tarte'],
    tags: ['en:meals', 'en:pizzas', 'en:quiches', 'en:soups', 'en:sandwiches'],
    satisfies: ['plat'],
  },
  {
    kind: 'tartinable',
    names: ['confiture', 'pate a tartiner', 'nutella', 'creme de marron'],
    tags: ['en:jams', 'en:spreads'],
    satisfies: ['confiture'],
  },
];

/** Ces produits restent des ingrédients simples malgré un mot-clé trompeur (« jus de citron »). */
const INGREDIENT_EXCEPTIONS = ['jus de citron', 'jus de citron vert', 'jus de lime'];

/** Type de produit fini, ou undefined pour un produit « brut » (lait, pomme, œufs…). */
export function guessKind(name: string, offTags: string[] = []): ProductKind | undefined {
  const text = normalize(name);
  if (INGREDIENT_EXCEPTIONS.some((e) => hasKeyword(text, e))) return undefined;
  for (const rule of RULES) {
    if (rule.names.some((n) => hasKeyword(text, n))) return rule.kind;
  }
  const tags = offTags.join(' ').toLowerCase();
  if (tags) {
    for (const rule of RULES) {
      if (rule.tags.some((t) => tags.includes(t))) return rule.kind;
    }
  }
  return undefined;
}

/** Un produit fini peut-il servir pour cet ingrédient de recette ? */
export function kindSatisfies(kind: ProductKind, ingredientKeywords: string[]): boolean {
  const rule = RULES.find((r) => r.kind === kind);
  return !!rule && ingredientKeywords.some((k) => rule.satisfies.includes(k));
}

/** Catégorie d'affichage d'un produit fini (un yaourt aux fraises est un produit laitier, pas un fruit). */
export function categoryForKind(kind: ProductKind): Category {
  switch (kind) {
    case 'yaourt':
    case 'dessert':
      return 'laitier';
    case 'boisson':
      return 'boisson';
    case 'plat':
      return 'plat';
    default:
      return 'epicerie';
  }
}

/** Corrige un produit déjà enregistré : type et catégorie déduits du nom (sans rien réécrire dans le cloud). */
export function upgradeItem(item: FoodItem): FoodItem {
  const kind = item.kind ?? guessKind(item.name);
  if (!kind) return item;
  const category = categoryForKind(kind);
  return item.kind === kind && item.category === category ? item : { ...item, kind, category };
}
