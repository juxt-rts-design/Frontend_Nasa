import { useEffect, useMemo, useRef, useState } from 'react'
import { loadCountries, searchPlaces } from '../data/countries'
import { Icon } from '../ui/icons'

export function CountrySearch({ currentId, currentNom, onPick, autoFocus = false, compact = true }) {
  const [q, setQ] = useState('')
  const [ready, setReady] = useState(false)
  const [hi, setHi] = useState(0)
  const input = useRef(null)
  const typing = q.trim().length > 0

  useEffect(() => {
    loadCountries().then(() => setReady(true))
  }, [])

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  const shortcuts = useMemo(() => searchPlaces('', compact ? 5 : 8), [ready, compact])
  const hits = useMemo(() => (typing ? searchPlaces(q, compact ? 7 : 12) : []), [q, ready, typing, compact])

  function choose(item) {
    if (!item) return
    onPick(item.id)
    setQ('')
    setHi(0)
  }

  function onKey(e) {
    const list = typing ? hits : shortcuts
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(list.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(list[hi] || list[0])
    } else if (e.key === 'Escape') {
      setQ('')
    }
  }

  return (
    <div className={`country-search${compact ? ' compact' : ''}`}>
      <label className="country-field">
        <Icon name="pin" size={15} />
        <input
          ref={input}
          className="field"
          value={q}
          onChange={(e) => { setQ(e.target.value); setHi(0) }}
          onKeyDown={onKey}
          placeholder={currentNom || 'Rechercher un pays'}
          aria-label="Rechercher un pays"
          autoComplete="off"
        />
        {q && (
          <button type="button" className="icon-btn sm" aria-label="Effacer" onClick={() => setQ('')}>
            <Icon name="x" size={12} />
          </button>
        )}
      </label>

      {compact && !typing && (
        <p className="filter-hint">Tapez un pays, ou cliquez-le sur le globe.</p>
      )}
      {!typing && (
        <div className="country-chips" role="list">
          {shortcuts.map((item) => (
            <button
              key={item.id}
              type="button"
              className="country-chip"
              aria-pressed={item.id === currentId}
              onClick={() => choose(item)}
            >
              {item.nom}
            </button>
          ))}
        </div>
      )}

      {typing && (
        <div className="pop-list country-hits" role="listbox" aria-label="Pays proposés">
          {hits.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-current={item.id === currentId}
              aria-selected={i === hi}
              onMouseEnter={() => setHi(i)}
              onClick={() => choose(item)}
            >
              <span>
                {item.nom}
                {item.kind === 'world' && <small>toute la Terre</small>}
                {item.kind === 'macro' && <small>plusieurs pays</small>}
              </span>
              {item.id === currentId && <Icon name="check" size={15} />}
            </button>
          ))}
          {ready && hits.length === 0 && <p className="muted sm">Aucun pays pour « {q} ».</p>}
        </div>
      )}
    </div>
  )
}
