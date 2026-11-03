# Next Action

**M8 is complete. M9 (deployment) is planned but blocked, and it needs three things from you.**

---

## 1. The deployment cannot start yet

| Blocker | Detail |
|---|---|
| **Not authenticated** | `wrangler whoami` → "You are not authenticated". No resource can be created until you run `npx wrangler login` and complete the browser step. |
| **No production OAuth app** | The callback URL has to match the deployed hostname, so a production app (or a second callback on the existing one) is required before sign-in works. |
| **No approval** | Creating cloud resources needs your explicit "yes" for that step, not a general "continue". |

The full plan — exactly what is created, the commands in order, post-deploy checks, rollback — is in `docs/DEPLOYMENT_PLAN.md`. Nothing in it has been run.

## 2. Two manual checks, still open

Both take under a minute and both are better done before deploying:

1. **Live GitHub sign-in.** Create the OAuth app, fill `.dev.vars`, sign in once on localhost.
2. **Drag a card** across columns and within one.

If either is broken, you want to find out on localhost rather than on a live URL.

## 3. What I did instead of deploying

- Validated the deployment artefact without an account: `wrangler deploy --dry-run` bundles 151.18 KiB, reads 6 static files, reports the D1 binding.
- Wrote `docs/DEPLOYMENT_PLAN.md`.
- **Found and fixed a serious bug in my own M8 work**: the `_headers` file was structurally invalid — `/* … */` is not a comment in that format, so the SPA document would still have received no security headers. Rewritten with `#` comments and a single `/*` rule, and the tests now assert the *structure*, not just that the strings appear.

## 4. When you are ready

Say so and I will:

1. Walk `docs/DEPLOYMENT_PLAN.md` with you, item by item.
2. Wait for `npx wrangler login` to complete.
3. Create one D1 database and one Worker. Nothing else.
4. Apply migrations; seed nothing.
5. Verify a stranger cannot register.
6. Repeat the restore drill against the remote database.
7. Record the deployment, and how to roll it back.

**Current gate: owner action on login and the OAuth app, then explicit approval for M9.**
