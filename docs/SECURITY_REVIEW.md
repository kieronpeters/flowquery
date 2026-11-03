# FlowQuery — Security Review

**Date:** 3 November 2026
**Scope:** the whole application as built through M7, reviewed during M8.
**Method:** reading the code against the requirements, then attacking it with tests rather than opinion. Every claim below is backed by a test that fails if the control regresses.

This is a self-review by the engineer who wrote the code. It is not an independent audit, and it should not be described as one.

---

## 1. What is being protected

Board content and history; two human sessions with full access; agent tokens with task-level access to one board.

## 2. The two doors

| | Human | Agent |
|---|---|---|
| Credential | `__Host-fq_session` cookie, opaque, hashed at rest | `Authorization: Bearer fq_…`, hashed at rest |
| Scope | all boards | exactly one board, from the credential |
| Can administer boards | yes | **no** |
| Reaches the other door | no | no |

The isolation guarantee is structural: **the agent namespace has no board parameter.** No path segment, body field or query value names a board. `boardId` is read from the credential row and nowhere else.

## 3. Checks performed and results

| # | Question | Method | Result |
|---|---|---|---|
| 1 | Can an agent token read another board's task? | Second board + second token; GET by id | `404` |
| 2 | Can it update another board's task? | PATCH by id, then read as the owner | `404`; task unchanged |
| 3 | Can it move or delete? | POST move, DELETE | `404` |
| 4 | Can it comment on another board's task? | GET/POST comments | `404` |
| 5 | Can it see another board's activity? | GET activity | empty |
| 6 | Can it reach board administration? | PATCH `/agent/boards/...` | `404` |
| 7 | Does a revoked token still work? | Revoke, reuse immediately | `401` |
| 8 | Are unknown, malformed and revoked tokens distinguishable? | Compare responses | identical `401` |
| 9 | Does a cookie work on the agent door? | Send cookie to `/agent/board` | `401` |
| 10 | Does a bearer token work on the human door? | Send token to `/api/v1/boards` | `401` |
| 11 | Is the plaintext token ever returned again? | Create, then list; string search | absent |
| 12 | Are session tokens stored in plaintext? | Read the `sessions` table after sign-in | SHA-256 only |
| 13 | Does an expired session still work? | Resolve past expiry | rejected, row deleted |
| 14 | Can a stale version overwrite a newer edit? | `expectedVersion` mismatch | `409`, unchanged |
| 15 | Is comment content rendered as HTML? | Browser test with `<script>` and `<b>` | literal text; nothing executed |
| 16 | Do SQL queries take user text? | Code review + parameterised statements | bound parameters only |
| 17 | Can a cross-origin POST succeed? | `Origin: https://evil.example` | `403` |
| 18 | Are error responses leaking internals? | Inspect 404 body; test for SQL/stack patterns | clean |
| 19 | Do responses carry security headers? | Assert on every API response | CSP, nosniff, referrer, frame, COOP, permissions |
| 20 | Are browser-facing headers present on the SPA document too? | `public/_headers` compared to the Worker policy by test | identical |

## 4. Fixed during this review

| Issue | Severity | Fix |
|---|---|---|
| `/auth/callback` counted attempts but never checked the limit before contacting GitHub | low | Limit checked first (M8) |
| A `task.deleted` event was removed by the cascade that removed the task, so deletion left no trace | medium | Written with a null task reference (M6) |
| The create-board form could submit twice in one frame and create duplicates | low | Ref guard, not state (M4) |
| The CSP existed in two places with no guarantee they agreed | low | A test compares `_headers` to the Worker constant (M8) |
| **The `_headers` file was structurally invalid** — `/* … */` is not a comment in that format; `/*` is a URL pattern, so the file would have applied headers to the wrong block or none at all | **high** | Rewritten with `#` comments and one `/*` rule; tests now assert the structure, not just the strings (M8) |

The last one is worth dwelling on. The first attempt at fixing the missing CSP *was itself broken*, and the drift test passed because it searched for the policy string rather than checking that the file was a valid rule. A test that asserts content but not structure gives false confidence — the same class of mistake as a fake database that returns rows for any query.

## 5. Accepted risks

| Risk | Why accepted |
|---|---|
| Misconfigured allowlist admits the wrong GitHub account | The list is two numeric ids, set by the owner, changed by redeploy. A UI for granting access would be a UI for getting it wrong. |
| Compromise of a human's GitHub account compromises FlowQuery | Inherent to delegating identity. Mitigated by 2FA at GitHub and a two-person allowlist. |
| GitHub outage blocks sign-in | Accepted for a two-person internal tool. |
| Activity writes can be lost | Best-effort by design; failing the user's successful edit would be worse. |
| No rate limit on the agent door | Tokens are 256 bits; guessing is not a threat. Flooding is a availability concern handled at Cloudflare's edge, and a D1 counter per request would spend the CPU budget to defend against nothing. |
| Token prefix is shown in lists | Reveals 5 base32 characters of a 256-bit token. Remaining entropy makes this irrelevant, and it is what makes tokens distinguishable. |
| No CSRF token, only an Origin check | `SameSite=Lax` plus an exact Origin comparison covers the browser attack; a token would add ceremony without changing the outcome. |
| No independent audit | This is a self-review. An external review is a different exercise and has not been done. |

## 6. What this review does not claim

- It does not claim the application is free of defects. It claims specific properties are tested.
- It does not cover the **deployed** environment: no Cloudflare account has been configured, so TLS, DNS, zone settings and platform-level protections are untested.
- It does not cover the real GitHub round trip, which remains unperformed.
- It does not assess the security of Cloudflare's own infrastructure.

## 7. Conclusion

For a private two-person board exposed on the public internet with a scoped agent token, the controls in place are proportionate: authenticated humans only, no public links, hashed credentials, structural board isolation, and an audit trail that records who changed what.

### Accessibility and privacy audit (added during the M8+ pass)

Lighthouse was run against the live board, the dashboard and the task dialog:

| Audit | Score |
|---|---|
| Accessibility | **100** |
| Best practices | **100** |
| SEO | 80 — the remaining item is a missing meta description, deliberate for a `noindex` application |

One real defect was found by testing rather than by Lighthouse: the task drawer declares `aria-modal="true"` but **Tab walked straight out of it** into the page behind, and focus was not returned to the card on close. Both are now fixed — a focus trap cycles within the dialog, and the trigger regains focus on dismissal. Verified by pressing Tab twenty times (zero escapes) and closing with Escape (focus lands back on the card).

`public/robots.txt` now disallows all crawlers, so a shared link cannot be indexed. The document previously carried only a `noindex` meta tag, and `/robots.txt` returned the SPA's HTML.

The two remaining gaps are not weaknesses in the code — they are unverified paths, and they are listed in `NEXT_ACTION.md` rather than left implicit.
