# FlowQuery — Security and Quality (SUPERSEDED)

**This document has been replaced. Do not follow its content.**

Superseded on **3 November 2026** by:

- [`SECURITY_AND_AUTH.md`](SECURITY_AND_AUTH.md) — threat model, authentication design, token handling, backups.
- [`REQUIREMENTS.md`](REQUIREMENTS.md) §2, §7, §9 — the testable security requirements (`AUTH-*`, `AGT-*`, `SEC-*`).

## Why it was replaced

The original document assumed an organisation/project hierarchy, public board links and a role model that no longer exist. Its statements about "organisation boundaries", "anonymous board-link permissions" and "organisation creator becomes owner" contradict the current product direction and would mislead any future session that read them.

## The one-line summary of the current security position

Authenticated humans only; no public links; a separate board-scoped bearer token for Bob; every query scoped by board in a single repository layer; tokens stored as SHA-256 hashes and revocable instantly; no secrets in the repository, logs or browser code.
