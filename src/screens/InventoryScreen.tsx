import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { daysUntil, formatFR, urgencyOf } from '../dates';
import { radius, urgencyColor, urgencySoft, useTheme } from '../theme';
import { CATEGORY_EMOJI, CATEGORY_LABEL, FoodItem } from '../types';

interface Props {
  items: FoodItem[];
  emptyText: string;
  onEdit: (item: FoodItem) => void;
  /** Retire une unité (ou le produit s'il n'en reste qu'une). */
  onUse: (item: FoodItem) => void;
}

type Row =
  | { type: 'header'; key: string; title: string; count: number }
  | { type: 'item'; key: string; item: FoodItem; first: boolean; last: boolean };

/** Grand chiffre du compte à rebours et son unité. */
function countdown(iso: string): { value: string; unit: string } {
  const n = daysUntil(iso);
  if (n < 0) return { value: String(-n), unit: -n === 1 ? 'jour' : 'jours' };
  if (n === 0) return { value: '0', unit: 'aujourd’hui' };
  return { value: String(n), unit: n === 1 ? 'jour' : 'jours' };
}

export function InventoryScreen({ items, emptyText, onEdit, onUse }: Props) {
  const theme = useTheme();

  const { rows, attention } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const soon = sorted.filter((i) => urgencyOf(i.expiryDate) !== 'ok');
    const later = sorted.filter((i) => urgencyOf(i.expiryDate) === 'ok');
    const out: Row[] = [];
    const push = (key: string, title: string, list: FoodItem[]) => {
      if (list.length === 0) return;
      out.push({ type: 'header', key: `h-${key}`, title, count: list.length });
      list.forEach((item, idx) =>
        out.push({ type: 'item', key: item.id, item, first: idx === 0, last: idx === list.length - 1 }),
      );
    };
    push('soon', 'À consommer vite', soon);
    push('later', soon.length > 0 ? 'Plus tard' : 'Tout est frais', later);
    return { rows: out, attention: soon.length };
  }, [items]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.key}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        items.length > 0 ? (
          <View style={styles.summary}>
            <Text display style={[styles.summaryBig, { color: attention > 0 ? theme.warn : theme.ok }]}>
              {attention > 0 ? attention : items.length}
            </Text>
            <View style={{ flex: 1 }}>
              <Text display style={[styles.summaryTitle, { color: theme.text }]}>
                {attention > 0
                  ? attention > 1
                    ? 'produits à consommer vite'
                    : 'produit à consommer vite'
                  : items.length > 1
                    ? 'produits, tous frais'
                    : 'produit, bien frais'}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 14 }}>
                {items.length} produit{items.length > 1 ? 's' : ''} au total
              </Text>
            </View>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ fontSize: 44 }}>🧺</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>{emptyText}</Text>
        </View>
      }
      renderItem={({ item: row }) => {
        if (row.type === 'header') {
          return (
            <View style={styles.sectionHeader}>
              <Text display style={[styles.sectionTitle, { color: theme.text }]}>
                {row.title}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 14 }}>{row.count}</Text>
            </View>
          );
        }

        const { item, first, last } = row;
        const urgency = urgencyOf(item.expiryDate);
        const color = urgencyColor(theme, urgency);
        const n = daysUntil(item.expiryDate);
        const meter = Math.max(0.06, Math.min(1, n / 14));
        const cd = countdown(item.expiryDate);
        const emoji = CATEGORY_EMOJI[item.category ?? 'autre'];

        return (
          <View
            style={[
              styles.row,
              { backgroundColor: theme.card, borderBottomColor: theme.border },
              first && styles.rowFirst,
              last ? styles.rowLast : styles.rowDivider,
            ]}
          >
            <Pressable
              onPress={() => onEdit(item)}
              accessibilityLabel={`Modifier ${item.name}`}
              style={styles.main}
            >
              {item.imageUrl ? (
                <View style={[styles.thumb, { backgroundColor: '#FFFFFF', borderColor: theme.border, borderWidth: 1 }]}>
                  <Image source={{ uri: item.imageUrl }} style={styles.thumbImg} resizeMode="contain" />
                </View>
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.fill }]}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>
                  {item.brand ? `${item.brand}, ` : ''}
                  {item.category ? CATEGORY_LABEL[item.category] : 'Produit'}
                  {item.quantity > 1 ? `, ×${item.quantity}` : ''}
                </Text>
                <View style={[styles.track, { backgroundColor: theme.fill }]}>
                  <View style={[styles.fill, { backgroundColor: color, width: `${Math.round(meter * 100)}%` }]} />
                </View>
                <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
                  {n < 0 ? 'Périmé le ' : 'Avant le '}
                  {formatFR(item.expiryDate)}
                </Text>
                {item.reminderDate ? (
                  <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
                    🔔 Rappel le {formatFR(item.reminderDate)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.count}>
                <Text display style={[styles.countValue, { color }]}>
                  {n < 0 ? `−${cd.value}` : cd.value}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                  {cd.unit}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel={`Retirer ${item.name}`}
              onPress={() => onUse(item)}
              style={({ pressed }) => [
                styles.use,
                { backgroundColor: pressed ? theme.primary : urgencySoft(theme, 'ok') },
              ]}
            >
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>Utilisé</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 190 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 4, paddingBottom: 8 },
  summaryBig: { fontSize: 56, fontWeight: '800', lineHeight: 60, minWidth: 44, textAlign: 'center' },
  summaryTitle: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 8, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 12, marginTop: 56, paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  row: { paddingTop: 14, paddingBottom: 10, paddingHorizontal: 14 },
  rowFirst: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  rowLast: { borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, paddingBottom: 14 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 48, height: 48 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 3, marginBottom: 1 },
  fill: { height: 4, borderRadius: 2 },
  count: { width: 72, alignItems: 'center' },
  countValue: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  use: { alignSelf: 'flex-end', marginTop: -6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
});
