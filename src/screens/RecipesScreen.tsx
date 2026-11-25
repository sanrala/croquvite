import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../components/Text';
import { daysUntil } from '../dates';
import { RecipeLine, suggestRecipes } from '../recipes';
import { radius, useTheme } from '../theme';
import { FoodItem } from '../types';

interface Props {
  items: FoodItem[];
  onAddToShopping: (labels: string[]) => void;
}

const ICON: Record<RecipeLine['status'], string> = {
  have: '✓',
  missing: '✕',
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
  const readyCount = suggestions.filter((s) => s.missing.length === 0).length;

  const lineColor = (status: RecipeLine['status']): string => {
    if (status === 'have') return theme.ok;
    if (status === 'missing') return theme.danger;
    return theme.muted;
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {suggestions.length > 0 && (
        <View style={styles.intro}>
          <Text display style={[styles.introBig, { color: theme.primary }]}>
            {readyCount}
          </Text>
          <View style={{ flex: 1 }}>
            <Text display style={[styles.introTitle, { color: theme.text }]}>
              {readyCount > 1 ? 'recettes prêtes à cuisiner' : 'recette prête à cuisiner'}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 14 }}>
              {suggestions.length} idée{suggestions.length > 1 ? 's' : ''}, les produits à finir en premier
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.toggle, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.text, flex: 1, fontSize: 15 }}>Inclure les produits hors frigo</Text>
        <Switch
          value={withPantry}
          onValueChange={setWithPantry}
          trackColor={{ false: theme.fill, true: theme.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {expiredCount > 0 && (
        <Text style={{ color: theme.warn, fontSize: 14 }}>
          {expiredCount} produit{expiredCount > 1 ? 's' : ''} périmé{expiredCount > 1 ? 's' : ''} ignoré
          {expiredCount > 1 ? 's' : ''}.
        </Text>
      )}

      {suggestions.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ fontSize: 44 }}>🍳</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {pool.length === 0
              ? 'Ajoutez des produits à votre frigo pour obtenir des idées de recettes.'
              : 'Aucune recette ne correspond pour le moment. Ajoutez d’autres produits (œufs, pâtes, légumes, fromage…).'}
          </Text>
        </View>
      )}

      {suggestions.map((s) => {
        const open = openId === s.recipe.id;
        const ready = s.missing.length === 0;
        return (
          <View key={s.recipe.id} style={[styles.card, { backgroundColor: theme.card }]}>
            <Pressable
              onPress={() => setOpenId(open ? null : s.recipe.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              style={styles.head}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text display style={[styles.title, { color: theme.text }]}>
                  {s.recipe.title}
                </Text>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: theme.fill }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{s.recipe.minutes} min</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: theme.fill }]}>
                    <Text style={[styles.chipText, { color: theme.text }]}>{s.recipe.servings} pers.</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: ready ? theme.okSoft : theme.warnSoft }]}>
                    <Text style={[styles.chipText, { color: ready ? theme.ok : theme.warn }]}>
                      {ready ? 'Tout est là' : `Il manque ${s.missing.length}`}
                    </Text>
                  </View>
                </View>
                {!ready && (
                  <Text style={{ color: theme.muted, fontSize: 14 }}>À acheter : {s.missing.join(', ')}</Text>
                )}
                {s.urgentItems.length > 0 && (
                  <Text style={{ color: theme.warn, fontWeight: '600', fontSize: 14 }}>
                    À finir vite : {s.urgentItems.join(', ')}
                  </Text>
                )}
              </View>
              <Text style={{ color: theme.muted, fontSize: 18, paddingLeft: 8 }}>{open ? '⌃' : '⌄'}</Text>
            </Pressable>

            {open && (
              <View style={styles.detail}>
                {s.missing.length > 0 && (
                  <Pressable
                    onPress={() => onAddToShopping(s.missing)}
                    style={({ pressed }) => [styles.shopBtn, { backgroundColor: pressed ? theme.border : theme.primarySoft }]}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>Ajouter les manquants aux courses</Text>
                  </Pressable>
                )}

                <Text display style={[styles.section, { color: theme.text }]}>
                  Ingrédients
                </Text>
                {s.lines.map((l) => (
                  <View key={l.label} style={styles.line}>
                    <Text style={{ color: lineColor(l.status), width: 20, fontWeight: '800' }}>{ICON[l.status]}</Text>
                    <Text style={{ color: l.status === 'missing' ? theme.danger : theme.text, flex: 1, lineHeight: 21 }}>
                      {l.label}
                      {l.itemName ? ` (${l.itemName})` : ''}
                      {l.status === 'optional-have' || l.status === 'optional-missing' ? ', facultatif' : ''}
                      {l.status === 'staple' ? ', dans le placard' : ''}
                    </Text>
                  </View>
                ))}

                <Text display style={[styles.section, { color: theme.text }]}>
                  Préparation
                </Text>
                {s.recipe.steps.map((step, idx) => (
                  <View key={idx} style={styles.line}>
                    <View style={[styles.stepNo, { backgroundColor: theme.primarySoft }]}>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '800' }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ color: theme.text, flex: 1, lineHeight: 22 }}>{step}</Text>
                  </View>
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
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 48 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 4 },
  introBig: { fontSize: 56, fontWeight: '800', lineHeight: 60, minWidth: 44, textAlign: 'center' },
  introTitle: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  toggle: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, paddingHorizontal: 16, paddingVertical: 10 },
  empty: { alignItems: 'center', gap: 12, marginTop: 32, paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  card: { borderRadius: radius.sheet, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'flex-start', padding: 18 },
  title: { fontSize: 19, fontWeight: '700', lineHeight: 23 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '700' },
  detail: { paddingHorizontal: 18, paddingBottom: 20, gap: 8 },
  shopBtn: { borderRadius: radius.control, paddingVertical: 12, alignItems: 'center', marginBottom: 4 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNo: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
