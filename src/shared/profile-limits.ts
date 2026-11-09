/**
 * How much text a profile page accepts.
 *
 * Shared so the textarea's `maxLength` and the Worker's validation cannot drift.
 * The Worker is still the check that counts: a browser limit is a courtesy to
 * the typist, not a control.
 */
export const ROLE_TITLE_MAX = 120
export const ABOUT_MAX = 2000
export const SKILLS_MAX = 1000
export const DEVELOPMENT_MAX = 1000
