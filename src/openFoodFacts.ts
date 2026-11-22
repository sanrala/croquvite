export interface ProductInfo {
  name: string;
  brand?: string;
  imageUrl?: string;
  categoryTags: string[];
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
  };
}

/**
 * Identifie un produit à partir de son code-barres via Open Food Facts
 * (base ouverte, gratuite, sans clé API). Retourne null si inconnu ou hors ligne.
 */
export async function lookupBarcode(code: string): Promise<ProductInfo | null> {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
    '?fields=product_name,product_name_fr,generic_name_fr,brands,image_front_small_url,categories_tags';

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
      categoryTags: p.categories_tags ?? [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
