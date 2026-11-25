import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { ScanFrame } from '../components/ScanFrame';
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
        <ScanFrame width={280} height={160} />
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
  hint: { color: '#FFFFFF', marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)', overflow: 'hidden' },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 32, gap: 10 },
});
