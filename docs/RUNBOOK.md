# FlowQuery — Runbook

Everything needed to run, back up, restore and recover this application. Written for a future session — or for the owner at 11pm with the site broken.

---

## 1. Prerequisites

- Node 22+ (developed on 24)
- Git
- No Cloudflare account for local work

## 2. Local setup

```bash
npm install
cp .dev.vars.example .dev.vars     # fill in GitHub OAuth values
npm run db:reset                   # create the local D1, migrate, seed
npm run dev                        # http://localhost:5173
```

`.dev.vars` is git-ignored. It must contain `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `AUTH_ALLOWLIST`. Without the first two, `/auth/start` returns `503` and nothing else breaks — that is deliberate.

## 3. Routine commands

| Command | Effect |
|---|---|
| `npm run dev` | Local app on 5173 |
| `npm test` | 149 tests (unit, route, real-schema) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates |
| `npm run bench` | CPU measurement for board and auth paths |
| `npm run db:migrate:local` | Apply migrations only |
| `npm run db:seed:local` | Apply seed data only |
| `npm run db:reset` | **Delete local data**, migrate, seed |

`db:reset` is destructive and local-only. It never touches a remote database.

## 4. Backup

```bash
npx wrangler d1 export flowquery-db --remote --output backups/flowquery-YYYY-MM-DD.sql
```

- Store exports outside the repository (`backups/` is git-ignored, but keep a second copy elsewhere).
- The Free plan includes 7 days of Time Travel; use it for "I deleted the wrong thing an hour ago", not for disaster recovery.
- Export before any destructive migration, and after any significant milestone.

**A backup has never been verified until it has been restored.** See §5.

## 5. Restore drill

The procedure, exercised at M2 and again at M8 against the final schema:

```bash
# 1. Take a fresh export
npx wrangler d1 export flowquery-db --local --output backups/drill.sql

# 2. Destroy local state completely
Remove-Item .wrangler/state -Recurse -Force      # PowerShell
# rm -rf .wrangler/state                          # bash

# 3. Restore the dump into an empty database
npx wrangler d1 execute flowquery-db --local --file=./backups/drill.sql

# 4. Verify
npx wrangler d1 execute flowquery-db --local --json \
  --command "SELECT (SELECT COUNT(*) FROM boards) b, (SELECT COUNT(*) FROM tasks) t, (SELECT COUNT(*) FROM agent_tokens) a;"
npx wrangler d1 execute flowquery-db --local --json --command "PRAGMA foreign_key_check;"
```

Success criteria, all four:

1. Row counts match the export.
2. `PRAGMA foreign_key_check` returns nothing.
3. A board renders in the UI.
4. **An existing agent token still works** — the token table restored with its hashes.

## 6. Rollback (for M9 onward)

Not yet applicable: nothing is deployed. When it is:

1. Cloudflare keeps previous Worker versions — redeploy the last good one.
2. Migrations are forward-only. A rollback of code is not a rollback of schema; if a migration is at fault, restore from an export instead.
3. Record the version and timestamp of every deployment.

## 7. Incident procedures

| Incident | Action |
|---|---|
| **Agent token leaked** | Revoke it on the board's Tokens panel. Effective on the next request. Check `last_used_at` and the activity feed for writes you did not make. |
| **Session compromised** | Sign out (deletes the row). To end every session, delete all rows in `sessions`. |
| **Board deleted by mistake** | Restore from the most recent export, or Time Travel to just before the deletion. Note that a restore rolls the whole database back, not one board. |
| **Site is down** | Check Cloudflare status, then Worker errors (`1102` = CPU, `1027` = daily request quota). Both are Free-plan limit errors, not billing. |
| **Suspicious traffic** | The allowlist blocks unknown humans; agent tokens are 256-bit. Look for repeated `401`s in Worker logs first. |

## 8. Pre-deployment checklist (M9)

- [ ] Owner approval, in writing, for deployment
- [ ] Real D1 `database_id` replaces the placeholder in `wrangler.jsonc`
- [ ] `wrangler secret put GITHUB_CLIENT_SECRET`
- [ ] `AUTH_ALLOWLIST` holds the two **numeric** GitHub ids
- [ ] `GITHUB_CLIENT_ID`/`SECRET` point at the production callback URL
- [ ] Migrations applied to the remote database
- [ ] Seed applied **only** if a fresh install is intended (it inserts a placeholder user)
- [ ] A stranger cannot register: try signing in with a non-allowlisted account
- [ ] Restore drill repeated against the remote database
- [ ] Usage dashboard checked; no paid feature enabled
- [ ] Rollback procedure written down

## 9. Known limitations

- Activity writes are best-effort; a failure is logged and does not fail the user's action.
- Local workerd exposes request duration but not CPU, so real CPU figures only come from a deployed Worker.
- `npm run db:reset` wipes local data with no confirmation prompt — it is a developer command, not a user action.
