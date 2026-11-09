# Next Action

**Profile pages v2 are live on `main`.** https://flowquery.workstack.workers.dev — version `e696b299`, deployed from the merge commit `40adffd`. PR #5 merged; every branch is fully contained in `main`. Free plans, $0 recurring.

**Next change, on branch `agent-profiles`:** `/agents` becomes a read-only directory whose rows open `/profiles/:id`; picture upload, remove and colour choice move to the agent's profile page, beside the picture. Migration `0011` fills About, Skills and Development for all 16 non-human profiles. Not yet applied to production, committed or deployed.

---

## What is running

| | |
|---|---|
| Worker | `flowquery`, Free plan |
| Database | D1 `flowquery-db`, APAC — 2 humans (Kieron, Abdul), 15 AI agents, 1 contractor |
| Agent access | one live token per agent per board; `Bob` active and linked to `prf_bob` |
| Pictures | uploaded ones in `profile_avatars`; drawn avatars for agents |
| Allowlist | `51761129:Kieron,37402145:Abdul` |
| Cost | $0. No payment method, no paid plan, no domain |

## Verified after this deploy

- Migration `0010_profile_details.sql` applied **before** the deploy; `about`, `skills` and `development` confirmed on `team_profiles` with `pragma_table_info`.
- `AUTH_ALLOWLIST` uploaded as a Worker secret and parsed locally to both ids.
- Health `200`; CSP present; `/about` and `/login` `200`; `/auth/start` `302`.
- Anonymous `401` on `/api/v1/profiles` and `/api/v1/profiles/prf_bob`.
- Logo, favicons and PWA icons `200` under `/brand/`; `index.html` and the manifest carry the new paths.
- Logo renders at 131×32 in the header and 82×20 in the footer against a 1435×350 source — same ratio, no distortion.
- Every new UI marker present in the deployed bundle, including the 240px picture, the “View larger” trigger, the `.picture-preview` overlay and the People menu item.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run preflight` all pass — **358 tests**, 31 files.

**Not verified:** the signed-in profile pages and the preview overlay in a real browser (local preview has no OAuth session), the OS file-picker, and any flow on a phone.

## Worth doing next, none urgent

1. **Sign in as Abdul** to confirm the new allowlist entry works end to end; his pre-created `prf_abdul` profile should be adopted, not duplicated.
2. **Open `/people` on a phone** and check the profile layout at narrow widths.
3. **A real backup.** `docs/RUNBOOK.md` has the export procedure; production has no backup beyond Cloudflare's Time Travel window.
4. **The product name.** "FlowQuery" is still a working title, and it is in the URL.

## Rules that have not changed
