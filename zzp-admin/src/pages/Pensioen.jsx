import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { format, parseISO, getYear } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, PiggyBank, TrendingUp, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const TYPES = [
  { waarde: 'jaarruimte', label: 'Jaarruimte (lijfrente)' },
  { waarde: 'degiro', label: 'DeGiro — pensioenrekening' },
  { waarde: 'etf', label: 'ETF — zelf beleggen' },
  { waarde: 'sparen', label: 'Spaarrekening' },
  { waarde: 'overig', label: 'Overig' },
]

const KLEUREN = { jaarruimte: '#4fd1a0', degiro: '#6098f0', etf: '#f0c060', sparen: '#a88bf0', overig: '#8b92a8' }

function PensioenModal({ item, onClose }) {
  const { addPensioen, updatePensioen } = useStore()
  const isEdit = !!item?.id
  const [form, setForm] = useState(item || {
    datum: new Date().toISOString().split('T')[0],
    type: 'degiro',
    omschrijving: '',
    bedrag: '',
    rendement: '',
    notities: '',
  })

  const handleSubmit = () => {
    const data = { ...form, bedrag: parseFloat(form.bedrag) || 0, rendement: parseFloat(form.rendement) || 0 }
    if (isEdit) updatePensioen(item.id, data)
    else addPensioen(data)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Storting bewerken' : 'Storting registreren'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Datum</label>
              <input className="form-input" type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t.waarde} value={t.waarde}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Omschrijving</label>
            <input className="form-input" placeholder="bijv. Maandelijkse storting ETF VWRL" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })} />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Bedrag gestort €</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.bedrag} onChange={e => setForm({ ...form, bedrag: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Huidig rendement € (optioneel)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.rendement} onChange={e => setForm({ ...form, rendement: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Notities</label>
            <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.notities} onChange={e => setForm({ ...form, notities: e.target.value })} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Opslaan</button>
        </div>
      </div>
    </div>
  )
}

function JaarruimteCalc({ omzet, kosten, settings }) {
  const winst = omzet - kosten
  const aowFranchise = 13646 // 2025 bedrag
  const maxJaarruimte = 15793 // 2025 max
  const factor = settings.jaarruimtePercentage / 100 || 0.30

  const grondslag = Math.max(0, winst - aowFranchise)
  const berekendJaarruimte = Math.min(grondslag * factor, maxJaarruimte)

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Info size={16} style={{ color: 'var(--blue)' }} />
        <h3>Jaarruimte berekening {new Date().getFullYear()}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
        <div>
          <div style={{ color: 'var(--text3)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Winst uit onderneming</div>
          <div className="mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(winst)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text3)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AOW-franchise (aftrek)</div>
          <div className="mono" style={{ color: 'var(--red)' }}>- {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(aowFranchise)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text3)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grondslag ({(factor * 100).toFixed(0)}%)</div>
          <div className="mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(grondslag)} × {(factor * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div style={{ color: 'var(--text3)', marginBottom: '0.25rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max jaarruimte 2025</div>
          <div className="mono text-accent" style={{ fontWeight: 600 }}>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(berekendJaarruimte)}</div>
        </div>
      </div>
      <div style={{ background: 'var(--blue-dim)', borderRadius: 'var(--radius)', padding: '0.75rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--blue)' }}>
        💡 Dit bedrag kun je aftrekken van je belastbaar inkomen in NL via een lijfrentestorting (DeGiro pensioenrekening of andere lijfrente-aanbieder). Vul dit in vóór 1 juli van het volgende jaar.
      </div>
    </div>
  )
}

export default function Pensioen() {
  const { pensioen, deletePensioen, facturen, kosten, settings } = useStore()
  const [modal, setModal] = useState(null)
  const [filterJaar, setFilterJaar] = useState(new Date().getFullYear())

  const huidigJaar = new Date().getFullYear()
  const jaren = [...new Set(pensioen.map(p => { try { return getYear(parseISO(p.datum)) } catch { return huidigJaar } }))].sort((a, b) => b - a)
  if (!jaren.includes(huidigJaar)) jaren.unshift(huidigJaar)

  const gefilterd = pensioen
    .filter(p => { try { return getYear(parseISO(p.datum)) === filterJaar } catch { return false } })
    .sort((a, b) => new Date(b.datum) - new Date(a.datum))

  const totaalGestort = pensioen.reduce((s, p) => s + (p.bedrag || 0), 0)
  const totaalRendement = pensioen.reduce((s, p) => s + (p.rendement || 0), 0)
  const totaalWaarde = totaalGestort + totaalRendement

  // Verdeling per type
  const verdeling = useMemo(() => {
    const map = {}
    pensioen.forEach(p => {
      if (!map[p.type]) map[p.type] = 0
      map[p.type] += p.bedrag || 0
    })
    return Object.entries(map).map(([type, bedrag]) => ({
      name: TYPES.find(t => t.waarde === type)?.label || type,
      value: Math.round(bedrag),
      kleur: KLEUREN[type] || '#8b92a8'
    }))
  }, [pensioen])

  // Groei over jaren
  const groeiData = useMemo(() => {
    const map = {}
    pensioen.forEach(p => {
      try {
        const j = getYear(parseISO(p.datum))
        if (!map[j]) map[j] = 0
        map[j] += p.bedrag || 0
      } catch {}
    })
    let cumulatief = 0
    return Object.entries(map).sort((a, b) => a[0] - b[0]).map(([jaar, bedrag]) => {
      cumulatief += bedrag
      return { jaar, gestort: Math.round(bedrag), cumulatief: Math.round(cumulatief) }
    })
  }, [pensioen])

  // Omzet & kosten voor jaarruimte berekening
  const omzetJaar = facturen.filter(f => { try { return getYear(parseISO(f.datum)) === huidigJaar } catch { return false } }).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
  const kostenJaar = kosten.filter(k => { try { return getYear(parseISO(k.datum)) === huidigJaar } catch { return false } }).reduce((s, k) => s + (k.bedrag || 0), 0)

  const pensioendoel = settings.pensioendoel || 500000
  const progressie = Math.min(100, (totaalWaarde / pensioendoel) * 100)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pensioen & Beleggen</h2>
          <p>Jaarruimte, DeGiro pensioenrekening & ETF portefeuille</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Storting registreren
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card green">
          <div className="stat-label">Totaal ingelegd</div>
          <div className="stat-value green mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalGestort)}</div>
          <div className="stat-sub">alle jaren</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Totaal rendement</div>
          <div className="stat-value blue mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalRendement)}</div>
          <div className="stat-sub">opgegeven rendement</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Totale waarde</div>
          <div className="stat-value yellow mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalWaarde)}</div>
          <div className="stat-sub">gestort + rendement</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3>Pensioendoel: {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(pensioendoel)}</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--accent)' }}>{progressie.toFixed(1)}%</span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${progressie}%`, background: 'linear-gradient(90deg, var(--accent), var(--blue))' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text3)' }}>
          <span>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalWaarde)}</span>
          <span>Nog {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Math.max(0, pensioendoel - totaalWaarde))} te gaan</span>
        </div>
      </div>

      <JaarruimteCalc omzet={omzetJaar} kosten={kostenJaar} settings={settings} />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {groeiData.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--text2)' }}>Cumulatief ingelegd</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={groeiData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4fd1a0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4fd1a0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="jaar" tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={n => `€${(n/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1e2535', border: '1px solid #2a3245', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)]} labelStyle={{ color: '#8b92a8' }} />
                <Area type="monotone" dataKey="cumulatief" stroke="#4fd1a0" strokeWidth={2} fill="url(#gCum)" name="Cumulatief" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {verdeling.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', color: 'var(--text2)' }}>Verdeling</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={verdeling} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                  {verdeling.map((entry, i) => <Cell key={i} fill={entry.kleur} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e2535', border: '1px solid #2a3245', borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v)]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 100 }} value={filterJaar} onChange={e => setFilterJaar(Number(e.target.value))}>
          {jaren.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {gefilterd.length === 0 ? (
          <div className="empty-state"><PiggyBank /><p>Geen stortingen gevonden voor {filterJaar}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Type</th>
                  <th>Omschrijving</th>
                  <th>Gestort</th>
                  <th>Rendement</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gefilterd.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>{p.datum ? format(parseISO(p.datum), 'd MMM yyyy', { locale: nl }) : '—'}</td>
                    <td>
                      <span className="badge" style={{ background: KLEUREN[p.type] + '22', color: KLEUREN[p.type] }}>
                        {TYPES.find(t => t.waarde === p.type)?.label || p.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.omschrijving}</td>
                    <td className="mono text-accent">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(p.bedrag || 0)}</td>
                    <td className="mono" style={{ color: (p.rendement || 0) >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {p.rendement ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(p.rendement) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(p)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deletePensioen(p.id)}><Trash2 size={14} style={{ color: 'var(--red)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <PensioenModal item={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
