import { addDays, formatFR, parseISODate } from './dates';
import type { Location } from './types';

/** Heure des rappels (heure locale). */
export const REMINDER_HOUR = 9;

/** Rappels automatiques : combien de jours avant l'expiration (1 = la veille). */
export const REMINDER_DAYS: Record<Location, number[]> = {
  frigo: [3, 1],
  placard: [7, 1],
};

export interface ReminderSource {
  name: string;
  location: Location;
  expiryDate: string;
  /** Date de rappel choisie (AAAA-MM-JJ). Si présente, elle remplace les rappels automatiques. */
  reminderDate?: string;
}

export interface PlannedReminder {
  when: Date;
  body: string;
}

function at9(d: Date): Date {
  const r = new Date(d);
  r.setHours(REMINDER_HOUR, 0, 0, 0);
  return r;
}

/** Tous les rappels d'un produit (y compris ceux déjà passés : à l'appelant de filtrer). */
export function planReminders(item: ReminderSource): PlannedReminder[] {
  if (item.reminderDate) {
    return [
      {
        when: at9(parseISODate(item.reminderDate)),
        body: `${item.name} : à consommer avant le ${formatFR(item.expiryDate)}.`,
      },
    ];
  }
  const expiry = parseISODate(item.expiryDate);
  return REMINDER_DAYS[item.location].map((before) => ({
    when: at9(addDays(expiry, -before)),
    body: `${item.name} expire dans ${before} jour${before > 1 ? 's' : ''}.`,
  }));
}

// --- Fichier calendrier (.ics) : rappels sur iPhone depuis le site -------------------------

const pad = (n: number) => String(n).padStart(2, '0');

function icsLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function icsUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Replie les lignes de plus de 75 caractères, comme l'exige le format. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/**
 * Événement de calendrier avec alerte(s) :
 * - rappel choisi : événement à 9 h ce jour-là, alerte à l'heure de l'événement ;
 * - sinon : événement le jour d'expiration, avec les alertes automatiques (3 j et 1 j avant, ou 7 j et 1 j).
 */
export function buildReminderIcs(item: ReminderSource & { id?: string }, now: Date = new Date()): string {
  const title = `À consommer : ${item.name}`;
  const description = `${item.name} expire le ${formatFR(item.expiryDate)}. (Croqu'Vite)`;

  const eventDay = item.reminderDate ? parseISODate(item.reminderDate) : parseISODate(item.expiryDate);
  const start = at9(eventDay);
  const end = new Date(start.getTime() + 15 * 60_000);
  const triggers = item.reminderDate ? ['PT0M'] : REMINDER_DAYS[item.location].map((d) => `-P${d}D`);

  const uid = `${item.id ?? Math.random().toString(36).slice(2)}-${icsLocal(start)}@croquvite`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Croqu'Vite//FR",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsLocal(start)}`,
    `DTEND:${icsLocal(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    ...triggers.flatMap((t) => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(title)}`,
      `TRIGGER:${t}`,
      'END:VALARM',
    ]),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function icsFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `rappel-${slug || 'produit'}.ics`;
}
