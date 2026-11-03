# FlowQuery Backlog

Ordered by priority. M2 onward requires owner approval per milestone.

## Complete

### M0 — Specification
- [x] Audit the package; catalogue contradictions
- [x] Consolidate the product specification to the flat board model
- [x] Requirements, architecture, database, API, security and research documents
- [x] Single decisions register
- [x] Owner approved AUTH-01, AUTH-02, DEC-031, SCOPE-01, DEC-029, DEC-030

### M1 — Repository foundation
- [x] Local Git on `main`; no remote
- [x] `.gitignore` covering `node_modules/`, `dist/`, `.wrangler/`, `.dev.vars`, `.env*`
- [x] `.gitattributes`, `.editorconfig`, `.nvmrc`, Prettier, ESLint
- [x] TypeScript strict, split app/worker tsconfigs
- [x] Vite + Cloudflare plugin + React 19 + Hono
- [x] Vitest with 2 passing tests
- [x] `wrangler.jsonc` with SPA fallback and `run_worker_first: ["/api/*"]`
- [x] `GET /api/v1/health` and JSON-404 fallback
- [x] OpenCode agents activated at `.opencode/agents/`, verified discoverable
- [x] README verified against real command output

## Awaiting approval

### M2 — Walking skeleton
- [ ] D1 binding, local only
- [ ] `migrations/0001_init.sql` per `docs/DATABASE_DESIGN.md`
- [ ] `db:migrate:local` and `db:reset` scripts
- [ ] Seed 16 profiles + one demo board
- [ ] `GET /api/v1/columns`
- [ ] Read-only board rendered from D1
- [ ] Remove the M1 placeholder screen
- [ ] Record CPU measurement per endpoint
- [ ] Export/restore smoke test

## Not yet authorised

### M3 — Human authentication
- [ ] GitHub OAuth app registration (owner action: create the OAuth app)
- [ ] `AUTH_ALLOWLIST` keyed on immutable GitHub numeric IDs
- [ ] Session table, `__Host-` cookie, expiry, sign-out
- [ ] Origin check on mutating requests
- [ ] Tests for AUTH-001…011
- [ ] Measured CPU cost of the callback

### M4 — Boards
- [ ] Board CRUD with typed-name delete confirmation and cascade
- [ ] Dashboard, create, rename, delete flows
- [ ] Landing page and redirects

### M5 — Kanban and tasks
- [ ] Five-column board view with counts
- [ ] Task CRUD, priority, assignee, due date
- [ ] Drag-and-drop plus explicit keyboard move
- [ ] Optimistic updates with 409 reconciliation

### M6 — Comments and activity
### M7 — Agent API and tokens (isolation tests, OpenAPI)
### M8 — Hardening, restore drill, performance pass
### M9 — Deployment (separate approval; `workers.dev`)

## Technical debt

- [ ] Trim `design/DESIGN_DIRECTION.md` to the MVP shell
- [ ] Reconcile or mark historical `repository/SETUP_QUESTIONS.md`
- [ ] Delete the neutralised `memory/` mirror
- [ ] Confirm `npm audit` dev-chain findings stay dev-only at each dependency bump
