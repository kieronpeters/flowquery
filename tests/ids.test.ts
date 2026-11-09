import { describe, expect, it } from 'vitest'

import { randomId } from '../src/worker/lib/ids'

/**
 * Board and ticket identifiers are opaque and non-sequential. The prefix is for
 * logs and errors only; clients never parse it.
 */

describe('opaque identifiers', () => {
  it('generates prefixed base32 ids, not numbers', () => {
    const boardId = randomId('brd')
    const ticketId = randomId('tsk')

    expect(boardId).toMatch(/^brd_[0-9A-HJKMNP-TV-Z]+$/)
    expect(ticketId).toMatch(/^tsk_[0-9A-HJKMNP-TV-Z]+$/)
    expect(boardId).not.toMatch(/^\d+$/)
    expect(ticketId).not.toMatch(/^\d+$/)
  })

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, () => randomId('brd')))
    expect(ids.size).toBe(200)
  })

  it('is long enough to resist guessing', () => {
    const suffix = randomId('tsk').slice('tsk_'.length)
    expect(suffix.length).toBeGreaterThanOrEqual(20)
  })
})
