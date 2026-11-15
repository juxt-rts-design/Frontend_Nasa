import { useEffect, useState } from 'react'
import { AppState, DEMO_ACCOUNT, useApp } from './state'
import { REGIONS } from './data/engine'
import { GlobeView } from './components/GlobeView'
import { CalendarView } from './components/CalendarView'
import { SeriesView } from './components/SeriesView'
import { MapView } from './components/MapView'
import { AgentView } from './components/AgentView'

const VIEWS = [
  ['globe', 'Globe'],
  ['calendrier', 'Calendrier'],
  ['series', 'Séries'],
  ['carte', 'Carte détaillée'],
  ['agent', 'Agent IA'],
]

const HELP = {
  globe: {
    titre: 'Le globe',
    montre: 'Les points chauds du jour, ou des sept derniers jours au premier chargement. En mode combiné, chaque point est une détection. En mode harmonisé, chaque point est une cellule de 0,1° ramenée à l’échelle d’Aqua.',
    couleurs: 'La taille suit le FRP. Brut et combiné : bleu pour MODIS, vert pour VIIRS. Harmonisé : une seule couleur, parce que le capteur ne doit plus compter.',
    chiffres: 'Le bandeau compare le jour à l’habitude du mois. Le niveau de FRP d’un feu va de faible (< 10 MW) à exceptionnel (> 100 MW).',
  },
  calendrier: {
    titre: 'Le calendrier',
    montre: 'La série de référence Aqua, de 2002 à 2026, une case par mois. C’est le livrable central : le même capteur, la même résolution, sur toute la période.',
    couleurs: 'La clarté augmente avec le nombre de détections, sans opposer le vert au rouge. Un losange clair signale une anomalie positive, un losange bleu une activité anormalement basse.',
    chiffres: 'z = (valeur − médiane des années précédentes) / écart-type. Anomalie si |z| > 2. Le résumé donne le début, le pic et la fin de saison, et l’année record.',
  },
  series: {
    titre: 'Les séries',
    montre: 'L’évolution mensuelle d’une cellule, satellite par satellite, ou l’indice de plusieurs régions (100 = médiane du mois).',
    couleurs: 'Chaque satellite a sa couleur. La bande dorée est la médiane ± un écart-type. Le curseur du bas zoome sur une période.',
    chiffres: 'VIIRS compte plus de feux qu’Aqua parce que son pixel fait 375 m contre 1 km. Le bouton « équivalent Aqua » divise par le ratio de correction.',
  },
  carte: {
    titre: 'La carte',
    montre: 'La position exacte des feux du jour, sur un fond satellite, un plan, ou les couleurs réelles NASA GIBS. La grille de 0,1° se superpose.',
    couleurs: 'Les marqueurs suivent la confiance : sable si elle est faible, ambre si elle est nominale, rouge si elle est élevée.',
    chiffres: 'Un polygone enregistré filtre le globe, le calendrier et les séries. La latitude et la longitude amènent la carte à un point précis.',
  },
  agent: {
    titre: 'L’agent',
    montre: 'Un guide qui explique la vue active. Il reçoit la région, la période, le mode et les chiffres affichés. Il ne remplace pas les graphiques.',
    couleurs: 'Les boutons sous la réponse ouvrent le calendrier, la série, l’export CSV, ou le mode harmonisé.',
    chiffres: 'FRP, confiance, ratio, z-score et NRT sont définis dans sa consigne. Il doit s’appuyer sur les chiffres du contexte, pas en inventer.',
  },
}

function Shell() {
  const app = useApp()
  useEffect(() => {
    const names = { globe: 'Globe', calendrier: 'Calendrier', series: 'Séries', carte: 'Carte', agent: 'Agent' }
    document.title = `FireWatch — ${names[app.view]}`
  }, [app.view])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        app.setHelp(false)
        app.setAuthOpen(false)
        app.setProfileOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>Fire<i>Watch</i></strong>
          <small>Calendrier unifié des feux actifs</small>
        </div>
        <nav className="nav" aria-label="Vues">
          {VIEWS.map(([id, label]) => (
            <button key={id} aria-current={app.view === id ? 'page' : undefined} onClick={() => app.setView(id)}>{label}</button>
          ))}
        </nav>
        <div className="top-actions">
          {app.isDemo && <span className="badge">Démonstration</span>}
          {app.activeZone && (
            <button className="zone-chip" onClick={() => app.setActiveZoneId(null)}>{app.activeZone.nom} ×</button>
          )}
          <select className="select" aria-label="Région" value={app.regionId} onChange={(e) => app.changeRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
          <button className="ghost" onClick={() => app.setHelp(true)}>Comprendre</button>
          {app.user ? (
            <button className="avatar" aria-label="Profil" onClick={() => app.setProfileOpen(true)}>{app.user.username.slice(0, 1).toUpperCase()}</button>
          ) : (
            <button className="solid" onClick={() => app.setAuthOpen(true)}>Connexion</button>
          )}
        </div>
      </header>
      <main>
        <div className={app.view === 'globe' ? 'stage' : 'stage parked'} aria-hidden={app.view !== 'globe'}>
          <GlobeView />
        </div>
        {app.view === 'calendrier' && <CalendarView />}
        {app.view === 'series' && <SeriesView />}
        {app.view === 'carte' && <MapView />}
        {app.view === 'agent' && <AgentView />}
      </main>
      {app.help && <Help onClose={() => app.setHelp(false)} view={app.view} />}
      {app.authOpen && <Auth onClose={() => app.setAuthOpen(false)} />}
      {app.profileOpen && <Profile onClose={() => app.setProfileOpen(false)} />}
      {app.onboard && app.view === 'globe' && <Onboarding />}
    </div>
  )
}

function Help({ view, onClose }) {
  const block = HELP[view] || HELP.globe
  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <p className="kicker">Comprendre cette vue</p>
        <h2 id="help-title" className="panel-title">{block.titre}</h2>
        <section className="help-block"><h3>Ce que montre la vue</h3><p className="muted">{block.montre}</p></section>
        <section className="help-block"><h3>Comment lire les couleurs</h3><p className="muted">{block.couleurs}</p></section>
        <section className="help-block"><h3>Les chiffres</h3><p className="muted">{block.chiffres}</p></section>
        <section className="help-block">
          <h3>Limites</h3>
          <p className="muted">Les nuages masquent les feux. Un jour sans passage satellite n’est pas un jour sans feu. Les données temps réel (NRT) sont remplacées par le produit standard environ cinq mois plus tard. Terra dérive de 10 h 30 vers 8 h 30, Aqua de 13 h 30 vers 15 h 50 : d’où la série de référence Aqua et les ratios, plutôt qu’une somme brute.</p>
        </section>
        <section className="help-block">
          <h3>Niveau de gravité d’un feu</h3>
          <table className="scale">
            <thead><tr><th>Niveau</th><th>FRP</th><th>Couleur</th></tr></thead>
            <tbody>
              <tr><td>Faible</td><td>&lt; 10 MW</td><td><i className="swatch" style={{ background: '#f0ddb0' }} /></td></tr>
              <tr><td>Modérée</td><td>10–30 MW</td><td><i className="swatch" style={{ background: '#f0a05a' }} /></td></tr>
              <tr><td>Intense</td><td>30–100 MW</td><td><i className="swatch" style={{ background: '#ff5a36' }} /></td></tr>
              <tr><td>Exceptionnelle</td><td>&gt; 100 MW</td><td><i className="swatch" style={{ background: '#ffd0b8' }} /></td></tr>
            </tbody>
          </table>
        </section>
        <button className="ghost" onClick={onClose}>Fermer</button>
      </aside>
    </div>
  )
}

function Auth({ onClose }) {
  const app = useApp()
  const [tab, setTab] = useState('connexion')
  const [username, setUsername] = useState(DEMO_ACCOUNT.username)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(DEMO_ACCOUNT.password)
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    setError('')
    try {
      if (tab === 'inscription') app.register({ username, email, password })
      else app.login({ username, password })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <p className="kicker">Session</p>
        <h2 id="auth-title" className="panel-title">{tab === 'inscription' ? 'Créer un accès' : 'Connexion'}</h2>
        <div className="seg">
          <button aria-pressed={tab === 'inscription'} onClick={() => setTab('inscription')}>Inscription</button>
          <button aria-pressed={tab === 'connexion'} onClick={() => setTab('connexion')}>Connexion</button>
        </div>
        <form className="form" onSubmit={submit}>
          <label>Nom<input className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label>
          {tab === 'inscription' && <label>Courriel<input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>}
          <label>Mot de passe<input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
          {error && <p className="error">{error}</p>}
          <button className="solid" type="submit">{tab === 'inscription' ? 'Créer le compte' : 'Entrer'}</button>
        </form>
        <p className="muted">Compte déjà créé. Nom : <b>{DEMO_ACCOUNT.username}</b> · mot de passe : <b>{DEMO_ACCOUNT.password}</b></p>
      </div>
    </div>
  )
}

function Profile({ onClose }) {
  const app = useApp()
  const [region, setRegion] = useState(app.user?.profil?.region_defaut || app.regionId)
  const [mode, setMode] = useState(app.user?.profil?.mode_vue_defaut || app.mode)
  const [sats, setSats] = useState(app.user?.profil?.satellite_prefere || app.satellites.join(','))

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-labelledby="profil-title" onClick={(e) => e.stopPropagation()}>
        <p className="kicker">{app.user?.username}</p>
        <h2 id="profil-title" className="panel-title">Profil</h2>
        <form className="form" onSubmit={(e) => { e.preventDefault(); app.saveProfil({ region_defaut: region, mode_vue_defaut: mode, satellite_prefere: sats }); onClose() }}>
          <label>Région par défaut
            <select className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </label>
          <label>Mode par défaut
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="brut">Brut</option>
              <option value="harmonise">Harmonisé</option>
              <option value="combine">Combiné</option>
            </select>
          </label>
          <label>Satellites préférés
            <input className="field" value={sats} onChange={(e) => setSats(e.target.value)} />
          </label>
          <p className="muted">Exemple : Aqua,Suomi NPP</p>
          <button className="solid" type="submit">Enregistrer</button>
        </form>
        <button className="ghost" onClick={app.logout}>Fermer la session</button>
      </aside>
    </div>
  )
}

const STEPS = [
  'Voici le globe. Chaque point est un endroit où un satellite a détecté de la chaleur.',
  'Utilisez les flèches pour naviguer dans le temps, jour par jour. Le premier écran charge les sept derniers jours, en mode combiné.',
  'Cliquez sur un point pour voir la date, le satellite, le FRP, la confiance et le type.',
  'Le calendrier, les séries et la carte sont dans les onglets. L’agent IA répond aux questions sur les chiffres affichés.',
]

function Onboarding() {
  const app = useApp()
  const [step, setStep] = useState(0)
  return (
    <div className="onboard panel">
      <div className="steps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <p className="kicker">Étape {step + 1} sur 4</p>
      <p>{STEPS[step]}</p>
      <div className="row-actions">
        <button className="ghost" onClick={app.finishOnboard}>Passer</button>
        {step < 3 ? (
          <button className="solid" onClick={() => setStep((s) => s + 1)}>Suivant</button>
        ) : (
          <button className="solid" onClick={app.finishOnboard}>Commencer</button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppState>
      <Shell />
    </AppState>
  )
}
