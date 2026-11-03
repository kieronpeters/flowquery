# FlowQuery — Visual Direction

**Status:** reference, not a specification. The application is built; this document records the visual language and separates it from the features in the concept images that were **not** built.

---

## 1. What was built

- Dark navy foundation, restrained violet accents, rounded surfaces, generous spacing.
- One accent colour used for emphasis only: primary buttons, the active drop target, focus rings.
- System font stack; no webfont download.
- A board that is Kanban-first: five columns, cards with title, priority chip, assignee and due date.
- Accessible contrast, visible focus states, keyboard operation for every action including moving a card.

## 2. What the concept images show that is deliberately absent

The three images in this directory were generated before the scope was settled. They depict a larger product. None of the following exists, and none should be inferred from the images:

| In the images | Status |
|---|---|
| Sidebar with Home, My Work, Boards, Projects, Team, Agents, Reports, Settings | **Not built.** The app has a header, a board list and a board. |
| List, timeline and calendar views | **Not built.** Kanban only. |
| Sprint progress, velocity and reporting metrics | **Out of scope.** No sprint management in the MVP. |
| Agent directory with model and status per agent | **Not built.** Profiles are assignee labels in a dropdown. |
| Human avatars and presence indicators | **Not built.** No presence, no avatars in the UI. |
| Task counts and burndown charts on a dashboard | **Not built.** The dashboard lists boards with a task count. |

If any of these is wanted later, it needs a decision entry and an owner conversation — not an inference from an image.

## 3. Visual rules that do apply

1. **One accent.** Violet is for emphasis, not decoration.
2. **Surfaces, not borders.** Elevation is expressed with a slightly lighter surface plus a hairline border.
3. **Density with air.** Cards are compact, but the board breathes.
4. **Motion is feedback, not decoration.** The only animation is the drag transform.
5. **Accessibility is a requirement.** Contrast, focus rings, keyboard paths and semantic landmarks are part of "done", not polish.
6. **No icon-only controls without an accessible name.** Buttons carry `aria-label` when the visible text is a symbol.

## 4. Where the rules live in code

- Design tokens: `src/app/app.css` (`:root` custom properties).
- Component styling: the same file, grouped by surface (shell, board, drawer, activity, tokens).
- No CSS framework, no utility classes — see `DECISIONS.md` DEC-032 for why.
