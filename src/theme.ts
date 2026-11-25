import { Platform, useColorScheme } from 'react-native';
import { Urgency } from './dates';

/**
 * Identité visuelle : un frigo bien rangé. Fond givré légèrement bleuté, vert épicéa profond pour l'action,
 * et trois couleurs de fraîcheur (vert, ambre, tomate) réservées à l'information « à consommer avant… ».
 */
export interface Theme {
  bg: string;
  card: string;
  /** Fond des champs et des boutons secondaires. */
  fill: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  ok: string;
  okSoft: string;
  /** Ombre portée du bandeau d'actions (iOS/web). */
  shadow: string;
  isDark: boolean;
}

const light: Theme = {
  bg: '#EFF4F2',
  card: '#FFFFFF',
  fill: '#E4ECE9',
  text: '#10272B',
  muted: '#566C6F',
  border: '#D6E0DD',
  primary: '#0B5D4B',
  onPrimary: '#FFFFFF',
  primarySoft: '#D9EFE7',
  danger: '#BF3A22',
  dangerSoft: '#FBE4DE',
  warn: '#B45309',
  warnSoft: '#FCEBD0',
  ok: '#12795B',
  okSoft: '#D9EFE7',
  shadow: 'rgba(16, 39, 43, 0.16)',
  isDark: false,
};

const dark: Theme = {
  bg: '#0A1619',
  card: '#122328',
  fill: '#1B3036',
  text: '#E8F1EF',
  muted: '#8FA7A8',
  border: '#223A40',
  primary: '#52D3AF',
  onPrimary: '#032A20',
  primarySoft: '#143B34',
  danger: '#FF8068',
  dangerSoft: '#3B1D17',
  warn: '#F5AB40',
  warnSoft: '#3A2A10',
  ok: '#52D3AF',
  okSoft: '#143B34',
  shadow: 'rgba(0, 0, 0, 0.5)',
  isDark: true,
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function urgencyColor(theme: Theme, urgency: Urgency): string {
  if (urgency === 'expired') return theme.danger;
  if (urgency === 'soon') return theme.warn;
  return theme.ok;
}

export function urgencySoft(theme: Theme, urgency: Urgency): string {
  if (urgency === 'expired') return theme.dangerSoft;
  if (urgency === 'soon') return theme.warnSoft;
  return theme.okSoft;
}

// --- Typographie ---------------------------------------------------------------------------
// Sur le web : Bricolage Grotesque (titres, chiffres) et Instrument Sans (texte), chargées depuis Google Fonts.
// Sur mobile : police du système (même mise en page, pas de téléchargement).
const WEB_DISPLAY = "'Bricolage Grotesque', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
const WEB_BODY = "'Instrument Sans', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";

export const fonts = {
  display: Platform.OS === 'web' ? WEB_DISPLAY : undefined,
  body: Platform.OS === 'web' ? WEB_BODY : undefined,
};

/** Rayons : les grandes surfaces sont plus arrondies que les petits éléments, pour hiérarchiser. */
export const radius = { sheet: 24, control: 14, thumb: 14, pill: 999 };

/** Largeur maximale du contenu sur grand écran (ordinateur, tablette). */
export const MAX_WIDTH = 680;

function injectWebAssets() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('croquvite-fonts')) return;
  const link = document.createElement('link');
  link.id = 'croquvite-fonts';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Instrument+Sans:wght@400..700&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.textContent = `
    html, body { background: #EFF4F2; -webkit-font-smoothing: antialiased; }
    @media (prefers-color-scheme: dark) { html, body { background: #0A1619; } }
    input, button { font-family: ${WEB_BODY}; }
    input[type="date"] { color-scheme: light dark; }
    [tabindex]:focus-visible, input:focus-visible, button:focus-visible { outline: 3px solid #52D3AF; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  `;
  document.head.appendChild(style);
}
injectWebAssets();
