# Next Action

**M8 is complete. The build is finished. Deployment is the only milestone left — and it needs your explicit approval.**

## 1. Before deployment: two unverified paths

Neither is a known defect, and neither can be closed by me.

| Gap | How to close it |
|---|---|
| **Live GitHub sign-in** | Create the OAuth app, fill `.dev.vars`, sign in once. Five minutes. |
| **Drag-and-drop gesture** | Open a board, drag a card across and within a column. Ten seconds. |

I recommend doing both **before** deploying, so that if something is wrong you find it on `localhost` rather than on a live URL with your real data in it.

## 2. M9 — deployment, if and when you approve it

What it involves, and what it costs:

| Item | Detail | Cost |
|---|---|---|
| D1 database | Create the real database, replace the placeholder id | Free |
| Worker | `wrangler deploy`, Free plan | Free |
| URL | `<name>.workers.dev` | Free |
| Secrets | `wrangler secret put GITHUB_CLIENT_SECRET`, set `AUTH_ALLOWLIST` | Free |
| OAuth app | Add the production callback URL | Free |
| Domain | Not required | — |

**Total recurring cost: $0.** The checklist is in `docs/RUNBOOK.md` §8.

## 3. What I will do during M9

1. Walk the checklist with you, item by item, before anything is created.
2. Create only what is needed: one D1 database, one Worker.
3. Apply migrations; seed **nothing** (the seed inserts a placeholder user).
4. Verify a stranger cannot register.
5. Run the restore drill against the remote database.
6. Record the deployment version, timestamp and rollback procedure.

## 4. What I will not do

- No paid plan, no domain, no add-on, no billing activation.
- No automatic upgrade path.
- No deployment without a written "yes" from you for this specific step.

## A recommendation

Deploy to a `workers.dev` address first and use it for a week with the two of you. If it holds up, then consider whether it ever needs a domain. A domain is a recurring cost and a recurring decision; there is no reason to make it before the thing has proven useful.

**Current gate: owner review of M8.**
