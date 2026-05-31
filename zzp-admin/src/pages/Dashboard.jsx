import { useMemo } from 'react'
import { useStore } from '../store'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, getYear } from 'date-fns'
import { nl } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Clock, FileCheck, AlertCircle } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtShort = (n) => `€${(n / 1000).toFixed(1)}k`

export default function Dashboard() {
  const { facturen, uren, kosten, pensioen, settings } = useStore()
  const huidigJaar = new Date().getFullYear()
  const huidigeMaand = new Date().getMonth()

  const stats = useMemo(() => {
    const jaarFacturen = facturen.filter(f => getYear(parseISO(f.datum)) === huidigJaar)
    const totaalOmzet = jaarFacturen.reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const totaalBtw = jaarFacturen.reduce((s, f) => s + (f.btwBedrag || 0), 0)
    const openstaand = jaarFacturen.filter(f => f.status === 'openstaand').reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const betaald = jaarFacturen.filter(f => f.status === 'betaald').reduce((s, f) => s + (f.bedragExBtw || 0), 0)

    const jaarKosten = kosten.filter(k => getYear(parseISO(k.datum)) === huidigJaar)
    const totaalKosten = jaarKosten.reduce((s, k) => s + (k.bedrag || 0), 0)

    const jaarUren = uren.filter(u => getYear(parseISO(u.datum)) === huidigJaar)
    const totaalUren = jaarUren.reduce((s, u) => s + (u.uren || 0), 0)
    const gemUurtarief = totaalUren > 0 ? totaalOmzet / totaalUren : 0

    const jaarPensioen = pensioen.filter(p => getYear(parseISO(p.datum)) === huidigJaar)
    const totaalPensioen = jaarPensioen.reduce((s, p) => s + (p.bedrag || 0), 0)

    // Jaarruimte berekening (30% van winst, max ~15k)
    const winst = totaalOmzet - totaalKosten
    const jaarruimte = Math.min(winst * (settings.jaarruimtePercentage / 100), 15793)
    const jaarruimteRest = Math.max(0, jaarruimte - totaalPensioen)

    return { totaalOmzet, totaalBtw, openstaand, betaald, totaalKosten, totaalUren, gemUurtarief, totaalPensioen, jaarruimte, jaarruimteRest, winst }
  }, [facturen, uren, kosten, pensioen, huidigJaar, settings])

  // Maandelijks overzicht voor chart (laatste 12 maanden)
  const maandData = useMemo(() => {
    const data = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = format(d, 'MMM', { locale: nl })
      const start = startOfMonth(d)
      const end = endOfMonth(d)
      const interval = { start, end }

      const omzet = facturen
        .filter(f => { try { return isWithinInterval(parseISO(f.datum), interval) } catch { return false } })
        .reduce((s, f) => s + (f.bedragExBtw || 0), 0)

      const kost = kosten
        .filter(k => { try { return isWithinInterval(parseISO(k.datum), interval) } catch { return false } })
        .reduce((s, k) => s + (k.bedrag || 0), 0)

      data.push({ maand: label, omzet: Math.round(omzet), kosten: Math.round(kost), winst: Math.round(omzet - kost) })
    }
    return data
  }, [facturen, kosten])

  const openFacturen = facturen.filter(f => f.status === 'openstaand').slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard</h2>
          <p>{huidigJaar} — Overzicht jaarlijkse administratie</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card green">
          <div className="stat-label">Omzet {huidigJaar}</div>
          <div className="stat-value green mono">{fmt(stats.totaalOmzet)}</div>
          <div className="stat-sub">excl. BTW</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Kosten {huidigJaar}</div>
          <div className="stat-value yellow mono">{fmt(stats.totaalKosten)}</div>
          <div className="stat-sub">aftrekbare kosten</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Nettowinst</div>
          <div className="stat-value blue mono">{fmt(stats.winst)}</div>
          <div className="stat-sub">omzet - kosten</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Openstaand</div>
          <div className="stat-value red mono">{fmt(stats.openstaand)}</div>
          <div className="stat-sub">nog te ontvangen</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text2)' }}>Omzet vs Kosten — laatste 12 maanden</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={maandData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gOmzet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4fd1a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4fd1a0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gKosten" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0c060" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f0c060" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="maand" tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip
                contentStyle={{ background: '#1e2535', border: '1px solid #2a3245', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v, n) => [fmt(v), n === 'omzet' ? 'Omzet' : 'Kosten']}
                labelStyle={{ color: '#8b92a8' }}
              />
              <Area type="monotone" dataKey="omzet" stroke="#4fd1a0" strokeWidth={2} fill="url(#gOmzet)" />
              <Area type="monotone" dataKey="kosten" stroke="#f0c060" strokeWidth={2} fill="url(#gKosten)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-sm">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-label">Jaarruimte pensioen</div>
                <div className="stat-value green" style={{ fontSize: '1.2rem' }}>{fmt(stats.jaarruimte)}</div>
                <div className="stat-sub">nog beschikbaar: {fmt(stats.jaarruimteRest)}</div>
              </div>
              <TrendingUp size={20} style={{ color: 'var(--accent)', marginTop: 4 }} />
            </div>
            <div className="progress-bar mt-1" style={{ marginTop: '0.75rem' }}>
              <div className="progress-fill" style={{
                width: `${Math.min(100, ((stats.jaarruimte - stats.jaarruimteRest) / stats.jaarruimte) * 100 || 0)}%`,
                background: 'var(--accent)'
              }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.4rem' }}>
              {fmt(stats.totaalPensioen)} gestort dit jaar
            </div>
          </div>

          <div className="card-sm">
            <div className="stat-label">BTW te betalen (NL)</div>
            <div className="stat-value yellow" style={{ fontSize: '1.2rem' }}>{fmt(stats.totaalBtw)}</div>
            <div className="stat-sub">21% over gefactureerde omzet</div>
          </div>

          <div className="card-sm">
            <div className="stat-label">Gem. uurtarief</div>
            <div className="stat-value blue" style={{ fontSize: '1.2rem' }}>{fmt(stats.gemUurtarief)}/u</div>
            <div className="stat-sub">{stats.totaalUren.toFixed(1)} uur gefactureerd</div>
          </div>
        </div>
      </div>

      {openFacturen.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <AlertCircle size={16} style={{ color: 'var(--yellow)' }} />
            <h3>Openstaande facturen</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Opdrachtgever</th>
                  <th>Datum</th>
                  <th>Bedrag</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {openFacturen.map(f => (
                  <tr key={f.id}>
                    <td className="mono" style={{ color: 'var(--text2)' }}>{f.nummer}</td>
                    <td>{f.opdrachtgever}</td>
                    <td style={{ color: 'var(--text2)' }}>{f.datum ? format(parseISO(f.datum), 'd MMM yyyy', { locale: nl }) : '—'}</td>
                    <td className="mono text-accent">{fmt(f.bedragExBtw)}</td>
                    <td><span className="badge badge-yellow">Openstaand</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openFacturen.length === 0 && facturen.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <FileCheck />
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Welkom bij ZZP Admin!</p>
            <p>Begin met het instellen van je gegevens en voeg je eerste factuur toe.</p>
          </div>
        </div>
      )}
    </div>
  )
}
