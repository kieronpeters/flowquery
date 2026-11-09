# Brand assets

The visual identity is a deep-navy plate, a white “Flow” and cyan “Query”
wordmark, and a square app icon built from the same three Kanban accents
(blue/cyan, green, purple).

All deployed artwork lives under `public/brand/` so the source tree has one
predictable home for it. `public/` is copied verbatim into `dist/client/` at
build time; nothing else is served.

## Logos — `public/brand/logos/`

| File | Size | Use |
|---|---|---|
| `flowquery-logo-dark.png` | 1435 × 350 | Horizontal wordmark. Header (2rem tall), footer (1.25rem tall), and the larger mark on the landing and sign-in pages. |

The wordmark is a raster crop on its own navy plate (`#01092E`). The header
(`rgba(2, 9, 47, 0.92)`) and footer (`#02092f`) are matched to it, so the plate
does not show. Never stretch it: `app.css` fixes the height and leaves the
width auto.

The original full composition is **not** deployed. It is archived at
`docs/brand/flowquery-logo-original.png` (1536 × 1024) and exists only as the
source the wordmark and icons were cut from.

## Icons — `public/brand/icons/`

| File | Size | Reference |
|---|---|---|
| `favicon-16.png` | 16 × 16 | `index.html` favicon |
| `favicon-32.png` | 32 × 32 | `index.html` favicon |
| `icon-64.png` | 64 × 64 | General-purpose small icon (not linked yet) |
| `apple-touch-icon.png` | 180 × 180 | `index.html`, manifest |
| `pwa-192.png` | 192 × 192 | Manifest (`any`) |
| `app-icon-512.png` | 512 × 512 | Manifest (`any`) |
| `app-icon-1024.png` | 1024 × 1024 | Master copy for stores and future maskable icons |

`public/manifest.webmanifest` is the single source for install icons, and
`index.html` carries the browser icons. Both point into `public/brand/icons/`;
there are no loose icon files in `public/` any more.

## Where the mark appears

- **Header** — wordmark on the left, at 2rem tall, linking home; primary tabs follow it.
- **Footer** — wordmark at 1.25rem tall, with no additional text.
- **Landing and sign-in** — a larger standalone mark above the copy.
- **Browser and home screen** — favicons and the web manifest.

## Agent team artwork

| File | Size | Use |
|---|---|---|
| `public/brand/flowquery-ai-development-team-overview.png` | 1536 × 655 | Corrected team overview banner at the top of `/people`, above the directory. Displayed whole, with `object-fit: contain` and the natural aspect ratio preserved. |
| `public/brand/agents/defaults/prf_*.png` | 512 × 512 | One approved default portrait per non-human profile, keyed by profile id. |

The banner lists the real 16-agent roster and its roles. It is the corrected
artwork from `FlowQuery_Corrected_AI_Team_Art_Pack/`. The older fictional
poster and its 19 crops were superseded and removed during the repository
cleanup; they are not part of the application or its history.

`src/shared/agent-portraits.ts` is the single mapping from profile id to
default portrait. The UI never hardcodes these paths. An uploaded picture is
stored in D1 and wins over the default; for an agent, choosing a drawn colour
is also a customisation, and **Restore default** clears both and returns the
portrait. Uploads never touch the files here.

The portraits in `defaults/` are the approved illustrated set from
`FlowQuery_Corrected_AI_Team_Art_Pack/agents/`, one per canonical agent,
512 × 512 and hash-identical to the supplied files. The mapping is recorded in
`public/brand/agents/defaults/README.md`.

## Human administrator defaults — `public/brand/humans/`

| File | GitHub id | Account |
|---|---|---|
| `kieron-default.png` | `51761129` | Kieron |
| `abdul-default.png` | `37402145` | Abdul |

The mapping lives in `src/shared/human-default-avatars.ts`, keyed by the
immutable GitHub numeric id rather than a display name. Abdul's pre-created
`prf_abdul` profile is a fallback until his identity row exists. An upload in
D1 wins; removing it restores these files, which are never overwritten.

## Rules

1. Do not redraw, recolour or crop the supplied artwork in CSS. If a size is
   wrong, fix the asset.
2. Keep one dimension fixed and the other `auto`. No distortion.
3. Preserve the dark theme: the navy plate is part of the asset, not a
   background to be replaced with a light colour.
4. Add new sizes to the icon table above and to the manifest in the same
   change.
5. The original artwork is never overwritten; a new art pack replaces it and
   updates this document.
