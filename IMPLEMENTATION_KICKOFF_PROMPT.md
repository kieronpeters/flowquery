# FlowQuery Implementation Kickoff Prompt (SUPERSEDED)

**Do not use this prompt.** It described the organisation → project → board hierarchy, slug-based routes and public board links, all of which have been removed from the product.

Superseded on **3 November 2026** by:

| Was | Now |
|---|---|
| `IMPLEMENTATION_KICKOFF_PROMPT.md` | [`MASTER_PROMPT.md`](MASTER_PROMPT.md) — Bob's current operating prompt |
| Organisation/project/board hierarchy | [`docs/MVP_SPECIFICATION.md`](docs/MVP_SPECIFICATION.md) — flat boards only |
| Ad-hoc implementation start | [`docs/MVP_ROADMAP.md`](docs/MVP_ROADMAP.md) — staged milestones with exit criteria |
| Workflow described in passing | [`docs/IMPLEMENTATION_GUIDE.md`](docs/IMPLEMENTATION_GUIDE.md) — propose, verify, review, close |

## Why it was replaced

The kickoff prompt was written to bootstrap a build under the previous product shape. Following it today would produce the wrong routes, the wrong data model and the wrong security model. It also front-loaded implementation detail before the access-control and authentication decisions were made — which is precisely the mistake the current roadmap avoids by placing authentication at M3, before the board is built.

## What to do instead

1. Read `MASTER_PROMPT.md` for Bob's role.
2. Read `docs/MVP_SPECIFICATION.md` and `docs/REQUIREMENTS.md` for scope.
3. Read `.flowquery/state/NEXT_ACTION.md` for what is actually next.
