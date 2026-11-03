# Next Action

**M7 is complete. Bob has an API. Approve M8 to finish the build.**

## 1. Try it yourself

1. `npm run db:reset && npm run dev`, sign in.
2. On a board row, click **Tokens**, create one, and copy the value — it is shown once.
3. In a shell:

```bash
export FLOWQUERY_API_TOKEN="fq_..."
curl -s -H "Authorization: Bearer $FLOWQUERY_API_TOKEN" http://localhost:5173/api/v1/agent/tasks?status=backlog
```

That is the workflow the whole project was built for: you read the backlog, Bob refines it.

## 2. Two manual checks still outstanding

**Drag-and-drop** and the **live GitHub sign-in**. Both are unverified by automation and both are recorded as open in the README, phase status and backlog. The sign-in is now the last thing between you and using this for real work.

## 3. Approve M8 — hardening and release preparation

The last milestone before deployment:

- Security headers (CSP, nosniff, referrer policy) and a review of every response
- Error handling: no stack traces, consistent shapes, request ids
- Rate limiting reviewed across the auth endpoints
- **Backup and restore drill repeated on the final schema**, including the token table
- Performance pass with the new endpoints measured against the 10 ms budget
- Full regression run and a written runbook (setup, backup, restore, rollback)
- A final security review of the two doors

## What I will specifically look for

Not "does it work" — 142 tests answer that. The questions for M8 are:

1. Can any error response leak internal detail?
2. Can a revoked token be used because of a caching or timing window?
3. Does a restore actually produce a working board, or just matching row counts?
4. What happens when D1 is slow or a quota is hit — does the UI degrade or break?

## Not in M8

Deployment (M9, separate approval). Notifications (dropped).

**Current gate: owner review of M7.**
