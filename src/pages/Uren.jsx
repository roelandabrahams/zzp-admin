import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { format, parseISO, getYear, getMonth } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function UrenModal({ uur, onClose }) {
  const { addUren, updateUren, opdrachtgevers } = useStore()
  const isEdit = !!uur?.id
  const [form, setForm] = useState(uur || {
    datum: new Date().toISOString().split('T')[0],
    opdrachtgever: '',
    omschrijving: '',
    uren: '',
    tarief: '',
    gefactureerd: false,
  })

  const handleSubmit = () => {
    const data = { ...form, uren: parseFloat(form.uren) || 0, tarief: parseFloat(form.tarief) || 0 }
    if (isEdit) updateUren(uur.id, data)
    else addUren(data)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Uren bewerken' : 'Uren registreren'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Datum</label>
              <input className="form-input" type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Opdrachtgever</label>
              {opdrachtgevers.length > 0 ? (
                <select className="form-select" value={form.opdrachtgever} onChange={e => setForm({ ...form, opdrachtgever: e.target.value })}>
                  <option value="">— kies —</option>
                  {opdrachtgevers.map(o => <option key={o.id} value={o.naam}>{o.naam}</option>)}
                </select>
              ) : (
                <input className="form-input" placeholder="Naam opdrachtgever" value={form.opdrachtgever} onChange={e => setForm({ ...form, opdrachtgever: e.target.value })} />
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Omschrijving werkzaamheden</label>
            <input className="form-input" placeholder="bijv. Waarneming huisartsenpraktijk" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })} />
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Aantal uren</label>
              <input className="form-input" type="number" step="0.25" placeholder="0.00" value={form.uren} onChange={e => setForm({ ...form, uren: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Uurtarief (€)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.tarief} onChange={e => setForm({ ...form, tarief: e.target.value })} />
            </div>
          </div>

          {form.uren && form.tarief && (
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>Totaal</span>
              <span className="mono text-accent" style={{ fontWeight: 600 }}>
                {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((parseFloat(form.uren) || 0) * (parseFloat(form.tarief) || 0))}
              </span>
            </div>
          )}

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" id="gefactureerd" checked={form.gefactureerd} onChange={e => setForm({ ...form, gefactureerd: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <label htmlFor="gefactureerd" style={{ cursor: 'pointer', marginBottom: 0 }}>Al gefactureerd</label>
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

export default function Uren() {
  const { uren, updateUren, deleteUren } = useStore()
  const [modal, setModal] = useState(null)
  const [filterJaar, setFilterJaar] = useState(new Date().getFullYear())
  const [filterMaand, setFilterMaand] = useState(-1) // -1 = alle maanden

  const jaren = [...new Set(uren.map(u => getYear(parseISO(u.datum))))].sort((a, b) => b - a)

  const gefilterd = useMemo(() => {
    return uren
      .filter(u => {
        try {
          const d = parseISO(u.datum)
          return getYear(d) === filterJaar && (filterMaand === -1 || getMonth(d) === filterMaand)
        } catch { return false }
      })
      .sort((a, b) => new Date(b.datum) - new Date(a.datum))
  }, [uren, filterJaar, filterMaand])

  const totaalUren = gefilterd.reduce((s, u) => s + (u.uren || 0), 0)
  const totaalOmzet = gefilterd.reduce((s, u) => s + (u.uren || 0) * (u.tarief || 0), 0)
  const gemTarief = totaalUren > 0 ? totaalOmzet / totaalUren : 0

  // Maandelijkse data voor chart
  const maandData = useMemo(() => {
    const map = {}
    uren.filter(u => { try { return getYear(parseISO(u.datum)) === filterJaar } catch { return false } })
      .forEach(u => {
        const m = getMonth(parseISO(u.datum))
        if (!map[m]) map[m] = { uren: 0, omzet: 0 }
        map[m].uren += u.uren || 0
        map[m].omzet += (u.uren || 0) * (u.tarief || 0)
      })
    const maandNamen = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    return maandNamen.map((n, i) => ({ maand: n, uren: Math.round((map[i]?.uren || 0) * 10) / 10, omzet: Math.round(map[i]?.omzet || 0) }))
  }, [uren, filterJaar])

  const maanden = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Urenregistratie</h2>
          <p>{totaalUren.toFixed(1)} uren — {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalOmzet)}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Uren registreren
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card green">
          <div className="stat-label">Totaal uren</div>
          <div className="stat-value green mono">{totaalUren.toFixed(1)}</div>
          <div className="stat-sub">in geselecteerde periode</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Omzet uren</div>
          <div className="stat-value blue mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalOmzet)}</div>
          <div className="stat-sub">excl. BTW</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Gem. uurtarief</div>
          <div className="stat-value yellow mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(gemTarief)}</div>
          <div className="stat-sub">gewogen gemiddelde</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', color: 'var(--text2)' }}>Uren per maand — {filterJaar}</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={maandData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis dataKey="maand" tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#5a6177', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1e2535', border: '1px solid #2a3245', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v, n) => [n === 'uren' ? `${v}u` : new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v), n === 'uren' ? 'Uren' : 'Omzet']}
              labelStyle={{ color: '#8b92a8' }}
            />
            <Bar dataKey="uren" fill="#4fd1a0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 100 }} value={filterJaar} onChange={e => setFilterJaar(Number(e.target.value))}>
          {jaren.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          {jaren.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterMaand} onChange={e => setFilterMaand(Number(e.target.value))}>
          <option value={-1}>Alle maanden</option>
          {maanden.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {gefilterd.length === 0 ? (
          <div className="empty-state"><Clock /><p>Geen uren gevonden voor deze periode</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Opdrachtgever</th>
                  <th>Omschrijving</th>
                  <th>Uren</th>
                  <th>Tarief</th>
                  <th>Bedrag</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gefilterd.map(u => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                      {u.datum ? format(parseISO(u.datum), 'dd MMM yyyy', { locale: nl }) : '—'}
                    </td>
                    <td style={{ fontWeight: 500 }}>{u.opdrachtgever}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>{u.omschrijving}</td>
                    <td className="mono">{(u.uren || 0).toFixed(2)}u</td>
                    <td className="mono" style={{ color: 'var(--text2)' }}>€{(u.tarief || 0).toFixed(2)}</td>
                    <td className="mono text-accent">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((u.uren || 0) * (u.tarief || 0))}</td>
                    <td>
                      <span className={`badge ${u.gefactureerd ? 'badge-green' : 'badge-gray'}`}>
                        {u.gefactureerd ? 'Gefactureerd' : 'Open'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(u)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteUren(u.id)}><Trash2 size={14} style={{ color: 'var(--red)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <UrenModal uur={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
