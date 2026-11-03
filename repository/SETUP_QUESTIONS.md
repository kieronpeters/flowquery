# Repository Setup Questions — Owner Confirmation Required

Bob must present these after completing the repository research report. Ask conversationally or as one compact form. Do not create the remote repository until the owner confirms the choices and explicitly authorises creation.

1. **GitHub account / organisation:** Please provide your personal GitHub username or profile URL so Bob can target the correct account. This is a personal learning/portfolio project; no company GitHub organisation is planned.
2. **Repository name:** Recommended `flowquery`. Keep this, or choose another?
3. **Visibility:** Private (recommended during development) or public?
4. **Default branch:** `main` (recommended)?
5. **Branch workflow:** Feature branches + pull requests, or simpler direct-to-main workflow initially? Recommendation: feature branches + PRs, even for a solo developer.
6. **Branch protection:** Require PRs and passing checks on `main` where supported? Recommendation: yes, with settings matched to the GitHub plan and team size.
7. **GitHub Projects / Issues:** Use GitHub Issues and Projects for initial backlog, or keep planning in Markdown until the FlowQuery app has its own board?
8. **License:** Private/no open-source license for now, or a specific license if public? Do not choose one without approval.
9. **Collaborators:** Any GitHub usernames to invite now? Optional.
10. **CI:** Approve a basic GitHub Actions workflow for documentation checks now, or defer until the application foundation milestone?
11. **Deployment:** Keep cloud deployment out of repository setup and decide during the deployment research milestone? Recommended: yes.
12. **Initial commit:** Approve a documentation-only initial commit containing the specification, team profiles, OpenCode agent prompts and `.flowquery/` memory structure?

## Approval gate

After the owner answers, Bob must summarise the exact repository configuration and ask for explicit permission to create the GitHub repository. The owner’s answers alone are not permission to create it unless they explicitly say to proceed.


## Local path confirmation

Preferred local Windows path is `C:\\repos\\flowquery`. Bob must inspect it first. If it already exists or contains a Git repository/files, report what is there and ask before modifying it.
