# FlowQuery — Technical Research and Validation

**Verification date:** 3 November 2026. Cloudflare limits and pricing change; re-verify before deployment and before any decision that depends on a number here.

**Method:** primary sources only — `developers.cloudflare.com`, `docs.github.com`, `w3.org`, `publicsuffix.org`, and vendor pricing pages. Where a page did not state something, this document says "not stated" rather than inferring. Local measurements were run on the owner's machine and are labelled as such.

---

## 1. Environment (verified locally)

| Tool | Version |
|---|---|
| Git | 2.55.0.windows.3 |
| Node | v24.21.0 |
| npm | 11.19.0 |
| OpenCode | v2.2.1 |
| GitHub CLI | 2.103.3 |

`pnpm` and `wrangler` are not installed globally. Wrangler should be a project-local dev dependency, not a global install.

Git identity is configured: `Kieron Peters <kieronpeters1@gmail.com>`.

No Git repository exists at `C:\Users\Asus\source\repos\FlowQuery`. `C:\repos\flowquery`, referenced in earlier planning, does not exist.

## 2. Cloudflare Workers — plans and limits

Source: `https://developers.cloudflare.com/workers/platform/limits/` (last updated 29 Oct 2026) and `https://developers.cloudflare.com/workers/platform/pricing/` (last updated 2 Oct 2026).

| | Free | Paid |
|---|---|---|
| Requests | 100,000/day | 10M/month included, +$0.30/M |
| **CPU per request** | **10 ms** | 30 s default, 5 min max |
| Memory | 128 MB | 128 MB |
| Subrequests | 50/request | 10,000/request |
| Simultaneous connections | 6 | 6 |
| Static asset files | 20,000 | 100,000 |
| Price | $0 | $5/month minimum |

**What "CPU" means here** — the docs are explicit: "CPU time measures how long the CPU spends executing your Worker code. Waiting on network requests (such as `fetch()` calls, KV reads, or database queries) does **not** count toward CPU time."

This is the single most important sentence in the whole research set. It means **D1 query time is excluded** from the 10 ms budget. The budget constrains our own computation — JSON serialisation, crypto, validation — not our database work.

**Over-quota behaviour:** exceeding the daily request limit returns **Error 1027**. CPU overage returns **Error 1102** ("Worker exceeded resource limits"). On CPU, the docs mention that each isolate has "some built-in flexibility to allow for cases where your Worker infrequently runs over the configured limit" — **no number, no guarantee**. It is a safety margin, not a design allowance.

**No automatic billing on Free.** The docs describe exhaustion purely as errors. Workers Paid is an opt-in subscription ("By default, users have access to the Workers Free plan").

## 3. Static assets and SPA routing

Sources: `https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/`, `https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/`.

- **"Requests to static assets are free and unlimited."** Only requests that invoke the Worker are billable.
- With compatibility date ≥ 2025-04-01, **navigation requests do not invoke the Worker**; they are served directly as assets.
- `"not_found_handling": "single-page-application"` returns `index.html` with **200** for unmatched paths.
- `"run_worker_first": ["/api/*"]` gives explicit control over which paths invoke the Worker (Wrangler ≥ 4.20.0, Vite plugin ≥ 1.7.0).
- **Documented trap:** if `run_worker_first` matches asset paths, those requests always invoke the Worker, and once the free daily limit is hit they return **429 instead of the asset** — the app breaks, not just the API.

**Design consequence:** `run_worker_first` is scoped to `/api/*` only. Page views never consume the request budget, so browsing cannot exhaust it, and quota exhaustion degrades the API rather than the whole application (DEC-016, DEC-017).

## 4. D1 — limits, pricing, behaviour

Sources: `https://developers.cloudflare.com/d1/platform/limits/` (30 Oct 2026), `https://developers.cloudflare.com/workers/platform/pricing/` (2 Oct 2026).

| | Free | Paid |
|---|---|---|
| Rows read | 5,000,000/day | 25B/month included, +$0.001/M |
| Rows written | 100,000/day | 50M/month included, +$1.00/M |
| Storage | 5 GB total, **500 MB per database** | 10 GB per database |
| Databases | 10 | 100,000 included |

**Behaviour when limits are exceeded:** queries fail with errors until the 00:00 UTC reset; at the storage cap, writes must delete before inserting. **No automatic charge.** Free-tier enforcement has been active since 1 September 2026.

**Concurrency:** each D1 database is backed by a single Durable Object and processes queries one at a time. Write queries take "several milliseconds" of SQL duration because they are durably persisted. Irrelevant at two users; relevant to the advice not to fan out queries per request.

**Foreign keys:** supported and **enforced by default**, equivalent to `PRAGMA foreign_keys = on`. The schema can rely on cascade deletes.

**`batch()`:** statements run as a single transaction, executed sequentially; a failure aborts the whole sequence; a batch counts as **one** query against the per-invocation limit. This is why task moves use `batch()`.

**Per-statement limits that constrain the design:**

| Limit | Value | Design consequence |
|---|---|---|
| SQL statement length | 100 KB | Fine |
| Bound parameters per query | 100 | Bulk operations must chunk |
| `LIKE`/`GLOB` pattern | **50 bytes** | Search terms capped at 40 bytes (API §9) |
| Row size | 2 MB | Descriptions capped at 20,000 characters |
| Query duration | 30 s | Fine |
| Queries per invocation | 50 (Free) | Batch where possible |
| Query result size | 50 MB (effective 4 Nov 2026) | Irrelevant at this scale |

**Time Travel:** point-in-time recovery, **7 days on Free**, 10 restores per 10 minutes per database.

**Export:** `wrangler d1 export <name> --remote --output file.sql` (`--local`, `--table`, `--no-schema`, `--no-data` also available).

## 5. Billing safety

Source: `https://developers.cloudflare.com/billing/manage/budget-alerts/`.

- Budget alerts are **"informational only. They do not pause or cap usage."**
- Usage notifications are informational and require Professional plan or above for per-product metrics.
- **No hard spending cap is documented anywhere in Cloudflare billing.**

**Consequence:** the safeguard must be architectural, not a billing setting — stay on Free, enable no paid feature, and keep the workload bounded. This is recorded as DEC-013 and is the reason Workers Paid was rejected even though it would have solved the CPU problem.

## 6. Local development

Sources: `https://developers.cloudflare.com/workers/local-development/`, `https://developers.cloudflare.com/d1/best-practices/local-development/`.

- `wrangler dev` / the Vite plugin run on `workerd` locally via Miniflare. Bindings are simulated locally by default; `--local` forces local-only.
- Data persists across runs (Wrangler v3+); `--persist-to` controls location.
- Local D1 "runs the same version of D1 as Cloudflare runs globally", but local and remote data are **completely separate**.
- `wrangler d1 migrations create | list | apply` with `--local`/`--remote`; `apply` takes a backup and rolls back a failed migration.
- No Cloudflare account is needed for local development. This is what makes M1 verifiable before any account exists.

## 7. Authentication research

### 7.1 Cloudflare Access (Zero Trust)

Sources: `https://www.cloudflare.com/zero-trust/products/access/`, `https://developers.cloudflare.com/workers/configuration/cloudflare-access/` (updated 2 Nov 2026), `https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/` (updated 17 Apr 2026), `https://developers.cloudflare.com/cloudflare-one/setup/`.

- Free plan: **50 users**.
- The Workers-specific page states Access can protect "a specific hostname — can be `workers.dev`, a Custom Domain, or a path", and gives an example using `my-worker.example.workers.dev`.
- **Conflict:** the general self-hosted application page lists "an active domain on Cloudflare" as a prerequisite and says "Domains must belong to an active zone in your Cloudflare account". Cloudflare has **not reconciled** this with the Workers page. Which applies to `workers.dev` is **not stated**.
- **Zero Trust sign-up requires payment details even on the free plan** ("this step is still needed but you will not be charged").
- An authenticated Worker can read identity via `ctx.access.getIdentity()`; a one-time-PIN email identity provider is available.

**Assessment:** technically attractive, but it requires payment details, rests on an unreconciled documentation conflict, and would sit in front of the agent API as well, forcing a bypass or service token for Bob. Not selected.

### 7.2 GitHub OAuth Apps

Sources: `https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app`, `.../authorizing-oauth-apps`, `.../scopes-for-oauth-apps`, `https://docs.github.com/en/rest/users/emails`.

- Registration asks for a Homepage URL and an Authorization callback URL; up to 10 callback URLs. **No custom-domain requirement is documented**, and no restriction on `workers.dev` hosts is stated.
- Redirect matching is exact unless wildcard matching is enabled. Loopback URLs are permitted.
- Scope needed for the verified email: `user:email` ("OAuth app tokens and personal access tokens (classic) need the user:email scope to use this endpoint" — `GET /user/emails`).
- The email object has required fields `email`, `primary`, `verified` (booleans) — so GitHub will tell us whether the address is confirmed, without us sending any email.
- Flow: `GET github.com/login/oauth/authorize` (`client_id`, `redirect_uri`, `scope`, `state`, optional PKCE S256) → `code` (expires in 10 minutes) → `POST github.com/login/oauth/access_token` → `GET api.github.com/user` and `/user/emails` with the bearer token.

**Assessment:** no cost, no card, no domain, no email service, documented flow, verified-email signal, recovery delegated to GitHub. Selected as the AUTH-01 recommendation.

### 7.3 Free transactional email

Sources: `https://resend.com/pricing`, `https://resend.com/docs/dashboard/domains/introduction`, `https://help.brevo.com/hc/en-us/articles/208589409`, `https://help.brevo.com/hc/en-us/articles/208836149`, `https://www.mailchannels.com/pricing`.

| Provider | Free tier | Domain required | Can send to arbitrary recipients at $0? |
|---|---|---|---|
| Resend | 3,000/month, 100/day | **Yes** — "You must add and verify at least one domain" | **No** |
| Brevo | 300/day | Yes to authenticate; free sender domains cannot be authenticated | **No** |
| MailChannels | 3,000/month, 100/day, 3 domains | Yes | **No** |

**Conclusion: no verified provider will send to arbitrary recipients without owning a verified domain.** Therefore email-based password reset and magic-link sign-in are **not viable at zero recurring cost**. This is the finding that makes the "password reset email" requirement impossible to satisfy literally — and it is why the recommendation delegates recovery to an identity provider instead.

### 7.4 Passkeys / WebAuthn

Sources: `https://simplewebauthn.dev/docs/packages/server`, `https://www.w3.org/TR/webauthn-3/`, `https://publicsuffix.org/list/public_suffix_list.dat`.

- `@simplewebauthn/server` (14.0.x) documents **Node ≥22 and Deno ≥2.4 only**. Cloudflare Workers support is **not stated**.
- WebAuthn requires the RP ID to equal, or be a registrable suffix of, the origin's effective domain, over HTTPS.
- **`workers.dev` is on the Public Suffix List**, so the RP ID must be the full `<name>.workers.dev`. Cookies are scoped to that registrable domain, not shared across `workers.dev` — which is good for isolation.
- ES256 assertion verification CPU cost: **not stated anywhere**, and not measured by us.

**Assessment:** viable in principle, unvalidated on this platform, and the largest implementation of the three options. Held as an alternative if a third-party identity provider is unacceptable.

## 8. Local measurements

**Purpose:** determine whether server-side password hashing can fit the 10 ms Workers Free CPU budget.

**Method:** Node v24.21.0 on the owner's machine, WebCrypto `PBKDF2` / `SHA-256` / 256-bit output, 5 runs per setting, median reported. This is **not** the Workers runtime — it is the same V8/WebCrypto family, used to establish order of magnitude. Script: `%TEMP%\opencode\pbkdf2-bench.mjs`.

**Actual output:**

```text
{"iterations":10000,"medianMs":2.63,"minMs":2.58,"maxMs":4.26}
{"iterations":100000,"medianMs":25.92,"minMs":25.25,"maxMs":27.3}
{"iterations":210000,"medianMs":54.86,"minMs":53.71,"maxMs":58.82}
{"iterations":600000,"medianMs":162.6,"minMs":160.25,"maxMs":193.48}
```

**Interpretation:** at 100,000 iterations a single hash costs ~26 ms — 2.6× the entire per-request CPU budget. At the OWASP-recommended 600,000 it is ~163 ms, 16×. Password authentication cannot be delivered on Workers Free without weakening the hash below a defensible minimum.

**Caveat, stated plainly:** this is a proxy measurement, not a Workers measurement. It establishes the order of magnitude, which is all that is needed to rule the approach out. If a future decision depends on a precise figure, it must be measured on a deployed Worker.

### 8.2 Board view assembly and serialisation

**Purpose:** establish whether the read path fits the 10 ms CPU budget. D1 query time is I/O and is excluded from CPU, so the constrained work is our own: assembling the view and serialising JSON.

**Method:** `npm run bench` (`benchmarks/board-view.ts`), Node v24.21.0 on the owner's machine, 50 warm-up iterations then 300 measured per size. Synthetic tasks with realistic titles, ~160-character descriptions, assignees and due dates.

**Actual output:**

```text
 tasks     payload     median        p95
     9       4.8 KB    0.032 ms    0.057 ms
    50      24.8 KB    0.145 ms    0.285 ms
   200      98.0 KB    0.546 ms    0.838 ms
   500     244.5 KB    1.443 ms    2.666 ms
```

**Interpretation:** at 500 tasks the CPU-bound work is ~15% of the 10 ms budget. At realistic sizes it is negligible. The bottleneck for this application is not CPU; it is whether the design stays simple.

**What this does not tell us:** local workerd tooling exposes span *duration* but not CPU time, so an end-to-end CPU figure requires a deployed Worker. That measurement is deferred to M9 and is recorded as such in §9.

## 9. Not verified

| Item | Why it matters | When to resolve |
|---|---|---|
| Whether Cloudflare Access works on `*.workers.dev` in practice | Would change AUTH-01 to Option B | Only if AUTH-01 revisits |
| Whether `@simplewebauthn/server` runs on Workers | Would change AUTH-01 to Option C | Only if AUTH-01 revisits |
| ES256 verification CPU cost | Same | Same |
| Actual Workers CPU per FlowQuery endpoint | The 10 ms budget is the key risk | M9, from Workers logs — local tooling exposes duration only, not CPU |
| D1 read-replication status | Beta at last check, requires the Sessions API | Not needed — single primary is fine at this scale |
| Latency from Bali to the D1 primary | Affects perceived speed | M9, with `apac` location hint |
| GitHub OAuth behaviour with a `workers.dev` callback | Blocks sign-in if wrong | M3, first attempt |

## 10. Bottom line

The stack is viable at **$0/month** with real headroom: static assets unmetered, API calls in the low hundreds per day against a 100,000/day allowance, and a database measured in megabytes against 500 MB.

The only hard constraint is **10 ms of CPU**, and it bites in exactly one place: password hashing. Every other operation the product needs — session verification, validation, JSON serialisation of a bounded board payload — fits with margin. Since D1 query time is excluded from CPU, the design should push work into the database and keep computation bounded, which is what `ARCHITECTURE.md` §7 specifies.

Email is not available at zero cost, which removes password reset and magic links from consideration and points decisively at an external identity provider.
