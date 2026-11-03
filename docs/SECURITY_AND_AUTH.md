# FlowQuery — Security and Authentication Design

**Status:** 3 November 2026. Authoritative security design.
**Decided:** AUTH-01 is GitHub OAuth with a server-side allowlist; AUTH-02 confirms both administrators use GitHub accounts; DEC-031 requires administrator identity to be keyed on the immutable GitHub numeric user ID. The analysis of rejected alternatives is retained in §4 so the reasoning is auditable.

---

## 1. Assets and adversaries

**What is worth protecting**

| Asset | Why it matters |
|---|---|
| Board content | The owner's actual project state: tasks, plans, priorities |
| Human sessions | Full access to every board |
| Agent tokens | Full task access to one board, including deletion |
| The database | Everything above, plus activity history |

**Who might attack**

1. **An anonymous internet visitor** who finds the `*.workers.dev` URL and tries to register, guess a token, or reach an API endpoint.
2. **Someone holding a leaked token or session cookie** — from a screenshot, a log, a shared terminal, a browser sync.
3. **A malicious payload inside board content** — task text or a comment crafted to make Bob take an action.
4. **Nobody, most of the time.** This is a two-person private tool. The design should be proportionate: strong where secrets live, simple everywhere else.

The realistic threat is not a sophisticated attacker. It is a leaked credential and an accidental `SELECT` that forgets `WHERE board_id = ?`.

## 2. Threat model against the design

| Threat | Control |
|---|---|
| Stranger registers and reads every board | Server-side allowlist at the authentication callback (AUTH-001). No self-service path to an account. |
| Token leaked in a URL, log or screenshot | Tokens travel only in `Authorization: Bearer`; stored hashed; shown once; revocable (AGT-002, AGT-009) |
| Token from board A used on board B | Board derived from the token, never from the request (AGT-006, AGT-008) |
| Session cookie stolen | `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix; server-side session row can be deleted (AUTH-003, AUTH-006) |
| CSRF from a malicious page | `SameSite=Lax` plus an `Origin` check on every mutating request (AUTH-007) |
| SQL injection | Bound parameters only, enforced by review rule; no string-built SQL (SEC-004) |
| XSS via task content | React escapes by default; no `dangerouslySetInnerHTML`; CSP header (COM-003, SEC-005, SEC-007) |
| Prompt injection through board text | Board content is data. Bob summarises, never obeys. Stated in `MASTER_PROMPT.md` §4 and AGENTS rule 9 (SEC-008) |
| Enumerating whether a board exists | Scope failures return `404`, never `403` |
| Credential stuffing | Tokens are 256-bit random; there is nothing to stuff. Rate limiting bounds the noise (§9) |
| Insider mistake deleting a board | Typed-name confirmation; backups (DEC-007) |

## 3. Why there are no passwords

This is the single most consequential constraint in the project, and it is worth recording the evidence rather than the conclusion.

Workers Free allows **10 ms of CPU per request** (verified 2026-11-03, `workers/platform/limits`, last updated 29 Oct 2026). I measured PBKDF2-SHA256 in the local V8/WebCrypto stack:

| Iterations | Median CPU |
|---|---|
| 10,000 | 2.6 ms |
| 100,000 | **25.9 ms** |
| 210,000 (OWASP floor) | 54.9 ms |
| 600,000 (OWASP recommended) | 162.6 ms |

Even the weakest defensible setting is 2.6× the entire per-request budget. Node's WebCrypto is OpenSSL-backed and the Workers runtime may differ, but not by an order of magnitude — and the docs themselves note that "heavier workloads that handle authentication… typically use 10–20 ms".

The options that would rescue a password form are all worse than the problem:

- Lower the iteration count until it fits → an insecure password store, which the owner explicitly ruled out.
- Move stretching to the browser → non-standard scheme, and the derived value becomes password-equivalent.
- Use Workers Paid → violates DEC-013 (zero recurring cost).

So passwords are excluded by measurement, not by preference. The owner's instruction was explicit: do not choose an insecure workaround merely to preserve a username/password interface. This design follows that.

## 4. AUTH-01 — the options

Verified against official documentation on 2026-11-03. Sources and dates in `TECHNICAL_RESEARCH.md`.

### Option A — GitHub OAuth app with a server-side allowlist (**selected**)

**How it works.** `/auth/start` redirects to GitHub with a `state` value (and PKCE `S256`). GitHub returns a code to `/auth/callback`. The Worker exchanges it for an access token (`POST github.com/login/oauth/access_token` — one `fetch`, which is I/O, not CPU), reads `GET /user` (numeric id, login) and `GET /user/emails` with scope `user:email` (returns `primary` and `verified`). If the numeric GitHub id is on the allowlist, a user row is created or matched and a session issued. Otherwise `403` with "This FlowQuery instance is private." and no session.

**Cost:** $0. No card, no domain, no email service.
**CPU:** two `fetch` calls (excluded from CPU), one HMAC session token, one or two D1 queries. Comfortably inside 10 ms.
**Registration restriction:** the allowlist is a Worker variable mapping GitHub numeric IDs to display names. Numeric IDs are stable across renames, so the allowlist cannot be defeated by renaming an account.
**Recovery:** GitHub owns it. A lost password, a lost device, 2FA recovery — all handled upstream. FlowQuery never handles a credential reset.
**Verification:** `verified: true` from `/user/emails` gives us the confirmation the owner asked for, without sending an email.
**Trade-offs, stated plainly:**
- Both humans need a GitHub account. AUTH-02 confirms whether that is acceptable.
- If GitHub is down, nobody can sign in. Acceptable for this tool.
- Compromise of the GitHub account means compromise of FlowQuery. Mitigation: 2FA on GitHub, and the allowlist means only those accounts matter.
- We depend on a third party's identity — but we already depend on their hosting.

### Option B — Cloudflare Access (Zero Trust) in front of the Worker

**How it works.** Put an Access application on the Worker hostname; Cloudflare handles sign-in (including a one-time PIN by email) and passes a verified identity to the Worker via `ctx.access.getIdentity()`.

**Attractions:** no authentication code at all; email-OTP login; free plan capped at 50 users.

**Blockers and caveats:**
- Cloudflare's Workers Access page (updated 2 Nov 2026) explicitly supports `*.workers.dev` hostnames. But the general self-hosted application page (17 Apr 2026) lists "an active domain on Cloudflare" as a prerequisite. **Cloudflare has not reconciled these two statements**, so this must be proven in the dashboard before it is relied on.
- Zero Trust sign-up **asks for payment details even on the free plan** ("this step is still needed but you will not be charged"). That conflicts with the owner's instruction not to activate billing or provide payment details without approval.
- Access protects the whole Worker, including `/api/v1/agent/*`. Bob's bearer-token requests would then need an Access bypass or service token — a second identity system layered on the first, for no gain in this design.

**Verdict:** technically plausible, but it adds a payment-details step, an unresolved documentation conflict, and a second identity layer for the agent door. Keep as a fallback, not the default.

### Option C — Passkeys / WebAuthn

**How it works.** Users register a platform passkey; the Worker verifies an ES256 assertion.

**Attractions:** no third party, no email, phishing-resistant, and recovery is delegated to the device platform's sync.

**Problems:**
- `@simplewebauthn/server` documents support for Node ≥22 and Deno ≥2.4 only. **Cloudflare Workers support is not stated.**
- ES256 verification CPU cost is **not published**; unmeasured against a 10 ms budget.
- `workers.dev` is on the Public Suffix List, so the RP ID must be the full `<name>.workers.dev` — workable, but it pins the deployment hostname permanently.
- Recovery needs a design of our own: a second device, or printed recovery codes.
- It is meaningfully more code — CBOR/COSE handling, challenge storage, credential lifecycle — for a two-person tool.

**Verdict:** the best answer if a third-party identity is unacceptable, but it is the option most likely to consume a week on a platform where its library support is undocumented.

### Comparison

| | A. GitHub OAuth | B. Cloudflare Access | C. Passkeys |
|---|---|---|---|
| Recurring cost | $0 | $0 (50 users) | $0 |
| Payment details required | No | **Yes, at sign-up** | No |
| Custom domain required | No | Disputed — unproven on `workers.dev` | No |
| Email service required | No | No (Cloudflare sends OTP) | No |
| New application code | Small | Minimal | Large |
| CPU risk | Low | None | **Unmeasured** |
| Third-party dependency | GitHub | Cloudflare | None |
| Recovery ownership | Third party | Third party | **Ours** |
| Interacts with agent tokens | No | **Yes — needs a bypass** | No |

**Recommendation: Option A.** It is the only option that is free, needs no payment details, no domain and no email service, keeps the agent door simple, and has a documented, boring flow. Its weakness — requiring a GitHub account — is a conversation with your friend, not an engineering problem.

**Selected by the owner on 3 November 2026** (AUTH-01, AUTH-02), with the added requirement (DEC-031) that identity be keyed on the immutable GitHub numeric user ID. Options B and C remain documented above as the fallbacks if the GitHub dependency later becomes unacceptable.

## 5. Recommended authentication design (Option A)

```text
GET  /auth/start        → set signed `state` cookie; 302 to github.com/login/oauth/authorize
                          (client_id, redirect_uri, scope=read:user user:email, state, PKCE S256)
GET  /auth/callback     → verify state + PKCE → POST token exchange → GET /user, /user/emails
                          → id on allowlist? → upsert user + auth_identities row
                          → create session → Set-Cookie → 302 /boards
                          → not on allowlist → 403, no session, no user row
POST /auth/logout       → delete session row, clear cookie → 204
GET  /auth/me           → identity or 401
```

**Allowlist.** A single Worker variable:

```text
AUTH_ALLOWLIST = "583231:Kieron,1234567:Friend"
```

Each entry is `<github_user_id>:<display name>`. The numeric ID comes from `GET /user` (`id`), and it is the **only** identity key in the system (DEC-031).

Why the numeric ID and not the username or email:

- **Usernames are mutable.** GitHub lets an account be renamed, and the old name can then be claimed by someone else. Keying on login is how allowlists silently transfer access to a stranger.
- **Email addresses are mutable and re-assignable.** A changed email would either lock the owner out or, worse, match a previous holder.
- The numeric ID is permanent for the life of the account and is never reused.

Consequences, stated so they are not discovered later:

- `users.display_name` and `users.email` are **display metadata**, refreshed on each sign-in. Changing them grants nothing.
- `auth_identities` rows use `provider = 'github'` and `subject = <numeric id>`. There is exactly one identity per administrator.
- Removing an ID from the allowlist does not delete the user row; it prevents a new session. Existing sessions are ended by deleting the session rows (or rotating the signing key).

Adding a third person later is a variable update and a redeploy — deliberately not a UI feature, because a UI for granting access is a UI for getting it wrong.

**Session.** 32 random bytes, base64url, stored as SHA-256 in `sessions`, delivered as `__Host-fq_session` with `HttpOnly; Secure; SameSite=Lax; Path=/`. 30-day absolute expiry, idle refresh on use, deleted on sign-out. Rotated on sign-in. A session is a database row, so it can be killed server-side (`AUTH-006`).

**Bootstrap.** On first ever run the allowlist is set and the two humans sign in; each gets a `users` row on first successful sign-in. There is no seeded account and no default password to leak — a small but real security advantage over the usual first-run admin account.

## 6. Agent tokens

| Property | Decision |
|---|---|
| Format | `fq_` + 32 bytes from `crypto.getRandomValues`, base32 (Crockford, no ambiguous characters) |
| Shown | Once, at creation, with a copy control and a warning |
| Stored | `SHA-256(token)` hex, unique index. Fast hash is correct: 256 bits of entropy has no brute-force surface, and a slow hash would not fit the budget |
| Identified in UI | `token_prefix` (first 8 characters) + label + `created_at` + `last_used_at` |
| Scope | Exactly one board. Enforced by deriving `board_id` from the token row, never from the request |
| Revocation | `revoked_at` set; rejected on the next request. No cached session to expire |
| Multiple per board | Yes, each labelled — e.g. "Bob — Main Development", "Bob — backlog cleanup" |
| Transport | `Authorization: Bearer <token>` only. Never a query parameter, never a URL, never a cookie |

**Why not a JWT.** A signed token cannot be revoked without a denylist, and a denylist is a database lookup — the same cost as checking the token row directly. Opaque tokens are simpler and revocable by construction.

**Why board-scoped rather than one global agent token.** A leaked global token is the whole workspace. A leaked board token is one board, and the blast radius is bounded by something other than good behaviour.

## 7. Human/agent boundary

| | Human session | Agent token |
|---|---|---|
| Board administration | Yes | **No** |
| Task create/edit/delete | Yes | Yes |
| Comments, activity | Yes | Yes |
| Other boards | All | **None** |
| Dashboard | Yes | **No** |
| Can be revoked instantly | On sign-out | Per token |

Enforced by two separate route namespaces (`/api/v1/…` and `/api/v1/agent/…`) whose only shared component is the service layer. There is no endpoint that infers authority from a body field.

## 8. Input, output and transport

- All bodies validated by Zod before reaching a service; unknown fields rejected rather than ignored.
- Body limit 256 KB; `LIKE` search terms capped at 40 bytes because D1 caps the pattern at 50.
- Output escaped by React; no raw HTML rendering anywhere.
- Security headers on HTML responses: `Content-Security-Policy` (no inline script, `self` only), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal.
- HTTPS only; HSTS is set by Cloudflare at the platform level.

## 9. Rate limiting

Deliberately small, because the credentials are unguessable:

- `/auth/*`: more than 10 requests per IP per minute → `429` for 60 seconds.
- Bearer authentication failures: more than 20 per token prefix per minute → `429`.
- Implemented as bounded counter rows in D1. No paid WAF product, no Redis, no Durable Object.

## 10. Secrets

| Secret | Local | Deployed |
|---|---|---|
| `GITHUB_CLIENT_ID` | `.dev.vars` | Worker variable |
| `GITHUB_CLIENT_SECRET` | `.dev.vars` | `wrangler secret put` |
| `AUTH_ALLOWLIST` (configuration, not a secret) | `.dev.vars` | Worker variable |

There is **no session signing key**, and that is deliberate: sessions are opaque random tokens stored server-side as SHA-256 hashes. Nothing is signed, so there is nothing to rotate except the sessions themselves (delete the rows). This is simpler and more revocable than a signed cookie.

`.dev.vars.example` documents the required variables. `.dev.vars` is git-ignored **before** the first commit. No secret is ever printed to a log; error handlers log the error name only, never request bodies, cookies or headers.

## 11. Backups and recovery

Nothing here is theoretical: permanent deletion (DEC-007) means backups are the *only* recovery path.

- **Time Travel:** D1 keeps 7 days of point-in-time recovery on the Free plan. This is the first line of defence against an accidental delete.
- **Export:** `wrangler d1 export <db> --remote --output backup-YYYY-MM-DD.sql`. The Free plan allows 5 GB of storage against a database measured in single-digit megabytes, so exports are cheap and can be kept for a long time.
- **Cadence for MVP:** a manual export after any significant change, plus one before any destructive migration. Automation is deliberately out of scope — a cron trigger would consume the free quota and add a failure mode we would not notice.
- **Restore drill:** before deployment, restore an export into a scratch database and verify row counts and a spot-checked board. **A backup that has never been restored is a hope, not a backup.** M8's exit criterion.

## 12. If something goes wrong

| Incident | Response |
|---|---|
| Token leaked | Revoke it in the UI. Effective immediately. Review `last_used_at` and the activity log for writes you did not make. |
| Session cookie leaked | Delete the session row (sign out from another device), or rotate the signing key to invalidate all sessions. |
| Database corrupted or wrongly deleted | Time Travel to a timestamp before the event, or import the most recent export. |
| Suspicious registration attempt | Expected and blocked; the allowlist denies it. Check logs only if it recurs at volume. |
| Owner loses access | If GitHub is intact, sign in again. If the allowlist is wrong, correct the variable and redeploy. There is no password to reset — which is the point. |

## 13. Residual risks, stated honestly

1. **GitHub availability** becomes a hard dependency for sign-in. Accepted.
2. **GitHub account compromise** grants FlowQuery access. Mitigated only by 2FA at GitHub and a narrow allowlist.
3. **The free tier has no hard spending cap**, but there is nothing to spend: the plan is Free and no paid feature is enabled. Quota exhaustion produces errors, not bills.
4. **Passkeys remain unvalidated** on this platform; if AUTH-01 later switches to Option C, the CPU and library-support questions must be answered with a spike before committing.
5. **`memory/` and stale documents** were a real risk this session; the mitigations are the superseded markers and the single decision register, not technical controls.
6. **Two humans is a small sample.** The design assumes trusted colleagues, not adversarial users among the account holders. If that assumption changes, this document needs revisiting — not just a new role.

## 14. Implementation status (M3)

Built and tested:

- `GET /auth/start` with a state cookie and PKCE (S256); `GET /auth/callback`; `GET /auth/me`; `POST /auth/logout`.
- Allowlist keyed on the immutable GitHub numeric id, refreshed display name and email on each sign-in (DEC-031).
- Sessions: opaque 256-bit token, SHA-256 at rest, `__Host-fq_session` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30-day sliding expiry.
- Sign-out deletes the session row, so the cookie is worthless afterwards.
- CSRF: `Origin` check on state-changing requests.
- Rate limiting: 10 attempts per minute per IP on the auth endpoints, stored in `auth_attempts`.
- Board reads require a session; unauthenticated requests get `401`.

Not yet verified: **the real GitHub round trip**, because it needs the owner's OAuth app credentials and two GitHub accounts. The callback logic is covered by tests with a stubbed GitHub, and the start redirect was verified against a real dev server — but a live sign-in has not been performed. That must happen before deployment.

Measured CPU for the auth path: allowlist parse 0.002 ms, SHA-256 token hash 0.035 ms, response serialisation 0.001 ms — about 0.04 ms against a 10 ms budget.
