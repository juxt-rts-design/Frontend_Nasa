import { useEffect, useRef, useState } from 'react'

/** Charge une donnée asynchrone ; garde la précédente pendant le calcul pour éviter les sauts d'écran. */
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const run = useRef(0)
  useEffect(() => {
    run.current += 1
    const id = run.current
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fn)
      .then((data) => { if (id === run.current) setState({ data, loading: false, error: null }) })
      .catch((error) => { if (id === run.current) setState((s) => ({ ...s, loading: false, error })) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export function useDebounced(value, ms = 220) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return v
}
