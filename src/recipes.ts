import { daysUntil } from './dates';
import { hasKeyword, normalize } from './text';
import { FoodItem } from './types';

export interface RecipeIngredient {
  label: string;
  /** Mots-clés sans accents, en minuscules ; un seul suffit pour reconnaître l'ingrédient. */
  keywords: string[];
  optional?: boolean;
  /** Produit de placard supposé disponible (sel, huile, farine…). */
  staple?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  minutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface RecipeLine {
  label: string;
  status: 'have' | 'missing' | 'optional-have' | 'optional-missing' | 'staple';
  itemName?: string;
}

export interface RecipeSuggestion {
  recipe: Recipe;
  lines: RecipeLine[];
  missing: string[];
  coverage: number;
  /** Produits utilisés qui expirent dans les 3 prochains jours. */
  urgentItems: string[];
  score: number;
}

const req = (label: string, keywords: string[]): RecipeIngredient => ({ label, keywords });
const opt = (label: string, keywords: string[]): RecipeIngredient => ({ label, keywords, optional: true });
const staple = (label: string): RecipeIngredient => ({ label, keywords: [], staple: true });

const K = {
  oeuf: ['oeuf'],
  fromage: ['fromage', 'emmental', 'gruyere', 'comte', 'mozzarella', 'cheddar', 'chevre', 'parmesan', 'raclette', 'reblochon'],
  jambon: ['jambon'],
  lardons: ['lardon', 'bacon', 'poitrine fumee', 'poitrine salee'],
  pates: ['pates', 'spaghetti', 'tagliatelle', 'penne', 'coquillette', 'macaroni', 'fusilli', 'torsade'],
  tomate: ['tomate', 'coulis', 'passata'],
  creme: ['creme'],
  lait: ['lait'],
  beurre: ['beurre'],
  pdt: ['pomme de terre', 'pommes de terre'],
  carotte: ['carotte'],
  oignon: ['oignon', 'echalote'],
  courgette: ['courgette'],
  poivron: ['poivron'],
  aubergine: ['aubergine'],
  champignon: ['champignon'],
  poireau: ['poireau'],
  ail: ['ail'],
  poulet: ['poulet', 'volaille'],
  poisson: ['poisson', 'saumon', 'cabillaud', 'colin', 'truite', 'merlu', 'dorade', 'lieu noir'],
  viandeHachee: ['viande hachee', 'boeuf hache', 'steak hache', 'steaks haches'],
  salade: ['salade', 'laitue', 'mesclun', 'roquette', 'mache', 'batavia'],
  riz: ['riz'],
  pain: ['pain de mie', 'pain'],
  pate: ['pate brisee', 'pate feuilletee', 'pate a tarte'],
  chouFleur: ['chou fleur'],
};

export const RECIPES: Recipe[] = [
  {
    id: 'omelette',
    title: 'Omelette garnie',
    minutes: 10,
    servings: 2,
    ingredients: [
      req('Œufs (4)', K.oeuf),
      opt('Fromage', K.fromage),
      opt('Jambon', K.jambon),
      opt('Champignons', K.champignon),
      opt('Tomate', K.tomate),
      opt('Oignon', K.oignon),
      staple('Sel, poivre, huile ou beurre'),
    ],
    steps: [
      'Battez 4 œufs avec une pincée de sel et de poivre.',
      'Faites revenir les garnitures coupées en petits morceaux 3 à 4 minutes dans une poêle huilée, puis réservez-les.',
      'Versez les œufs dans la poêle chaude et laissez prendre à feu moyen sans trop remuer.',
      'Disposez les garnitures et le fromage sur une moitié, pliez l’omelette et servez aussitôt.',
    ],
  },
  {
    id: 'pates-lardons-oeufs',
    title: 'Pâtes aux lardons et aux œufs',
    minutes: 20,
    servings: 2,
    ingredients: [
      req('Pâtes (200 g)', K.pates),
      req('Lardons', K.lardons),
      req('Œufs (2)', K.oeuf),
      opt('Fromage râpé', K.fromage),
      staple('Poivre'),
    ],
    steps: [
      'Faites cuire les pâtes dans une grande casserole d’eau salée, puis égouttez-les en gardant un peu d’eau de cuisson.',
      'Faites dorer les lardons à sec dans une poêle.',
      'Battez les œufs avec le fromage râpé et beaucoup de poivre.',
      'Hors du feu, mélangez pâtes, lardons et sauce aux œufs en ajoutant un peu d’eau de cuisson pour napper. Servez immédiatement.',
    ],
  },
  {
    id: 'gratin-pdt',
    title: 'Gratin de pommes de terre',
    minutes: 75,
    servings: 4,
    ingredients: [
      req('Pommes de terre (800 g)', K.pdt),
      req('Crème', K.creme),
      opt('Lait', K.lait),
      opt('Fromage râpé', K.fromage),
      opt('Ail', K.ail),
      staple('Sel, poivre'),
    ],
    steps: [
      'Préchauffez le four à 180 °C. Épluchez les pommes de terre et coupez-les en fines rondelles.',
      'Frottez un plat avec l’ail, puis disposez les rondelles en couches en salant et poivrant.',
      'Versez la crème (allongée de lait si besoin) pour presque recouvrir, puis parsemez de fromage.',
      'Enfournez environ 1 heure, jusqu’à ce que le dessus soit doré et les pommes de terre tendres.',
    ],
  },
  {
    id: 'quiche-lardons',
    title: 'Quiche aux lardons',
    minutes: 50,
    servings: 4,
    ingredients: [
      req('Pâte brisée ou feuilletée', K.pate),
      req('Lardons', K.lardons),
      req('Œufs (3)', K.oeuf),
      req('Crème (20 cl)', K.creme),
      opt('Fromage râpé', K.fromage),
      opt('Oignon', K.oignon),
      staple('Poivre'),
    ],
    steps: [
      'Préchauffez le four à 180 °C et foncez un moule avec la pâte, que vous piquez à la fourchette.',
      'Faites revenir les lardons (et l’oignon émincé) quelques minutes, puis répartissez-les sur la pâte.',
      'Battez les œufs avec la crème et du poivre (peu de sel : les lardons sont salés), puis versez sur les lardons.',
      'Ajoutez le fromage et enfournez 35 minutes, jusqu’à ce que la quiche soit dorée.',
    ],
  },
  {
    id: 'soupe-legumes',
    title: 'Soupe de légumes',
    minutes: 35,
    servings: 4,
    ingredients: [
      req('Pommes de terre', K.pdt),
      req('Carottes', K.carotte),
      opt('Poireau', K.poireau),
      opt('Oignon', K.oignon),
      opt('Courgette', K.courgette),
      opt('Crème', K.creme),
      staple('Sel, poivre, huile'),
    ],
    steps: [
      'Épluchez et coupez tous les légumes en morceaux.',
      'Faites suer l’oignon et le poireau 5 minutes dans un filet d’huile.',
      'Ajoutez le reste des légumes, couvrez d’eau à hauteur, salez et laissez cuire 25 minutes.',
      'Mixez, ajoutez une cuillère de crème si vous en avez, rectifiez l’assaisonnement.',
    ],
  },
  {
    id: 'ratatouille',
    title: 'Ratatouille express',
    minutes: 35,
    servings: 3,
    ingredients: [
      req('Courgettes', K.courgette),
      req('Tomates', K.tomate),
      req('Poivrons', K.poivron),
      opt('Aubergine', K.aubergine),
      opt('Oignon', K.oignon),
      staple('Huile d’olive, sel, poivre'),
    ],
    steps: [
      'Coupez tous les légumes en dés.',
      'Faites revenir l’oignon, puis les poivrons et l’aubergine dans l’huile d’olive pendant 10 minutes.',
      'Ajoutez les courgettes et les tomates, salez, poivrez et laissez mijoter 20 minutes à couvert.',
    ],
  },
  {
    id: 'croque-monsieur',
    title: 'Croque-monsieur',
    minutes: 15,
    servings: 2,
    ingredients: [
      req('Pain de mie ou pain', K.pain),
      req('Jambon', K.jambon),
      req('Fromage', K.fromage),
      opt('Beurre', K.beurre),
    ],
    steps: [
      'Préchauffez le four à 200 °C. Beurrez légèrement les tranches de pain.',
      'Garnissez de jambon et de fromage, puis refermez.',
      'Parsemez le dessus de fromage et enfournez 10 minutes, jusqu’à ce que le fromage soit gratiné.',
    ],
  },
  {
    id: 'riz-saute-oeufs',
    title: 'Riz sauté aux œufs',
    minutes: 20,
    servings: 2,
    ingredients: [
      req('Riz cuit (idéalement de la veille)', K.riz),
      req('Œufs (2)', K.oeuf),
      opt('Jambon', K.jambon),
      opt('Carottes', K.carotte),
      opt('Oignon', K.oignon),
      staple('Huile, sauce soja si vous en avez'),
    ],
    steps: [
      'Faites revenir l’oignon, les carottes en petits dés et le jambon 5 minutes dans un peu d’huile.',
      'Poussez les légumes sur le côté, versez les œufs battus et brouillez-les.',
      'Ajoutez le riz et faites sauter à feu vif 5 minutes en remuant, avec un trait de sauce soja.',
    ],
  },
  {
    id: 'pates-tomate',
    title: 'Pâtes à la tomate',
    minutes: 20,
    servings: 2,
    ingredients: [
      req('Pâtes (200 g)', K.pates),
      req('Tomates, coulis ou sauce tomate', K.tomate),
      opt('Mozzarella', ['mozzarella']),
      opt('Oignon', K.oignon),
      opt('Ail', K.ail),
      staple('Huile d’olive, sel, poivre'),
    ],
    steps: [
      'Faites revenir l’oignon et l’ail dans l’huile d’olive, puis ajoutez les tomates et laissez mijoter 10 minutes.',
      'Pendant ce temps, faites cuire les pâtes dans l’eau salée et égouttez-les.',
      'Mélangez pâtes et sauce, ajoutez la mozzarella en morceaux et servez.',
    ],
  },
  {
    id: 'poulet-creme',
    title: 'Poulet à la crème',
    minutes: 30,
    servings: 3,
    ingredients: [
      req('Poulet', K.poulet),
      req('Crème', K.creme),
      opt('Champignons', K.champignon),
      opt('Oignon', K.oignon),
      opt('Moutarde', ['moutarde']),
      staple('Huile, sel, poivre'),
    ],
    steps: [
      'Coupez le poulet en morceaux et faites-le dorer dans une poêle huilée, puis réservez.',
      'Faites revenir l’oignon et les champignons 5 minutes.',
      'Remettez le poulet, ajoutez la crème et une cuillère de moutarde, salez, poivrez et laissez mijoter 10 minutes.',
    ],
  },
  {
    id: 'gratin-pates-jambon',
    title: 'Gratin de pâtes au jambon',
    minutes: 35,
    servings: 3,
    ingredients: [
      req('Pâtes (250 g)', K.pates),
      req('Jambon', K.jambon),
      req('Fromage râpé', K.fromage),
      opt('Crème', K.creme),
      opt('Lait', K.lait),
    ],
    steps: [
      'Préchauffez le four à 200 °C. Faites cuire les pâtes 2 minutes de moins que le temps indiqué.',
      'Mélangez pâtes, jambon en dés et crème (ou un peu de lait) dans un plat.',
      'Recouvrez de fromage et gratinez environ 15 minutes.',
    ],
  },
  {
    id: 'salade-composee',
    title: 'Salade composée',
    minutes: 10,
    servings: 2,
    ingredients: [
      req('Salade', K.salade),
      req('Tomates', K.tomate),
      opt('Œuf dur', K.oeuf),
      opt('Thon', ['thon']),
      opt('Maïs', ['mais']),
      opt('Fromage', K.fromage),
      opt('Concombre', ['concombre']),
      opt('Poulet', K.poulet),
      staple('Huile, vinaigre, sel, poivre'),
    ],
    steps: [
      'Lavez et essorez la salade, coupez les tomates en quartiers.',
      'Ajoutez les garnitures que vous avez (œuf dur, thon, maïs, fromage…).',
      'Assaisonnez au dernier moment avec huile, vinaigre, sel et poivre.',
    ],
  },
  {
    id: 'pdt-lardons',
    title: 'Pommes de terre sautées aux lardons',
    minutes: 30,
    servings: 2,
    ingredients: [
      req('Pommes de terre', K.pdt),
      req('Lardons', K.lardons),
      opt('Oignon', K.oignon),
      opt('Œuf au plat', K.oeuf),
      staple('Huile, poivre'),
    ],
    steps: [
      'Coupez les pommes de terre en dés et faites-les cuire 10 minutes à l’eau bouillante, puis égouttez-les.',
      'Faites dorer les lardons et l’oignon dans une grande poêle.',
      'Ajoutez les pommes de terre et faites-les sauter 10 minutes jusqu’à ce qu’elles soient dorées. Servez avec un œuf au plat si vous le souhaitez.',
    ],
  },
  {
    id: 'crepes',
    title: 'Crêpes',
    minutes: 30,
    servings: 4,
    ingredients: [
      req('Œufs (3)', K.oeuf),
      req('Lait (50 cl)', K.lait),
      opt('Beurre', K.beurre),
      staple('Farine (250 g), sucre, une pincée de sel'),
    ],
    steps: [
      'Mélangez la farine, une pincée de sel et du sucre, puis incorporez les œufs.',
      'Versez le lait peu à peu en fouettant pour éviter les grumeaux, ajoutez un peu de beurre fondu.',
      'Laissez reposer 30 minutes si possible.',
      'Faites cuire les crêpes dans une poêle chaude légèrement huilée, 1 minute par face.',
    ],
  },
  {
    id: 'tartiflette',
    title: 'Tartiflette',
    minutes: 60,
    servings: 4,
    ingredients: [
      req('Pommes de terre (1 kg)', K.pdt),
      req('Reblochon', ['reblochon']),
      req('Lardons', K.lardons),
      opt('Oignon', K.oignon),
      opt('Crème', K.creme),
    ],
    steps: [
      'Préchauffez le four à 200 °C. Faites cuire les pommes de terre en rondelles 15 minutes à l’eau bouillante.',
      'Faites revenir les lardons et l’oignon émincé.',
      'Mélangez avec les pommes de terre (et un peu de crème) dans un plat, puis posez le reblochon coupé en deux sur le dessus.',
      'Enfournez 20 minutes, jusqu’à ce que le fromage soit fondu et doré.',
    ],
  },
  {
    id: 'poisson-papillote',
    title: 'Poisson en papillote',
    minutes: 30,
    servings: 2,
    ingredients: [
      req('Poisson', K.poisson),
      opt('Citron', ['citron']),
      opt('Courgette', K.courgette),
      opt('Carottes', K.carotte),
      staple('Huile, sel, poivre'),
    ],
    steps: [
      'Préchauffez le four à 180 °C. Coupez les légumes en fines lamelles.',
      'Déposez légumes et poisson sur une feuille de papier cuisson, avec un filet d’huile, du citron, du sel et du poivre.',
      'Fermez hermétiquement la papillote et enfournez 20 minutes.',
    ],
  },
  {
    id: 'pates-bolognaise',
    title: 'Pâtes bolognaise express',
    minutes: 30,
    servings: 3,
    ingredients: [
      req('Viande hachée', K.viandeHachee),
      req('Pâtes (300 g)', K.pates),
      req('Tomates, coulis ou sauce tomate', K.tomate),
      opt('Oignon', K.oignon),
      opt('Carottes', K.carotte),
      staple('Huile, sel, poivre'),
    ],
    steps: [
      'Faites revenir l’oignon et la carotte en petits dés, puis ajoutez la viande hachée et faites-la dorer.',
      'Versez les tomates, salez, poivrez et laissez mijoter 15 minutes.',
      'Faites cuire les pâtes, égouttez-les et servez avec la sauce.',
    ],
  },
  {
    id: 'gratin-chou-fleur',
    title: 'Gratin de chou-fleur',
    minutes: 50,
    servings: 4,
    ingredients: [
      req('Chou-fleur', K.chouFleur),
      req('Fromage râpé', K.fromage),
      opt('Crème', K.creme),
      opt('Lait', K.lait),
      opt('Jambon', K.jambon),
    ],
    steps: [
      'Préchauffez le four à 200 °C. Détaillez le chou-fleur en bouquets et faites-les cuire 10 minutes à l’eau bouillante.',
      'Disposez-les dans un plat avec le jambon en dés, nappez de crème ou de lait, puis recouvrez de fromage.',
      'Enfournez 25 à 30 minutes, jusqu’à ce que le gratin soit bien doré.',
    ],
  },
];

function urgencyWeight(days: number): number {
  if (days <= 1) return 3;
  if (days <= 3) return 2;
  if (days <= 7) return 1;
  return 0;
}

/**
 * Propose des recettes à partir des articles en stock.
 * Les produits périmés sont ignorés ; ceux qui expirent bientôt font remonter les recettes qui les utilisent.
 */
export function suggestRecipes(allItems: FoodItem[], limit = 12): RecipeSuggestion[] {
  const items = allItems
    .filter((i) => daysUntil(i.expiryDate) >= 0)
    .map((item) => ({ item, text: normalize(item.name) }));

  const suggestions: RecipeSuggestion[] = [];

  for (const recipe of RECIPES) {
    const lines: RecipeLine[] = [];
    const used = new Map<string, FoodItem>();
    let requiredCount = 0;
    let requiredHave = 0;
    let optionalHave = 0;

    for (const ing of recipe.ingredients) {
      if (ing.staple) {
        lines.push({ label: ing.label, status: 'staple' });
        continue;
      }
      if (!ing.optional) requiredCount++;

      const best = items
        .filter(({ text }) => ing.keywords.some((k) => hasKeyword(text, k)))
        .sort((a, b) => daysUntil(a.item.expiryDate) - daysUntil(b.item.expiryDate))[0]?.item;

      if (best) {
        used.set(best.id, best);
        if (ing.optional) optionalHave++;
        else requiredHave++;
        lines.push({
          label: ing.label,
          status: ing.optional ? 'optional-have' : 'have',
          itemName: best.name,
        });
      } else {
        lines.push({ label: ing.label, status: ing.optional ? 'optional-missing' : 'missing' });
      }
    }

    if (requiredHave === 0 || requiredCount === 0) continue;
    const coverage = requiredHave / requiredCount;
    if (!(coverage === 1 || (requiredHave >= 2 && coverage >= 0.6))) continue;

    let urgency = 0;
    const urgentItems: string[] = [];
    for (const item of used.values()) {
      const days = daysUntil(item.expiryDate);
      urgency += urgencyWeight(days);
      if (days <= 3) urgentItems.push(item.name);
    }

    suggestions.push({
      recipe,
      lines,
      missing: lines.filter((l) => l.status === 'missing').map((l) => l.label),
      coverage,
      urgentItems,
      score: coverage * 10 + urgency + optionalHave * 0.5,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}
