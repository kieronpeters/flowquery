# Human administrator default avatars

The approved default portraits for the two human accounts. They are keyed by
the immutable GitHub numeric id, which is the identity key used by the
allowlist and `auth_identities`; display names are never used.

| File | GitHub id | FlowQuery account | Profile |
|---|---|---|---|
| `kieron-default.png` | `51761129` | Kieron | `prf_user_usr_F7NNF62ZPW1B7Z8P9TZKFZDP7R` |
| `abdul-default.png` | `37402145` | Abdul (after first sign-in) | `prf_abdul` (pre-created) |

The single mapping is `src/shared/human-default-avatars.ts`. Abdul's profile is
pre-created before his first sign-in, so `prf_abdul` is used as a fallback
until his `auth_identities` row exists. The GitHub id takes precedence once it
does.

These files are immutable defaults. An upload is stored in D1 and wins; removing
it restores the file above. Nothing in the application writes to this folder.

Images are 627 x 627 PNG, square and suitable for circular crops.
