import React, { useMemo } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { expiryLabel, formatFR, urgencyOf } from '../dates';
import { urgencyColor, useTheme } from '../theme';
import { CATEGORY_EMOJI, CATEGORY_LABEL, FoodItem } from '../types';

interface Props {
  items: FoodItem[];
  emptyText: string;
  onEdit: (item: FoodItem) => void;
  /** Retire une unité (ou le produit s'il n'en reste qu'une). */
  onUse: (item: FoodItem) => void;
}

export function InventoryScreen({ items, emptyText, onEdit, onUse }: Props) {
  const theme = useTheme();

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
    [items],
  );
  const attention = sorted.filter((i) => urgencyOf(i.expiryDate) !== 'ok').length;

  return (
    <FlatList
      data={sorted}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        sorted.length > 0 ? (
          <Text style={[styles.summary, { color: theme.muted }]}>
            {sorted.length} produit{sorted.length > 1 ? 's' : ''}
            {attention > 0 ? ` · ${attention} à consommer vite ou périmé${attention > 1 ? 's' : ''}` : ''}
          </Text>
        ) : null
      }
      ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{emptyText}</Text>}
      renderItem={({ item }) => {
        const urgency = urgencyOf(item.expiryDate);
        const color = urgencyColor(theme, urgency);
        const emoji = CATEGORY_EMOJI[item.category ?? 'autre'];
        return (
          <Pressable
            onPress={() => onEdit(item)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.bar, { backgroundColor: color }]} />
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="contain" />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.bg }]}>
                <Text style={{ fontSize: 28 }}>{emoji}</Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12 }} numberOfLines={1}>
                {item.category ? `${CATEGORY_LABEL[item.category]} · ` : ''}
                {item.brand ? `${item.brand} · ` : ''}×{item.quantity}
              </Text>
              <Text style={{ color, fontWeight: '700' }}>
                {expiryLabel(item.expiryDate)}{' '}
                <Text style={{ color: theme.muted, fontWeight: '400', fontSize: 12 }}>({formatFR(item.expiryDate)})</Text>
              </Text>
              {item.reminderDate ? (
                <Text style={{ color: theme.muted, fontSize: 12 }}>🔔 Rappel le {formatFR(item.reminderDate)}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={`Retirer ${item.name}`}
              onPress={() => onUse(item)}
              style={[styles.use, { borderColor: theme.border }]}
            >
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Utilisé</Text>
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 140 },
  summary: { marginBottom: 4, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15, paddingHorizontal: 24 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  bar: { width: 6, alignSelf: 'stretch' },
  thumb: { width: 64, height: 64, borderRadius: 12, marginLeft: 10 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 12, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  use: { marginRight: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
