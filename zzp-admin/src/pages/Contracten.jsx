import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { format, parseISO, differenceInDays, isPast, isWithinInterval, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, FileText, AlertTriangle, CheckCircle, Clock, Paperclip, FileX } from 'lucide-react'

function ContractModal({ contract, onClose }) {
  const { addContract, updateContract, opdrachtgevers } = useStore()
  const isEdit = !!contract?.id
  const [form, setForm] = useState(contract || {
    opdrachtgever: '', contactpersoon: '', type: 'waarneemovereenkomst',
    startDatum: new Date().toISOString().split('T')[0],
    eindDatum: '', onbepaaldeTijd: false,
    uurtarief: '', beschrijving: '',
    herinneringDagen: 30,
    notities: '',
    bijlagen: [],
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useState(null)

  const leesAlsBase64 = file => new Promise((res,rej) => {
    const r = new FileReader()
    r.onload = () => res({ naam: file.name, type: file.type, data: r.result })
    r.onerror = rej; r.readAsDataURL(file)
  })

  const handleBijlage = async e => {
    const files = Array.from(e.target.files); if (!files.length) return
    setUploading(true)
    try { const b = await Promise.all(files.map(leesAlsBase64)); setForm(f => ({...f, bijlagen:[...(f.bijlagen||[]),...b]})) }
    finally { setUploading(false); e.target.value='' }
  }

  const handleSubmit = () => {
    if (isEdit) updateContract(contract.id, form)
    else addContract(form)
    onClose()
  }

  const f = k => e => setForm({...form, [k]: e.target.value})

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:580 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Contract bewerken' : 'Contract toevoegen'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Opdrachtgever *</label>
              {opdrachtgevers.length > 0 ? (
                <select className="form-select" value={form.opdrachtgever} onChange={f('opdrachtgever')}>
                  <option value="">— kies —</option>
                  {opdrachtgevers.map(o => <option key={o.id} value={o.naam}>{o.naam}</option>)}
                </select>
              ) : (
                <input className="form-input" value={form.opdrachtgever} onChange={f('opdrachtgever')} placeholder="Naam praktijk" />
              )}
            </div>
            <div className="form-group">
              <label>Type contract</label>
              <select className="form-select" value={form.type} onChange={f('type')}>
                <option value="waarneemovereenkomst">Waarneemovereenkomst</option>
                <option value="raamovereenkomst">Raamovereenkomst</option>
                <option value="zzp-overeenkomst">ZZP-overeenkomst</option>
                <option value="anders">Anders</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Contactpersoon</label>
            <input className="form-input" value={form.contactpersoon} onChange={f('contactpersoon')} />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Startdatum</label>
              <input className="form-input" type="date" value={form.startDatum} onChange={f('startDatum')} />
            </div>
            <div className="form-group">
              <label>Einddatum</label>
              <input className="form-input" type="date" value={form.eindDatum} onChange={f('eindDatum')} disabled={form.onbepaaldeTijd} />
            </div>
          </div>
          <div className="form-group" style={{ flexDirection:'row', alignItems:'center', gap:'0.6rem' }}>
            <input type="checkbox" id="onbepaald" checked={form.onbepaaldeTijd} onChange={e => setForm({...form, onbepaaldeTijd:e.target.checked, eindDatum:''})} style={{ width:16, height:16, accentColor:'var(--accent)' }} />
            <label htmlFor="onbepaald" style={{ cursor:'pointer', marginBottom:0, fontSize:'0.875rem' }}>Onbepaalde tijd</label>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Afgesproken uurtarief €</label>
              <input className="form-input" type="number" step="0.01" value={form.uurtarief} onChange={f('uurtarief')} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Herinnering voor verlopen (dagen)</label>
              <select className="form-select" value={form.herinneringDagen} onChange={f('herinneringDagen')}>
                {[14,30,60,90].map(d => <option key={d} value={d}>{d} dagen</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Beschrijving / scope</label>
            <textarea className="form-textarea" style={{ minHeight:60 }} value={form.beschrijving} onChange={f('beschrijving')} placeholder="bijv. Waarneming huisartsenpraktijk, max 2 dagen/week" />
          </div>

          {/* Bijlagen */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.6rem' }}>
              <label style={{ fontSize:'0.8rem', color:'var(--text2)', fontWeight:500 }}>Contractdocument(en)</label>
              <label className="btn btn-secondary btn-sm" style={{ cursor:'pointer' }}>
                <Paperclip size={13}/> {uploading ? 'Laden…' : 'PDF toevoegen'}
                <input type="file" accept="application/pdf,image/*" multiple style={{ display:'none' }} onChange={handleBijlage} />
              </label>
            </div>
            {(form.bijlagen||[]).length === 0 ? (
              <div style={{ border:'2px dashed var(--border2)', borderRadius:'var(--radius)', padding:'1rem', textAlign:'center', color:'var(--text3)', fontSize:'0.825rem' }}>
                <Paperclip size={18} style={{ display:'block', margin:'0 auto 0.4rem', opacity:0.3 }}/>
                Voeg het getekende contract toe als PDF
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                {(form.bijlagen||[]).map((b,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--bg3)', borderRadius:'var(--radius)', padding:'0.5rem 0.75rem' }}>
                    <Paperclip size={13} style={{ color:'var(--accent)', flexShrink:0 }}/>
                    <span style={{ flex:1, fontSize:'0.825rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.naam}</span>
                    <a href={b.data} download={b.naam} className="btn btn-ghost btn-sm" style={{ padding:'0.15rem 0.4rem', fontSize:'0.75rem' }}>↓</a>
                    <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({...f, bijlagen:f.bijlagen.filter((_,j)=>j!==i)}))} style={{ padding:'0.15rem 0.3rem' }}>
                      <FileX size={13} style={{ color:'var(--red)' }}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notities</label>
            <textarea className="form-textarea" style={{ minHeight:50 }} value={form.notities} onChange={f('notities')} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.opdrachtgever}>Opslaan</button>
        </div>
      </div>
    </div>
  )
}

export default function Contracten() {
  const { contracten, deleteContract } = useStore()
  const [modal, setModal] = useState(null)
  const vandaag = new Date()

  const verrijkt = useMemo(() => contracten.map(c => {
    const eind = c.eindDatum ? parseISO(c.eindDatum) : null
    const dagenTot = eind ? differenceInDays(eind, vandaag) : null
    const verlopen = eind ? isPast(eind) : false
    const bijna = eind ? isWithinInterval(vandaag, { start: vandaag, end: addDays(vandaag, c.herinneringDagen||30) }) && !verlopen && dagenTot <= (c.herinneringDagen||30) : false
    return { ...c, dagenTot, verlopen, bijna }
  }).sort((a,b) => {
    if (a.verlopen && !b.verlopen) return 1
    if (!a.verlopen && b.verlopen) return -1
    if (a.dagenTot !== null && b.dagenTot !== null) return a.dagenTot - b.dagenTot
    return 0
  }), [contracten, vandaag])

  const aantalActief  = verrijkt.filter(c => !c.verlopen).length
  const aantalBijna   = verrijkt.filter(c => c.bijna).length
  const aantalVerlopen = verrijkt.filter(c => c.verlopen).length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Contracten & Documenten</h2>
          <p>{aantalActief} actieve contracten</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={16}/> Contract toevoegen</button>
      </div>

      {aantalBijna > 0 && (
        <div style={{ background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:'var(--radius)', padding:'0.875rem 1rem', marginBottom:'1.5rem', display:'flex', gap:'0.6rem', fontSize:'0.875rem', color:'var(--yellow)' }}>
          <AlertTriangle size={16} style={{ flexShrink:0 }}/>
          <span><strong>{aantalBijna} contract{aantalBijna>1?'en':''}</strong> verlop{aantalBijna>1?'en':'t'} binnenkort. Bekijk en verleng op tijd.</span>
        </div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:'1.5rem' }}>
        <div className="stat-card green"><div className="stat-label">Actief</div><div className="stat-value green mono">{aantalActief}</div><div className="stat-sub">lopende contracten</div></div>
        <div className="stat-card yellow"><div className="stat-label">Verloopt binnenkort</div><div className="stat-value yellow mono">{aantalBijna}</div><div className="stat-sub">binnen herinneringstermijn</div></div>
        <div className="stat-card red"><div className="stat-label">Verlopen</div><div className="stat-value red mono">{aantalVerlopen}</div><div className="stat-sub">niet verlengd</div></div>
      </div>

      <div className="card" style={{ padding:0 }}>
        {verrijkt.length === 0 ? (
          <div className="empty-state"><FileText/><p>Nog geen contracten toegevoegd</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Opdrachtgever</th><th>Type</th><th>Start</th><th>Eind</th><th>Tarief</th><th>Status</th><th>Bijl.</th><th></th></tr></thead>
              <tbody>
                {verrijkt.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight:500 }}>{c.opdrachtgever}</div>
                      {c.contactpersoon && <div style={{ fontSize:'0.75rem', color:'var(--text3)' }}>{c.contactpersoon}</div>}
                    </td>
                    <td><span className="badge badge-gray" style={{ fontSize:'0.7rem' }}>{c.type}</span></td>
                    <td style={{ color:'var(--text2)', fontSize:'0.825rem' }}>{c.startDatum ? format(parseISO(c.startDatum),'d MMM yyyy',{locale:nl}) : '—'}</td>
                    <td style={{ fontSize:'0.825rem' }}>
                      {c.onbepaaldeTijd
                        ? <span style={{ color:'var(--accent)' }}>Onbepaald</span>
                        : c.eindDatum
                          ? <span style={{ color: c.verlopen ? 'var(--red)' : c.bijna ? 'var(--yellow)' : 'var(--text2)' }}>
                              {format(parseISO(c.eindDatum),'d MMM yyyy',{locale:nl})}
                              {!c.verlopen && c.dagenTot !== null && <div style={{ fontSize:'0.7rem' }}>{c.dagenTot}d</div>}
                            </span>
                          : '—'
                      }
                    </td>
                    <td className="mono" style={{ fontSize:'0.825rem' }}>{c.uurtarief ? `€${c.uurtarief}/u` : '—'}</td>
                    <td>
                      {c.verlopen
                        ? <span className="badge badge-red">Verlopen</span>
                        : c.bijna
                          ? <span className="badge badge-yellow">Verloopt binnenkort</span>
                          : c.onbepaaldeTijd
                            ? <span className="badge badge-green">Onbepaald</span>
                            : <span className="badge badge-green">Actief</span>
                      }
                    </td>
                    <td>
                      {(c.bijlagen||[]).length > 0
                        ? <div style={{ display:'flex', gap:'0.2rem' }}>
                            {(c.bijlagen||[]).map((b,i) => (
                              <a key={i} href={b.data} download={b.naam} className="btn btn-ghost btn-sm" title={b.naam} style={{ padding:'0.2rem 0.35rem' }}>
                                <Paperclip size={13} style={{ color:'var(--accent)' }}/>
                              </a>
                            ))}
                          </div>
                        : <span style={{ color:'var(--text3)', fontSize:'0.75rem' }}>—</span>
                      }
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(c)}><Pencil size={14}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteContract(c.id)}><Trash2 size={14} style={{ color:'var(--red)' }}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && <ContractModal contract={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
