import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { fonts, radius, useTheme } from '../theme';
import { Text } from './Text';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, style }: Props) {
  const theme = useTheme();

  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary, pressed: theme.primary },
    secondary: { bg: theme.fill, fg: theme.text, pressed: theme.border },
    danger: { bg: theme.dangerSoft, fg: theme.danger, pressed: theme.dangerSoft },
    ghost: { bg: 'transparent', fg: theme.primary, pressed: theme.primarySoft },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? palette.pressed : palette.bg,
          opacity: disabled ? 0.45 : pressed && variant === 'primary' ? 0.88 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.fg, fontFamily: fonts.display }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
});
