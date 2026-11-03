import { useState } from 'react'

import type { BoardTheme } from '../shared/api-types'
import { COLUMNS, type ColumnKey } from '../shared/columns'
import { PRESETS, cardBackground, inkFor } from './theme'

type Surface = {
  id: string
  label: string
  value: string | undefined
  /** Colour the preview shows behind "Aa". */
  preview: string | undefined
  onChange: (value: string | undefined) => void
}

/**
 * Board appearance editor.
 *
 * Every colour is optional; clearing a surface removes its override rather
 * than storing a copy of the default, so the app can change its own defaults
 * later without boards freezing the old ones.
 *
 * Presets are the primary action — one click each. The native picker is
 * behind a per-row "Custom" button so the common path stays uncluttered.
 */
export function ThemePanel({
  initial,
  onSave,
  onClose,
}: {
  initial: BoardTheme
  onSave: (theme: BoardTheme) => Promise<string | null>
  onClose: () => void
}) {
  const [background, setBackground] = useState<string | undefined>(initial.background)
  const [columns, setColumns] = useState<Partial<Record<ColumnKey, string>>>(initial.columns ?? {})
  const [tickets, setTickets] = useState<string | undefined>(initial.tickets)
  const [custom, setCustom] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setColumn(key: ColumnKey, value: string | undefined) {
    setColumns((current) => {
      const next = { ...current }
      if (value === undefined) delete next[key]
      else next[key] = value
      return next
    })
  }

  function toggleCustom(id: string) {
    setCustom((current) => ({ ...current, [id]: !current[id] }))
  }

  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const theme: BoardTheme = {}
      if (background) theme.background = background
      if (Object.keys(columns).length > 0) theme.columns = columns
      if (tickets) theme.tickets = tickets

      const message = await onSave(theme)
      if (message) setError(message)
      else onClose()
    } finally {
      setBusy(false)
    }
  }

  const surfaces: Surface[] = [
    {
      id: 'board',
      label: 'Board background',
      value: background,
      preview: background,
      onChange: setBackground,
    },
    ...COLUMNS.map((column) => ({
      id: column.key,
      label: column.name,
      value: columns[column.key],
      preview: columns[column.key],
      onChange: (value: string | undefined) => setColumn(column.key, value),
    })),
    {
      id: 'tickets',
      label: 'Tickets',
      value: tickets,
      preview: tickets,
      onChange: setTickets,
    },
  ]

  return (
    <section className="theme-panel" aria-labelledby="theme-heading">
      <div className="theme-panel-header">
        <h2 id="theme-heading" className="section-heading">
          Board appearance
        </h2>
        <button className="button button-quiet inline" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="token-note">
        Saved with this board and visible to everyone who can open it. Pick a swatch, or press
        Custom for a colour of your own. Text and card shading adjust automatically so they stay
        readable.
      </p>

      {surfaces.map((surface) => {
        const showingCustom = custom[surface.id] === true

        return (
          <div className="theme-row" key={surface.id}>
            <span className="theme-label">{surface.label}</span>

            <div className="theme-swatches" role="group" aria-label={`${surface.label} presets`}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className="swatch"
                  style={{ background: preset.value }}
                  aria-label={`${preset.name} for ${surface.label}`}
                  aria-pressed={surface.value === preset.value}
                  onClick={() => surface.onChange(preset.value)}
                />
              ))}

              <button
                type="button"
                className="swatch swatch-custom"
                aria-label={`Custom colour for ${surface.label}`}
                aria-expanded={showingCustom}
                onClick={() => toggleCustom(surface.id)}
              >
                +
              </button>
            </div>

            {showingCustom && (
              <input
                className="theme-colour"
                type="color"
                aria-label={`Pick a custom colour for ${surface.label}`}
                value={surface.value ?? '#141a2e'}
                onChange={(event) => surface.onChange(event.target.value)}
              />
            )}

            <span
              className="theme-preview"
              style={
                surface.value
                  ? {
                      background: cardBackground(surface.value),
                      color: inkFor(cardBackground(surface.value)),
                    }
                  : undefined
              }
            >
              Aa
            </span>

            <button
              className="button"
              type="button"
              onClick={() => surface.onChange(undefined)}
              disabled={!surface.value}
            >
              Default
            </button>
          </div>
        )
      })}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <div className="theme-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => void save()}
          disabled={busy}
        >
          Save colours
        </button>
        <button
          className="button"
          type="button"
          onClick={() => {
            setBackground(undefined)
            setColumns({})
            setTickets(undefined)
          }}
          disabled={busy}
        >
          Reset all
        </button>
      </div>
    </section>
  )
}
