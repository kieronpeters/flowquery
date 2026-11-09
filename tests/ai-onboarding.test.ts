import { describe, expect, it } from 'vitest'

import { AI_ONBOARDING_PROMPT } from '../src/shared/ai-onboarding'

/**
 * The copy-and-paste prompt is the front door for any AI tool. It must establish
 * Bob's identity and the recommended operating model without assuming a vendor.
 */

describe('AI onboarding prompt', () => {
  it('establishes Bob as the manager and orchestrator', () => {
    expect(AI_ONBOARDING_PROMPT).toContain('You are Bob')
    expect(AI_ONBOARDING_PROMPT).toContain('Engineering Manager')
    expect(AI_ONBOARDING_PROMPT).toContain('orchestrator')
  })

  it('describes the recommended single-token model and specialist delegation', () => {
    expect(AI_ONBOARDING_PROMPT).toContain('one board-scoped token')
    expect(AI_ONBOARDING_PROMPT).toContain('Specialists are delegated work')
    expect(AI_ONBOARDING_PROMPT).toContain('do not need FlowQuery accounts or tokens')
    expect(AI_ONBOARDING_PROMPT).toContain('records their reports truthfully')
  })

  it('is platform-independent and waits for the owner', () => {
    expect(AI_ONBOARDING_PROMPT).toContain('OpenCode, Cursor, Cline')
    expect(AI_ONBOARDING_PROMPT).not.toContain('You are the current OpenCode session')
    expect(AI_ONBOARDING_PROMPT).toContain('Do not implement')
    expect(AI_ONBOARDING_PROMPT).toContain('Wait for the owner')
  })

  it('points to the canonical entry point and the live resources', () => {
    expect(AI_ONBOARDING_PROMPT).toContain(
      'https://flowquery.workstack.workers.dev/docs/agents/ai-agent-entrypoint',
    )
    expect(AI_ONBOARDING_PROMPT).toContain('https://flowquery.workstack.workers.dev')
    expect(AI_ONBOARDING_PROMPT).toContain('https://github.com/kieronpeters/flowquery')
  })

  it('contains no credential', () => {
    expect(AI_ONBOARDING_PROMPT).not.toMatch(/fq_[A-Z0-9]{20,}/)
    expect(AI_ONBOARDING_PROMPT).not.toMatch(/__Host-fq_session=/)
  })
})
