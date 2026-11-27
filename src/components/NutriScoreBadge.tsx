import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import type { NutriScore } from '../openFoodFacts';

/** Couleurs officielles du Nutri-Score. */
const COLORS: Record<NutriScore, string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63E11',
};

interface Props {
  grade: NutriScore;
  /** Version courte (juste la lettre), pour les listes. */
  compact?: boolean;
}

export function NutriScoreBadge({ grade, compact = false }: Props) {
  const textColor = grade === 'C' ? '#1A1A1A' : '#FFFFFF'; // texte foncé sur le jaune pour rester lisible
  return (
    <View
      style={[styles.badge, compact && styles.compact, { backgroundColor: COLORS[grade] }]}
      accessibilityLabel={`Nutri-Score ${grade}`}
    >
      <Text style={[styles.text, { color: textColor }, compact && styles.compactText]}>
        {compact ? grade : `Nutri-Score ${grade}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  compact: { paddingHorizontal: 7, paddingVertical: 1 },
  text: { fontSize: 12, fontWeight: '800' },
  compactText: { fontSize: 11 },
});