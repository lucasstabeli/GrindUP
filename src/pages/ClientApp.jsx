import { useState } from 'react'
import TopBar from '../components/layout/TopBar'
import Hoje from '../sections/Hoje'
import Rotina from '../sections/Rotina'
import Calendario from '../sections/Calendario'
import Cursos from '../sections/Cursos'
import Loja from '../sections/Loja'
import Rank from '../sections/Rank'
import AdminPanel from '../sections/AdminPanel'
import SubscriptionGate from '../components/SubscriptionGate'

const IcHome = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
)
const IcCalendar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
)
const IcClock = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
  </svg>
)
const IcTrophy = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/>
  </svg>
)
const IcChest = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M20 6H4C2.9 6 2 6.9 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V8h16v12zm-8-9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM20 2H4v2h16V2z"/>
  </svg>
)
const IcBook = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h12v16zM8 6h8v2H8zm0 4h8v2H8zm0 4h5v2H8z"/>
  </svg>
)

const TABS = [
  { id: 'hoje',       label: 'Hoje',    Icon: IcHome },
  { id: 'calendario', label: 'Agenda',  Icon: IcCalendar },
  { id: 'rotina',     label: 'Rotina',  Icon: IcClock },
  { id: 'cursos',     label: 'Cursos',  Icon: IcBook },
  { id: 'loja',       label: 'Baú',     Icon: IcChest },
  { id: 'rank',       label: 'Rank',    Icon: IcTrophy },
]

export default function ClientApp() {
  const [tab, setTab] = useState('hoje')
  const [showAdmin, setShowAdmin] = useState(false)

  if (showAdmin) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <TopBar onAdmin={() => setShowAdmin(false)} isAdmin />
        <AdminPanel />
      </div>
    )
  }

  const content = {
    hoje:       <Hoje onNavigate={setTab} />,
    calendario: <Calendario />,
    rotina:     <Rotina />,
    cursos:     <Cursos />,
    rank:       <Rank />,
    loja:       <Loja />,
  }

  return (
    <SubscriptionGate>
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <TopBar onAdmin={() => setShowAdmin(true)} />
        <div className="tab-content">{content[tab]}</div>
        <nav className="nav">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </SubscriptionGate>
  )
}
