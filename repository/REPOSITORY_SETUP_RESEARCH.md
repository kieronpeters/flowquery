# Repository Setup Research — 2 November 2026

## Current recommendation

Use **GitHub** as the source-control host, under the owner's **personal GitHub account**. This is a learning/portfolio project; do not create a company organisation. Ask for the exact GitHub username/profile URL if not known. Do not assume the GitHub organisation already exists.

Suggested repository name: `flowquery` (subject to name research and owner confirmation).

Suggested default branch: `main`. Use short-lived branches such as `feature/<scope>` and `fix/<scope>`. Protect `main` with pull-request review/required checks when the selected GitHub plan and account support the desired rules. For a solo owner, a lightweight PR workflow can still be used; do not create unnecessary ceremony.

## Official documentation findings

- DeepSeek's current API model identifier is `deepseek-flash`, served by its V4.1 Flash model family. DeepSeek documents direct OpenCode integration through `/connect`, choosing the `deepseek` provider, entering an API key and selecting the Flash model. Verify the actual model option shown by the installed OpenCode version. Sources: https://api-docs.deepseek.com/quick_start/agent_integrations/ and https://api-docs.deepseek.com/quick_start/agent_integrations/opencode/
- OpenCode supports project-local agent definitions in `.opencode/agents/`, with a Markdown file per agent. Agent definitions can set a role prompt, mode, model and permissions. Its configuration supports `subagent_depth`; default `1` allows the primary agent to launch subagents while preventing subagents from launching further subagents. Sources: https://opencode.ai/v2/docs/agents and https://docs.opencode.ai/docs/config/
- OpenCode's provider docs describe connecting credentials with `/connect`; credentials are stored in its local auth store rather than needing API keys committed to the repository. Source: https://docs.opencode.ai/docs/providers/
- GitHub repository creation, branch protection/rulesets, Actions and repository secrets should be configured from the repository's actual account/plan and current GitHub settings. Confirm feature availability before assuming enforcement capabilities.

## Recommended initial repository content

Create a documentation/agent foundation only:
- `README.md`
- `MASTER_PROMPT.md`
- `AGENTS.md`
- `docs/`
- `team/`
- `.opencode/agents/`
- `.flowquery/` project memory
- `design/`
- `templates/`
- `.github/` only after CI workflow choices are approved

Do not scaffold application source code in the documentation-only stage.

## Important unresolved research / setup items

- Confirm whether FlowQuery already has a GitHub organisation.
- Confirm GitHub plan and which branch rules are available.
- Confirm whether repository should be private or public.
- Confirm license (a private repository does not need an open-source license file; do not add MIT by default).
- Confirm whether GitHub Projects will be used for issues/board or FlowQuery's own board is the eventual product.
- Confirm whether external collaborators need access.
- Confirm CI workflow and whether deployment should be configured now or later.
- Confirm whether domain/trademark clearance is required before public naming. FlowQuery remains a preferred working name only.

## GitHub ruleset and plan caveat

GitHub documents repository rulesets as available for public repositories on GitHub Free (including Free for organizations) and for public/private repositories on Pro, Team and Enterprise Cloud. Protected branches also have plan-dependent availability. Therefore, if we choose a private repository under a free organisation, verify which protections are available to that exact account before assuming private-repo rulesets are enforceable. Sources:
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

Repository secrets can be configured at repository, environment or organisation level; do not put credentials in the Git repository. GitHub's current documentation describes the access required to manage these secrets.


## Owner's local directory preference

Preferred Windows project path: `C:\\repos\\flowquery`. Before using it, inspect whether the directory exists, whether it is already a Git repository, and whether it contains user data. Never overwrite or initialise over existing content without inspecting and asking first.

## Naming research required before final brand approval

Investigate `FlowQuery` and `Flow Query` as working names, exact matches and confusingly similar names in software/project management/workflow/AI developer tools, likely domain registrations and trademark registers relevant to Indonesia and international use. Include sources and research date. Do not purchase domains, file trademarks or make a legal-clearance claim.
