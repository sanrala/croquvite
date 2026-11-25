import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { makeId } from '../id';
import { fonts, radius, useTheme } from '../theme';
import { ShoppingItem } from '../types';

interface Props {
  items: ShoppingItem[];
  onChange: (items: ShoppingItem[]) => void;
}

export function ShoppingScreen({ items, onChange }: Props) {
  const theme = useTheme();
  const [text, setText] = useState('');

  const add = () => {
    const name = text.trim();
    if (!name) return;
    onChange([{ id: makeId(), name, done: false, createdAt: Date.now() }, ...items]);
    setText('');
  };

  const toggle = (id: string) => onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const clearDone = () => onChange(items.filter((i) => !i.done));

  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));
  const doneCount = items.filter((i) => i.done).length;

  return (
    <FlatList
      data={sorted}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            placeholder="Ajouter un produit"
            placeholderTextColor={theme.muted}
            returnKeyType="done"
          />
          <Button title="Ajouter" onPress={add} style={styles.addBtn} />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ fontSize: 44 }}>🛒</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Votre liste est vide. Ajoutez un produit ci-dessus, ou depuis une recette avec « Ajouter les manquants ».
          </Text>
        </View>
      }
      ListFooterComponent={
        doneCount > 0 ? (
          <Button
            title={`Retirer les produits cochés (${doneCount})`}
            variant="secondary"
            onPress={clearDone}
            style={{ marginTop: 16 }}
          />
        ) : null
      }
      renderItem={({ item, index }) => {
        const first = index === 0;
        const last = index === sorted.length - 1;
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
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done }}
              style={styles.rowMain}
            >
              <View
                style={[
                  styles.box,
                  item.done
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { borderColor: theme.muted },
                ]}
              >
                {item.done ? <Text style={{ color: theme.onPrimary, fontSize: 14, fontWeight: '800' }}>✓</Text> : null}
              </View>
              <Text
                style={{
                  color: item.done ? theme.muted : theme.text,
                  textDecorationLine: item.done ? 'line-through' : 'none',
                  fontSize: 16,
                  flex: 1,
                }}
              >
                {item.name}
              </Text>
            </Pressable>
            <Pressable accessibilityLabel={`Supprimer ${item.name}`} onPress={() => remove(item.id)} style={styles.remove}>
              <Text style={{ color: theme.muted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  addBtn: { paddingHorizontal: 22 },
  empty: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 24 },
  emptyText: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowFirst: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  rowLast: { borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingLeft: 18 },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  remove: { paddingHorizontal: 18, paddingVertical: 16 },
});
