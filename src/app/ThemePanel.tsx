import { useState } from 'react'

import type { BoardTheme } from '../shared/api-types'
import { COLUMNS, type ColumnKey } from '../shared/columns'
import { cardBackground, inkFor } from './theme'

/**
 * Preset surfaces.
 *
 * Seven base tones plus a few varieties, including three light ones so the
 * luminance-aware ink is exercised rather than theoretical. Clicking a swatch
 * is one action; the native picker stays for anything else.
 */
const PRESETS = [
  { name: 'Midnight', value: '#0b1020' },
  { name: 'Slate', value: '#141a2e' },
  { name: 'Steel', value: '#2b3038' },
  { name: 'Indigo', value: '#2a2350' },
  { name: 'Violet', value: '#3b2f63' },
  { name: 'Teal', value: '#123c3a' },
  { name: 'Forest', value: '#123524' },
  { name: 'Amber', value: '#4a3617' },
  { name: 'Rose', value: '#4a1f2a' },
  { name: 'Paper', value: '#f4efe6' },
  { name: 'Mint', value: '#dff2e4' },
  { name: 'Sky', value: '#dce9f7' },
] as const

type Surface = {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}

/**
 * Board appearance editor.
 *
 * Every colour is optional; clearing a surface removes its override rather
 * than storing a copy of the default, so the app can change its own defaults
 * later without boards freezing the old ones.
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

  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)

    try {
      const theme: BoardTheme = {}
      if (background) theme.background = background
      if (Object.keys(columns).length > 0) theme.columns = columns

      const message = await onSave(theme)
      if (message) setError(message)
      else onClose()
    } finally {
      setBusy(false)
    }
  }

  const surfaces: Surface[] = [
    { id: 'board', label: 'Board background', value: background, onChange: setBackground },
    ...COLUMNS.map((column) => ({
      id: column.key,
      label: column.name,
      value: columns[column.key],
      onChange: (value: string | undefined) => setColumn(column.key, value),
    })),
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
        Saved with this board and visible to everyone who can open it. Pick a swatch or use the
        colour field for anything else. Text and cards adjust automatically so they stay readable.
      </p>

      {surfaces.map((surface) => (
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
          </div>

          <input
            className="theme-colour"
            type="color"
            aria-label={`Custom colour for ${surface.label}`}
            value={surface.value ?? '#141a2e'}
            onChange={(event) => surface.onChange(event.target.value)}
          />

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
      ))}

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
          }}
          disabled={busy}
        >
          Reset all
        </button>
      </div>
    </section>
  )
}
