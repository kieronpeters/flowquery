# FlowQuery — Deployment Plan (M9)

**Status: NOT AUTHORISED. NOT POSSIBLE YET.**
Nothing in this document has been executed. No cloud resource exists.

---

## 1. Why it cannot run yet

| Blocker | Who clears it |
|---|---|
| `wrangler` is not authenticated on this machine (`You are not authenticated`) | Owner runs `npx wrangler login` |
| No written approval for creating cloud resources | Owner |
| No production GitHub OAuth app | Owner |
| The two manual checks (live sign-in, drag gesture) are still open | Owner |

The first one is absolute: without an authenticated Cloudflare account, `wrangler d1 create` and `wrangler deploy` cannot run at all.

## 2. What would be created

| Resource | Detail | Cost |
|---|---|---|
| One D1 database | `flowquery-db`, Free plan, ~1 MB initial | $0 |
| One Worker | `flowquery`, Free plan, 151 KiB upload | $0 |
| One hostname | `<name>.workers.dev` | $0 |

No domain, no paid plan, no add-on, no billing activation. Total recurring cost: **$0**.

## 3. Prerequisites the owner must supply

1. **Cloudflare login.** `npx wrangler login` opens a browser; the owner completes it. Nothing else needs doing on the Cloudflare dashboard.
2. **A production GitHub OAuth app** (a second app, or add the production callback to the existing one):
   - Homepage URL: `https://<name>.workers.dev`
   - Callback URL: `https://<name>.workers.dev/api/v1/auth/callback`
3. **The two GitHub numeric ids**, as in `.dev.vars` locally.
4. **A decision on the Worker name.** It becomes part of the public URL.

## 4. Exact commands, in order

```bash
# 1. Authenticate (owner, interactive)
npx wrangler login

# 2. Create the database; note the returned database_id
npx wrangler d1 create flowquery-db

# 3. Put that real id into wrangler.jsonc, replacing
#    00000000-0000-0000-0000-000000000000

# 4. Apply migrations to the remote database (no seed)
npx wrangler d1 migrations apply flowquery-db --remote

# 5. Secrets and configuration
npx wrangler secret put GITHUB_CLIENT_SECRET
# GITHUB_CLIENT_ID and AUTH_ALLOWLIST are non-secret vars in wrangler.jsonc or
# set with `wrangler versions secret put` / dashboard vars

# 6. Deploy
npm run build
npx wrangler deploy
```

## 5. Post-deploy verification

| # | Check | Expected |
|---|---|---|
| 1 | `https://<name>.workers.dev/api/v1/health` | `200`, version string |
| 2 | Load `/` in a private window | Landing page; no console errors |
| 3 | Sign in with an allowlisted account | Reaches the dashboard |
| 4 | Sign in with a non-allowlisted account | `403` / `login?error=not_allowed` |
| 5 | Create a board, a task, comment | All persist after reload |
| 6 | Check response headers on the document | CSP present (proves `_headers` works in production) |
| 7 | Create an agent token, call `/api/v1/agent/board` from a shell | `200` with the board |
| 8 | Revoke it, call again | `401` |
| 9 | Cloudflare dashboard → Workers metrics | Request count sane; no errors |
| 10 | Usage page | Free plan, nothing billable |

Step 6 is the one I cannot test locally: the asset layer's behaviour only exists in a deployed Worker.

## 6. Rollback

1. **Bad deployment, database intact:** redeploy the previous Worker version (`wrangler deployments list`, then `wrangler rollback`).
2. **Bad migration:** migrations are forward-only. Restore from an export taken before the migration.
3. **Wrong data:** `wrangler d1 export` before any risky step; Time Travel covers 7 days on Free.

## 7. What I will not do

- Create the database or Worker before the owner approves that specific step.
- Buy a domain, enable a paid plan, or activate billing.
- Apply the seed to production (it inserts a placeholder user and a demo board).
- Deploy with the placeholder `database_id`.

## 8. Recommendation

Deploy to `workers.dev` and use it for a week before deciding whether it needs anything else. A domain is a recurring cost and a recurring decision, and there is no reason to make it before the application has proven useful.
