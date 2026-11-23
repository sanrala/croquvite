/** Traduit les erreurs Firestore en messages clairs (logique pure, sans dépendance). */

export interface SyncProblem {
  /** network = probablement passager (on réessaie vite) ; config = à corriger dans Firebase ; other = autre. */
  kind: 'network' | 'config' | 'other';
  message: string;
  code: string;
}

export function describeSyncError(error: unknown): SyncProblem {
  const raw = (error as { code?: string } | null)?.code ?? '';
  const code = raw.replace(/^firestore\//, '');

  switch (code) {
    case 'permission-denied':
      return {
        kind: 'config',
        code,
        message:
          'Accès refusé par Firestore : publiez les règles du fichier firestore.rules (Firebase > Firestore Database > Règles > Publier).',
      };
    case 'not-found':
      return {
        kind: 'config',
        code,
        message: 'Base Firestore introuvable : créez-la dans Firebase > Firestore Database > Créer une base de données.',
      };
    case 'unauthenticated':
      return { kind: 'config', code, message: 'Session expirée : déconnectez-vous puis reconnectez-vous.' };
    case 'unavailable':
    case 'deadline-exceeded':
    case 'cancelled':
      return {
        kind: 'network',
        code,
        message:
          'Impossible de joindre Firestore. Vérifiez votre connexion ; un bloqueur de publicités, un VPN ou un filtre réseau peut aussi bloquer firestore.googleapis.com.',
      };
    case 'resource-exhausted':
      return { kind: 'other', code, message: 'Quota gratuit Firebase dépassé pour aujourd’hui. La synchronisation reprendra plus tard.' };
    case 'failed-precondition':
      return { kind: 'other', code, message: 'Le stockage du navigateur est indisponible (navigation privée ?). Essayez hors navigation privée.' };
    default:
      return { kind: 'other', code, message: `Erreur de synchronisation${code ? ` (${code})` : ''}.` };
  }
}
