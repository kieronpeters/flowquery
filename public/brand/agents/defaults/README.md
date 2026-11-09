# Agent default portraits

The immutable default avatars for the 16 non-human profiles. They are the
approved illustrated portraits from `FlowQuery_Corrected_AI_Team_Art_Pack/agents/`,
cropped from the corrected team artwork. Every file is 512 x 512 and square, so
it drops cleanly into a circular avatar.

The UI falls back to these when an agent has no uploaded picture and no explicit
colour choice. The central map is `src/shared/agent-portraits.ts`; the filenames
here are the canonical profile ids with a `.png` extension.

| File | Profile id | Team id | Name | Role |
|---|---|---|---|---|
| `prf_alex.png` | `prf_alex` | `agent-alex` | Alex | Senior Software Engineer |
| `prf_bob.png` | `prf_bob` | `agent-bob` | Bob | Engineering Manager |
| `prf_chris.png` | `prf_chris` | `agent-chris` | Chris | Database Architect |
| `prf_daniel.png` | `prf_daniel` | `agent-daniel` | Daniel | Backlog & Delivery Planner |
| `prf_emma.png` | `prf_emma` | `agent-emma` | Emma | UX/UI Designer |
| `prf_ethan.png` | `prf_ethan` | `agent-ethan` | Ethan | Data & Analytics Engineer |
| `prf_james.png` | `prf_james` | `agent-james` | James | Release & Deployment Engineer |
| `prf_liam.png` | `prf_liam` | `agent-liam` | Liam | Product Manager |
| `prf_marcus.png` | `prf_marcus` | `agent-marcus` | Marcus | DevOps & CI/CD Engineer |
| `prf_noah.png` | `prf_noah` | `agent-noah` | Noah | IT Operations & Developer Tooling |
| `prf_olivia.png` | `prf_olivia` | `agent-olivia` | Olivia | Business Analyst |
| `prf_priya.png` | `prf_priya` | `agent-priya` | Priya | Technical Writer |
| `prf_rebecca.png` | `prf_rebecca` | `agent-rebecca` | Rebecca | Customer Success & Support |
| `prf_sarah.png` | `prf_sarah` | `agent-sarah` | Sarah | QA & Test Automation Engineer |
| `prf_victoria.png` | `prf_victoria` | `agent-victoria` | Victoria | Security & Code Review |
| `prf_contractor.png` | `prf_contractor` | `contractor` | Contractor | External Specialist |

## Replacement and restore

An uploaded picture is stored in D1 and wins over the default. For an agent,
choosing a drawn colour is also a customisation. **Restore default** clears both
and returns the matching file above. Nothing in the application writes to this
folder; the supplied originals are never overwritten.

## Banner

`public/brand/flowquery-ai-development-team-overview.png` is the corrected
1536 x 655 overview banner, shown whole at the top of `/people` with
`object-fit: contain` and its natural aspect ratio. Its names and roles match
this table.

## Superseded

The older fictional poster and its 19 crops (`alice`, `blake`, `cora`, `dex`,
`elara`, `finn`, `gina`, `hux`, `ivy`, `jax`, `kai`, `lena`, `milo`, `nora`,
`orion`, `pax`, `quinn`, `rex`) were superseded by this corrected set and
removed during the repository cleanup. They must not be presented as the
roster.
