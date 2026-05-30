import { Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Clock, Receipt,
  Settings, Users, PiggyBank, Building2
} from 'lucide-react'
import FileStatus from './components/FileStatus'
import Dashboard from './pages/Dashboard'
import Facturen from './pages/Facturen'
import Uren from './pages/Uren'
import Kosten from './pages/Kosten'
import Pensioen from './pages/Pensioen'
import BtwNL from './pages/BtwNL'
import BtwBE from './pages/BtwBE'
import Opdrachtgevers from './pages/Opdrachtgevers'
import Instellingen from './pages/Instellingen'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>ZZP Admin</h1>
        <p>Waarnemend Huisarts</p>
      </div>

      <nav>
        <span className="nav-section">Overzicht</span>
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard /> Dashboard
        </NavLink>

        <span className="nav-section">Financieel</span>
        <NavLink to="/facturen" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText /> Facturen
        </NavLink>
        <NavLink to="/uren" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Clock /> Urenregistratie
        </NavLink>
        <NavLink to="/kosten" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Receipt /> Kosten & Aftrekposten
        </NavLink>

        <span className="nav-section">Belasting</span>
        <NavLink to="/btw-nl" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Building2 /> BTW Aangifte NL
        </NavLink>
        <NavLink to="/btw-be" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Building2 /> BTW Aangifte BE
        </NavLink>

        <span className="nav-section">Pensioen</span>
        <NavLink to="/pensioen" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <PiggyBank /> Pensioen & Beleggen
        </NavLink>

        <span className="nav-section">Beheer</span>
        <NavLink to="/opdrachtgevers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users /> Opdrachtgevers
        </NavLink>
        <NavLink to="/instellingen" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings /> Instellingen
        </NavLink>
      </nav>
    </aside>
  )
}

// Wrapper die FileStatus boven elke pagina zet
function Page({ children }) {
  return (
    <>
      <FileStatus />
      {children}
    </>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<Page><Dashboard /></Page>} />
          <Route path="/facturen"      element={<Page><Facturen /></Page>} />
          <Route path="/uren"          element={<Page><Uren /></Page>} />
          <Route path="/kosten"        element={<Page><Kosten /></Page>} />
          <Route path="/pensioen"      element={<Page><Pensioen /></Page>} />
          <Route path="/btw-nl"        element={<Page><BtwNL /></Page>} />
          <Route path="/btw-be"        element={<Page><BtwBE /></Page>} />
          <Route path="/opdrachtgevers" element={<Page><Opdrachtgevers /></Page>} />
          <Route path="/instellingen"  element={<Page><Instellingen /></Page>} />
        </Routes>
      </main>
    </div>
  )
}
