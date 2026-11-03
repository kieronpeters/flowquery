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

function toRgb(hex: string): [number, number, number] | null {
  const value = hex.replace('#', '')
  if (value.length !== 6) return null

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  return [r, g, b].some((part) => Number.isNaN(part)) ? null : [r, g, b]
}

function toHex(r: number, g: number, b: number): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Blends `hex` toward `target` by `amount` (0-1). */
export function mix(hex: string, target: string, amount: number): string {
  const from = toRgb(hex)
  const to = toRgb(target)
  if (!from || !to) return hex

  const t = Math.max(0, Math.min(1, amount))
  return toHex(
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  )
}

/**
 * The card colour that sits on a custom column.
 *
 * Cards lighten the column rather than staying a fixed dark surface, so the
 * board reads as one palette. Light columns need a bigger lift to stay
 * distinguishable; dark ones need only a little.
 */
export function cardBackground(columnHex: string): string {
  const lift = luminance(columnHex) > 0.5 ? 0.55 : 0.12
  return mix(columnHex, '#ffffff', lift)
}
