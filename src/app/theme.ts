/**
 * Colour helpers for per-board theming.
 *
 * The ink is chosen by measuring contrast against the surface, not by a
 * luminance threshold. A mid-tone can look "dark" and still read better with
 * dark text, and a threshold gets that case wrong.
 */

const INK_ON_LIGHT = '#0b1020'
const INK_ON_DARK = '#e6e9f2'

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function toRgb(hex: string): [number, number, number] | null {
  const value = hex.replace('#', '')
  if (value.length !== 6) return null

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  return [r, g, b].some((part) => Number.isNaN(part)) ? null : [r, g, b]
}

/** Relative luminance, 0 (black) to 1 (white), per WCAG. */
export function luminance(hex: string): number {
  const rgb = toRgb(hex)
  if (!rgb) return 0

  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black/white). */
export function contrastRatio(a: string, b: string): number {
  const one = luminance(a)
  const two = luminance(b)
  const light = Math.max(one, two)
  const dark = Math.min(one, two)

  return (light + 0.05) / (dark + 0.05)
}

/**
 * Ink that reads best on the given background.
 *
 * Picks whichever of the two ink tokens has the higher contrast, so a
 * mid-tone violet gets dark text when that wins and light text when it does
 * not — rather than following a threshold that only approximates the answer.
 */
export function inkFor(hex: string): string {
  const onLight = contrastRatio(hex, INK_ON_LIGHT)
  const onDark = contrastRatio(hex, INK_ON_DARK)
  return onDark >= onLight ? INK_ON_DARK : INK_ON_LIGHT
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
 * The default card colour for a column, used when the board has no ticket
 * colour of its own.
 *
 * Cards lighten the column rather than staying a fixed dark surface, so the
 * board reads as one palette. Light columns need a bigger lift to stay
 * distinguishable; dark ones need only a little.
 */
export function cardBackground(columnHex: string): string {
  const lift = luminance(columnHex) > 0.5 ? 0.55 : 0.12
  return mix(columnHex, '#ffffff', lift)
}

/**
 * Colour presets.
 *
 * Every hue in the spectrum is represented — red, orange, yellow, green,
 * blue, indigo and violet — plus two neutrals and one pale surface. Only one
 * pale neutral is kept: three near-whites were indistinguishable in the row
 * and crowded out the hues the owner actually wanted.
 *
 * Every preset is checked against the AA contrast threshold for body text by
 * a test, so "a preset" always means "readable", not "a colour someone liked".
 */
export const PRESETS = [
  { name: 'Midnight', value: '#0b1020' },
  { name: 'Slate', value: '#1c2333' },
  { name: 'Red', value: '#5c1a24' },
  { name: 'Orange', value: '#5e3312' },
  { name: 'Yellow', value: '#f2c94c' },
  { name: 'Green', value: '#1b3f2b' },
  { name: 'Teal', value: '#0f3f3c' },
  { name: 'Blue', value: '#1b2a5e' },
  { name: 'Indigo', value: '#2a2350' },
  { name: 'Violet', value: '#402a63' },
  { name: 'Pink', value: '#5d2340' },
  { name: 'Paper', value: '#f4efe6' },
] as const
