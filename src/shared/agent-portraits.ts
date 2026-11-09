/**
 * The default portrait for every non-human profile.
 *
 * One map, not a path hardcoded at each call site. The keys are the stable
 * `team_profiles.id` values; the values are static assets under
 * `public/brand/agents/defaults/`. A custom upload lives in D1 and always wins;
 * this is only what an agent looks like when nobody has replaced it.
 *
 * The portraits are ordinary image files, so replacing the artwork later is a
 * file swap: no code, database or migration change.
 */
export const AGENT_DEFAULT_PORTRAITS: Record<string, string> = {
  prf_bob: '/brand/agents/defaults/prf_bob.png',
  prf_alex: '/brand/agents/defaults/prf_alex.png',
  prf_sarah: '/brand/agents/defaults/prf_sarah.png',
  prf_olivia: '/brand/agents/defaults/prf_olivia.png',
  prf_daniel: '/brand/agents/defaults/prf_daniel.png',
  prf_marcus: '/brand/agents/defaults/prf_marcus.png',
  prf_james: '/brand/agents/defaults/prf_james.png',
  prf_victoria: '/brand/agents/defaults/prf_victoria.png',
  prf_chris: '/brand/agents/defaults/prf_chris.png',
  prf_emma: '/brand/agents/defaults/prf_emma.png',
  prf_liam: '/brand/agents/defaults/prf_liam.png',
  prf_priya: '/brand/agents/defaults/prf_priya.png',
  prf_ethan: '/brand/agents/defaults/prf_ethan.png',
  prf_rebecca: '/brand/agents/defaults/prf_rebecca.png',
  prf_noah: '/brand/agents/defaults/prf_noah.png',
  prf_contractor: '/brand/agents/defaults/prf_contractor.png',
}

/** The default portrait for a profile id, or null when there is none. */
export function defaultPortraitFor(profileId: string | null | undefined): string | null {
  if (!profileId) return null
  return AGENT_DEFAULT_PORTRAITS[profileId] ?? null
}
