import { describe, expect, it } from 'vitest'

import { isContiguous, moveWithin, positionsFor } from '../src/shared/ordering'

describe('moveWithin', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('moves an item down', () => {
    expect(moveWithin(ids, 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item up', () => {
    expect(moveWithin(ids, 'd', 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves to the start', () => {
    expect(moveWithin(ids, 'c', 0)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves to the end', () => {
    expect(moveWithin(ids, 'a', 3)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('clamps a target index beyond the end', () => {
    expect(moveWithin(ids, 'a', 99)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('clamps a negative target index', () => {
    expect(moveWithin(ids, 'c', -5)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('is a no-op when the item is already at the target index', () => {
    expect(moveWithin(ids, 'b', 1)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('handles an empty column by placing the item first', () => {
    expect(moveWithin([], 'a', 0)).toEqual(['a'])
  })

  it('handles a single-item column', () => {
    expect(moveWithin(['a'], 'a', 0)).toEqual(['a'])
  })

  it('never drops or duplicates an item', () => {
    for (let target = 0; target <= ids.length; target += 1) {
      const result = moveWithin(ids, 'c', target)
      expect(result).toHaveLength(ids.length)
      expect(new Set(result).size).toBe(ids.length)
      expect(result).toContain('c')
    }
  })

  it('round-trips: moving to an index then back restores the original order', () => {
    const moved = moveWithin(ids, 'a', 3)
    expect(moveWithin(moved, 'a', 0)).toEqual(ids)
  })
})

describe('positionsFor', () => {
  it('assigns contiguous positions in order', () => {
    expect(positionsFor(['x', 'y', 'z'])).toEqual([
      { id: 'x', position: 0 },
      { id: 'y', position: 1 },
      { id: 'z', position: 2 },
    ])
  })

  it('produces an empty list for an empty column', () => {
    expect(positionsFor([])).toEqual([])
  })
})

describe('isContiguous', () => {
  it('accepts a well-formed column', () => {
    expect(
      isContiguous([
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
      ]),
    ).toBe(true)
  })

  it('rejects duplicate positions', () => {
    expect(
      isContiguous([
        { id: 'a', position: 0 },
        { id: 'b', position: 0 },
      ]),
    ).toBe(false)
  })

  it('rejects gaps', () => {
    expect(
      isContiguous([
        { id: 'a', position: 0 },
        { id: 'b', position: 2 },
      ]),
    ).toBe(false)
  })

  it('rejects out-of-range positions', () => {
    expect(isContiguous([{ id: 'a', position: 5 }])).toBe(false)
  })
})

describe('ordering invariants after repeated moves', () => {
  it('stays contiguous and unique through a random-ish sequence', () => {
    let order = ['a', 'b', 'c', 'd', 'e']
    const sequence: [string, number][] = [
      ['c', 0],
      ['a', 4],
      ['e', 2],
      ['b', 1],
      ['d', 0],
      ['d', 4],
      ['c', 2],
    ]

    for (const [id, index] of sequence) {
      order = moveWithin(order, id, index)
      expect(order).toHaveLength(5)
      expect(new Set(order).size).toBe(5)
      expect(isContiguous(positionsFor(order))).toBe(true)
    }
  })
})
