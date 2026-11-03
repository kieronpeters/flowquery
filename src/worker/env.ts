import type { D1Database } from '@cloudflare/workers-types'

import type { UserRecord } from './repositories/auth-store'

/** Worker bindings and configuration. */
export type Bindings = {
  DB: D1Database

  /** GitHub OAuth app credentials (AUTH-01). Absent in tests and in an unconfigured deployment. */
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string

  /** `<immutable-github-id>:<display name>`, comma separated (DEC-031). */
  AUTH_ALLOWLIST?: string
}

/** Context available to authenticated human routes. */
export type AppEnv = {
  Bindings: Bindings
  Variables: {
    user: UserRecord
  }
}
