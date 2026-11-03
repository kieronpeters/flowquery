import { Link } from 'react-router-dom'

import { signInHref } from './auth-links'

/**
 * Registration.
 *
 * GitHub OAuth has no separate sign-up step: the first successful sign-in of an
 * allowlisted account creates the user. This page exists to explain that rather
 * than to collect a form that would not do anything.
 */
export function SignupPage() {
  return (
    <main className="page page-narrow">
      <h1>Access</h1>
      <p className="lede">
        FlowQuery has two human administrators. There is no public sign-up, so nobody can create an
        account and see every board.
      </p>

      <section className="card-panel">
        <h2>How access works</h2>
        <ul className="plain-list">
          <li>The allowlist holds two GitHub numeric user ids, set by the owner.</li>
          <li>
            Signing in with an allowlisted account creates your user on first use. After that, the
            same account always resolves to the same user.
          </li>
          <li>
            An account that is not on the allowlist is refused, and no user, session or data is
            created.
          </li>
        </ul>
      </section>

      <section className="card-panel">
        <h2>Why GitHub rather than a password</h2>
        <p>
          Cloudflare Workers Free allows 10&nbsp;ms of CPU per request. A single properly-iterated
          password hash costs about 26&nbsp;ms — more than twice the entire budget. Rather than
          weaken the hash to fit, FlowQuery delegates sign-in to GitHub and never stores a password.
          Recovery, two-factor and device management are handled there.
        </p>
      </section>

      <a className="button button-primary" href={signInHref()}>
        Continue with GitHub
      </a>

      <p className="note">
        <Link to="/login">Back to sign in</Link>
      </p>
    </main>
  )
}
