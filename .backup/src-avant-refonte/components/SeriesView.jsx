import { useEffect, useMemo, useState } from 'react'
import { Area, Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../state'
import { exportSerieCsv, fetchSerie } from '../api/client'
import { REGIONS, SATELLITES, decadeTrend, getCalendar, parseCell } from '../data/engine'
import { fmt, moisNom, trendPhrase } from '../ui/format'

const COLORS = Object.fromEntries(SATELLITES.map((s) => [s.id, s.color]))

function indexSeries(regionId) {
  const rows = getCalendar(regionId)
  return rows.map((r) => {
    const peers = rows.filter((p) => p.mois === r.mois && p.mediane_historique)
    const base = r.mediane_historique || peers[0]?.mediane_historique || r.total_detections || 1
    return { annee: r.annee, mois: r.mois, index: Math.round((r.total_detections / base) * 100) }
  })
}

export function SeriesView() {
  const app = useApp()
  const [harmonise, setHarmonise] = useState(false)
  const [sats, setSats] = useState(['Aqua', 'Suomi NPP'])
  const [regions, setRegions] = useState(['Afrique_Centrale', 'Gabon'])
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancel = false
    if (app.seriesMode !== 'cellule') return undefined
    fetchSerie(app.cellId, {
      region: app.regionId,
      anneeDebut: 2002,
      anneeFin: 2026,
      harmonise,
    }).then((data) => { if (!cancel) setRows(data) })
    return () => { cancel = true }
  }, [app.cellId, app.regionId, app.seriesMode, harmonise])

  const chart = useMemo(() => {
    if (app.seriesMode === 'regions') {
      const bags = regions.map((id) => ({ id, rows: indexSeries(id) }))
      const base = bags[0]?.rows || []
      return base.map((r, i) => {
        const point = { label: `${moisNom(r.mois).slice(0, 3)} ${r.annee}` }
        bags.forEach((b) => { point[b.id] = b.rows[i]?.index ?? null })
        return point
      })
    }
    const chosen = rows.filter((r) => sats.includes(r.satellite))
    const byKey = new Map()
    chosen.forEach((r) => {
      const key = `${r.annee}-${r.mois}`
      const cur = byKey.get(key) || { annee: r.annee, mois: r.mois, label: `${moisNom(r.mois).slice(0, 3)} ${String(r.annee).slice(2)}` }
      cur[r.satellite] = r.nb_detections
      byKey.set(key, cur)
    })
    const points = [...byKey.values()]
    const primary = sats[0]
    if (primary) {
      const buckets = new Map()
      points.forEach((p) => {
        const list = buckets.get(p.mois) || []
        if (p[primary] != null) list.push(p[primary])
        buckets.set(p.mois, list)
      })
      points.forEach((p) => {
        const list = (buckets.get(p.mois) || []).slice().sort((a, b) => a - b)
        if (!list.length) return
        const mid = Math.floor(list.length / 2)
        const median = list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2
        const mean = list.reduce((a, b) => a + b, 0) / list.length
        const variance = list.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, list.length - 1)
        const std = Math.sqrt(variance)
        p.median = Math.round(median)
        p.bande = [Math.max(0, Math.round(median - std)), Math.round(median + std)]
      })
    }
    return points
  }, [app.seriesMode, rows, sats, regions])

  const trend = decadeTrend(app.regionId)
  const parsed = parseCell(app.cellId)
  const lines = app.seriesMode === 'regions' ? regions : sats

  function toggle(id, setList) {
    setList((cur) => (cur.includes(id) ? (cur.length === 1 ? cur : cur.filter((x) => x !== id)) : [...cur, id].slice(-4)))
  }

  return (
    <div className="view-pad">
      <div className="series-layout">
        <aside className="panel sheet">
          <p className="kicker">Séries</p>
          <div className="seg">
            <button aria-pressed={app.seriesMode === 'cellule'} onClick={() => app.setSeriesMode('cellule')}>Cellule</button>
            <button aria-pressed={app.seriesMode === 'regions'} onClick={() => app.setSeriesMode('regions')}>Régions</button>
          </div>
          {app.seriesMode === 'cellule' ? (
            <>
              <label className="muted" htmlFor="cell">Cellule 0,1°
                <input id="cell" className="field" style={{ width: '100%', marginTop: 6 }} value={app.cellId} onChange={(e) => app.setCellId(e.target.value.trim())} />
              </label>
              <p className="muted">{parsed ? `${parsed.lat}°, ${parsed.lon}°` : 'Identifiant C_lat_lon'}</p>
              <button className="ghost" onClick={() => setHarmonise((v) => !v)} aria-pressed={harmonise}>
                {harmonise ? 'Équivalent Aqua' : 'Comptes bruts par satellite'}
              </button>
              <div className="chips">
                {SATELLITES.map((s) => (
                  <button key={s.id} aria-pressed={sats.includes(s.id)} onClick={() => toggle(s.id, setSats)}>
                    <i className="dot" style={{ background: s.color }} />{s.id}
                  </button>
                ))}
              </div>
              <p className="muted">VIIRS au-dessus de MODIS montre le biais de résolution, pas forcément plus de feux. L’équivalent Aqua superpose les courbes.</p>
            </>
          ) : (
            <>
              <p className="muted">Indice 100 = médiane du mois. Plusieurs régions se superposent.</p>
              <div className="chips">
                {REGIONS.map((r) => (
                  <button key={r.id} aria-pressed={regions.includes(r.id)} onClick={() => toggle(r.id, setRegions)}>{r.nom}</button>
                ))}
              </div>
            </>
          )}
          <button className="solid" onClick={() => exportSerieCsv(app.cellId, rows)}>Exporter la série</button>
        </aside>
        <section className="panel chart-card">
          <p className="kicker">{app.seriesMode === 'cellule' ? app.cellId : 'Indice régional'}</p>
          <h2 className="panel-title" style={{ fontSize: 28 }}>{app.region.nom}</h2>
          <p className="banner" style={{ position: 'static' }}>{trendPhrase(trend)}</p>
          <div style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(244,239,230,0.08)" />
                <XAxis dataKey="label" minTickGap={28} tick={{ fill: '#b7ada3', fontSize: 11 }} />
                <YAxis tick={{ fill: '#b7ada3', fontSize: 11 }} width={42} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#141820', border: '1px solid rgba(244,239,230,0.12)', borderRadius: 12 }}
                  labelStyle={{ color: '#f4efe6' }}
                />
                {app.seriesMode === 'cellule' && <Area dataKey="bande" stroke="none" fill="rgba(230,177,92,0.16)" />}
                {app.seriesMode === 'cellule' && <Line dataKey="median" name="Médiane" stroke="#e6b15c" strokeDasharray="4 4" dot={false} />}
                {lines.map((id) => (
                  <Line key={id} type="monotone" dataKey={id} name={REGIONS.find((r) => r.id === id)?.nom || id} stroke={COLORS[id] || '#ffb089'} dot={false} strokeWidth={2} />
                ))}
                <Brush dataKey="label" height={22} stroke="#ff4d2e" fill="#10131a" travellerWidth={8} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  )
}
