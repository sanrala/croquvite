import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const theme = useTheme();

  const background =
    variant === 'primary' ? theme.primary : variant === 'danger' ? 'transparent' : theme.card;
  const color =
    variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.danger : theme.text;
  const borderColor = variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.border;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '600' },
});
