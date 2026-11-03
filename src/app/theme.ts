/**
 * Colour helpers for per-board theming.
 *
 * A colour picker lets someone choose a pale background. If the text stays
 * light, the column becomes unreadable — so every custom surface gets an ink
 * colour chosen from its luminance rather than from taste.
 */

const LIGHT_INK = '#0b1020'
const DARK_INK = '#e6e9f2'

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Relative luminance, 0 (black) to 1 (white), per WCAG. */
export function luminance(hex: string): number {
  const value = hex.replace('#', '')
  if (value.length !== 6) return 0

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  if ([r, g, b].some((part) => Number.isNaN(part))) return 0

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Ink that stays legible on the given background. */
export function inkFor(hex: string): string {
  return luminance(hex) > 0.45 ? LIGHT_INK : DARK_INK
}
