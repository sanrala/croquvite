import { useColorScheme } from 'react-native';
import { Urgency } from './dates';

export interface Theme {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  warn: string;
  ok: string;
}

const light: Theme = {
  bg: '#FFFCF5',
  card: '#FFFFFF',
  text: '#2A2118',
  muted: '#7A6F63',
  border: '#EFE6D6',
  primary: '#2E7D4F',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  warn: '#E07B00',
  ok: '#1F7A5C',
};

const dark: Theme = {
  bg: '#0F1418',
  card: '#1A2228',
  text: '#EAF0F4',
  muted: '#93A3B0',
  border: '#2A343C',
  primary: '#3DBE92',
  onPrimary: '#06251B',
  danger: '#EF6B6B',
  warn: '#F5A524',
  ok: '#3DBE92',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function urgencyColor(theme: Theme, urgency: Urgency): string {
  if (urgency === 'expired') return theme.danger;
  if (urgency === 'soon') return theme.warn;
  return theme.ok;
}
