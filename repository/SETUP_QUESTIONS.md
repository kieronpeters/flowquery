# Repository Setup — Historical and Current

**Status:** partly historical. The local repository exists; the remote does not.

This document began as a list of questions to resolve before creating a GitHub repository. Most have been answered by events. The remainder are still open, and only the owner can answer them.

---

## 1. What is settled

| Question | Answer |
|---|---|
| Local path | `C:\Users\Asus\source\repos\FlowQuery` — in use since M1. The earlier preference for `C:\repos\flowquery` was abandoned because that directory does not exist. |
| Version control | Local Git on `main`. Created at M1 under DEC-030. |
| Remote repository | **Not created, not authorised.** |
| Default branch | `main`. |
| Commit style | Small commits, one concern each, imperative subject, body explains why. |
| Secrets | `.dev.vars` git-ignored before the first commit; `.dev.vars.example` committed. |

## 2. Still open — owner decisions

These matter when the remote repository is created, which has not been approved:

1. **GitHub account.** Personal account or an organisation? The earlier research recommended the personal account for a learning/portfolio project.
2. **Repository name.** `flowquery` was suggested; the product name is still a working title.
3. **Visibility.** Private is recommended while the app is pre-deployment.
4. **License.** A private repository needs none. Do not add MIT by default.
5. **Branch protection.** Availability depends on the account plan; a sole owner may prefer a lightweight PR habit rather than enforced rules.
6. **CI.** A GitHub Actions workflow running typecheck, lint and tests would be cheap and useful. Not configured.
7. **Collaborators.** None currently.

## 3. What the earlier research got wrong

- It assumed a company GitHub organisation might exist. It does not.
- It recommended `.github/` workflows "after CI choices are approved" — still true, still not approved.
- It discussed protecting `main` with rulesets before any repository existed. Moot until there is a remote.

## 4. Related documents

- `docs/DEPLOYMENT_PLAN.md` — deployment, which is a separate decision from source control.
- `docs/RUNBOOK.md` — how the project is run and restored.
- `docs/DECISIONS.md` — DEC-030 covers the local-repository authorisation.
