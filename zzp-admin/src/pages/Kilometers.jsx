import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { format, parseISO, getYear } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, Car, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const DOELEN = ['Waarneming praktijk', 'Cursus/bijscholing', 'Zakelijk overleg', 'Overig zakelijk']
const fmt = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

function RitModal({ rit, onClose }) {
  const { addRit, updateRit, opdrachtgevers } = useStore()
  const isEdit = !!rit?.id
  const [form, setForm] = useState(rit || {
    datum: new Date().toISOString().split('T')[0],
    van: '', naar: '', doel: 'Waarneming praktijk',
    opdrachtgever: '', km: '', retour: true, notities: '',
  })

  const totalKm = (parseFloat(form.km) || 0) * (form.retour ? 2 : 1)

  const handleSubmit = () => {
    if (isEdit) updateRit(rit.id, { ...form, km: parseFloat(form.km) || 0, totalKm })
    else addRit({ ...form, km: parseFloat(form.km) || 0, totalKm })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Rit bewerken' : 'Rit registreren'}</h3>
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
                <input className="form-input" placeholder="Naam praktijk" value={form.opdrachtgever} onChange={e => setForm({ ...form, opdrachtgever: e.target.value })} />
              )}
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Van (vertrekplaats)</label>
              <input className="form-input" placeholder="bijv. Antwerpen" value={form.van} onChange={e => setForm({ ...form, van: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Naar (bestemming)</label>
              <input className="form-input" placeholder="bijv. Amsterdam" value={form.naar} onChange={e => setForm({ ...form, naar: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Doel</label>
            <select className="form-select" value={form.doel} onChange={e => setForm({ ...form, doel: e.target.value })}>
              {DOELEN.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Enkele reis (km)</label>
              <input className="form-input" type="number" step="0.1" placeholder="0" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0' }}>
                <input type="checkbox" id="retour" checked={form.retour} onChange={e => setForm({ ...form, retour: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                <label htmlFor="retour" style={{ cursor: 'pointer', marginBottom: 0, fontSize: '0.875rem' }}>Retour</label>
              </div>
            </div>
          </div>

          {form.km && (
            <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Totaal km</div>
                <div className="mono text-accent" style={{ fontWeight: 600, marginTop: '0.2rem' }}>{totalKm} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tarief</div>
                <div className="mono" style={{ fontWeight: 600, marginTop: '0.2rem' }}>€0,23/km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vergoeding</div>
                <div className="mono text-accent" style={{ fontWeight: 600, marginTop: '0.2rem' }}>{fmt(totalKm * 0.23)}</div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Notities</label>
            <textarea className="form-textarea" style={{ minHeight: 50 }} value={form.notities} onChange={e => setForm({ ...form, notities: e.target.value })} />
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

export default function Kilometers() {
  const { ritten, deleteRit, settings } = useStore()
  const [modal, setModal] = useState(null)
  const [filterJaar, setFilterJaar] = useState(new Date().getFullYear())

  const huidigJaar = new Date().getFullYear()
  const jaren = [...new Set(ritten.map(r => { try { return getYear(parseISO(r.datum)) } catch { return huidigJaar } }))].sort((a,b) => b-a)
  if (!jaren.includes(huidigJaar)) jaren.unshift(huidigJaar)

  const gefilterd = useMemo(() =>
    ritten.filter(r => { try { return getYear(parseISO(r.datum)) === filterJaar } catch { return false } })
      .sort((a,b) => new Date(b.datum) - new Date(a.datum))
  , [ritten, filterJaar])

  const totaalKm   = gefilterd.reduce((s,r) => s + (r.totalKm || 0), 0)
  const kmTarief   = settings.kmVergoeding || 0.23
  const totaalVerg = totaalKm * kmTarief

  // Per maand
  const maandData = useMemo(() => {
    const map = {}
    gefilterd.forEach(r => {
      const m = parseISO(r.datum).getMonth()
      if (!map[m]) map[m] = 0
      map[m] += r.totalKm || 0
    })
    const namen = ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
    return namen.map((n,i) => ({ maand: n, km: Math.round(map[i] || 0) }))
  }, [gefilterd])

  // Per opdrachtgever
  const perOG = useMemo(() => {
    const map = {}
    gefilterd.forEach(r => {
      const k = r.opdrachtgever || 'Overig'
      if (!map[k]) map[k] = 0
      map[k] += r.totalKm || 0
    })
    return Object.entries(map).sort((a,b) => b[1]-a[1])
  }, [gefilterd])

  const exportCSV = () => {
    const rows = [
      ['Datum','Van','Naar','Doel','Opdrachtgever','Enkele km','Retour','Totaal km','Vergoeding'],
      ...gefilterd.map(r => [
        r.datum, r.van, r.naar, r.doel, r.opdrachtgever,
        r.km, r.retour?'Ja':'Nee', r.totalKm, (r.totalKm*kmTarief).toFixed(2)
      ])
    ]
    const blob = new Blob([rows.map(r=>r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kilometerregistratie-${filterJaar}.csv`; a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Kilometerregistratie</h2>
          <p>{totaalKm.toFixed(0)} km — {fmt(totaalVerg)} aftrekbaar</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={16} /> CSV</button>
          <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={16} /> Rit registreren</button>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card green">
          <div className="stat-label">Totaal km {filterJaar}</div>
          <div className="stat-value green mono">{totaalKm.toFixed(0)} km</div>
          <div className="stat-sub">{gefilterd.length} ritten</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Aftrekbare vergoeding</div>
          <div className="stat-value blue mono">{fmt(totaalVerg)}</div>
          <div className="stat-sub">€{kmTarief}/km (NL fiscaal)</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Gem. per rit</div>
          <div className="stat-value yellow mono">{gefilterd.length ? (totaalKm/gefilterd.length).toFixed(0) : 0} km</div>
          <div className="stat-sub">gemiddelde ritlengte</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text2)' }}>Km per maand — {filterJaar}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={maandData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <XAxis dataKey="maand" tick={{ fill:'#5a6177', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#5a6177', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:'#1e2535', border:'1px solid #2a3245', borderRadius:'8px', fontSize:'12px' }} formatter={v=>[`${v} km`,'Km']} labelStyle={{ color:'#8b92a8' }} />
              <Bar dataKey="km" fill="#4fd1a0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Per opdrachtgever</h3>
          {perOG.length === 0 ? <p style={{ color:'var(--text3)', fontSize:'0.825rem' }}>Geen data</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              {perOG.map(([naam, km]) => (
                <div key={naam}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:'0.25rem' }}>
                    <span style={{ color:'var(--text2)' }}>{naam}</span>
                    <span className="mono">{km} km</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${(km/totaalKm)*100}%`, background:'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border)', fontSize:'0.75rem', color:'var(--text3)' }}>
            Kilometervergoeding is aftrekbaar als kostenpost. Voeg toe aan Kosten &amp; Aftrekposten aan het einde van het jaar.
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.25rem' }}>
        <select className="form-select" style={{ width:100 }} value={filterJaar} onChange={e => setFilterJaar(Number(e.target.value))}>
          {jaren.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        {gefilterd.length === 0 ? (
          <div className="empty-state"><Car /><p>Geen ritten gevonden voor {filterJaar}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Datum</th><th>Van → Naar</th><th>Doel</th><th>Opdrachtgever</th><th>Km</th><th>Vergoeding</th><th></th></tr></thead>
              <tbody>
                {gefilterd.map(r => (
                  <tr key={r.id}>
                    <td style={{ color:'var(--text2)', fontSize:'0.825rem', whiteSpace:'nowrap' }}>{r.datum ? format(parseISO(r.datum),'d MMM yyyy',{locale:nl}) : '—'}</td>
                    <td style={{ fontSize:'0.875rem' }}>{r.van} <span style={{ color:'var(--text3)' }}>→</span> {r.naar}{r.retour && <span style={{ marginLeft:4, fontSize:'0.7rem', color:'var(--blue)', background:'var(--blue-dim)', borderRadius:4, padding:'1px 5px' }}>retour</span>}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.825rem' }}>{r.doel}</td>
                    <td style={{ fontSize:'0.825rem' }}>{r.opdrachtgever || '—'}</td>
                    <td className="mono" style={{ fontWeight:600 }}>{r.totalKm} km</td>
                    <td className="mono text-accent">{fmt(r.totalKm * kmTarief)}</td>
                    <td>
                      <div style={{ display:'flex', gap:'0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(r)}><Pencil size={14}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteRit(r.id)}><Trash2 size={14} style={{ color:'var(--red)' }}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && <RitModal rit={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
