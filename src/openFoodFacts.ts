export type NutriScore = 'A' | 'B' | 'C' | 'D' | 'E';

export interface ProductInfo {
  name: string;
  brand?: string;
  imageUrl?: string;
  categoryTags: string[];
  /** Nutri-Score (A à E), absent si le produit n'est pas noté (eau, sel…) ou inconnu. */
  nutriscore?: NutriScore;
}

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_fr?: string;
    generic_name_fr?: string;
    brands?: string;
    image_front_small_url?: string;
    categories_tags?: string[];
    food_groups_tags?: string[];
    nutriscore_grade?: string;
  };
}

/** Tags parents trop génériques qui faussent le classement (ex. des pâtes classées en boissons). */
const TAGS_TROMPEURS = new Set([
  'en:plant-based-foods-and-beverages',
  'en:plant-based-foods',
  'en:groceries',
]);

/** Groupes alimentaires d'abord (fiables), puis catégories du plus précis au plus général. */
function ordonnerTags(p: NonNullable<OffResponse['product']>): string[] {
  const tags = [...(p.food_groups_tags ?? []), ...[...(p.categories_tags ?? [])].reverse()];
  return [...new Set(tags)].filter((t) => !TAGS_TROMPEURS.has(t));
}

function lireNutriScore(grade?: string): NutriScore | undefined {
  const g = grade?.toUpperCase();
  return g === 'A' || g === 'B' || g === 'C' || g === 'D' || g === 'E' ? g : undefined;
}

/**
 * Identifie un produit à partir de son code-barres via Open Food Facts
 * (base ouverte, gratuite, sans clé API). Retourne null si inconnu ou hors ligne.
 */
export async function lookupBarcode(code: string): Promise<ProductInfo | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
    '?fields=product_name,product_name_fr,generic_name_fr,brands,image_front_small_url,' +
    'categories_tags,food_groups_tags,nutriscore_grade';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CroquVite/1.0 (application personnelle)' },
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const json = (await res.json()) as OffResponse;
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const name = (p.product_name_fr || p.product_name || p.generic_name_fr || '').trim();
    if (!name) return null;

    const brand = p.brands?.split(',')[0]?.trim();
    return {
      name,
      brand: brand || undefined,
      imageUrl: p.image_front_small_url || undefined,
      categoryTags: ordonnerTags(p),
      nutriscore: lireNutriScore(p.nutriscore_grade),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}