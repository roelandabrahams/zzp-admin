import { Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Clock, Receipt, Settings, Users,
  PiggyBank, Building2, Car, FileSignature, CalendarDays,
  TrendingUp, BarChart3, ScrollText
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
import Kilometers from './pages/Kilometers'
import Offertes from './pages/Offertes'
import Belasting from './pages/Belasting'
import Dagen from './pages/Dagen'
import Contracten from './pages/Contracten'
import Jaaroverzicht from './pages/Jaaroverzicht'

function Sidebar() {
  const link = (to, icon, label, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      {icon} {label}
    </NavLink>
  )
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>ZZP Admin</h1>
        <p>Waarnemend Huisarts</p>
      </div>
      <nav>
        <span className="nav-section">Overzicht</span>
        {link('/', <LayoutDashboard />, 'Dashboard', true)}
        {link('/jaaroverzicht', <BarChart3 />, 'Jaaroverzicht')}

        <span className="nav-section">Financieel</span>
        {link('/offertes',  <ScrollText />,      'Offertes')}
        {link('/facturen',  <FileText />,         'Facturen')}
        {link('/uren',      <Clock />,            'Urenregistratie')}
        {link('/kilometers',<Car />,              'Kilometerregistratie')}
        {link('/kosten',    <Receipt />,          'Kosten & Aftrekposten')}

        <span className="nav-section">Belasting</span>
        {link('/belasting', <TrendingUp />,       'IB Schatting')}
        {link('/btw-nl',    <Building2 />,        'BTW Aangifte NL')}
        {link('/btw-be',    <Building2 />,        'BTW Aangifte BE')}
        {link('/dagen',     <CalendarDays />,     '183-Dagenkalender')}

        <span className="nav-section">Pensioen</span>
        {link('/pensioen',  <PiggyBank />,        'Pensioen & Beleggen')}

        <span className="nav-section">Beheer</span>
        {link('/contracten',    <FileSignature />, 'Contracten')}
        {link('/opdrachtgevers',<Users />,         'Opdrachtgevers')}
        {link('/instellingen',  <Settings />,      'Instellingen')}
      </nav>
    </aside>
  )
}

function Page({ children }) {
  return <><FileStatus />{children}</>
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"               element={<Page><Dashboard /></Page>} />
          <Route path="/jaaroverzicht"  element={<Page><Jaaroverzicht /></Page>} />
          <Route path="/offertes"       element={<Page><Offertes /></Page>} />
          <Route path="/facturen"       element={<Page><Facturen /></Page>} />
          <Route path="/uren"           element={<Page><Uren /></Page>} />
          <Route path="/kilometers"     element={<Page><Kilometers /></Page>} />
          <Route path="/kosten"         element={<Page><Kosten /></Page>} />
          <Route path="/belasting"      element={<Page><Belasting /></Page>} />
          <Route path="/btw-nl"         element={<Page><BtwNL /></Page>} />
          <Route path="/btw-be"         element={<Page><BtwBE /></Page>} />
          <Route path="/dagen"          element={<Page><Dagen /></Page>} />
          <Route path="/pensioen"       element={<Page><Pensioen /></Page>} />
          <Route path="/contracten"     element={<Page><Contracten /></Page>} />
          <Route path="/opdrachtgevers" element={<Page><Opdrachtgevers /></Page>} />
          <Route path="/instellingen"   element={<Page><Instellingen /></Page>} />
        </Routes>
      </main>
    </div>
  )
}
