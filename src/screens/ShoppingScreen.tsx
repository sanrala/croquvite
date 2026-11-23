import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { makeId } from '../id';
import { useTheme } from '../theme';
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
            placeholder="Ajouter un produit…"
            placeholderTextColor={theme.muted}
            returnKeyType="done"
          />
          <Button title="Ajouter" onPress={add} />
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.muted }]}>
          Votre liste est vide. Ajoutez des produits ici, ou depuis une recette avec « Ajouter les manquants ».
        </Text>
      }
      ListFooterComponent={
        doneCount > 0 ? (
          <Button title={`Retirer les produits cochés (${doneCount})`} variant="secondary" onPress={clearDone} />
        ) : null
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={() => toggle(item.id)} style={styles.rowMain}>
            <Text style={{ fontSize: 20, color: item.done ? theme.ok : theme.muted }}>{item.done ? '☑' : '☐'}</Text>
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
            <Text style={{ color: theme.muted, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10, paddingBottom: 48 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 15, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  remove: { paddingHorizontal: 16, paddingVertical: 14 },
});
