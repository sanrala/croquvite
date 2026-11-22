/** Minuscules, sans accents ni ponctuation, entouré d'espaces : " oeufs bio x6 ". */
export function normalize(s: string): string {
  const clean = s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return ` ${clean} `;
}

/** Mot (ou expression) entier, avec pluriel simple : "lait" ne correspond pas à "laitue". */
export function hasKeyword(text: string, kw: string): boolean {
  return text.includes(` ${kw} `) || text.includes(` ${kw}s `) || text.includes(` ${kw}x `);
}
