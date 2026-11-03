// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ThemePanel } from '../../src/app/ThemePanel'

/**
 * The appearance panel: presets must be one click, and Save must send exactly
 * the colours chosen — not the defaults behind them.
 */

afterEach(() => {
  cleanup()
})

function renderPanel(initial = {}) {
  const onSave = vi.fn(async () => null)
  const onClose = vi.fn()

  render(<ThemePanel initial={initial} onSave={onSave} onClose={onClose} />)
  return { onSave, onClose }
}

describe('ThemePanel', () => {
  it('offers a swatch group for the board and each column', () => {
    renderPanel()

    for (const name of ['Board background', 'Backlog', 'To Do', 'In Progress', 'Review', 'Done']) {
      expect(screen.getByRole('group', { name: `${name} presets` })).toBeTruthy()
    }
  })

  it('selects a preset in one click', async () => {
    renderPanel()

    const swatch = screen.getByRole('button', { name: 'Teal for Backlog' })
    expect(swatch.getAttribute('aria-pressed')).toBe('false')

    await userEvent.click(swatch)
    expect(swatch.getAttribute('aria-pressed')).toBe('true')
  })

  it('saves only the colours that were changed', async () => {
    const { onSave, onClose } = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Rose for To Do' }))
    await userEvent.click(screen.getByRole('button', { name: 'Paper for Board background' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save colours' }))

    expect(onSave).toHaveBeenCalledWith({
      background: '#f4efe6',
      columns: { todo: '#4a1f2a' },
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('clears a surface back to the default', async () => {
    renderPanel({ columns: { review: '#3b2f63' } })

    const swatch = screen.getByRole('button', { name: 'Violet for Review' })
    expect(swatch.getAttribute('aria-pressed')).toBe('true')

    // Six rows each have a "Default" button, so scope to the Review row.
    const row = swatch.closest('.theme-row') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Default' }))

    expect(swatch.getAttribute('aria-pressed')).toBe('false')
  })

  it('reports a save failure instead of closing', async () => {
    const onSave = vi.fn(async () => 'Could not save colours.')
    const onClose = vi.fn()

    render(<ThemePanel initial={{}} onSave={onSave} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Teal for Backlog' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save colours' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })
})
