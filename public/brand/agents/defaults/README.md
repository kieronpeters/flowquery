# Agent default portraits

These are the immutable default images for the 16 non-human profiles. The UI
falls back to them when an agent has no uploaded picture and no explicit colour
choice. They are copied from `team/portraits/`, the canonical set recorded in
`team/TEAM_DIRECTORY.md`; the originals there are never modified.

| File | Profile id | Team id | Name | Role |
|---|---|---|---|---|
| `prf_bob.png` | `prf_bob` | `agent-bob` | Bob | Engineering Manager / Orchestrator |
| `prf_alex.png` | `prf_alex` | `agent-alex` | Alex | Senior Software Engineer / Tech Lead |
| `prf_sarah.png` | `prf_sarah` | `agent-sarah` | Sarah | QA & Test Automation Engineer |
| `prf_olivia.png` | `prf_olivia` | `agent-olivia` | Olivia | Business Analyst |
| `prf_daniel.png` | `prf_daniel` | `agent-daniel` | Daniel | Backlog & Delivery Planner |
| `prf_marcus.png` | `prf_marcus` | `agent-marcus` | Marcus | DevOps & CI/CD Engineer |
| `prf_james.png` | `prf_james` | `agent-james` | James | Release & Deployment Engineer |
| `prf_victoria.png` | `prf_victoria` | `agent-victoria` | Victoria | Security Engineer / Independent Code Reviewer |
| `prf_chris.png` | `prf_chris` | `agent-chris` | Chris | Database Architect / DBA |
| `prf_emma.png` | `prf_emma` | `agent-emma` | Emma | UX/UI Designer |
| `prf_liam.png` | `prf_liam` | `agent-liam` | Liam | Product Manager / Product Owner |
| `prf_priya.png` | `prf_priya` | `agent-priya` | Priya | Technical Writer / Developer Documentation Specialist |
| `prf_ethan.png` | `prf_ethan` | `agent-ethan` | Ethan | Data & Analytics Engineer |
| `prf_rebecca.png` | `prf_rebecca` | `agent-rebecca` | Rebecca | Customer Success & Support Specialist |
| `prf_noah.png` | `prf_noah` | `agent-noah` | Noah | IT Operations & Developer Tooling Specialist |
| `prf_contractor.png` | `prf_contractor` | `contractor` | Contractor | Anonymous external specialist |

## Status

These are the repository's existing canonical portraits at 512 x 512. They are
**interim** defaults: the requested cinematic intelligence-agency set could not
be generated because the image service returned "Insufficient account funds".
Replacing them is a file swap — keep the filenames and dimensions, and update
this table if the roster ever changes. `prf_contractor.png` is currently a
generic silhouette and should be replaced first.

The full team overview poster is deployed at
`public/brand/flowquery-ai-development-team-overview.png` and shown whole at the
top of `/agents`. Its lower panels contain fictional names that are not the
FlowQuery roster; the page labels it as illustrative and the directory below is
authoritative. A copy of the source is kept at
`docs/brand/agents/flowquery-ai-team-overview-original.png`, and the retired
banner crop at `docs/brand/agents/flowquery-ai-team-hero-banner.jpg`.
