/**
 * Column ordering, as pure functions.
 *
 * This is the one place in the product where a bug corrupts a board silently:
 * two tasks claiming a slot, or one slipping past the end of a column and
 * becoming invisible. So the logic is pure, has no database or HTTP concern,
 * and is tested exhaustively before anything calls it.
 */

export type Positioned = { id: string; position: number }

/**
 * Moves `movingId` to `targetIndex` in the resulting array.
 *
 * `targetIndex` is the index the item ends up at (0-based), which is what a
 * drag-and-drop library reports as `newIndex`. Out-of-range values are clamped
 * rather than throwing: a drop at the end of a column is normal, not an error.
 */
export function moveWithin(
  ids: readonly string[],
  movingId: string,
  targetIndex: number,
): string[] {
  const without = ids.filter((id) => id !== movingId)
  const index = Math.max(0, Math.min(Math.trunc(targetIndex), without.length))

  return [...without.slice(0, index), movingId, ...without.slice(index)]
}

/** Maps an ordered id list to explicit positions. */
export function positionsFor(ids: readonly string[]): Positioned[] {
  return ids.map((id, position) => ({ id, position }))
}

/** True when the list contains no duplicates and positions are contiguous from 0. */
export function isContiguous(rows: readonly Positioned[]): boolean {
  const seen = new Set<number>()
  for (const row of rows) {
    if (row.position < 0 || row.position >= rows.length || seen.has(row.position)) return false
    seen.add(row.position)
  }
  return seen.size === rows.length
}
