import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Viseur du scanner : quatre coins plutôt qu'un cadre fermé, pour garder l'image lisible. */
export function ScanFrame({ width, height }: { width: number; height: number }) {
  const corner = { position: 'absolute' as const, width: 34, height: 34, borderColor: '#FFFFFF' };
  return (
    <View style={{ width, height }}>
      <View style={[corner, styles.tl]} />
      <View style={[corner, styles.tr]} />
      <View style={[corner, styles.bl]} />
      <View style={[corner, styles.br]} />
      <View style={styles.line} />
    </View>
  );
}

const W = 4;
const R = 14;
const styles = StyleSheet.create({
  tl: { top: 0, left: 0, borderTopWidth: W, borderLeftWidth: W, borderTopLeftRadius: R },
  tr: { top: 0, right: 0, borderTopWidth: W, borderRightWidth: W, borderTopRightRadius: R },
  bl: { bottom: 0, left: 0, borderBottomWidth: W, borderLeftWidth: W, borderBottomLeftRadius: R },
  br: { bottom: 0, right: 0, borderBottomWidth: W, borderRightWidth: W, borderBottomRightRadius: R },
  line: { position: 'absolute', left: 14, right: 14, top: '50%', height: 2, backgroundColor: 'rgba(82, 211, 175, 0.9)' },
});
