# Phase Status

**Current phase:** M3 complete — human authentication.
**Next gate:** owner review of M3, plus a live sign-in test with real GitHub credentials.
**Last updated:** 2026-11-03.

## Phase history

| Phase | Status | Outcome |
|---|---|---|
| Initial package assembly | Complete | Project pack, team roster, concept images, early research |
| Requirements consolidation (v1) | Complete — superseded | Organisation → project → board hierarchy; never implemented |
| Access-control investigation | Complete — resolved by scope change | Hierarchy removed; authenticated-humans-only chosen |
| Specification consolidation (v2) | Complete 2026-11-03 | Flat board model; single decisions register |
| Owner review and approval | Complete 2026-11-03 | AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030 |
| M1 Repository foundation | Complete 2026-11-03 | Git, toolchain, structure, OpenCode agents, smoke test |
| M2 Walking skeleton | Complete 2026-11-03 | D1 schema, seeds, read-only board, CPU measurement, restore drill |
| **M3 Human authentication** | **Complete 2026-11-03** | GitHub OAuth + PKCE, numeric-id allowlist, sessions, CSRF, rate limiting |
| M4 Boards and dashboard | Not started | Requires owner approval |
| M5–M8 | Not started | — |
| M9 Deployment | Not started | Requires explicit deployment approval |

## M3 completion evidence

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, no findings |
| `npm test` | **33 tests passed**, 3 files |
| `npm run build` | Pass — worker 71 kB, client 267 kB |
| `npm run db:reset` | Both migrations applied (`0001_init.sql`, `0002_auth_attempts.sql`) |
| `GET /api/v1/boards/brd_demo` unsigned | `401 UNAUTHENTICATED` |
| `GET /api/v1/auth/start` | `302` → `github.com/login/oauth/authorize` with `client_id`, `scope=read:user user:email`, `code_challenge_method=S256`, 43-char challenge, 39-char state, correct `redirect_uri` |
| State cookie | `__Host-fq_oauth` with `HttpOnly; Secure; SameSite=Lax; Path=/` |
| `/boards/brd_demo` in a browser, signed out | Redirects to `/login?next=%2Fboards%2Fbrd_demo`; login page renders; **0 console errors** |
| Callback (stubbed GitHub) | Allowlisted → session issued, 302 to `/boards`; non-allowlisted → `/login?error=not_allowed`, no session, no user created |
| Session at rest | SHA-256 hash only; token never stored |
| Cross-origin POST | `403` |
| Bench | allowlist 0.002 ms, SHA-256 0.035 ms, response JSON 0.001 ms |

## Not verified

**A live GitHub sign-in.** It requires the owner's OAuth app client id/secret and the two GitHub accounts. Everything up to and including the token exchange is exercised with a stubbed provider; the real round trip must be performed before deployment.

## Explicitly not done

No task mutations, no board creation/dashboard, no comments or activity UI, no agent API or tokens, no remote repository, no push, no Cloudflare resource, no deployment, no domain, no paid service.
