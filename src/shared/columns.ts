/**
 * The five fixed columns (COL-001, COL-002).
 *
 * Columns are a product constant, not configuration: they cannot be created,
 * renamed, reordered or deleted. They are not a database table either — task
 * status is an enum column (DEC-019) — but they are exposed through the API so
 * the shape stays stable if that ever changes.
 *
 * Shared by the Worker and the React app so both agree on order and labels.
 */
export const COLUMNS = [
  { key: 'backlog', name: 'Backlog', position: 0 },
  { key: 'todo', name: 'To Do', position: 1 },
  { key: 'in_progress', name: 'In Progress', position: 2 },
  { key: 'review', name: 'Review', position: 3 },
  { key: 'done', name: 'Done', position: 4 },
] as const

export type ColumnKey = (typeof COLUMNS)[number]['key']

export const COLUMN_KEYS: readonly ColumnKey[] = COLUMNS.map((column) => column.key)

export function isColumnKey(value: string): value is ColumnKey {
  return COLUMN_KEYS.includes(value as ColumnKey)
}
