const ERROR_MESSAGES: Record<string, string> = {
  denied: 'Sign-in was cancelled at GitHub.',
  state: 'That sign-in attempt expired or did not match. Please try again.',
  not_allowed: 'This FlowQuery instance is private. That GitHub account is not on the allowlist.',
  provider: 'GitHub could not complete the sign-in. Please try again.',
  configuration:
    'Sign-in is not configured yet. Put your GitHub OAuth client id and secret in .dev.vars (see docs/RUNBOOK.md), then restart the dev server.',
  rate_limited: 'Too many sign-in attempts. Wait a minute and try again.',
  unknown: 'Sign-in failed. Please try again.',
}

export function errorMessage(code: string | null): string | null {
  if (!code) return null
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown!
}

/** Absolute path that starts the OAuth flow and returns to `next` afterwards. */
export function signInHref(next = '/boards'): string {
  return `/api/v1/auth/start?next=${encodeURIComponent(next)}`
}
