# Migrations

Forward-only D1 schema migrations, applied in filename order.

Rules (from `docs/internal/DATABASE_DESIGN.md` §7):

- Files are named `NNNN_short_description.sql` and are apply-only, never edited
  after being applied anywhere.
- Apply locally with `wrangler d1 migrations apply flowquery-db --local`;
  remotely only when a deployment exists.
- Corrections are new migrations, not edits to old ones.
- Seeds are separate from migrations so production seeding is an explicit
  choice. `seeds/dev.sql` is local-only.
- Take an export before any destructive migration.

The tests apply every migration in order through `node:sqlite`, so schema
changes are exercised against the real SQL rather than a mock.
