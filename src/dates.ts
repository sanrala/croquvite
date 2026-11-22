export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Nombre de jours entre aujourd'hui et la date (négatif si dépassée). */
export function daysUntil(iso: string): number {
  const ms = parseISODate(iso).getTime() - startOfToday().getTime();
  return Math.round(ms / 86_400_000);
}

export function formatFR(iso: string): string {
  return parseISODate(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function expiryLabel(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return `Périmé depuis ${-n} j`;
  if (n === 0) return "Expire aujourd'hui";
  if (n === 1) return 'Expire demain';
  return `Dans ${n} jours`;
}

export type Urgency = 'expired' | 'soon' | 'ok';

export function urgencyOf(iso: string): Urgency {
  const n = daysUntil(iso);
  if (n < 0) return 'expired';
  if (n <= 3) return 'soon';
  return 'ok';
}
