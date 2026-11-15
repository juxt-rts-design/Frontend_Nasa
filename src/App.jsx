import { useEffect, useState } from 'react'
import { AppState, DEMO_ACCOUNT, useApp } from './state'
import { CountrySearch } from './components/CountrySearch'
import { FRP_LEVELS, SATELLITES } from './data/engine'
import { GlobeView } from './components/GlobeView'
import { CalendarView } from './components/CalendarView'
import { SeriesView } from './components/SeriesView'
import { MapView } from './components/MapView'
import { VoiceAssistant } from './components/VoiceAssistant'
import { FilterBar } from './components/FilterBar'
import { Icon } from './ui/icons'
import { Segmented, Toasts } from './ui/controls'
import { AlertStream, NotificationBell } from './components/AlertStream'

const VIEWS = [
  { id: 'globe', label: 'Globe', icon: 'globe', desc: 'Points chauds sur la Terre' },
  { id: 'calendrier', label: 'Calendrier', icon: 'calendar', desc: 'Activité de brûlage mois par mois' },
  { id: 'series', label: 'Séries', icon: 'chart', desc: 'Tendances harmonisées' },
  { id: 'carte', label: 'Carte', icon: 'map', desc: 'Zone d’intérêt' },
]

const HELP = {
  globe: {
    titre: 'Le globe',
    faire: [
      'Cherchez un pays en haut, ou cliquez-le sur le globe : seuls ses points chauds apparaissent, pas ceux des voisins.',
      'Choisissez la période sous le globe (dates, flèches ← → ou raccourcis).',
      'À droite, la liste des zones les plus actives (cases ~28 km déjà harmonisées).',
      'Cliquez une zone, ou une ligne de la liste, pour ouvrir sa fiche.',
    ],
    montre: 'Les cases d’environ 28 km déjà corrigées en base (équivalent Aqua, z-score). Le capteur d’origine n’importe plus : Terra, Aqua et VIIRS ont été ramenés à la même échelle par la pipeline.',
    couleurs: 'La couleur suit le z-score : plus froid que d’habitude, comme d’habitude, ou plus chaud. La taille suit le nombre de points chauds équivalent Aqua.',
    chiffres: 'Le bandeau compare la période à la médiane historique du mois. Au plus 10 000 points, les plus intenses d’abord.',
  },
  calendrier: {
    titre: 'Le calendrier d’activité de brûlage',
    faire: [
      'Cliquez un mois : la liste de ses zones ~28 km s’ouvre à droite.',
      'Ouvrez une zone pour la voir sur le globe ou tracer sa courbe.',
      'Le calendrier compte déjà en équivalent Aqua : aucun satellite à choisir.',
    ],
    montre: 'Le livrable du défi NASA : une case par mois, chiffres déjà harmonisés (séries mensuelles Aqua-équivalent et z-scores). Les années se comparent sans dépendre du capteur.',
    couleurs: 'Plus la case est claire, plus il y a de points chauds. Losange clair : anomalie haute par rapport à la médiane des années précédentes. Losange bleu : activité anormalement basse. Hachures : Aqua pas encore lancé. Contour : la période choisie.',
    chiffres: 'z = (valeur − médiane des années précédentes) / écart-type. Anomalie si |z| > 2. Maj + clic sélectionne une plage de mois.',
  },
  series: {
    titre: 'Les séries',
    faire: [
      'Choisissez le type de vue : courbes, barres, empilées, aires, saisons, 3D ou tableau.',
      'Choisissez la mesure (nombre de points chauds, FRP…) et le pas de temps (mois, année).',
      'Les courbes lisent uniquement les séries mensuelles déjà harmonisées.',
    ],
    montre: 'L’évolution des points chauds équivalent Aqua pour la région, la zone dessinée ou un endroit précis (~28 km). « Saisons » superpose plusieurs années de janvier à décembre.',
    couleurs: 'Une seule série, couleur Aqua. La bande dorée est la normale (médiane ± écart-type).',
    chiffres: 'Les comptes viennent de serie_mensuelle : chaque satellite a déjà été ramené à l’échelle d’Aqua, puis moyenné. C’est l’harmonisation demandée par le défi.',
  },
  carte: {
    titre: 'La carte',
    faire: [
      'Choisissez le fond : satellite, plan ou image NASA du jour.',
      'Dessinez un cercle, un polygone ou un rectangle, puis « Appliquer à toutes les vues ». Les zones enregistrées sont des cercles (centre + rayon).',
      'Cliquez une zone pour sa fiche (z-score, équivalent Aqua). Latitude et longitude pour un lieu précis.',
    ],
    montre: 'Les mêmes cases ~28 km que le globe, déjà harmonisées. Au plus 5 000 zones, les plus actives d’abord.',
    couleurs: 'Par défaut la couleur suit le z-score (habitude). Vous pouvez colorer par intensité (FRP).',
    chiffres: 'Une zone appliquée filtre le globe, le calendrier, les listes et les séries. L’enregistrer dans « mes zones » demande une session.',
  },
  agent: {
    titre: 'L’assistant',
    faire: [
      'Entrez avec le compte de démonstration si ce n’est pas fait.',
      'Cliquez une question proposée ou écrivez la vôtre.',
      'Utilisez les boutons sous la réponse pour aller au calendrier, à la série ou exporter.',
    ],
    montre: 'Un guide qui explique ce que vous regardez. Il reçoit la région, la zone, la période, les satellites, les filtres et les chiffres affichés.',
    couleurs: 'La ligne du haut rappelle exactement ce que l’assistant voit.',
    chiffres: 'FRP, confiance, ratio, z-score et NRT sont définis dans sa consigne. Il s’appuie sur les chiffres du contexte, sans en inventer.',
  },
}

function Shell() {
  const app = useApp()
  useEffect(() => {
    const v = VIEWS.find((x) => x.id === app.view)
    document.title = `FireWatch — ${v?.label || ''}`
  }, [app.view])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        app.setHelp(false)
        app.setAuthOpen(false)
        app.setProfileOpen(false)
        app.setNotifOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => app.setView('globe')} aria-label="FireWatch, retour au globe">
          <span className="logo"><Icon name="flame" size={18} /></span>
          <span className="brand-copy">
            <strong>Fire<i>Watch</i></strong>
            <small>Points chauds MODIS · VIIRS</small>
          </span>
        </button>
        <nav className="nav" aria-label="Vues">
          {VIEWS.map((v) => (
            <button type="button" key={v.id} aria-current={app.view === v.id ? 'page' : undefined} onClick={() => app.setView(v.id)} title={v.desc}>
              <Icon name={v.icon} size={16} />
              <span>{v.label}</span>
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button type="button" className="icon-btn" aria-label="Aide" onClick={() => app.setHelp(true)}><Icon name="help" size={16} /></button>
          <NotificationBell />
          {app.user ? (
            <button type="button" className="avatar" aria-label="Profil" onClick={() => app.setProfileOpen(true)}>{app.user.username.slice(0, 1).toUpperCase()}</button>
          ) : (
            <button type="button" className="solid sm" onClick={() => app.setAuthOpen(true)}><Icon name="user" size={15} />Connexion</button>
          )}
        </div>
      </header>
      <FilterBar />
      <main>
        <div className={app.view === 'globe' ? 'stage' : 'stage parked'} aria-hidden={app.view !== 'globe'}>
          <GlobeView />
        </div>
        {app.view === 'calendrier' && <CalendarView />}
        {app.view === 'series' && <SeriesView />}
        {app.view === 'carte' && <MapView />}
        <VoiceAssistant />
      </main>
      {app.help && <Help onClose={() => app.setHelp(false)} view={app.view} />}
      {app.authOpen && <Auth onClose={() => app.setAuthOpen(false)} />}
      {app.profileOpen && <Profile onClose={() => app.setProfileOpen(false)} />}
      {app.onboard && app.view === 'globe' && <Onboarding />}
      {app.view !== 'globe' && <AlertStream />}
      <Toasts />
    </div>
  )
}

function Help({ view, onClose }) {
  const app = useApp()
  const block = HELP[view] || HELP.globe
  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="kicker">Comprendre cette vue</p>
            <h2 id="help-title" className="panel-title">{block.titre}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer l’aide" onClick={onClose}><Icon name="x" /></button>
        </div>
        <section className="help-steps">
          <h3>Que faire ici ?</h3>
          <ol>{block.faire.map((f) => <li key={f}>{f}</li>)}</ol>
        </section>
        <section className="help-block"><h3>Ce que montre la vue</h3><p className="muted">{block.montre}</p></section>
        <section className="help-block"><h3>Comment lire les couleurs</h3><p className="muted">{block.couleurs}</p>
          <div className="sat-legend">
            {SATELLITES.map((s) => <span key={s.id} style={{ '--c': s.color }}><i />{s.id}<small>{s.instrument} · {s.pixel}</small></span>)}
          </div>
        </section>
        <section className="help-block"><h3>Les chiffres</h3><p className="muted">{block.chiffres}</p></section>
        <section className="help-block">
          <h3>Le défi NASA</h3>
          <p className="muted">Space Apps 2026 — Harmonization of MODIS and VIIRS Hot Spots. FIRMS livre des points chauds : anomalies thermiques (brûlage de végétation, feux agricoles, parfois volcan ou torchère). MODIS et VIIRS n’ont pas le même pixel, ni la même sensibilité, ni les mêmes heures de passage : leurs comptes ne se comparent pas tels quels. FireWatch les ramène à une même échelle, puis les lit dans un calendrier d’activité de brûlage.</p>
        </section>
        <section className="help-block">
          <h3>Filtres</h3>
          <p className="muted">L’icône de curseurs, en haut, change le pays, la zone, la période, les satellites et le FRP pour toutes les pages. Un clic sur un pays du globe ne garde que ses points chauds, à l’intérieur des frontières.</p>
        </section>
        <section className="help-block">
          <h3>Limites</h3>
          <p className="muted">Les nuages masquent les points chauds. Un jour sans passage satellite n’est pas un jour sans brûlage. Les données temps réel (NRT) sont remplacées par le produit standard environ cinq mois plus tard. Terra dérive de 10 h 30 vers 8 h 30, Aqua de 13 h 30 vers 15 h 50 : d’où la série de référence Aqua et les ratios, plutôt qu’une somme brute.</p>
        </section>
        <section className="help-block">
          <h3>Intensité d’un point chaud (FRP)</h3>
          <table className="scale">
            <thead><tr><th>Niveau</th><th>FRP</th><th>Détections / jour</th><th>Couleur</th></tr></thead>
            <tbody>
              {FRP_LEVELS.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <td>{l.max === Infinity ? `> ${l.min} MW` : l.min === 0 ? `< ${l.max} MW` : `${l.min}–${l.max} MW`}</td>
                  <td>{l.jour}</td>
                  <td><i className="swatch" style={{ background: l.color }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="row-actions">
          <button type="button" className="ghost" onClick={app.restartOnboard}>Revoir le guide de démarrage</button>
          <button type="button" className="solid" onClick={onClose}>Compris</button>
        </div>
      </aside>
    </div>
  )
}

function Auth({ onClose }) {
  const app = useApp()
  const [tab, setTab] = useState('connexion')
  const [username, setUsername] = useState(DEMO_ACCOUNT.username)
  const [email, setEmail] = useState('')
  const [pays, setPays] = useState('Gabon')
  const [password, setPassword] = useState(DEMO_ACCOUNT.password)
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function switchTab(next) {
    setTab(next)
    setError('')
    if (next === 'inscription') {
      setUsername('')
      setPassword('')
      setPassword2('')
    } else {
      setUsername(DEMO_ACCOUNT.username)
      setPassword(DEMO_ACCOUNT.password)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (tab === 'inscription') {
        await app.register({ username, email, password, password2, pays })
      } else {
        await app.login({ username, password })
      }
    } catch (err) {
      setError(err.message || 'Impossible de poursuivre.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal auth-modal" role="dialog" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="kicker">Session</p>
            <h2 id="auth-title" className="panel-title">{tab === 'inscription' ? 'Créer un accès' : 'Connexion'}</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}><Icon name="x" /></button>
        </div>
        <Segmented
          value={tab}
          onChange={switchTab}
          options={[{ id: 'connexion', label: 'Connexion' }, { id: 'inscription', label: 'Inscription' }]}
        />
        <form className="form" onSubmit={submit}>
          <label>Nom d’utilisateur
            <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          {tab === 'inscription' && (
            <label>E-mail
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
          )}
          {tab === 'inscription' && (
            <label>Pays
              <input className="field" value={pays} onChange={(e) => setPays(e.target.value)} autoComplete="country-name" />
            </label>
          )}
          <label>Mot de passe
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'inscription' ? 'new-password' : 'current-password'}
              minLength={tab === 'inscription' ? 8 : 1}
              required
            />
          </label>
          {tab === 'inscription' && (
            <label>Confirmer le mot de passe
              <input className="field" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="solid" type="submit" disabled={busy}>
            {busy ? 'Un instant…' : (tab === 'inscription' ? 'Créer le compte' : 'Entrer')}
          </button>
        </form>
        {tab === 'connexion' && (
          <p className="muted sm">Compte de démonstration : <b>{DEMO_ACCOUNT.username}</b> · <b>{DEMO_ACCOUNT.password}</b></p>
        )}
        {tab === 'inscription' && (
          <p className="muted sm">Le mot de passe doit faire au moins 8 caractères. Vous serez connecté tout de suite.</p>
        )}
      </div>
    </div>
  )
}

function Profile({ onClose }) {
  const app = useApp()
  const [region, setRegion] = useState(app.user?.profil?.region_defaut || app.regionId)
  const [mode, setMode] = useState(app.mode === 'brut' ? 'brut' : 'harmonise')
  const [pays, setPays] = useState(app.user?.pays || app.user?.profil?.pays || '')

  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-labelledby="profil-title" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="kicker">{app.user?.username}</p>
            <h2 id="profil-title" className="panel-title">Profil</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}><Icon name="x" /></button>
        </div>
        <form className="form" onSubmit={(e) => { e.preventDefault(); app.saveProfil({ region_defaut: region, mode_vue_defaut: mode, pays }); onClose() }}>
          <label>Pays
            <input className="field" value={pays} onChange={(e) => setPays(e.target.value)} />
          </label>
          <label>Pays ou région à l’ouverture
            <CountrySearch currentId={region} currentNom={region} onPick={setRegion} autoFocus={false} />
          </label>
          <label>Lecture par défaut
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="harmonise">Harmonisé · équivalent Aqua</option>
              <option value="brut">Capteurs · chaque satellite</option>
            </select>
          </label>
          <button className="solid" type="submit">Enregistrer</button>
        </form>
        <p className="muted sm">{app.zones.length} zone{app.zones.length > 1 ? 's' : ''} enregistrée{app.zones.length > 1 ? 's' : ''} · {app.conversations.length} conversation{app.conversations.length > 1 ? 's' : ''}</p>
        <button type="button" className="ghost" onClick={app.logout}>Fermer la session</button>
      </aside>
    </div>
  )
}

const STEPS = [
  { icon: 'globe', titre: 'Des points chauds', texte: 'Chaque point est une anomalie thermique vue par MODIS ou VIIRS : brûlage de végétation, feu agricole, parfois volcan ou torchère. Ce n’est pas forcément un incendie de forêt.' },
  { icon: 'sat', titre: 'Harmoniser ou voir les capteurs', texte: 'Harmonisé ramène MODIS et VIIRS à l’échelle d’Aqua. Capteurs montre chaque détection satellite, pour comparer visuellement les instruments. Vous passez de l’un à l’autre quand vous voulez.' },
  { icon: 'calendar', titre: 'Le calendrier d’activité', texte: 'Une case par mois depuis le début des années 2000 : quels mois voient plus de points chauds, quelles années sortent de la médiane historique, comment le mois en cours se compare.' },
  { icon: 'sliders', titre: 'Une zone, une période', texte: 'Choisissez un pays, dessinez une zone, changez les dates. Globe, carte, séries et export CSV suivent ces filtres.' },
]

function Onboarding() {
  const app = useApp()
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  return (
    <div className="onboard panel" role="dialog" aria-label="Guide de démarrage">
      <div className="ob-top">
        <span className="ob-icon"><Icon name={s.icon} size={20} /></span>
        <div className="steps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <span className="kicker">Étape {step + 1} sur {STEPS.length}</span>
      </div>
      <h3>{s.titre}</h3>
      <p>{s.texte}</p>
      <div className="row-actions">
        <button type="button" className="texty" onClick={app.finishOnboard}>Passer</button>
        {step > 0 && <button type="button" className="ghost sm" onClick={() => setStep((x) => x - 1)}>Retour</button>}
        {step < STEPS.length - 1 ? (
          <button type="button" className="solid sm" onClick={() => setStep((x) => x + 1)}>Suivant</button>
        ) : (
          <button type="button" className="solid sm" onClick={app.finishOnboard}>Commencer</button>
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
