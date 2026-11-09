# Agent Activity Log

Significant actions and their verified outcomes. Newest first. Facts only — no hidden reasoning, no secrets.

---

## 2026-11-09 — Repository simplification (local)

**Requested by the owner:** simplify the repository, remove obsolete and duplicated material, consolidate documentation and AI instructions, and point everything at the public repository.

**Removed:** `memory/` (deprecated mirror), `repository/` (historical setup research), root `templates/`, `design/` concept images (6.4 MB), `team/profiles/`, `team/portraits/`, the 11 completed M1–M8 handoffs, the empty per-agent contact files, `IMPLEMENTATION_KICKOFF_PROMPT.md`, `PACKAGE_CONTENTS.md`, `SECURITY_AND_QUALITY.md`, and the executed `DEPLOYMENT_PLAN.md`.

**Consolidated:** `team/TEAM_DIRECTORY.md` and `team/AGENT_OPERATING_MODEL.md` moved to `docs/agents/`; the engineering documents moved to `docs/internal/`; `docs/README.md` is the single index; `DESIGN_DIRECTION.md` moved to `docs/internal/`. Root `AGENTS.md` is now the single source of development instructions, with the engineering rules folded in; `docs/AGENTS.md` was removed. The Worker catalogue now imports only `docs/**/*.md`; `DocsPage` no longer special-cases `team/`.

**References:** repository-wide path rewrite for the moved documents; the public repository URL is used throughout; `AI_AGENT_ENTRYPOINT.md`, the onboarding prompt and project state now describe the repository as public.

**Migrations:** `0012_clear_legacy_avatar_paths.sql` clears the `team/portraits/` values from `team_profiles`; `0013_bob_profile_text.sql` corrects Bob's About text. Neither applied to production.

**Verification:** typecheck, lint, format:check, **394 tests**, build. A Markdown link checker found 0 broken relative links in `docs/`. The built worker bundle contains all 22 documents under `docs/` and no `team/` or `docs/AGENTS.md` path.

**Exposure note:** the repository is already public. `docs/internal/TECHNICAL_RESEARCH.md` records the owner's real email address as the local Git identity. It is already in Git history and on `main`; it was left in place for owner review rather than silently rewritten.

**Not done:** nothing pushed, merged or deployed. The branch is `refactor/repository-simplification`.

---

## 2026-11-09 — Bob operating model and direct ticket links released

**Release:** PR #10 (`feature/bob-manager-operating-model` → `main`), merge `10aa71a`; branch deleted locally and remotely. `main` and `origin/main` match. Deployed from `main` as version `d3d09443`. Post-deploy: health `200`, `/boards`, `/people`, `/docs/...` and a direct ticket route `200`, anonymous docs API `401`, and the deployed bundle carries `drawer-breadcrumb`, `drawer-ticket-link` and `Copy ticket link` with no private-instance footer note. 393 tests pass.

---

## 2026-11-09 — Bob operating model and direct ticket links (local)

**Requested by the owner:** make Bob the platform-independent AI manager, document the single-token recommended model, and add direct ticket URLs.

**Implementation:** `/boards/:boardId/tickets/:ticketId` opens the task drawer from the URL; refresh and back/forward work; an unknown id shows a not-found message. Board and ticket ids were already opaque `brd_`/`tsk_` values from 16 random bytes, so no data migration was needed. The universal prompt, master entry point, team operating model, Bob's instructions, API/security/user docs, decisions and project brief now describe Bob as the running AI manager, not an OpenCode session. Specialists remain profiles and are delegated through Bob.

**Verification:** typecheck, lint, format, **393 tests**, build. Manual browser test on `Agent Bob Test Board` (`brd_WJX7KBV7YMD26548FS790KSZE0`): five tasks across the five columns, card opened a direct ticket URL, refresh preserved it, back/forward worked, an invalid id showed the not-found message, a comment was added, a move changed columns, and activity recorded the events. Bob's board token added a comment and moved a ticket; activity attributed both to Bob, then the token was revoked.

**Follow-up:** the four move arrows were removed from the ticket drawer. Dragging, in-column ordering and the **Status** selector remain; the selector was verified moving a ticket from Review to Done. The board-page tests now use the status selector instead of the arrows. A **Copy ticket link** button was added to the drawer header; it copies the absolute ticket URL and shows a read-only fallback if the clipboard is blocked. Card titles are now real links to the ticket URL, so they can be opened in a new tab or copied. The ticket sidebar header now shows Task > title as a link; saving an existing ticket keeps it open and updates that link. **393 tests pass.** The footer's private-instance note was also removed; the footer now carries only the wordmark.

**Not done:** nothing further outstanding. The test board and its tickets remain in local D1 for owner review.

---

## 2026-11-09 — Header tabs and one People directory released

**Release:** PR #9 (`people-nav` → `main`), merge `97d44ff`; branch deleted locally and remotely. `main` and `origin/main` match.

**Deployed:** version `4dfb09c7`; no migration. Post-deploy: health `200`, `/boards`, `/people`, `/docs/...` and `/agents` `200`, anonymous docs API `401`, and the tab, footer and banner markers present.

**Contents:** primary tabs in the header (Boards, People, Docs, About, Test a token), a minimal footer, the Agents page consolidated into People, the team banner on People, `/agents` redirecting to `/people`, and the duplicate profile-menu link removed. Docs updated to match.

**Verified:** typecheck, lint, format check, **377 tests**, build; local DOM confirmed tab order and active states, the banner, the redirect, and People staying active on profile pages.

---

## 2026-11-09 — Universal AI onboarding and docs released

**Release:** PR #8 (`ai-onboarding-docs` → `main`), merge `d0512aa`; release branch deleted locally and remotely. `main` and `origin/main` match. Local dev servers stopped.

**Deployed:** version `64e2433e` from `main`; no migration required. Post-deploy: health `200`, `/boards` and `/docs/agents/ai-agent-entrypoint` `200`, anonymous `/api/v1/docs` and the document endpoint `401`, all 10 logo SVGs `200`, the DocsPage chunk present, and no documentation text in the client bundle.

**Contents:** the Boards onboarding panel with one universal prompt, the repository Markdown docs browser, the master entry point, user guides and internal index, and the 10 official tool marks.

**Verified before release:** typecheck, lint, format check, **381 tests**, build.

---

## 2026-11-09 — Universal AI onboarding panel and documentation browser

**Requested by the owner:** a compact onboarding panel on the Boards page that copies one universal prompt, plus a documentation section that renders repository Markdown, with search, navigation and separated audiences.

**Panel:** first element in the authenticated Boards page, above the `Boards` heading. Dark navy/cyan gradient, 10 official tool marks (Simple Icons and LobeHub icons), and **Copy AI onboarding prompt**. Clipboard success shows a confirmation; failure reveals the prompt in a read-only textarea. The prompt contains the live base URL, the entrypoint URL and the private repository URL, with no token.

**Docs:** `GET /api/v1/docs` and `/api/v1/docs/:slug` are session-gated and read `docs/**` and `team/*.md` at build time. The client never bundles internal docs. `/docs` renders Markdown with `react-markdown` + `remark-gfm`, groups navigation into Agents, User guides and Internal, and filters by title and headings. Repository-relative links are mapped to docs routes.

**Content:** added `docs/agents/AI_AGENT_ENTRYPOINT.md`, three user guides, and an internal index. Existing engineering documents stay in place; the internal index groups them. The canonical roster is unchanged.

**Verified:** typecheck, lint, **381 tests**, build. Local API returns 25 documents, the entrypoint, and 401 without a session; the panel sits above the heading with all 10 logos loaded; the docs page renders the roster table and maps links; search filters correctly.

**Not done:** nothing committed, pushed, merged or deployed.

---

## 2026-11-09 — Corrected AI team artwork and cleanup released

**Release:** PR #7 (`artwork-final` → `main`), merge `86a0b65`. Release branch deleted locally and on the remote; `main` and `origin/main` match. Local dev servers stopped.

**Contents:** the corrected 1536×655 team banner and 16 illustrated portraits (512×512) for the canonical roster, mapped by profile id. The superseded fictional poster and banner were deleted, the integrated pack ZIP removed, and `*.zip` added to `.gitignore`. Original team portraits, design concepts, logo source, documentation and `.flowquery/` history retained.

**Verification:** typecheck, lint, format check, **370 tests**, build; built assets hash-match the pack; local DOM showed 16 correct portraits and the full banner.

**Deployment:** **pending.** Production remains on version `08fffc21`; no CI runs on merge. Run `npm run deploy` from `main` when approved.

---

## 2026-11-09 — Corrected AI team pack: banner and all 16 portraits

**Requested by the owner:** replace the previous poster and the Bob-only crop with the corrected pack, whose banner and portraits use the real 16-agent roster.

**Mapping:** all 16 supplied files match the canonical names exactly and were copied to `public/brand/agents/defaults/prf_<name>.png` (512×512, SHA-256 identical): alex, bob, chris, contractor, daniel, emma, ethan, james, liam, marcus, noah, olivia, priya, rebecca, sarah, victoria. No fictional poster names, no Rex, no human avatars, no renaming.

**Banner:** the corrected 1536×655 image is now `public/brand/flowquery-ai-development-team-overview.png`; `AgentsPage` uses `width={1536} height={655}` and the existing `object-fit: contain`/`height: auto` CSS, so it is shown whole. The caption now says the directory opens each profile.

**Replacement/restore:** unchanged. The central map already pointed at these filenames, so Restore default returns the matching corrected portrait; uploads remain in D1 and never touch the files.

**Verified:** typecheck, lint, **370 tests**, build; every copied file hash-matches the pack, and the local page renders the new banner and portraits.

**Not done:** nothing committed, pushed or deployed.

---

## 2026-11-09 — Poster profile crops: Bob matched, 18 unmatched

**Requested by the owner:** use the individual poster crops as agent profile pictures, matching only exact canonical names and reporting anything unmatched.

**Mapping:** of 19 crops, only `bob.png` matches a canonical name. It is now `public/brand/agents/defaults/prf_bob.png` (285×285, SHA-256 identical to the supplied crop). The other 18 — alice, blake, cora, dex, elara, finn, gina, hux, ivy, jax, kai, lena, milo, nora, orion, pax, quinn, rex — have no exact application profile. They are deliberately unused; no role-similarity mapping, no renaming, and Rex is not assigned to a person. The other 15 canonical agents keep their existing defaults.

**Implementation:** no code change. The central map already points `prf_bob` at the file, and upload/replace/restore continue to work; restoring Bob returns this poster crop.

**Verified:** typecheck, lint, **370 tests**, build. The local dev server serves the new crop at 285×285 and the Bob row renders it.

**Not done:** nothing committed, pushed or deployed.

---

## 2026-11-09 — Agent profiles and visual pack released

**Release:** PR #6 (`agent-profiles` → `main`), merge `bf13f63`. Branch deleted locally and on the remote; every branch is contained in `main`. Local dev servers stopped.

**Production:** migration `0011` applied before the deploy; all 16 non-human profiles now have About, Skills and Development. Deployed from `main` as version `08fffc21`.

**Verified after deploy:** health `200`; CSP present; `/agents` `200`; the full overview poster, agent defaults and human defaults all `200`; anonymous `/api/v1/profiles` `401`; `/auth/start` `302`; the deployed poster SHA-256 matches the source; the worker bundle contains both human default paths; the client bundle references the full poster and the agent default map, and not the retired banner.

**Known gaps:** the agent portraits are the repository's existing 512×512 canonical set, not a new cinematic set (the image service had insufficient funds); the contractor is a silhouette; phone layout is not visually verified.

---

## 2026-11-09 — Full team overview poster replaces the banner hero

**Requested by the owner:** use the complete `flowquery-ai-development-team-overview.png` as the `/agents` hero, not the cropped banner. The full image must be visible, uncropped, with the whole agent grid.

**Decision:** this overrides the earlier pack guidance to use the banner. The owner explicitly approved showing the full poster, whose lower panels name fictional agents. The page captions it as illustrative and keeps the real roster below.

**Implementation:** copied to `public/brand/flowquery-ai-development-team-overview.png` (1536×1024, hash-identical to the root file); `AgentsPage` references it with `width={1536} height={1024}`; CSS uses `width: 100%; height: auto; object-fit: contain`, so the aspect ratio is preserved and nothing is cropped. The retired banner moved to `docs/brand/agents/` and is no longer referenced or built.

**Verified:** typecheck, lint, **370 tests**, build. The built bundle references only the new image; the dev server serves it as `image/png` and the old banner path no longer resolves to an image.

**Not done:** nothing committed, pushed or deployed.

---

## 2026-11-09 — Human administrator default avatars

**Requested by the owner:** use the two supplied portraits as Kieron's and Abdul's default human avatars, keep them replaceable and restorable, and do not touch AI agent avatars.

**Identity mapping:** keyed by the immutable GitHub numeric id — Kieron `51761129`, Abdul `37402145` — from the approved allowlist and `auth_identities`. Display names are not used. Abdul's `prf_abdul` profile exists before his first sign-in, so the profile id is a documented fallback until his identity row exists; the GitHub id wins once it does.

**Implementation:** images copied to `public/brand/humans/` and mapped in `src/shared/human-default-avatars.ts`. `/auth/me`, the profile list and the profile detail now fall back to the supplied default after an upload, before the GitHub avatar. A human with an upload sees **Restore default**; removing it clears the D1 upload and returns the supplied file. Agent avatars and mappings are untouched.

**Security:** no auth or allowlist changes; uploads remain session-gated and limited to the account's own human profile (another human gets `403`). The mapping is server-side static data; no client-supplied id is trusted.

**Verified:** typecheck, lint, **370 tests**, build. New tests cover Kieron's `/auth/me`, the directory showing both defaults unswapped, Abdul after sign-in, upload-then-restore, and Kieron being refused Abdul's picture. Locally the dev server serves both PNGs with `200`.

**Not done:** nothing committed, pushed or deployed.

---

## 2026-11-09 — Agent visual pack: team hero, default portraits and Restore default

**Requested by the owner:** use the supplied team overview artwork at the top of `/agents`, make each canonical agent's portrait their default avatar, allow replacement and restoration, and keep the roster accurate.

**Artwork decision:** the pack's full overview contains fictional names in its lower panels (Alice, Blake, Cora…). Its supplied banner crop is the same artwork without those panels, so the hero uses the banner (`public/brand/agents/flowquery-ai-team-hero.jpg`) and the full original is archived at `docs/brand/agents/` as a non-deployed reference. No later poster variant is used and no fictional name is presented.

**Portraits:** the image service rejected all 16 generation jobs with "Insufficient account funds", and the supplied zip contains only hero images. With the owner's agreement, the repository's existing canonical portraits in `team/portraits/` are copied to `public/brand/agents/defaults/` as interim defaults; `prf_contractor.png` is still a silhouette. They are 512×512 square, not the requested cinematic set. Replacing them is a file swap with the same names.

**Implementation:** `src/shared/agent-portraits.ts` is the single id-to-portrait map. `ProfileAvatar` precedence is upload → chosen colour → default portrait → drawn SVG → initials, and it now takes a profile id. Board cards and the activity feed use `ProfileAvatar` too, so an upload appears everywhere. `DELETE /profiles/:id/image` now also clears a chosen colour for non-humans; the profile page labels "Default portrait" or "Custom avatar" and offers Restore default.

**Verified:** typecheck, lint, **363 tests**, build. Tests cover the hero path, default portrait rendering, the custom marker, Restore default calling DELETE, and the server clearing `avatar_path`. Locally the dev server serves the hero and all 16 portraits with `200`.

**Not done:** nothing committed, pushed or deployed; migration 0011 still not applied to production. The cinematic portrait set remains outstanding.

---

## 2026-11-09 — Agent profiles: appearance moves to the profile, and every agent gets a purpose

**Requested by the owner:** make the agents obvious — pressing a name opens the profile; remove the picture/colour buttons from `/agents` and put them on the profile picture; the row action becomes “View profile”; fill in each agent’s details and purpose from the defined roles.

**Shipped on branch `agent-profiles`:** `/agents` is a list of links with no appearance controls. Upload, remove and the eight colour swatches now sit under the picture on `/profiles/:id`, shown only when `canEdit` (your own human profile or any agent). The server rules did not change: humans still cannot set a drawn avatar, and only your own profile or an agent’s can be edited.

**Migration `0011_agent_profile_text.sql`:** writes About, Skills and Development for all 16 non-human profiles using `COALESCE`, so text already written by a person is never overwritten. Verified against a fresh SQLite database built from every migration plus the seed: 16 profiles, all three fields populated.

**Verified:** typecheck, lint, tests (**358**, 31 files), build all pass. Tests cover the directory links, the absence of appearance controls on `/agents`, choosing a colour from the profile, no colour on a human profile, and the seeded agent text.

**Not done:** migration not applied to production, nothing committed, deployed or pushed. The wording of the agent descriptions is a first draft for the owner to review.

---

## 2026-11-09 — Profile pages v2: a full-size picture preview

**Requested by the owner:** the profile picture could not be seen large anywhere; make it viewable at a decent size, keep the list of everyone, and keep other humans view-only.

**Clarified with the owner:** view every profile, edit only your own or an agent's (the LinkedIn/Facebook model). Point 1 of the request said “own profile only”, but points 2 and 3 said view-only for other humans; the owner confirmed the latter.

**Shipped on branch `profile-pages-v2`, version `1ae37931`:** the picture is 240px on the page and opens a dimmed overlay sized to 72% of the smaller viewport edge (220–560px), closed by Close, Escape or a click on the backdrop. Focus moves to the close button and returns to the picture. Initials-only profiles get no “View larger” affordance. People was added to the account menu. No schema or server change; the branch is built from `profile-pages`.

**Verified:** typecheck, lint, tests (**358**, 31 files), build and preflight all pass. After deploy: health `200`, CSP present, `/about` `200`, `/auth/start` `302`, anonymous `401` on `/profiles` and `/profiles/prf_abdul`, and the 240px picture, “View larger” trigger and `.picture-preview` overlay all present in the deployed bundle.

**Not verified:** the overlay in a real signed-in browser and on a phone.

**Git:** committed locally on `profile-pages-v2`. **Not merged and not pushed.**

**Follow-up (same day):** the owner then asked to push, open a PR, merge and deploy from `main`. PR #5 merged as `40adffd`; `main` and `origin/main` are the same commit and every local and remote branch has 0 commits outside `main`. Redeployed from `main` as version `e696b299` — no assets changed, confirming the tree matches the tested build — and the post-deploy checks passed again.

---

## 2026-11-09 — Profile pages, the people directory and the new brand pack

**Requested by the owner:** dedicated profile pages with a large picture and optional About/Skills/Development text, editable only for your own profile and for agents; the new art pack integrated across the site; and the production allowlist updated for Abdul.

**Decided with the owner:** every signed-in human may view every profile, LinkedIn-style, but only your own or an agent's may be edited; agents get the same prose fields as humans; `/people` is the directory and `/agents` stays the appearance editor.

**Schema — migration `0010_profile_details.sql`:** nullable `about`, `skills`, `development` on `team_profiles`, with length CHECKs. Applied to production before the deploy; all three columns confirmed present.

**Shipped on branch `profile-pages`, version `bdf11702`:** `/people` and `/profiles/:profileId`, a 192px picture with upload/remove, a read-only notice on another human's page, "View my profile" in the account menu, and profile links from `/agents` and the footer. Authorisation is one shared function (`services/profile-access.ts`) used by both the picture and text endpoints, so a human cannot edit another human (403) while agents remain editable. The art pack's 1435×350 wordmark replaces the old 480×117 one in the header, footer, landing and sign-in pages; all browser and PWA icons moved under `public/brand/icons/` with the old root duplicates removed; the full original composition is archived at `docs/brand/` (not deployed); and `docs/internal/BRAND.md` records paths, sizes and rules.

**Allowlist:** production `AUTH_ALLOWLIST` set to `51761129:Kieron,37402145:Abdul`; the exact string parses to both numeric ids, and Kieron's existing `github:51761129` identity is unchanged, so his account is not recreated. Abdul still needs to complete a first sign-in.

**Verified:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run preflight` all pass — **355 tests**, 31 files. After deploy: health `200`; CSP present; `/about` and `/login` `200`; `/auth/start` `302`; anonymous `401` on `/api/v1/profiles` and `/api/v1/profiles/prf_bob`; logo, favicon and PWA icon assets `200`; `index.html` and the manifest carry the new `/brand/` paths; every new UI marker present in the deployed bundle. In a local preview the logo measured 131×32 in the header and 82×20 in the footer against a 1435×350 source — the same ratio, so no distortion.

**Not verified:** the signed-in profile pages in a real browser (the local preview has no OAuth session), the OS file-picker, and any flow on a phone.

**Git:** committed locally on `profile-pages`. **Not merged and not pushed**, as instructed.

---

## 2026-11-04 — Improvements v3: profile pictures, and tokens chosen by agent

**Requested by the owner:** a picture upload in the profile menu, per-agent pictures on the agents page (a drawn default or a custom upload), and token creation simplified to choosing an agent from a list with one token each, rotatable in one press.

**Decided with the owner:** pictures stored in D1 rather than R2 (DEC-036); the token dropdown covers the 16 non-human profiles, including the contractor (DEC-037).

**Schema — migration `0009_profile_images.sql`:** a `profile_avatars` table (one row per profile, base64 plus MIME, capped); `agent_tokens.profile_id` added and backfilled by matching the old free-text label to a profile name; a partial unique index allowing one live token per agent per board. Applied locally first: 5 commands, no errors.

**Shipped:** PR #4, merge `7ebf06a`, deployed as version `11046318`. The migration was applied to production **before** the deploy, and the backfill was checked first: Bob's token now carries `profile_id = prf_bob`, and `profile_avatars` plus `idx_tokens_one_live_per_profile` both exist. Verified after deploy: health `200`, CSP present, `/about` `200`, `/auth/start` `302`; anonymous `401` on `/avatars/prf_bob`, `/profiles` and `/boards`; an agent token gets `401` on a picture and `404` trying to issue a token, while `/agent/board` and `/agent/tasks` still return `200`; every new UI marker present in the deployed bundle.

**A note on the post-deploy check:** the first run reported every UI marker missing. It was not a bad deploy — the edge served the previous `index.html` for a moment, so the check fetched an asset name that no longer existed and compared against an error page. Re-run a minute later, all markers were present. Worth remembering before treating a failed marker check as a failed deploy.

**Fixed a real defect on the way:** agent activity is attributed by matching `actor_name` against `team_profiles.display_name`, so a hand-typed token label could silently detach an agent's actions from its name and avatar. The label is now copied from the profile.

**Security:** SVG uploads refused (a document that can carry script, served from our own origin); magic bytes checked against the declared MIME type, so a mislabelled file is rejected rather than trusted; size checked on decoded bytes; a human may change their own picture and any agent's, but not another human's (403); the image endpoint is session-gated, so an agent token cannot read one.

**Verified:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — all pass, **332 tests** (29 files). In a browser against the dev server: upload resized 400×300 to 256×256 and stored it; the picture appeared on `/agents` and in the header; Remove picture fell back to initials; the dropdown listed 16 agents and omitted the one holding a token; rotating showed a new plaintext and moved the old row into "Revoked tokens"; the rotated token returned `200` from `/api/v1/agent/board` and `/api/v1/agent/tasks`, and the database held exactly one live row for that agent.

**Not verified:** the OS file-picker dialog (suppressed so the app's own code could run), and the flows on a phone.

**Mistake worth recording:** mounting the avatar router at `/api/v1` made its session middleware apply to every API route, so agent tokens started returning `401`. Found by the test suite; fixed by mounting it at `/api/v1/avatars`.

---

## 2026-11-04 — Improvements v2 merged and deployed

**PR #3** (`improvements-v2` → `main`), merge `0841b3f`, deployed as version `8bdda078`. Nine commits: branding and footer, About page, profile menu with a GitHub avatar, agent avatars and `/agents`, board search and filters, overdue marking, keyboard shortcuts, the new-since marker, an error boundary, a web manifest, undo on delete, and the board description.

**Approval:** refused by GitHub, as before — a pull request cannot approve itself and the repository has one collaborator. A review comment was recorded; the merge proceeded.

**Verified after deploy:** health `200`; CSP on the document; the manifest serves as `application/manifest+json` with three icons; `/about` `200`; `/auth/start` `302`; unauthenticated API `401`; and every new UI marker is present in the deployed bundle. Migrations 0007 and 0008 applied, and `boards.description` plus `users.avatar_url` confirmed with `pragma_table_info`.

**GitHub was unstable during this round:** two pushes and one PR creation failed with `Internal Server Error` and a GraphQL error, then succeeded on retry. Nothing was lost; the retries are noted so the pattern is not mistaken for a local problem.

---

## 2026-11-03 — Improvements v1 merged and deployed

**PR #2** (`improvements-v1` → `main`), merge commit `e7cefa0`, deployed as version `153bd20f`. Sixteen commits: mobile board, activity feed, named humans, agent labels, `/agent` page, audit fixes.

**Approval:** attempted and refused — GitHub will not let an account approve its own pull request, and this repository has one collaborator. A review comment was recorded and the merge proceeded, as with PR #1.

**Verified after deploy:** health `200`; CSP on the document; `/agent` renders; `/auth/start` redirects to GitHub with the right callback; unauthenticated API `401`; the deployed bundle contains the new UI (checked by marker because the UI is client-rendered). A short-lived session used for the check was deleted immediately.

**Not verified by automation:** the touch gestures. There is no device emulation available here, so the mobile behaviour is the owner's to confirm on a real phone.

---

## 2026-11-03 — Full app audit (owner-requested)

**Walked every page in a browser:** landing, sign-in, access, dashboard, board, task drawer, colours panel, tokens panel, activity accordion, and a missing board. No console errors on any of them.

**Fixed:**
- The activity "Who" filter dropped events whose actor no longer matches a profile. Names are frozen on the event, so a renamed account leaves history under the old name; those events were unfilterable and the roster claimed nobody had acted.
- The header still read "M8 · release candidate" after release. Removed: scaffolding, not information.
- README and RUNBOOK quoted test counts that had drifted (167 and 149 against 255). Neither quotes a number now.
- The board subtitle told phone users to drag between columns, which is the hard part there.
- Column tabs claimed `role="tab"` with no tabpanels; they are toggle buttons with `aria-pressed` now.

**Verified healthy:** board create/rename/delete confirmation, task drawer fields and move buttons, theme panel (8 rows × 12 swatches), token panel, empty and not-found states, 401 handling.

---

## 2026-11-03 — Hostname moved to flowquery.workstack.workers.dev

**Why:** the account subdomain was auto-assigned from the owner's personal details (`kieronpeters1`) and appeared in every URL. The owner wanted it gone, and wanted a generic namespace so future apps can sit beside this one.

**What was tried and failed:** `PUT /accounts/{id}/workers/subdomain` returns `10036 "Account already has an associated subdomain"`. The public API can create a subdomain but not rename one; only the dashboard can. Confirmed against Cloudflare's docs and community reports, not assumed.

**What happened:**
- The Worker was briefly renamed to `app` for an `app.flowquery.workers.dev` plan, deployed alongside the old Worker so nothing broke. That plan was abandoned when the subdomain change turned out to be dashboard-only and the name `flowquery` was already taken as a subdomain.
- The owner set the account subdomain to `workstack` in the dashboard.
- The Worker name was reverted to `flowquery`, which still carried all three secrets — so no re-entry was needed.
- The redundant `app` Worker was removed; only `flowquery` remains.

**Verified at the new URL:** health `200` (`0.0.0-m8`), document `200` with CSP and HSTS, unauthenticated API `401`, and `/auth/start` redirecting to GitHub with `redirect_uri=https://flowquery.workstack.workers.dev/api/v1/auth/callback`. `app.workstack.workers.dev` returns `404`; the old `kieronpeters1` hostname no longer resolves.

**Note for future debugging:** Windows `curl.exe` (schannel) fails the TLS handshake against the freshly issued `*.workstack.workers.dev` certificate while Node `fetch`, PowerShell and Chrome all succeed. Use Node or PowerShell for these checks, not curl.

---

## 2026-11-03 — M9: deployed to Cloudflare

**Approved by the owner:** "approved - deploy it".

**Created:** one D1 database `flowquery-db` (APAC, `d4c07e7e-…`) and one Worker `flowquery`. Both Free plan. No payment method, no domain, no paid service. Recurring cost: $0.

**Done, in order:** created the database; wrote the real id into `wrangler.jsonc`; applied the three migrations to the remote database (13 tables, deliberately no seed); deployed via `npm run deploy` (preflight passed); the owner created the production GitHub OAuth app and set three secrets in their own terminal so the client secret never entered this transcript.

**Verified, not assumed:** health `200`; CSP and security headers present on the static document, which is the one thing that could not be tested locally; unauthenticated API `401`; `/auth/start` redirecting to GitHub with the right client id, callback and PKCE challenge; callback without a code failing cleanly to `/login?error=state`; and a real sign-in confirmed **from the remote database** — one user, one github identity, one session expiring in 30 days.

**Write path:** the owner created a board, a task, changed a priority, moved a card three times and commented. The remote database recorded exactly that: 1 board, 1 task, 1 comment, 6 activity events. A redeploy afterwards preserved all of it.

**Defect found during verification:** `/api/v1/health` reported `0.0.0-m7` while the app was on M8, because the test pinned the literal string. Corrected to `0.0.0-m8`, and the test now asserts the version shape so it cannot silently drift again.

**Not done, deliberately:** no seed against production; no custom domain; no paid plan; no CI.

---

## 2026-11-03 — Visual improvements v1 reviewed through a pull request

**Asked:** put the visual work on a branch, open a merge request, assign the owner, approve and merge.

**Constraint reported first:** the work was already on `main`, so a branch cut today would produce an empty PR. The owner chose the retroactive route.

**Done:**
- `visual-improvements-v1` cut at `888a64e`; `main` reset to `dd7b940` and force-pushed with `--force-with-lease`.
- PR #1 opened against `main`, assigned to `kieronpeters`, merged as `654031f` (merge commit, four commits preserved).
- `git diff 888a64e main` is empty: the merged tree is byte-identical to the pre-rewrite tip. 233 tests pass on the merged `main`.

**Not done, because GitHub forbids it:** the approval. `gh pr review --approve` returned *"Can not approve your own pull request"* — the PR author and the only collaborator are the same account. A review comment was recorded instead, and the merge proceeded without an approval, which is permitted because branch protection cannot be enabled on a free private repository.

**Lesson for the next round:** open the branch *before* committing, not after, or the review is theatre.

---

## 2026-11-03 — Palette spread across the spectrum; custom control says what it is

**Reported by the owner:** the presets did not cover all seven colours, three of them were near-white, and the "+" button did not explain itself.

**Changed:**
- Presets are now Midnight, Slate, **Red, Orange, Yellow, Green, Teal, Blue, Indigo, Violet, Pink**, Paper. Seven hues are represented by name; Mint and Sky are gone, leaving Paper as the only pale neutral.
- Yellow is a light preset (`#f2c94c`) on purpose: a dark yellow is olive, which does not read as yellow. Its ink is dark, and the AA test confirms it.
- The custom control is a worded "Custom colour" button after the swatches, outside the preset group so the group contains only presets. `aria-expanded` still drives the picker.
- Tests added: the palette names all seven hues, exactly one preset is pale, and the custom control's visible text is words rather than a glyph.

**Verified in a browser:** 12 swatches in the expected order, row fits on one line (898 px wide, 49 px tall), custom control reads "Custom colour", pressing it opened exactly one labelled picker on the Tickets row with `aria-expanded="true"`.

**233 tests pass** (was 230). No deployment, no cloud cost.

---

## 2026-11-03 — Appearance scope decided: per board

**Asked:** should board colours be per board or per user, and what is standard.

**Answered and decided (DEC-034):** per board, unchanged. Shared board identity is per board in Trello, Notion and GitHub Projects; per-user is where dark/light belongs, not where a board's colours belong. With two admins sharing five boards there is one palette to maintain instead of two that can drift.

**Code changed:** none. The existing `boards.theme` column already behaves this way.

**Would-be fallback, not built:** `board_theme_overrides (user_id, board_id, theme)` merged over the board theme on read, giving a personal pin without altering what the other admin sees. One migration, still zero cost.

---

## 2026-11-03 — Activity box colours and filters

**Requested:** put the activity feed in a coloured box using the same presets; filter it by today / week / month / year / all history and by any people who changed things; keep newest first.

**Built:**
- `boards.theme.activity` — the eighth themed surface. Text, timestamps, borders, the period select and buttons all derive from the measured ink for that background.
- `GET /boards/:id/activity` gained `since` (ms) and `actors` (comma-separated, max 20, each ≤ 80 chars). Filters are applied in SQL, not to a loaded page: the feed is paginated, so client-side filtering would hide matches on later pages.
- The response now carries `actors` — a `GROUP BY actor_name` roster with counts, deliberately not affected by the active filter so the checkboxes do not disappear as you narrow things.
- Period boundaries are computed in the browser (`periodStart`) and sent as an instant. Weeks start Monday. "Today" is local midnight, which the Worker cannot know.
- UI: period select, one checkbox chip per actor with its event count, a Reset filters control, and a distinct empty state when filters exclude everything.

**Tests added (33):** `periodStart` for each period including Sunday → previous Monday, query building, actor/period filtering over HTTP and services, the roster surviving a filter, invalid `since` and oversized actor lists, the box colour and ink, and the filter requests the UI actually makes.

**Verified in a browser:** default feed with 8 real events and the "Kieron" chip; changing the period issued `?since=1793635200000` (local midnight, GMT+8); ticking Kieron issued `?actors=Kieron` and revealed Reset; Slate box → `rgb(20, 26, 46)` with light ink; Paper box → `rgb(244, 239, 230)` with dark ink and 70% dark timestamps.

**230 tests pass** (was 197). No deployment, no cloud cost.

---

## 2026-11-03 — Ticket colours, readable presets, custom picker behind a button

**Requested:** cards should be customisable with the same colour scheme, with default text-colour contrasts that work well as presets, and a custom picker available from within the preset row.

**Built (DEC-033 extended):**
- `boards.theme.tickets` — one card background for the whole board. Validation and parsing in `services/boards.ts` and `services/board-view.ts`; unknown key rejection still applies.
- Cards tint with their own column when no ticket colour is set; a board ticket colour overrides every column.
- Ink is now chosen by **highest WCAG contrast** rather than a luminance threshold, so mid-tones get the better of the two inks instead of an approximation.
- `PRESETS` moved into `theme.ts` (was duplicated in the panel) and exported; the panel renders 12 swatches plus a dashed “+” swatch that reveals the native picker for that row only.
- Drag overlay follows the same colour as the card it came from.

**Tests added:** ticket validation (accepted alone, rejected when not hex, cleared by `{}`), every preset at AA contrast or better as both a ticket and a column colour, the Custom button staying hidden until pressed, a custom value reaching the save payload, and the board applying ticket/column tints.

**Verified in a browser:** Indigo tickets `#2a2350` over teal and default columns with light ink; Paper tickets `#f4efe6` with dark ink and 72% dark description text; seven panel rows, 12 swatches each, exactly one picker visible after pressing Custom.

**197 tests pass** (was 188). No deployment, no cloud cost.

---

## 2026-11-03 — Drag visibility fix and board colours (owner-reported)

**Reported:** dragging a card from Backlog across to another column made it vanish mid-drag, though dropping still worked.

**Cause:** the dragged card was transformed in place and clipped by the board, which is a scroll container (`overflow-x: auto` makes `overflow-y` scroll too). Fixed with a `DragOverlay` portal; the source slot stays dimmed. Test added using dnd-kit's keyboard sensor.

**Requested in the same session:** per-board colours for the five columns and the page background, via a settings button.

**Built (DEC-033):**
- `migrations/0003_board_theme.sql` — `boards.theme` JSON document.
- `PUT /api/v1/boards/:boardId/theme`, human session only; the agent namespace has no equivalent.
- Six-digit hex only; unknown keys and columns rejected.
- Ink colour derived from luminance so pale surfaces keep readable text.
- A malformed stored document falls back to defaults instead of breaking the board read.
- UI: Colours panel with per-field Default and Reset all.

**Verified in a browser:** set a light page and backlog colour, confirmed the ink switched to dark, confirmed persistence across a reload, then reset to defaults.

**Also fixed:** the SQLite test helper hard-coded the migration list, so 0003 silently left the test schema behind. It now reads the migrations directory.

**Tests:** 179 passing. No deployment, no resource, no cost.

---

## 2026-11-03 — Live GitHub sign-in confirmed (owner-reported)

The owner reported that they are signed in to the localhost application with a real GitHub account. This is the first live OAuth round trip; every previous verification used a stubbed provider.

**Closes:** the sign-in gap open since M3. Remaining unverified: the drag gesture, and the Cloudflare deployment.

**Also completed this session:** GitHub remote created (`github.com/kieronpeters/flowquery`, private, `main` pushed, 25 commits); `cf` CLI authenticated (account e0837f85…); Cloudflare skills installed (21); MCP server registered (pending `/mcps` sign-in). No CI, at the owner's request.

**Not done:** no cloud resource created.

---

## 2026-11-03 — First-run experience fix (Bob, current session)

**Trigger:** owner said "continue". Rather than invent a feature, I checked the very first thing the owner will do: open the app without OAuth credentials and click "Continue with GitHub".

**Found:** `/auth/start` returned `503` with a JSON body. Because the endpoint is reached by clicking a link, the browser navigated to it and displayed raw JSON — no styling, no way back, and no explanation. The login page already had a `configuration` message that nothing ever triggered.

**Fixed:** `/auth/start` redirects to `/login?error=configuration` when credentials are missing, and the message now names the file to edit (`.dev.vars`) and points at the runbook.

**Verified:** started the dev server with no `.dev.vars` present, clicked the sign-in link, and landed on `/login?error=configuration` with the explanation rendered, zero console errors.

**Tests:** 167 passing (the unconfigured case now asserts a redirect instead of a 503). Typecheck, lint, build clean.

**Not done:** no deployment, no resource, no cost.

---

## 2026-11-03 — Scale check and header verification (Bob, current session)

**Trigger:** owner said "continue". Two things I had written down as assumptions were still unverified.

**1. Scale.** Loaded 509 tasks into one board (every column over 100) and measured end to end.

| Measure | Result |
|---|---|
| JSON payload | 244 KB |
| API response, local | 29–35 ms |
| First contentful paint (production build) | 100 ms |
| All 509 cards on screen | 332 ms |
| JS heap | 9 MB |
| Console errors | 0 |

The same page in dev mode took 658 ms and 40 MB — HMR and unminified React, not the application. Recorded in `ARCHITECTURE.md` §7 with that caveat, because benchmarking in `npm run dev` and concluding the app is slow is an easy mistake.

At ~500 tasks every card is in the DOM and each is a dnd-kit sortable. It works; virtualisation would be the fix beyond a few hundred tasks and is deliberately not built.

**2. Static headers.** `npm run preview` (production build served by workerd) reports **"Parsed 1 valid header rule"**, and `GET /boards/brd_demo` returns the full CSP plus nosniff, referrer, frame, COOP and permissions headers **on the HTML document**. That closes the M8 gap: the policy demonstrably reaches the page through the asset layer, not just the repository.

**Not verified:** the same two things on Cloudflare's own network, which is a deployment-time check.

**Cleanup:** bulk tasks removed with `db:reset`; preview and dev servers stopped.

---

## 2026-11-03 — Board page tests and defensive parsing (Bob, current session)

**Trigger:** owner chose "keep improving"; the gap I had named last turn was the board page.

**Performed:**
- `tests/ui/board-page.test.tsx` (4 tests): five columns render, clicking a card opens the dialog, the keyboard "move to next column" path calls `/move` with `{status, position, expectedVersion}` and replaces the board with the server's response, and a `409` surfaces a notice plus a refetch.

**Found by writing them — two real defects:**
- `ActivityFeed` crashed with `Cannot read properties of undefined (reading 'length')` when the activity payload lacked an `events` array, taking the whole board down. It now validates the payload and shows an error instead.
- `TaskDrawer` had the same fault for the comment list.
Both were reachable only through an unexpected response, but a page that white-screens because a secondary panel got a bad payload is the wrong failure mode; the board is the primary surface.

**Also fixed:** my own test expectations were wrong twice — a mock that matched `/tasks/` before `/comments`, and an assertion that expected a move from Backlog to land in Review instead of To Do. Both were my errors, not the application's.

**Result:** 167 tests across 15 files; typecheck, lint, build clean.

**Not done:** no deployment, no resource, no cost.

---

## 2026-11-03 — UI component tests (Bob, current session)

**Trigger:** owner chose "keep improving without deploying" from four options.

**Gap addressed:** all 152 tests were server-side. Nothing covered the drawer, the dashboard or the delete confirmation — a regression there would have shipped unnoticed.

**Performed:**
- Added `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` and `jsdom` as dev dependencies.
- `tests/ui/task-drawer.test.tsx` (6 tests): fields load from the API, save sends `expectedVersion`, deletion needs a second deliberate click, "Keep" sends nothing, empty title disables save, comment markup renders as text.
- `tests/ui/boards-page.test.tsx` (5 tests): board list with counts, 401 redirects to sign-in, delete stays disabled until the exact name is typed, cancel sends nothing, create posts a trimmed name.

**Three fixes that came out of writing them:**
1. `vitest.config.ts` include pattern missed `.tsx` — the files silently matched nothing.
2. Testing Library's automatic cleanup relies on a global `afterEach`, which this config does not enable, so rendered trees accumulated between tests and queries matched the previous test's DOM. Added explicit `cleanup()`.
3. The create form sent the name untrimmed and relied on the server. It now trims at the source, so the optimistic UI and the stored value agree.

**Result:** 163 tests across 14 files; typecheck, lint and build clean.

**Not done:** no deployment, no resource, no cost.

---

## 2026-11-03 — Accessibility audit and modal fix (Bob, current session)

**Trigger:** the owner said "continue" at the deployment gate, which remains blocked on Cloudflare authentication.

**Performed:**
- Ran Lighthouse against the board, the dashboard and the task dialog.
- Accessibility **100**, best practices **100** on all three; SEO 80 (the remaining item is a deliberate omission of a meta description for a `noindex` app).
- Added `public/robots.txt` (Disallow: /) — `/robots.txt` had been returning the SPA's HTML, and a private app should not be crawlable.

**Found by testing, not by the audit:** the task drawer declares `aria-modal="true"`, but pressing Tab walked focus out of it into the page behind (the brand link, then "All boards"), and closing did not return focus to the card that opened it. A keyboard or screen-reader user is told the background is inert and then put inside it anyway.

**Fixed:** a focus trap that cycles within the dialog, and focus restored to the trigger on unmount.

**Verified:** 20 consecutive Tab presses, zero escapes; Escape returns focus to the card (`classList.contains('card')` true). One earlier run showed focus restore "failing" — that was my automation calling `.click()`, which does not focus a button the way a real pointer click does. Re-tested with focus applied first, and it works.

**Tests:** 152 still passing; typecheck, lint, build clean.

**Not done:** no deployment, no resource, no cost.

---

## 2026-11-03 — Documentation reconciliation (Bob, current session)

**Trigger:** the owner said "continue" at the deployment gate, which is blocked on Cloudflare authentication. Rather than repeat the request, I audited eight milestones of accumulated drift.

**Found and fixed:**
- `ARCHITECTURE.md` still listed **TanStack Query, Tailwind CSS and Zod** as the frontend stack. None of them were used. The table now states what is in use and why each was dropped; `DECISIONS.md` gains DEC-032 recording the decision.
- The CPU table described "HMAC session verify" and "Zod validation". Sessions are opaque hashed tokens and validation is hand-written; the table now reflects that.
- `MVP_SPECIFICATION.md` §9 opened with "The mechanism is an open decision (AUTH-01)" and then, twelve lines later, stated it was decided. Fixed.
- `ARCHITECTURE.md` §12 said decisions were written "before code exists". Code exists.
- `/api/v1/boards` implementation note still said M7; the API has been hardened since.
- `design/DESIGN_DIRECTION.md` described a richer product than was built. Rewritten to record the visual language and explicitly list the eleven things in the concept images that do not exist.
- `repository/SETUP_QUESTIONS.md` still pointed at `C:\repos\flowquery`, a path abandoned in M1. Rewritten as settled-vs-open.

**Deliberately not changed:**
- The `memory/` mirror stays. It is neutralised file by file and Git-tracked; deleting it has no functional benefit.
- No signed-in name in the app header: the dashboard already shows it, and a per-page auth fetch would cost a request for no gain.

**Not done:** no deployment, no resource, no cost. Cloudflare authentication is still absent.

---

## 2026-11-03 — Deployment readiness check (Bob, current session)

**Authorised:** nothing new. The owner said "continue", which does not constitute approval to create cloud resources, so no resource was created.

**Performed:**
- `wrangler whoami`: **not authenticated** — deployment is impossible from this machine until the owner runs `npx wrangler login`.
- `wrangler deploy --dry-run`: bundles 151.18 KiB, reads 6 static files, reports the `env.DB` binding. No upload, no account needed.
- `docs/DEPLOYMENT_PLAN.md`: what would be created, exact commands, post-deploy verification, rollback.

**Found and fixed:** the `_headers` file from M8 was structurally invalid. In that format `/*` is a URL pattern, not a comment opener, so my `/* … */` comment blocks meant the policy was attached to the wrong block or none at all. The SPA document would still have shipped without a CSP. Rewritten with `#` comments and a single `/*` rule; the tests now assert structure (first rule line, indented headers, no `*/`) instead of merely finding the policy string.

**Tests:** 152 passing (3 new structural tests).

**Also:** added `npm run preflight` so a deployment cannot start with the placeholder D1 id, a malformed `_headers`, a missing build, or an un-ignored `.dev.vars`. Verified both branches — it refuses today, and passes with a real id (config restored byte-identically afterwards, hash checked).

**Not done:** no deployment, no database, no Worker, no domain, no cost. Still unauthenticated.

---

## 2026-11-03 — M8 hardening and release preparation (Bob, current session)

**Authorised:** M8 — hardening.

**Performed:**
- `middleware/security.ts`: CSP, nosniff, referrer, frame, COOP, permissions, HSTS on API responses.
- `public/_headers`: the same policy for the static SPA document, which the Worker never sees.
- Request-id middleware (`X-Request-Id`), `onError` returning a generic 500 with the id, and the catch-all 404 carrying it too.
- Callback rate limit now checked *before* the GitHub exchange rather than only counted.
- `benchmarks/board-view.ts` extended with the agent task list.
- `docs/internal/SECURITY_REVIEW.md` and `docs/internal/RUNBOOK.md`.

**Verified (actual output):**
- 149 tests, 12 files; typecheck, lint, build clean.
- Headers present on API responses; the `_headers` policy matches the Worker policy exactly (asserted by a test).
- Strict CSP (`script-src 'self'`) does **not** break the dev app: 9 cards, 5 columns, zero console errors.
- Restore drill on the final schema: export 12.7 KB → delete all `.wrangler/state` → import → counts identical, `PRAGMA foreign_key_check` empty, and the agent token still authenticated afterwards (200, 9 tasks).
- Bench: board view 0.033 ms @ 9 and 0.578 ms @ 200; agent task list 50 tasks 0.137 ms.

**Found:** the SPA document would have shipped with no CSP at all, because static assets bypass Worker middleware. Fixed with `public/_headers` plus a drift test.

**Not done:** no deployment, no remote repository, no resource creation, no cost.

**Outcome:** M8 complete; the build is finished and awaiting a deployment decision.

---

## 2026-11-03 — M7 agent API and tokens (Bob, current session)

**Authorised:** M7 — Bob's board-scoped API.

**Performed:**
- `repositories/agent-tokens.ts`: insert, list, revoke (sets `revoked_at`), find-active-by-hash, touch.
- `services/agent-tokens.ts`: token generation (`fq_` + 32 bytes), label validation, stored as SHA-256.
- `middleware/agent-auth.ts`: bearer resolution; sets `{ tokenId, boardId, label }` on the context.
- `routes/agent.ts`: board, columns, profiles, tasks (list with filters, read, create, edit, delete, move), comments, activity.
- `routes/tokens.ts`: human token management, registered on the board router.
- `openapi.ts`: hand-written OpenAPI 3.1 served at `/api/v1/openapi.json`.
- `repositories/tasks.ts` + `services/tasks.ts`: filtered task list (status, priority, assignee, title).
- UI: `TokenPanel` on each dashboard board row — create (plaintext once), list, revoke.

**Verified (actual output):**
- 142 tests, 11 files; typecheck, lint, build clean.
- Token stored as a hash; a list response never contains the plaintext.
- Isolation suite with a second board and second token: cross-board read, update, move, delete and comment all return 404, and the task is unchanged.
- Session cookie rejected on `/agent`; bearer token rejected on human routes; a revoked token returns 401 immediately.
- From a shell, with a token created in the browser: read the board (9 tasks), filtered the backlog (3), created a task, commented as "Bob - verification", saw the board reach 10 tasks with the new one in To Do, then revoked it in the UI and got 401.

**Note:** PowerShell's `Invoke-RestMethod` mangles a manually set `Cookie` header; used `curl.exe` instead. Not an application issue.

**Not done:** no hardening pass, no deployment.

**Outcome:** M7 complete; awaiting approval for M8.

---

## 2026-11-03 — M6 comments and activity (Bob, current session)

**Authorised:** M6 — comments and activity.

**Performed:**
- `repositories/activity.ts`: event statement builder, board feed with keyset pagination.
- `repositories/comments.ts`: append-only insert (batched with its activity row) and board-scoped listing via a join.
- `services/comments.ts`: validation, text-only storage, activity on comment.
- `services/activity.ts`: limit/before validation, board existence check.
- `services/tasks.ts`: activity for create, each changed field, column moves and deletion. Inside a column, reordering records nothing.
- `routes/comments.ts`, `routes/activity.ts`, registered onto the board router.
- UI: comments in the task drawer; `ActivityFeed` below the board with "Load older".

**Verified (actual output):**
- 113 tests, 9 files; typecheck, lint, build clean.
- Comment with `<script>` stored and returned verbatim; browser rendered it as text, `window.__pwned` stayed false, zero injected elements.
- Activity: create, priority (with from/to), description (no text stored), one move event per column change, none for reorder, comment, delete.
- Feed ordering and cursor pagination verified at service level with explicit timestamps.
- Browser: "created", "commented" and "moved" all rendered newest-first.

**Found and fixed:** the `task.deleted` event was being removed by the same cascade that removed the task, so deletion left no trace. It is now written with `task_id = NULL` and survives; task-scoped events still cascade. Recorded in `DATABASE_DESIGN.md` §9.

**Trade-off accepted:** activity writes are best-effort. A failed insert is logged and does not fail the user's action, because failing a successful edit invites a retry that duplicates it.

**Not done:** no agent API, no deployment.

**Outcome:** M6 complete; awaiting approval for M7.

---

## 2026-11-03 — M5b ordering and drag-and-drop (Bob, current session)

**Authorised:** M5b — ordering, drag-and-drop, keyboard alternative.

**Performed:**
- `src/shared/ordering.ts`: `moveWithin`, `positionsFor`, `isContiguous` — pure, shared by worker and UI. Moved out of `worker/services` so the client can compute optimistic moves with the same rule.
- `repositories/tasks.ts`: `listColumnTaskIds`, `guardedMove` (version-checked), `renumberColumn` (batch).
- `services/tasks.ts`: `moveTask` — guarded update first, then renumber both affected columns.
- `POST /api/v1/boards/:boardId/tasks/:taskId/move`; response returns the whole board view.
- UI: dnd-kit sortable columns and cards; optimistic `applyMove`; reconciliation with the server response; notice on 409.
- Drawer move controls: ← → across columns, ↑ ↓ within, reloading the task after each move.

**Verified (actual output):**
- 92 tests, 7 files; typecheck, lint, build clean.
- 13 ordering unit tests including clamping, round-trip and invariant sequences.
- Reorder within a column and across columns produce expected order; positions contiguous and unique after six consecutive moves; task count unchanged.
- Stale version on move → 409, nothing moved; wrong board → 404; invalid index → 400; unauthenticated → 401.
- Browser: drawer ↓ reordered the column (API confirmed positions 0/1/2); drawer → moved the task to the end of To Do, drawer reloaded to `todo`, version incremented to 3.

**Could not verify:** the drag gesture itself. Synthetic pointer events cannot drive dnd-kit (it uses pointer capture), and automated key events announced a pickup but never completed a drop. The sortable attributes and live region are present, so the wiring is mounted; a human click-drag is required. Recorded in `NEXT_ACTION.md` and the README rather than glossed over.

**Not done:** no comments or activity, no agent API, no deployment.

**Outcome:** M5 complete; awaiting approval for M6.

---

## 2026-11-03 — M5a task management (Bob, current session)

**Authorised:** M5a — task CRUD and detail (owner approved M5; Bob proposed and took the split).

**Performed:**
- `repositories/tasks.ts`: scoped reads, insert, whitelisted dynamic update, delete, next-position, active-profile lookup.
- `services/tasks.ts`: validation for title/description/priority/status/due date/assignee, create/read/edit/delete, `expectedVersion` concurrency.
- `services/task-dto.ts`: DTO mapping extracted so the board view and task endpoints share one shape; truncation is an explicit call-site decision.
- `routes/tasks.ts` registered onto the board router so it inherits the session gate; `routes/profiles.ts` added.
- `middleware/session.ts`: the gate extracted from the board router, now used by two routers.
- UI: `TaskDrawer` serves create and edit; cards are buttons; each column has an add-task control.
- Status change appends to the end of the target column, so position is never left pointing into the wrong column.

**Verified (actual output):**
- 64 tests pass, 5 files; typecheck, lint, build clean.
- Create defaults → 201, backlog, position 3 (after three seeded tasks), version 1.
- Nine invalid inputs → 400 with the offending field named.
- Single-task read returns a 900-character description; the board view truncates it to 500 and flags it.
- Update → version 2; clearing assignee and due date both work.
- Stale `expectedVersion` → 409 and the task is unchanged.
- Delete → 204, task gone, its comment cascaded.
- Browser: drawer create → card in Backlog; reopen shows title, priority, assignee and due date preserved; status change moved it to Review with position 1; two-step delete removed it; zero console errors.

**Discovered:** nothing broken, but browser driving confirmed that the `expectedVersion` round-trip works against a real moving board.

**Not done:** no drag-and-drop, no reordering, no keyboard move control, no comments or activity, no agent API, no deployment.

**Outcome:** M5a complete; awaiting approval for M5b.

---

## 2026-11-03 — M4 boards and dashboard (Bob, current session)

**Authorised:** M4 only — board lifecycle, dashboard.

**Performed:**
- Repository functions for list-with-counts, insert, rename and delete; all SQL stays in `repositories/boards.ts`.
- `services/boards.ts`: name validation (1–120 chars, trimmed, control characters rejected) and a delete service that requires the exact current name.
- `routes/boards.ts`: one session middleware for the whole router; `GET/POST/PATCH/DELETE`.
- Dashboard UI replacing the M3 placeholder: list with task counts, create form, inline rename, typed-name delete confirmation.
- Landing page redirects signed-in humans to `/boards`.
- `tests/helpers/sqlite-d1.ts`: a D1 facade over Node's built-in SQLite so tests run the real migrations with foreign keys enabled.
- Double-submit guard (ref, not state) after browser automation exposed the window.

**Verified (actual output):**
- 46 tests pass, 4 files; typecheck, lint, build all clean.
- Signed-out `GET /api/v1/boards` → 401.
- Create → 201, `brd_` id, appears in list with 0 tasks; empty/whitespace/non-string/121-char names → 400.
- Rename → 200, id unchanged, all 9 tasks intact; unknown board → 404.
- Delete with wrong name → 409 and nothing removed; with no confirmation → 409; with the exact name → 204 and the board, its 9 tasks, a comment, an activity event and an agent token all gone, while 18 profiles and both users survive.
- Cross-origin delete → 403.
- Browser: dashboard rendered with counts; create, rename and the typed-name delete all worked; zero console errors.

**Observed during testing:** automation filled the wrong textbox and created a duplicate board. Investigated: not an application bug, but it did expose a real double-submit window, which is now guarded.

**Not done:** no task editing, no drag-and-drop, no comments or activity UI, no agent API, no remote, no deployment.

**Outcome:** M4 complete; awaiting owner review.

---

## 2026-11-03 — M3 human authentication (Bob, current session)

**Authorised:** M3 only — human authentication.

**Performed:**
- `migrations/0002_auth_attempts.sql` for rate-limit counters.
- `auth/github.ts`: OAuth client with PKCE S256, token exchange, `/user` and `/user/emails`, verified-email requirement.
- `auth/allowlist.ts`: numeric-id allowlist, fail-closed on empty or malformed input.
- `auth/cookies.ts`: `__Host-` session and state cookies, plus open-redirect-safe `next` handling.
- `services/auth.ts`: sign-in, session resolution with sliding expiry, sign-out.
- `repositories/auth-store.ts`: interface + D1 implementation; all auth SQL isolated.
- `routes/auth.ts`: start, callback, me, logout.
- `app.ts`: Origin guard on state-changing requests; board reads now require a session.
- UI: `/login`, `/signup`, `/boards` placeholder; board page redirects to `/login` on 401.
- `benchmarks/auth.ts`; `npm run bench` now covers both paths.

**Verified (actual output):**
- `db:reset` applied `0001_init.sql` and `0002_auth_attempts.sql`.
- Unsigned `GET /api/v1/boards/brd_demo` → **401**; `/auth/me` → **401**.
- `GET /auth/start` → 302 to `github.com/login/oauth/authorize` with `client_id`, `scope=read:user user:email`, `code_challenge_method=S256`, 43-char challenge, 39-char state, correct `redirect_uri`.
- State cookie flags: `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Browser: `/boards/brd_demo` while signed out redirected to `/login?next=%2Fboards%2Fbrd_demo`, login page rendered, **0 console errors**; `/signup` rendered.
- Tests: **33 passed** across 3 files, including allowlist rejection creating no user/session, state mismatch never calling GitHub, session hashed at rest, expiry, sign-out invalidation, cross-origin POST → 403.
- Bench: allowlist 0.002 ms, SHA-256 0.035 ms, response JSON 0.001 ms.

**Not verified:** a live GitHub round trip — requires the owner's OAuth app credentials and two GitHub accounts. Recorded as a prerequisite in `NEXT_ACTION.md`.

**Not done:** no task mutations, no dashboard, no agent API, no remote, no deployment.

**Outcome:** M3 complete pending owner review and a live sign-in.

---

## 2026-11-03 — M2 walking skeleton (Bob, current session)

**Authorised:** M2 only — D1 schema, seeds, read-only board, measurement.

**Performed:**
- D1 binding added with a placeholder `database_id` (local only; a real id is created at M9).
- `migrations/0001_init.sql`: 9 tables, 9 indexes, CHECK constraints, foreign keys.
- `seeds/dev.sql`: 18 assignee profiles (2 human, 15 AI, 1 contractor), 1 demo board, 9 tasks, 1 placeholder dev user. Separate from migrations by design.
- Scripts: `db:migrate:local`, `db:seed:local`, `db:reset` (deletes local state, migrates, seeds).
- Layering: `repositories/boards.ts` (all SQL), `services/board-view.ts` (pure assembly + I/O wrapper), `domain` row types, `shared` wire types and column constants.
- Routes: `GET /api/v1/columns`, `GET /api/v1/boards/:boardId`.
- React: router, landing page, board view with five columns, priority/assignee/due-date metadata.
- `benchmarks/board-view.ts` + `npm run bench`; `tsx` added as a dev dependency because Vitest 5 removed its built-in bench API.

**Verified (actual output):**
- `db:reset` → 4 migration statements, 4 seed statements, no errors.
- Row counts: 18 profiles, 1 board, 9 tasks, 1 user.
- `GET /api/v1/boards/brd_demo` → 200, 4.4 KB, backlog 3 / todo 2 / in-progress 1 / review 1 / done 2.
- `GET /api/v1/boards/does-not-exist` → 404 JSON; unknown `/api/*` → 404 JSON; `/boards/brd_demo` deep link → 200 HTML.
- Export (12.2 KB, 10 tables, 31 inserts) → deleted `.wrangler/state` entirely → import → identical counts and board name, `PRAGMA foreign_key_check` empty.
- `npm run typecheck`, `lint`, `test` (**11 passed**), `build`, `format:check` all pass.
- Bench: 9 tasks 0.032 ms, 50 → 0.145, 200 → 0.546, 500 → 1.443 (median, assembly + JSON serialisation).
- Browser check: the board page rendered all 9 tasks across 5 columns with **zero console errors**; DOM confirmed via evaluated `body.innerText` and React root HTML.

**Discovered:** Vitest 5 no longer exports `bench`; local workerd tooling exposes span duration but not CPU, so end-to-end CPU is deferred to M9 and recorded as such.

**Not done:** no authentication (the board endpoint is temporarily open locally), no mutations, no dashboard, no agent API, no remote, no deployment.

**Outcome:** M2 complete; awaiting owner approval for M3.

---

## 2026-11-03 — M1 repository foundation (Bob, current session)

**Authorised:** M1 only — repository foundation and project configuration. No product implementation.

**Performed:**
- `git init -b main`; `.gitignore` written and committed before dependencies existed. No remote, no push.
- Commits: documentation baseline (126 files), owner approvals, M1 foundation.
- Structure: `src/worker/`, `src/app/`, `tests/`, `migrations/` (intentionally empty until M2).
- Toolchain installed: TypeScript 6.0.3, Vite 8.3.5, Vitest 5.1.0, Wrangler 4.156.2, React 19, Hono 4, ESLint, Prettier.
- `wrangler.jsonc` with SPA fallback and `run_worker_first: ["/api/*"]` only.
- `GET /api/v1/health` and a JSON-404 fallback for unknown `/api/*` paths, with 2 tests.
- OpenCode agents moved from `opencode/agents/` to `.opencode/agents/` (OpenCode V2 discovery path); invalid example config deleted; `opencode.jsonc` added.

**Verified (actual output):**
- `npm run typecheck` — pass, both projects.
- `npm run lint` — pass, no findings.
- `npm test` — 2 passed.
- `npm run build` — pass; worker 57.83 kB, client 220.80 kB.
- `npm run format:check` — all files match.
- `npm run dev` — `/` 200 HTML, `/boards/brd_example` 200 HTML, `/api/v1/health` 200 JSON, `/api/v1/does-not-exist` 404 JSON.
- `opencode api get /api/agent` — Bob (primary) + 15 specialists discovered.
- `npm audit --omit=dev` — 0 vulnerabilities.
- Fresh clone to a temp directory: `npm ci`, `typecheck`, `lint`, `test`, `build` all passed.

**Not done:** no product features, no schema, no D1 binding, no auth, no remote, no deployment, no paid service.

**Outcome:** M1 complete; awaiting owner approval for M2.

---

## 2026-11-03 — Specification consolidation (Bob, current session)

**Trigger:** owner issued a new product direction superseding the organisation/project hierarchy.

**Inspected:** all 60+ files in the package — root prompts and rules, 12 documents in `docs/`, 15 team profiles and the roster, 16 OpenCode agent definitions, the full `.flowquery/` tree, `design/`, `repository/`, `templates/`. Verified the toolchain (git 2.55.0, node 24.21.0, opencode 2.2.1, gh 2.103.3). Confirmed no Git repository and no application code existed.

**Identified contradictions:** nine, including a `AGENTS.md` line instructing agents not to reintroduce the hierarchy that the spec mandated; human accounts marked MUST in requirements while deferred in the roadmap and backlog; the README asserting public editable board links while the security documents left it open; and Bob's token scope described three different ways.

**Researched:** Cloudflare Workers and D1 limits, pricing, static-asset billing, SPA routing, D1 foreign keys, batch semantics, Time Travel, and the absence of a hard spending cap — all against official documentation on 2026-11-03. Sources recorded in `docs/internal/TECHNICAL_RESEARCH.md`.

**Measured:** PBKDF2-SHA256 CPU cost in the local V8/WebCrypto stack — 2.6 ms at 10k iterations, 25.9 ms at 100k, 162.6 ms at 600k. Against a 10 ms Workers Free budget this excludes server-side password hashing. Command and output recorded in `docs/internal/TECHNICAL_RESEARCH.md`.

**Rewrote:** `MASTER_PROMPT.md`, `AGENTS.md`, `README.md`, `IMPLEMENTATION_KICKOFF_PROMPT.md` (marked superseded), `docs/internal/MVP_SPECIFICATION.md`, `docs/internal/REQUIREMENTS.md`, `docs/internal/ARCHITECTURE.md`, `docs/internal/DATABASE_DESIGN.md`, `docs/internal/API_SPECIFICATION.md`, `docs/internal/SECURITY_AND_AUTH.md`, `docs/internal/TECHNICAL_RESEARCH.md`, `docs/internal/DECISIONS.md`, `docs/internal/MVP_ROADMAP.md`, `docs/internal/PROJECT_BRIEF.md`, `docs/README.md`, `AGENTS.md`, `docs/internal/IMPLEMENTATION_GUIDE.md`, `docs/SECURITY_AND_QUALITY.md` (superseded pointer), `docs/agents/TEAM_DIRECTORY.md`, `docs/agents/AGENT_OPERATING_MODEL.md`, and the `.flowquery/` state, backlog, next action, phase status, decisions pointer and handoff.

**Not done, deliberately:** no code, no dependencies, no migrations, no Git repository, no cloud resources, no deployment, no paid service, no domain.

**Outcome:** documentation internally consistent with the flat board model; three decisions left open for the owner (AUTH-01, AUTH-02, SCOPE-01).

---

## 2026-11-02 — Requirements consolidation (previous session)

- Consolidated the owner's questionnaire and clarifications into the then-current `docs/internal/MVP_SPECIFICATION.md`.
- Updated the brief, requirements, architecture candidate, API outline, data model, security/quality, roadmap, decision register, README, AGENTS and master prompt.
- No application code, repository creation, cloud resource creation or deployment performed.
- **Status now:** superseded by 2026-11-03. That specification described the organisation → project → board hierarchy, which has been removed from the product.
