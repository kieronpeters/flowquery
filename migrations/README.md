# Migrations

Empty by design at M1.

The schema migration `0001_init.sql` and its seed data are created in **M2 (walking skeleton)**, when the D1 binding is first configured. Adding a migration before the binding exists would produce a directory that cannot be applied or verified.

Rules once this directory is in use (from `docs/DATABASE_DESIGN.md` §7):

- Files are named `NNNN_short_description.sql` and are apply-only, never edited after being applied anywhere.
- Apply locally with `wrangler d1 migrations apply <db> --local`; remotely only when a deployment exists.
- Corrections are new migrations, not edits to old ones.
- Seeds are separate from migrations so production seeding is an explicit choice.
- Take an export before any destructive migration.
