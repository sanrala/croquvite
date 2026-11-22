import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { daysUntil } from '../dates';
import { RecipeLine, suggestRecipes } from '../recipes';
import { useTheme } from '../theme';
import { FoodItem } from '../types';

interface Props {
  items: FoodItem[];
  onAddToShopping: (labels: string[]) => void;
}

const ICON: Record<RecipeLine['status'], string> = {
  have: '✓',
  missing: '✗',
  'optional-have': '✓',
  'optional-missing': '–',
  staple: '•',
};

export function RecipesScreen({ items, onAddToShopping }: Props) {
  const theme = useTheme();
  const [withPantry, setWithPantry] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const pool = useMemo(
    () => items.filter((i) => withPantry || i.location === 'frigo'),
    [items, withPantry],
  );
  const suggestions = useMemo(() => suggestRecipes(pool), [pool]);
  const expiredCount = pool.filter((i) => daysUntil(i.expiryDate) < 0).length;

  const lineColor = (status: RecipeLine['status']): string => {
    if (status === 'have') return theme.ok;
    if (status === 'missing') return theme.danger;
    return theme.muted;
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.toggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, flex: 1 }}>Inclure les produits hors frigo</Text>
        <Switch value={withPantry} onValueChange={setWithPantry} />
      </View>

      {expiredCount > 0 && (
        <Text style={{ color: theme.warn }}>
          {expiredCount} produit{expiredCount > 1 ? 's' : ''} périmé{expiredCount > 1 ? 's' : ''} ignoré
          {expiredCount > 1 ? 's' : ''}.
        </Text>
      )}

      {suggestions.length === 0 && (
        <Text style={[styles.empty, { color: theme.muted }]}>
          {pool.length === 0
            ? 'Ajoutez des produits à votre frigo pour obtenir des idées de recettes.'
            : 'Aucune recette ne correspond pour le moment. Ajoutez d’autres produits (œufs, pâtes, légumes, fromage…).'}
        </Text>
      )}

      {suggestions.map((s) => {
        const open = openId === s.recipe.id;
        return (
          <View
            key={s.recipe.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Pressable onPress={() => setOpenId(open ? null : s.recipe.id)}>
              <Text style={[styles.title, { color: theme.text }]}>{s.recipe.title}</Text>
              <Text style={{ color: theme.muted }}>
                {s.recipe.minutes} min · {s.recipe.servings} pers.
                {s.missing.length === 0 ? ' · tout est là' : ` · il manque : ${s.missing.join(', ')}`}
              </Text>
              {s.urgentItems.length > 0 && (
                <Text style={{ color: theme.warn, fontWeight: '600', marginTop: 4 }}>
                  Utilise vite : {s.urgentItems.join(', ')}
                </Text>
              )}
              <Text style={{ color: theme.primary, marginTop: 6 }}>{open ? 'Masquer' : 'Voir la recette'}</Text>
            </Pressable>

            {s.missing.length > 0 && (
              <Pressable
                onPress={() => onAddToShopping(s.missing)}
                style={[styles.shopBtn, { borderColor: theme.primary }]}
              >
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Ajouter les manquants aux courses</Text>
              </Pressable>
            )}

            {open && (
              <View style={styles.detail}>
                <Text style={[styles.section, { color: theme.text }]}>Ingrédients</Text>
                {s.lines.map((l) => (
                  <Text key={l.label} style={{ color: lineColor(l.status) }}>
                    {ICON[l.status]} {l.label}
                    {l.itemName ? ` (${l.itemName})` : ''}
                    {l.status === 'optional-have' || l.status === 'optional-missing' ? ' — facultatif' : ''}
                    {l.status === 'staple' ? ' — placard' : ''}
                  </Text>
                ))}
                <Text style={[styles.section, { color: theme.text }]}>Préparation</Text>
                {s.recipe.steps.map((step, idx) => (
                  <Text key={idx} style={{ color: theme.text }}>
                    {idx + 1}. {step}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  toggle: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15, paddingHorizontal: 24 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 2 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  shopBtn: { marginTop: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  detail: { marginTop: 12, gap: 6 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 6, textTransform: 'uppercase' },
});
