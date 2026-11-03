import { useState } from 'react'

import type { BoardTheme } from '../shared/api-types'
import { COLUMNS, type ColumnKey } from '../shared/columns'
import { inkFor } from './theme'

/**
 * Board appearance editor.
 *
 * Every colour is optional. Clearing a field removes that surface's override,
 * so "default" is always reachable without guessing the original values.
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

  function clearAll() {
    setBackground(undefined)
    setColumns({})
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

  const preview = (colour: string | undefined) =>
    colour ? { background: colour, color: inkFor(colour) } : undefined

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
        Saved with this board, visible to everyone who can open it. Colours are limited to six-digit
        hex so a colour field cannot become a request to another site.
      </p>

      <div className="theme-row">
        <label className="theme-label" htmlFor="theme-background">
          Page background
        </label>
        <input
          id="theme-background"
          className="theme-colour"
          type="color"
          value={background ?? '#0b1020'}
          onChange={(event) => setBackground(event.target.value)}
        />
        <span className="theme-preview" style={preview(background ?? '#0b1020')}>
          Aa
        </span>
        <button
          className="button"
          type="button"
          onClick={() => setBackground(undefined)}
          disabled={!background}
        >
          Default
        </button>
      </div>

      {COLUMNS.map((column) => (
        <div className="theme-row" key={column.key}>
          <label className="theme-label" htmlFor={`theme-${column.key}`}>
            {column.name}
          </label>
          <input
            id={`theme-${column.key}`}
            className="theme-colour"
            type="color"
            value={columns[column.key] ?? '#141a2e'}
            onChange={(event) => setColumn(column.key, event.target.value)}
          />
          <span className="theme-preview" style={preview(columns[column.key] ?? '#141a2e')}>
            Aa
          </span>
          <button
            className="button"
            type="button"
            onClick={() => setColumn(column.key, undefined)}
            disabled={!columns[column.key]}
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
        <button className="button" type="button" onClick={clearAll} disabled={busy}>
          Reset all
        </button>
      </div>
    </section>
  )
}
