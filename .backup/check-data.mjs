import { getCalendar, fireSeason, recordYear, monthRow, getAnomalies, getRatio } from '../src/data/engine.js'

const cal = getCalendar('Afrique_Centrale')
const aug24 = monthRow('Afrique_Centrale', 2024, 8)
const season = fireSeason('Afrique_Centrale')
const rec = recordYear('Afrique_Centrale')
const gab = monthRow('Gabon', 2023, 3)
const anomalies = getAnomalies('Afrique_Centrale', 2).slice(0, 6)
console.log(JSON.stringify({
  aug24,
  season: { debut: season.debut, pic: season.pic, fin: season.fin },
  rec,
  gabonMars: gab,
  ratioAout: getRatio('Afrique_Centrale', 8, 'Suomi NPP'),
  anomalies,
  n: cal.length,
}, null, 2))
