import type { ColumnKey } from '../../shared/columns'

/** Row shapes as they come out of D1: snake_case, integers for booleans. */
export type BoardRow = {
  id: string
  name: string
  /** Optional "what this board is for"; null until somebody writes one. */
  description: string | null
  created_by: string
  created_at: number
  updated_at: number
  /** JSON document; parsed by the service layer. */
  theme: string
}

export type TaskRow = {
  id: string
  board_id: string
  title: string
  description: string
  status: ColumnKey
  position: number
  priority: string
  assignee_profile_id: string | null
  due_date: string | null
  version: number
  created_at: number
  updated_at: number
}

export type ProfileRow = {
  id: string
  display_name: string
  role_title: string
  kind: 'human' | 'ai' | 'contractor'
  avatar_path: string | null
  active: number
}

/**
 * Everything a profile page shows.
 *
 * Separate from `ProfileRow` because the list endpoint deliberately does not
 * select the text columns: profiles are loaded on every board view, and a
 * page's worth of prose should not ride along with an assignee dropdown.
 */
export type ProfileDetailRow = ProfileRow & {
  about: string | null
  skills: string | null
  development: string | null
}
