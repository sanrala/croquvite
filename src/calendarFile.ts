import { Platform } from 'react-native';

/** Sur iPhone / iPad (y compris iPadOS qui se présente comme un Mac). */
function isAppleTouch(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
}

/** Propose le fichier calendrier à l'utilisateur. Web uniquement ; retourne false ailleurs. */
export function offerCalendarFile(fileName: string, content: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;

  if (isAppleTouch()) {
    // Safari ouvre alors directement la fenêtre « Ajouter au calendrier ».
    window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
    return true;
  }
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
