import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/Text';
import { Button } from '../components/Button';
import { ScanFrame } from '../components/ScanFrame';
import { useTheme } from '../theme';

/**
 * Version navigateur du scanner. La caméra d'Expo ne lit que les QR codes sur le web,
 * donc on utilise ZXing pour les codes-barres de produits (EAN-13, EAN-8, UPC-A, UPC-E).
 * Une saisie manuelle du code est proposée : les webcams de PC lisent parfois mal les codes-barres.
 */

interface Props {
  onScanned: (barcode: string) => void;
  onManual: () => void;
  onClose: () => void;
}

export function ScannerScreen({ onScanned, onManual, onClose }: Props) {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const handled = useRef(false);
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;

  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let controls: IScannerControls | undefined;

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        video,
        (result) => {
          if (result && !handled.current) {
            handled.current = true;
            onScannedRef.current(result.getText());
          }
        },
      )
      .then((c) => {
        if (cancelled) c.stop();
        else controls = c;
      })
      .catch(() => {
        if (!cancelled) {
          setError('Caméra inaccessible. Autorisez-la dans le navigateur, ou saisissez le code-barres ci-dessous.');
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  const submitCode = () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Saisissez les 8 à 13 chiffres imprimés sous le code-barres.');
      return;
    }
    if (handled.current) return;
    handled.current = true;
    onScanned(digits);
  };

  return (
    <View style={styles.full}>
      {React.createElement('video', {
        ref: videoRef,
        muted: true,
        playsInline: true,
        autoPlay: true,
        style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
      })}

      <View style={styles.overlay} pointerEvents="none">
        <ScanFrame width={320} height={180} />
        <Text style={styles.hint}>Approchez le code-barres (15 à 20 cm), bien éclairé et net</Text>
      </View>

      <View style={[styles.panel, { backgroundColor: theme.bg }]}>
        {error ? <Text style={{ color: theme.warn }}>{error}</Text> : null}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(null);
            }}
            onSubmitEditing={submitCode}
            placeholder="Code-barres (chiffres)"
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            returnKeyType="done"
          />
          <Button title="Valider" onPress={submitCode} />
        </View>
        <View style={styles.row}>
          <Button title="Ajouter à la main" variant="secondary" onPress={onManual} style={{ flex: 1 }} />
          <Button title="Fermer" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hint: { color: '#FFFFFF', marginTop: 20, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)', overflow: 'hidden' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, gap: 12, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  input: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, minHeight: 52 },
});
