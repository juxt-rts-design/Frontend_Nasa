import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useApp } from '../state'
import { exportRowsCsv, fetchSeries } from '../api/client'
import {
  FIRST_YEAR, LAST_YEAR, MOIS_C, SATELLITES, TODAY, addDays, clampDate, daysBetween, daysInMonth,
  decadeTrend, makeSpec, monthlyNormals, parseCell, satColor,
} from '../data/engine'
import { useAsync } from '../ui/hooks'
import { Icon } from '../ui/icons'
import {
  PeriodFields, SatChips, Segmented, Spinner,
} from '../ui/controls'
import {
  fmt, fmtDayMonth, fmtPeriod, heatColor, pctDelta, periodLength, trendPhrase,
} from '../ui/format'

const Chart3D = lazy(() => import('./Chart3D'))

const VIZ = [
  { id: 'ligne', label: 'Courbes', icon: 'line', hint: 'Évolution dans le temps' },
  { id: 'barres', label: 'Barres', icon: 'bars', hint: 'Un mois après l’autre' },
  { id: 'empilees', label: 'Empilées', icon: 'stack', hint: 'Volume mensuel' },
  { id: 'aires', label: 'Aires', icon: 'area', hint: 'Volumes superposés' },
  { id: 'saisons', label: 'Saisons', icon: 'seasons', hint: 'Une courbe par année, de janvier à décembre' },
  { id: '3d', label: '3D', icon: 'cube', hint: 'Barres en relief, à faire tourner' },
  { id: 'tableau', label: 'Tableau', icon: 'table', hint: 'Les chiffres exacts' },
]

const METRICS = [
  { id: 'n', label: 'Nombre de points chauds', unit: '', digits: 0 },
  { id: 'frp_moyen', label: 'FRP moyen', unit: ' MW', digits: 1 },
  { id: 'frp_max', label: 'FRP maximal', unit: ' MW', digits: 1 },
  { id: 'energie', label: 'Chaleur totale dégagée', unit: ' MW', digits: 0 },
  { id: 'jours', label: 'Jours avec au moins un point chaud', unit: ' j', digits: 0 },
]

const YEAR_COLORS = ['#ff6b4a', '#ffc857', '#7bdff2', '#b388ff', '#f6f7d7', '#5eead4', '#fb7185', '#93c5fd']
const AXIS = { fill: '#b7ada3', fontSize: 11 }
const TOOLTIP = {
  contentStyle: { background: '#141820', border: '1px solid rgba(244,239,230,0.14)', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,.4)' },
  labelStyle: { color: '#f4efe6', fontWeight: 560, marginBottom: 4 },
  itemStyle: { padding: '1px 0' },
}

function valueOf(cell, metric, harm) {
  if (!cell || !cell.couvert) return null
  if (metric === 'n') return harm ? Math.round(cell.eq * 10) / 10 : cell.n
  if (metric === 'frp_moyen') return cell.n ? Math.round((cell.sum / cell.n) * 10) / 10 : null
  if (metric === 'frp_max') return cell.n ? cell.max : null
  if (metric === 'energie') return Math.round(cell.sum)
  return cell.actifs
}

/** Agrège plusieurs satellites ; en équivalent Aqua, la moyenne évite de compter deux fois les mêmes feux. */
function sumCells(cells, harm) {
  const live = cells.filter((c) => c && c.couvert)
  if (!live.length) return null
  return {
    n: live.reduce((a, c) => a + c.n, 0),
    eq: harm ? live.reduce((a, c) => a + c.eq, 0) / live.length : live.reduce((a, c) => a + c.eq, 0),
    sum: live.reduce((a, c) => a + c.sum, 0),
    max: Math.max(...live.map((c) => c.max)),
    actifs: Math.max(...live.map((c) => c.actifs)),
    couvert: Math.max(...live.map((c) => c.couvert)),
  }
}

function addCells(a, b) {
  if (!a) return b ? { ...b } : null
  if (!b) return a
  return { n: a.n + b.n, eq: a.eq + b.eq, sum: a.sum + b.sum, max: Math.max(a.max, b.max), actifs: a.actifs + b.actifs, couvert: a.couvert + b.couvert }
}

function shiftYear(iso, n) {
  const y = Number(iso.slice(0, 4)) + n
  const md = iso.slice(5)
  return clampDate(md === '02-29' ? `${y}-02-28` : `${y}-${md}`)
}

function bucketLabel(b, gran, multiYear) {
  if (gran === 'jour') return multiYear ? `${fmtDayMonth(b.key)} ${b.key.slice(2, 4)}` : fmtDayMonth(b.key)
  if (gran === 'mois') return `${MOIS_C[Number(b.key.slice(5, 7)) - 1]} ${b.key.slice(2, 4)}`
  return b.key
}

export function SeriesView() {
  const app = useApp()
  const [viz, setViz] = useState('ligne')
  const [metric, setMetric] = useState('n')
  const [granChoice, setGranChoice] = useState('auto')
  const [lieu, setLieu] = useState(app.cellId ? 'cellule' : 'selection')
  const [normal, setNormal] = useState(true)
  const [depth, setDepth] = useState(app.mode === 'brut' ? 'satellites' : 'annees')
  const harm = app.mode !== 'brut'
  const [seasonYears, setSeasonYears] = useState(null)
  const [cmp, setCmp] = useState('annee')
  const [custom, setCustom] = useState(null)
  const [sortKey, setSortKey] = useState('periode')

  useEffect(() => { if (app.cellId) setLieu('cellule') }, [app.cellId])

  const span = daysBetween(app.dateDebut, app.dateFin) + 1
  const gran = granChoice === 'auto'
    ? (harm ? (span <= 366 * 6 ? 'mois' : 'annee') : (span <= 92 ? 'jour' : span <= 366 * 6 ? 'mois' : 'annee'))
    : (harm && granChoice === 'jour' ? 'mois' : granChoice)
  const needFrp = metric !== 'n' && metric !== 'jours'
  const m = METRICS.find((x) => x.id === metric)
  const sats = harm ? SATELLITES.filter((s) => s.id === 'Aqua') : SATELLITES.filter((s) => app.effectiveSats.includes(s.id))
  const satKey = harm ? 'Aqua' : app.effectiveSats.join('|')
  const cell = lieu === 'cellule' ? app.cellId : null
  const ring = app.activeZone?.geojson?.coordinates?.[0]
  const spec = useMemo(() => (cell
    ? makeSpec({ frpMin: app.frpMin, confiance: app.confiance, moment: app.moment, ring, zoneKey: app.activeZone ? `z${app.activeZone.id}` : '', cell })
    : app.spec), [cell, app.spec, app.frpMin, app.confiance, app.moment, ring, app.activeZone])
  const fmtV = useCallback((v) => (v == null ? '—' : fmt(v, m.digits)), [m.digits])

  const main = useAsync(() => fetchSeries({
    region: app.regionId, debut: app.dateDebut, fin: app.dateFin, satellites: app.effectiveSats, spec, gran, needFrp, cell, mode: app.mode,
  }), [app.regionId, app.dateDebut, app.dateFin, satKey, spec, gran, needFrp, cell, app.mode])

  const primary = sats.find((s) => s.id === 'Aqua') || sats[0]
  const showNormal = normal && metric === 'n' && gran !== 'annee' && ['ligne', 'barres', 'aires'].includes(viz) && primary
  const normals = useAsync(async () => (showNormal ? monthlyNormals({ region: app.regionId, satellite: primary.id, spec, harmonise: harm }) : null),
    [showNormal, app.regionId, primary?.id, spec, harm])

  const periodYears = useMemo(() => {
    const y1 = Number(app.dateDebut.slice(0, 4))
    const y2 = Number(app.dateFin.slice(0, 4))
    const list = []
    for (let y = Math.max(FIRST_YEAR, y2 - 7); y <= y2; y += 1) if (y >= y1 || y2 - y1 < 2) list.push(y)
    while (list.length < 4 && list[0] > FIRST_YEAR) list.unshift(list[0] - 1)
    return list.slice(-8)
  }, [app.dateDebut, app.dateFin])
  const years = seasonYears || periodYears
  const yearsKey = years.join(',')
  const needYears = viz === 'saisons' || (viz === '3d' && depth === 'annees')
  const yearly = useAsync(async () => {
    if (!needYears || !years.length) return null
    const y1 = Math.min(...years)
    const y2 = Math.max(...years)
    return fetchSeries({
      region: app.regionId, debut: `${y1}-01-01`, fin: `${y2}-12-31` < TODAY ? `${y2}-12-31` : TODAY, satellites: app.effectiveSats, spec, gran: 'mois', needFrp, cell, mode: app.mode,
    })
  }, [needYears, yearsKey, app.regionId, satKey, spec, needFrp, cell, app.mode])

  const periodB = useMemo(() => {
    if (cmp === 'precedente') return { debut: clampDate(addDays(app.dateDebut, -span)), fin: clampDate(addDays(app.dateDebut, -1)) }
    if (cmp === 'perso' && custom) return custom
    return { debut: shiftYear(app.dateDebut, -1), fin: shiftYear(app.dateFin, -1) }
  }, [cmp, custom, app.dateDebut, app.dateFin, span])
  const compare = useAsync(() => fetchSeries({
    region: app.regionId, debut: periodB.debut, fin: periodB.fin, satellites: app.effectiveSats, spec, gran: 'tout', needFrp, cell, mode: app.mode,
  }), [app.regionId, periodB.debut, periodB.fin, satKey, spec, needFrp, cell, app.mode])

  const buckets = main.data || []
  const multiYear = app.dateDebut.slice(0, 4) !== app.dateFin.slice(0, 4)

  const chart = useMemo(() => buckets.map((b) => {
    const point = { key: b.key, label: bucketLabel(b, gran, multiYear) }
    sats.forEach((s) => { point[s.id] = valueOf(b.sat[s.id], metric, harm) })
    const tot = sumCells(sats.map((s) => b.sat[s.id]), harm)
    point.total = valueOf(tot, metric, harm)
    if (showNormal && normals.data) {
      const mo = Number(b.key.slice(5, 7)) || Number(b.debut.slice(5, 7))
      const y = Number(b.debut.slice(0, 4))
      const st = normals.data[mo - 1]
      if (st?.median != null) {
        if (gran === 'jour') {
          const perDay = st.median / daysInMonth(y, mo)
          point.median = Math.round(perDay)
          point.bande = [Math.round(perDay * 0.65), Math.round(perDay * 1.35)]
        } else {
          const f = b.jours / daysInMonth(y, mo)
          point.median = Math.round(st.median * f)
          point.bande = [Math.max(0, Math.round((st.median - st.std) * f)), Math.round((st.median + st.std) * f)]
        }
      }
    }
    return point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [buckets, satKey, metric, harm, showNormal, normals.data, gran, multiYear])

  const totals = useMemo(() => {
    const per = {}
    sats.forEach((s) => {
      let acc = null
      buckets.forEach((b) => { if (b.sat[s.id]?.couvert) acc = addCells(acc, b.sat[s.id]) })
      per[s.id] = acc
    })
    return per
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, satKey])
  const totalA = sumCells(sats.map((s) => totals[s.id]), harm)

  const trend = decadeTrend(app.regionId)
  const parsed = parseCell(app.cellId)

  function exportCsv() {
    exportRowsCsv(`firewatch-serie-${app.regionId}-${app.dateDebut}_${app.dateFin}.csv`, buckets.map((b) => ({
      region: app.regionId,
      cellule_id: cell || '',
      periode: b.key,
      equivalent_aqua: Math.round((b.sat.Aqua?.eq ?? 0) * 10) / 10,
      frp_moyen: b.sat.Aqua?.n ? Math.round((b.sat.Aqua.sum / b.sat.Aqua.n) * 10) / 10 : '',
      frp_max: b.sat.Aqua?.max || '',
      nb_jours_actifs: b.sat.Aqua?.actifs ?? 0,
    })))
  }

  return (
    <div className="view-pad">
      <div className="series-layout">
        <section className="panel chart-card">
          <div className="sheet-head">
            <div>
              <p className="kicker">{lieu === 'cellule'
                ? `Endroit précis · case ~28 km${parsed ? ` · ${fmt(parsed.lat, 1)}°, ${fmt(parsed.lon, 1)}°` : ''}`
                : `${app.region.nom}${app.activeZone ? ` · ${app.activeZone.nom}` : ''} · ${harm ? 'équivalent Aqua' : 'capteurs'}`}</p>
              <h2 className="panel-title">Évolution · {fmtPeriod(app.dateDebut, app.dateFin)}</h2>
            </div>
            <button type="button" className="ghost sm" onClick={exportCsv}><Icon name="download" size={14} />CSV</button>
          </div>

          <div className="viz-picker" role="radiogroup" aria-label="Type de visualisation">
            {VIZ.map((v) => (
              <button key={v.id} type="button" role="radio" aria-checked={viz === v.id} onClick={() => setViz(v.id)} title={v.hint}>
                <Icon name={v.icon} size={18} />
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          <details className="tune">
            <summary>Mesure, pas de temps et lieu</summary>
          <div className="series-tools">
            <label className="inline-field">
              <span>Mesure</span>
              <select className="select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {METRICS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </label>
            {viz !== 'saisons' && !(viz === '3d' && depth === 'annees') && (
              <div className="inline-field">
                <span>Pas de temps</span>
                <Segmented
                  size="sm"
                  value={granChoice}
                  onChange={setGranChoice}
                  options={[
                    { id: 'auto', label: 'Auto' },
                    ...(!harm ? [{ id: 'jour', label: 'Jour' }] : []),
                    { id: 'mois', label: 'Mois' },
                    { id: 'annee', label: 'Année' },
                  ]}
                />
              </div>
            )}
            <div className="inline-field">
              <span>Lieu</span>
              <Segmented
                size="sm"
                value={lieu}
                onChange={(v) => (v === 'cellule' && !app.cellId ? app.notify('Cliquez un point chaud sur le globe ou la carte, puis « Activité à cet endroit dans le temps ».') : setLieu(v))}
                options={[
                  { id: 'selection', label: app.activeZone ? 'Zone' : 'Région' },
                  { id: 'cellule', label: 'Endroit précis' },
                ]}
              />
            </div>
            {viz === '3d' && (
              <div className="inline-field">
                <span>Profondeur</span>
                <Segmented
                  size="sm"
                  value={depth}
                  onChange={setDepth}
                  options={harm
                    ? [{ id: 'annees', label: 'Années' }]
                    : [{ id: 'satellites', label: 'Satellites' }, { id: 'annees', label: 'Années' }]}
                />
              </div>
            )}
            {['ligne', 'barres', 'aires'].includes(viz) && metric === 'n' && gran !== 'annee' && (
              <label className="check">
                <input type="checkbox" checked={normal} onChange={(e) => setNormal(e.target.checked)} />
                Montrer une année normale (bande dorée)
              </label>
            )}
          </div>
          <SatChips counts={Object.fromEntries(sats.map((s) => [s.id, totals[s.id] ? totals[s.id].n : 0]))} compact />
          <p className="muted sm">{harm
            ? 'Courbe unique : séries mensuelles déjà corrigées en base (équivalent Aqua).'
            : 'Une courbe par satellite : ce que chaque capteur a vu, sans correction.'}</p>
          </details>

          {viz === 'saisons' && (
            <div className="year-chips">
              <span className="faint sm">Années comparées :</span>
              {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => LAST_YEAR - i).map((y) => {
                const idx = years.indexOf(y)
                return (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={idx >= 0}
                    style={idx >= 0 ? { '--c': YEAR_COLORS[idx % YEAR_COLORS.length] } : undefined}
                    onClick={() => setSeasonYears((cur) => {
                      const list = cur || periodYears
                      if (list.includes(y)) return list.length > 1 ? list.filter((x) => x !== y) : list
                      return [...list, y].sort().slice(-8)
                    })}
                  >{y}</button>
                )
              })}
            </div>
          )}

          <div className="chart-area">
            {(main.loading || (needYears && yearly.loading)) && <div className="chart-busy"><Spinner /></div>}
            <ChartBody
              viz={viz}
              chart={chart}
              sats={sats}
              metric={m}
              fmtV={fmtV}
              showNormal={showNormal}
              primary={primary}
              harm={harm}
              yearly={yearly.data}
              years={years}
              depth={depth}
              sortKey={sortKey}
              setSortKey={setSortKey}
              metricId={metric}
            />
          </div>

          <p className="glance">{trendPhrase(trend)}</p>
        </section>

        <aside className="side-stack">
          <section className="panel sheet">
            <p className="kicker">{harm ? 'Équivalent Aqua' : 'Qui a vu quoi'} · {periodLength(app.dateDebut, app.dateFin)}</p>
            <h3 className="card-title">{fmtV(valueOf(totalA, metric, harm))}{m.unit} <small>{metric === 'n' ? (harm ? 'points chauds (même échelle)' : 'points chauds') : m.label.toLowerCase()}</small></h3>
            {harm
              ? <p className="muted sm">Un seul chiffre, déjà ramené à l’échelle d’Aqua. Passez en Capteurs pour séparer MODIS et VIIRS.</p>
              : (
                <div className="share-bars">
                  {sats.map((s) => {
                    const v = valueOf(totals[s.id], metric, harm)
                    const max = Math.max(1, ...sats.map((x) => valueOf(totals[x.id], metric, harm) || 0))
                    return (
                      <div key={s.id} className="share-row" style={{ '--c': s.color }}>
                        <span className="sr-name"><i />{s.id}</span>
                        <span className="sr-bar"><b style={{ width: `${((v || 0) / max) * 100}%` }} /></span>
                        <span className="sr-v">{v == null ? 'pas lancé' : `${fmtV(v)}${m.unit}`}</span>
                      </div>
                    )
                  })}
                </div>
              )}
          </section>

          <section className="panel sheet">
            <p className="kicker"><Icon name="compare" size={13} /> Comparer avec d’autres dates</p>
            <Segmented
              size="sm"
              value={cmp}
              onChange={(v) => { setCmp(v); if (v === 'perso' && !custom) setCustom(periodB) }}
              options={[
                { id: 'annee', label: 'Année d’avant' },
                { id: 'precedente', label: 'Juste avant' },
                { id: 'perso', label: 'Au choix' },
              ]}
            />
            {cmp === 'perso' && (
              <PeriodFields debut={periodB.debut} fin={periodB.fin} onChange={(a, b) => setCustom({ debut: a <= b ? a : b, fin: a <= b ? b : a })} />
            )}
            <Comparison
              sats={sats}
              totals={totals}
              bData={compare.data}
              periodA={{ debut: app.dateDebut, fin: app.dateFin }}
              periodB={periodB}
              metric={metric}
              harm={harm}
              fmtV={fmtV}
              unit={m.unit}
              loading={compare.loading}
            />
            <button type="button" className="texty" onClick={() => app.setPeriode(periodB.debut, periodB.fin)}>
              Afficher plutôt {fmtPeriod(periodB.debut, periodB.fin)}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function ChartBody({ viz, chart, sats, metric, fmtV, showNormal, primary, harm, yearly, years, depth, sortKey, setSortKey, metricId }) {
  const fmtTip = (v, name) => [v == null ? '—' : `${fmtV(Array.isArray(v) ? v[1] : v)}${metric.unit}`, name]

  const seasonsData = useMemo(() => {
    if (!yearly) return []
    return MOIS_C.map((label, i) => {
      const point = { label }
      years.forEach((y) => {
        const b = yearly.find((x) => x.key === `${y}-${String(i + 1).padStart(2, '0')}`)
        point[y] = b ? valueOf(sumCells(sats.map((s) => b.sat[s.id]), harm), metricId, harm) : null
      })
      return point
    })
  }, [yearly, years, sats, harm, metricId])

  const cube = useMemo(() => {
    if (viz !== '3d') return null
    if (depth === 'annees') {
      if (!yearly) return null
      const rows = years.map((y, i) => ({ id: y, label: String(y), color: YEAR_COLORS[i % YEAR_COLORS.length] }))
      const cols = MOIS_C.map((label, i) => ({ id: i, label }))
      const values = years.map((y) => MOIS_C.map((_, i) => {
        const b = yearly.find((x) => x.key === `${y}-${String(i + 1).padStart(2, '0')}`)
        return b ? valueOf(sumCells(sats.map((s) => b.sat[s.id]), harm), metricId, harm) : null
      }))
      return { rows, cols, values, heat: true }
    }
    const cols = chart.slice(-160).map((p) => ({ id: p.key, label: p.label }))
    const rows = sats.map((s) => ({ id: s.id, label: s.id, color: s.color }))
    const values = sats.map((s) => chart.slice(-160).map((p) => p[s.id]))
    return { rows, cols, values, heat: false }
  }, [viz, depth, yearly, years, chart, sats, harm, metricId])

  const colorFor = useCallback((r, c, t) => {
    if (!cube) return '#ff5a36'
    if (cube.heat) return heatColor(0.25 + t * 0.75, 1).color
    return cube.rows[r].color
  }, [cube])

  if (viz === 'tableau') {
    const rows = [...chart]
    if (sortKey !== 'periode') rows.sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1))
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th><button type="button" onClick={() => setSortKey('periode')} aria-pressed={sortKey === 'periode'}>Période</button></th>
              {sats.map((s) => (
                <th key={s.id}><button type="button" onClick={() => setSortKey(s.id)} aria-pressed={sortKey === s.id}><i style={{ background: s.color }} />{harm ? 'Éq. Aqua' : s.id}</button></th>
              ))}
              <th><button type="button" onClick={() => setSortKey('total')} aria-pressed={sortKey === 'total'}>Total</button></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.key}>
                <td>{p.label}</td>
                {sats.map((s) => <td key={s.id}>{p[s.id] == null ? '—' : fmtV(p[s.id])}</td>)}
                <td><b>{fmtV(p.total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (viz === '3d') {
    if (!cube) return null
    return (
      <Suspense fallback={<Spinner label="Préparation de la 3D…" />}>
        <Chart3D rows={cube.rows} cols={cube.cols} values={cube.values} colorFor={colorFor} format={fmtV} unit={metric.unit} />
      </Suspense>
    )
  }

  if (viz === 'saisons') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={seasonsData} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="rgba(244,239,230,0.07)" />
          <XAxis dataKey="label" tick={AXIS} />
          <YAxis tick={AXIS} width={52} domain={[0, 'auto']} tickFormatter={(v) => fmt(v)} />
          <Tooltip {...TOOLTIP} formatter={fmtTip} />
          {years.map((y, i) => (
            <Line key={y} type="monotone" dataKey={y} name={String(y)} stroke={YEAR_COLORS[i % YEAR_COLORS.length]} strokeWidth={i === years.length - 1 ? 3 : 2} dot={{ r: 2.5 }} connectNulls={false} isAnimationActive />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  const stacked = viz === 'empilees'
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chart} margin={{ top: 16, right: 12, left: 4, bottom: 8 }} barCategoryGap={viz === 'barres' ? '18%' : '8%'}>
        <CartesianGrid vertical={false} stroke="rgba(244,239,230,0.07)" />
        <XAxis dataKey="label" minTickGap={24} tick={AXIS} />
        <YAxis tick={AXIS} width={52} domain={[0, 'auto']} tickFormatter={(v) => fmt(v)} />
        <Tooltip {...TOOLTIP} formatter={fmtTip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {showNormal && <Area dataKey="bande" name="Normale" stroke="none" fill="rgba(230,177,92,0.14)" isAnimationActive={false} />}
        {showNormal && <Line dataKey="median" name="Médiane" stroke="#e6b15c" strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
        {sats.map((s) => {
          const label = harm ? 'Éq. Aqua' : s.id
          if (viz === 'ligne') return <Line key={s.id} type="monotone" dataKey={s.id} name={label} stroke={satColor(s.id)} dot={false} strokeWidth={2.2} connectNulls={false} />
          if (viz === 'aires') return <Area key={s.id} type="monotone" dataKey={s.id} name={label} stroke={satColor(s.id)} fill={satColor(s.id)} fillOpacity={0.18} strokeWidth={2} />
          return <Bar key={s.id} dataKey={s.id} name={label} fill={satColor(s.id)} stackId={stacked ? 'a' : undefined} radius={stacked ? 0 : [3, 3, 0, 0]} maxBarSize={28} />
        })}
        {chart.length > 30 && <Brush dataKey="label" height={22} stroke="#ff4d2e" fill="#10131a" travellerWidth={8} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function Comparison({ sats, totals, bData, periodA, periodB, metric, harm, fmtV, unit, loading }) {
  if (!bData) return loading ? <Spinner /> : null
  const b = bData[0]
  const rows = sats.map((s) => {
    const a = valueOf(totals[s.id], metric, harm)
    const v = b ? valueOf(b.sat[s.id], metric, harm) : null
    return { s, a, b: v, d: a != null && v ? pctDelta(a, v) : null }
  })
  const totA = valueOf(sumCells(sats.map((s) => totals[s.id]), harm), metric, harm)
  const totB = b ? valueOf(sumCells(sats.map((s) => b.sat[s.id]), harm), metric, harm) : null
  const d = totA != null && totB ? pctDelta(totA, totB) : null
  const max = Math.max(1, ...rows.flatMap((r) => [r.a || 0, r.b || 0]))
  return (
    <div className="compare">
      <div className="cmp-head">
        <span><i className="cmp-a" />{fmtPeriod(periodA.debut, periodA.fin)}</span>
        <span><i className="cmp-b" />{fmtPeriod(periodB.debut, periodB.fin)}</span>
      </div>
      <div className={`cmp-total${d > 0 ? ' up' : d < 0 ? ' down' : ''}`}>
        <b>{d == null ? '—' : `${d > 0 ? '+' : ''}${fmt(d)} %`}</b>
        <span>{d == null ? '' : d > 0 ? 'Plus que l’autre période : ' : d < 0 ? 'Moins que l’autre période : ' : 'Autant : '}{fmtV(totA)}{unit} contre {fmtV(totB)}{unit}</span>
      </div>
      {rows.map((r) => (
        <div key={r.s.id} className="cmp-row" style={{ '--c': r.s.color }}>
          <span className="sr-name"><i />{harm ? 'Éq. Aqua' : r.s.id}</span>
          <span className="cmp-bars">
            <b style={{ width: `${((r.a || 0) / max) * 100}%` }} />
            <b className="ghostbar" style={{ width: `${((r.b || 0) / max) * 100}%` }} />
          </span>
          <span className={`cmp-d${r.d > 0 ? ' up' : r.d < 0 ? ' down' : ''}`}>{r.d == null ? (r.a == null && r.b == null ? 'pas lancé' : '—') : `${r.d > 0 ? '+' : ''}${fmt(r.d)} %`}</span>
        </div>
      ))}
    </div>
  )
}
