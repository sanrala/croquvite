import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { useTheme } from '../theme';

interface Props {
  onScanned: (barcode: string) => void;
  onManual: () => void;
  onClose: () => void;
}

export function ScannerScreen({ onScanned, onManual, onClose }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);

  if (!permission) {
    return <View style={[styles.center, { backgroundColor: theme.bg }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[styles.message, { color: theme.text }]}>
          L’accès à la caméra est nécessaire pour scanner les codes-barres.
        </Text>
        <Button title="Autoriser la caméra" onPress={() => void requestPermission()} style={styles.wide} />
        <Button title="Saisir à la main" variant="secondary" onPress={onManual} style={styles.wide} />
        <Button title="Annuler" variant="secondary" onPress={onClose} style={styles.wide} />
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          handled.current = true;
          onScanned(data);
        }}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Placez le code-barres dans le cadre</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
          variant="secondary"
          onPress={() => setTorch((t) => !t)}
        />
        <Button title="Saisir à la main" variant="secondary" onPress={onManual} />
        <Button title="Fermer" variant="secondary" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  wide: { alignSelf: 'stretch' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280,
    height: 160,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  hint: { color: '#FFFFFF', marginTop: 16, fontSize: 15, fontWeight: '500' },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 32, gap: 10 },
});
