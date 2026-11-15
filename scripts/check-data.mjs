import {
  ALL_SATS, calendarRows, fireSeason, getAnomalies, getRatio, makeSpec, monthRow, periodDays,
  queryGlobe, recordYear, seriesData, dayFires,
} from '../src/data/engine.js'

const R = 'Afrique_Centrale'
const fails = []
const expect = (ok, msg) => { if (!ok) fails.push(msg) }

const aug24 = monthRow(R, 2024, 8)
expect(aug24.total_detections === 4200, 'août 2024 doit valoir 4 200 détections Aqua')
expect(Math.abs(aug24.z_score - 1.38) < 0.05, 'août 2024 : z-score ≈ 1,38')
const season = fireSeason(R)
expect(season.debut === 6 && season.pic === 8 && season.fin === 10, 'saison juin → octobre, pic en août')
expect(recordYear(R).annee === 2007, 'année record 2007')
expect(monthRow('Gabon', 2023, 3).anomalie, 'Gabon mars 2023 en anomalie')
expect(monthRow(R, 2002, 1).total_detections == null, 'Aqua absent en janvier 2002')

const days = periodDays({ region: R, debut: '2024-08-01', fin: '2024-08-31', satellites: ['Aqua'] })
expect(days.total === 4200, 'la somme des jours d’août 2024 (Aqua) égale la case du calendrier')

const jan02 = periodDays({ region: R, debut: '2002-01-01', fin: '2002-01-31', satellites: ALL_SATS })
const fires = dayFires(R, '2002-01-15', ALL_SATS)
expect(jan02.days.length === 31 && fires.length > 0 && fires.every((f) => f.satellite === 'Terra'), 'janvier 2002 : 31 jours, feux Terra uniquement')

const spec = makeSpec({ frpMin: 100 })
const g = queryGlobe({ dateDebut: '2024-08-01', dateFin: '2024-08-07', region: R, spec })
expect(g.points.every((p) => p.frp >= 100), 'filtre puissance ≥ 100 MW respecté sur le globe')
const s = seriesData({ region: R, debut: '2024-08-01', fin: '2024-08-07', satellites: ALL_SATS, spec, gran: 'tout' })[0]
const seriesTotal = Object.values(s.sat).reduce((a, c) => a + c.n, 0)
expect(seriesTotal === g.total, 'série et globe donnent le même total avec les mêmes filtres')

const h = queryGlobe({ dateDebut: '2024-08-01', dateFin: '2024-08-31', region: R, mode: 'harmonise', satellites: ALL_SATS })
expect(Math.abs(h.equivalent - 4200) <= 2, 'harmonisé : ~4 200 équivalents Aqua en août 2024')

const cal30 = calendarRows(R, { source: 'aqua', spec: makeSpec({ frpMin: 30 }) })
const d30 = periodDays({ region: R, debut: '2024-08-01', fin: '2024-08-31', satellites: ['Aqua'], spec: makeSpec({ frpMin: 30 }) })
expect(cal30.find((r) => r.annee === 2024 && r.mois === 8).total_detections === d30.total, 'calendrier filtré = somme des jours filtrés')

console.log(JSON.stringify({
  aug24,
  season: { debut: season.debut, pic: season.pic, fin: season.fin },
  record: recordYear(R),
  gabonMars: monthRow('Gabon', 2023, 3),
  ratioAoutSNPP: getRatio(R, 8, 'Suomi NPP'),
  anomalies: getAnomalies(R, 2).slice(0, 4).map((a) => `${a.annee}-${a.mois} z=${a.z_score}`),
  intenses7j: g.total,
}, null, 2))
if (fails.length) {
  console.error(`\n${fails.length} contrôle(s) en échec :\n- ${fails.join('\n- ')}`)
  process.exit(1)
}
console.log('\nTous les contrôles passent.')
