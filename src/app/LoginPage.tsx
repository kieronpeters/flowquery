import { Link, useSearchParams } from 'react-router-dom'

import { errorMessage, signInHref } from './auth-links'

export function LoginPage() {
  const [params] = useSearchParams()
  const message = errorMessage(params.get('error'))
  const next = params.get('next') ?? '/boards'

  return (
    <main className="page page-narrow">
      <h1>Sign in</h1>
      <p className="lede">
        FlowQuery is private. Sign in with the GitHub account that has been added to the allowlist.
      </p>

      {message && (
        <p className="alert" role="alert">
          {message}
        </p>
      )}

      <a className="button button-primary" href={signInHref(next)}>
        Continue with GitHub
      </a>

      <p className="note">
        There is no password to remember or reset — GitHub verifies who you are, and FlowQuery only
        ever sees your account id and display details. <Link to="/signup">Why this design?</Link>
      </p>
    </main>
  )
}
