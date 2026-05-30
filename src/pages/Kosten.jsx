import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store'
import { format, parseISO, getYear } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, Receipt, Info, Paperclip, Eye, FileX } from 'lucide-react'

const CATEGORIEEN = [
  { waarde: 'kantoor',        label: 'Kantoor & werkruimte' },
  { waarde: 'ict',            label: 'ICT & software' },
  { waarde: 'telefoon',       label: 'Telefoon & communicatie' },
  { waarde: 'auto',           label: 'Auto & reiskosten' },
  { waarde: 'opleiding',      label: 'Opleiding & bijscholing' },
  { waarde: 'verzekering',    label: 'Verzekering (beroep)' },
  { waarde: 'beroepskleding', label: 'Beroepskleding' },
  { waarde: 'medisch',        label: 'Medisch materiaal' },
  { waarde: 'administratie',  label: 'Administratie & boekhouding' },
  { waarde: 'representatie',  label: 'Representatie (80%)' },
  { waarde: 'overig',         label: 'Overig' },
]

const LANDEN = ['Nederland', 'België', 'Beide']

// Lees een File als base64 data-URL
function leesAlsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({ naam: file.name, type: file.type, data: reader.result })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Bijlage-preview popup
function BijlagePreview({ bijlage, onClose }) {
  const isPdf = bijlage.type === 'application/pdf'
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{bijlage.naam}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ maxHeight: '75vh', overflow: 'auto', background: '#000' }}>
          {isPdf
            ? <iframe src={bijlage.data} style={{ width: '100%', height: '70vh', border: 'none' }} title={bijlage.naam} />
            : <img src={bijlage.data} alt={bijlage.naam} style={{ width: '100%', display: 'block' }} />
          }
        </div>
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <a href={bijlage.data} download={bijlage.naam} className="btn btn-secondary btn-sm">
            Downloaden
          </a>
        </div>
      </div>
    </div>
  )
}

function KostModal({ kost, onClose }) {
  const { addKost, updateKost } = useStore()
  const isEdit = !!kost?.id
  const fileInputRef = useRef()

  const [form, setForm] = useState(kost || {
    datum: new Date().toISOString().split('T')[0],
    omschrijving: '',
    categorie: 'overig',
    bedrag: '',
    btwBedrag: '',
    btwTarief: 21,
    land: 'Nederland',
    spreidenOverJaren: false,
    aantalJaren: 3,
    notities: '',
    afgetrokken: false,
    bijlagen: [],   // [{ naam, type, data }]
  })

  const [uploading, setUploading] = useState(false)

  const aftrekbaarBedrag = form.categorie === 'representatie'
    ? (parseFloat(form.bedrag) || 0) * 0.8
    : (parseFloat(form.bedrag) || 0)

  const jaarlijkPortie = form.spreidenOverJaren
    ? aftrekbaarBedrag / (parseInt(form.aantalJaren) || 1)
    : aftrekbaarBedrag

  const handleBijlage = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const nieuweB = await Promise.all(files.map(leesAlsBase64))
      setForm(f => ({ ...f, bijlagen: [...(f.bijlagen || []), ...nieuweB] }))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const verwijderBijlage = (i) =>
    setForm(f => ({ ...f, bijlagen: f.bijlagen.filter((_, j) => j !== i) }))

  const handleSubmit = () => {
    const data = { ...form, bedrag: parseFloat(form.bedrag) || 0, btwBedrag: parseFloat(form.btwBedrag) || 0, aftrekbaarBedrag, jaarlijkPortie }
    if (isEdit) updateKost(kost.id, data)
    else addKost(data)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Kost bewerken' : 'Kost toevoegen'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-grid">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Datum</label>
              <input className="form-input" type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Land</label>
              <select className="form-select" value={form.land} onChange={e => setForm({ ...form, land: e.target.value })}>
                {LANDEN.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Omschrijving</label>
            <input className="form-input" placeholder="bijv. Laptop voor administratie" value={form.omschrijving} onChange={e => setForm({ ...form, omschrijving: e.target.value })} />
          </div>

          <div className="form-group">
            <label>Categorie</label>
            <select className="form-select" value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
              {CATEGORIEEN.map(c => <option key={c.waarde} value={c.waarde}>{c.label}</option>)}
            </select>
          </div>

          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Bedrag (excl. BTW) €</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.bedrag} onChange={e => setForm({ ...form, bedrag: e.target.value })} />
            </div>
            <div className="form-group">
              <label>BTW bedrag €</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={form.btwBedrag} onChange={e => setForm({ ...form, btwBedrag: e.target.value })} />
            </div>
          </div>

          {form.categorie === 'representatie' && (
            <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 'var(--radius)', padding: '0.75rem', fontSize: '0.825rem', color: 'var(--yellow)', display: 'flex', gap: '0.5rem' }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Representatiekosten zijn voor 80% aftrekbaar. Aftrekbaar: <strong>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(aftrekbaarBedrag)}</strong></span>
            </div>
          )}

          {/* Afschrijving */}
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: form.spreidenOverJaren ? '0.75rem' : 0 }}>
              <input type="checkbox" id="spreiden" checked={form.spreidenOverJaren} onChange={e => setForm({ ...form, spreidenOverJaren: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <label htmlFor="spreiden" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, marginBottom: 0 }}>Afschrijven over meerdere jaren</label>
            </div>
            {form.spreidenOverJaren && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Aantal jaren afschrijving</label>
                  <select className="form-select" value={form.aantalJaren} onChange={e => setForm({ ...form, aantalJaren: e.target.value })}>
                    {[2, 3, 4, 5, 10].map(n => <option key={n} value={n}>{n} jaar</option>)}
                  </select>
                </div>
                <div style={{ background: 'var(--accent-dim)', borderRadius: 'var(--radius)', padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ color: 'var(--text2)' }}>Jaarlijks aftrekbaar</span>
                  <span className="mono text-accent" style={{ fontWeight: 600 }}>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(jaarlijkPortie)}/jaar</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Bijlagen ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 500 }}>
                Bijlagen — bonnetjes / facturen
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip size={13} /> {uploading ? 'Laden…' : 'Toevoegen'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleBijlage}
              />
            </div>

            {(form.bijlagen || []).length === 0 ? (
              <div
                style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius)', padding: '1.25rem', textAlign: 'center', color: 'var(--text3)', fontSize: '0.825rem', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={20} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
                Klik om een bonnetje of PDF toe te voegen
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {form.bijlagen.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem' }}>
                    <Paperclip size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.naam}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text3)', flexShrink: 0 }}>
                      {b.type === 'application/pdf' ? 'PDF' : 'Afbeelding'}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '0.15rem 0.3rem' }} onClick={() => verwijderBijlage(i)}>
                      <FileX size={13} style={{ color: 'var(--red)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notities</label>
            <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.notities} onChange={e => setForm({ ...form, notities: e.target.value })} />
          </div>

          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
            <input type="checkbox" id="afgetrokken" checked={form.afgetrokken} onChange={e => setForm({ ...form, afgetrokken: e.target.checked })} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <label htmlFor="afgetrokken" style={{ cursor: 'pointer', marginBottom: 0 }}>Al opgevoerd in belastingaangifte</label>
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

export default function Kosten() {
  const { kosten, updateKost, deleteKost } = useStore()
  const [modal, setModal]         = useState(null)
  const [preview, setPreview]     = useState(null)  // { bijlage }
  const [filterJaar, setFilterJaar] = useState(new Date().getFullYear())
  const [filterCat, setFilterCat]   = useState('alle')
  const [filterLand, setFilterLand] = useState('alle')

  const huidigJaar = new Date().getFullYear()
  const jaren = [...new Set(kosten.map(k => { try { return getYear(parseISO(k.datum)) } catch { return huidigJaar } }))].sort((a, b) => b - a)
  if (!jaren.includes(huidigJaar)) jaren.unshift(huidigJaar)

  const gefilterd = useMemo(() => {
    return kosten
      .filter(k => { try { return getYear(parseISO(k.datum)) === filterJaar } catch { return false } })
      .filter(k => filterCat  === 'alle' || k.categorie === filterCat)
      .filter(k => filterLand === 'alle' || k.land === filterLand)
      .sort((a, b) => new Date(b.datum) - new Date(a.datum))
  }, [kosten, filterJaar, filterCat, filterLand])

  const afschrijvingen = useMemo(() => {
    return kosten
      .filter(k => k.spreidenOverJaren)
      .map(k => {
        const startJaar = getYear(parseISO(k.datum))
        const eindJaar  = startJaar + parseInt(k.aantalJaren || 3) - 1
        const afschrijfJaren = []
        for (let j = startJaar; j <= eindJaar; j++) {
          afschrijfJaren.push({ jaar: j, bedrag: k.jaarlijkPortie || 0, reeds: j < huidigJaar })
        }
        return { ...k, afschrijfJaren }
      })
  }, [kosten, huidigJaar])

  const totaalBedrag     = gefilterd.reduce((s, k) => s + (k.bedrag || 0), 0)
  const totaalAftrekbaar = gefilterd.reduce((s, k) => s + (k.spreidenOverJaren ? (k.jaarlijkPortie || 0) : (k.aftrekbaarBedrag || k.bedrag || 0)), 0)
  const totaalBtw        = gefilterd.reduce((s, k) => s + (k.btwBedrag || 0), 0)

  const perCat = useMemo(() => {
    const map = {}
    gefilterd.forEach(k => {
      const cat = CATEGORIEEN.find(c => c.waarde === k.categorie)?.label || k.categorie
      if (!map[cat]) map[cat] = 0
      map[cat] += k.spreidenOverJaren ? (k.jaarlijkPortie || 0) : (k.aftrekbaarBedrag || k.bedrag || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [gefilterd])

  const fmtE = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Kosten & Aftrekposten</h2>
          <p>Aftrekbare bedrijfskosten NL en BE</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Kost toevoegen
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.5rem' }}>
        <div className="stat-card yellow">
          <div className="stat-label">Totaal kosten {filterJaar}</div>
          <div className="stat-value yellow mono">{fmtE(totaalBedrag)}</div>
          <div className="stat-sub">excl. BTW</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Aftrekbaar bedrag</div>
          <div className="stat-value green mono">{fmtE(totaalAftrekbaar)}</div>
          <div className="stat-sub">dit belastingjaar</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">BTW te vorderen</div>
          <div className="stat-value blue mono">{fmtE(totaalBtw)}</div>
          <div className="stat-sub">voorbelasting</div>
        </div>
      </div>

      {afschrijvingen.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📅 Afschrijvingsoverzicht meerdere jaren</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Omschrijving</th>
                  <th>Aanschaf</th>
                  <th>Totaal</th>
                  {[...Array(6)].map((_, i) => <th key={i}>{huidigJaar - 1 + i}</th>)}
                </tr>
              </thead>
              <tbody>
                {afschrijvingen.map(k => (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 500 }}>{k.omschrijving}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>{k.datum ? format(parseISO(k.datum), 'd MMM yyyy', { locale: nl }) : '—'}</td>
                    <td className="mono">{fmtE(k.bedrag)}</td>
                    {[...Array(6)].map((_, i) => {
                      const jaar  = huidigJaar - 1 + i
                      const portie = k.afschrijfJaren?.find(j => j.jaar === jaar)
                      return (
                        <td key={i} className="mono" style={{ fontSize: '0.8rem' }}>
                          {portie
                            ? <span style={{ color: portie.reeds ? 'var(--text3)' : jaar === huidigJaar ? 'var(--accent)' : 'var(--text2)' }}>
                                {portie.reeds ? '✓ ' : ''}{fmtE(portie.bedrag)}
                              </span>
                            : <span style={{ color: 'var(--text3)' }}>—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.75rem' }}>✓ = al afgetrokken · groen = huidig jaar · grijs = toekomstig</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 100 }} value={filterJaar} onChange={e => setFilterJaar(Number(e.target.value))}>
          {jaren.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select className="form-select" style={{ width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="alle">Alle categorieën</option>
          {CATEGORIEEN.map(c => <option key={c.waarde} value={c.waarde}>{c.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterLand} onChange={e => setFilterLand(e.target.value)}>
          <option value="alle">Alle landen</option>
          <option value="Nederland">Nederland</option>
          <option value="België">België</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: 0 }}>
          {gefilterd.length === 0 ? (
            <div className="empty-state"><Receipt /><p>Geen kosten gevonden</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Omschrijving</th>
                    <th>Categorie</th>
                    <th>Land</th>
                    <th>Bedrag</th>
                    <th>Aftrekbaar</th>
                    <th>Bijl.</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gefilterd.map(k => {
                    const aftrekbaar = k.spreidenOverJaren ? k.jaarlijkPortie : (k.aftrekbaarBedrag || k.bedrag)
                    const bijlagen   = k.bijlagen || []
                    return (
                      <tr key={k.id}>
                        <td style={{ color: 'var(--text2)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {k.datum ? format(parseISO(k.datum), 'd MMM yy', { locale: nl }) : '—'}
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {k.omschrijving}
                          {k.spreidenOverJaren && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--blue)', background: 'var(--blue-dim)', borderRadius: 4, padding: '1px 5px' }}>{k.aantalJaren}j</span>}
                        </td>
                        <td><span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{CATEGORIEEN.find(c => c.waarde === k.categorie)?.label || k.categorie}</span></td>
                        <td><span className={`badge ${k.land === 'Nederland' ? 'badge-blue' : k.land === 'België' ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>{k.land}</span></td>
                        <td className="mono" style={{ fontSize: '0.825rem' }}>{fmtE(k.bedrag)}</td>
                        <td className="mono text-accent" style={{ fontSize: '0.825rem' }}>{fmtE(aftrekbaar)}</td>
                        <td>
                          {bijlagen.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                              {bijlagen.map((b, i) => (
                                <button
                                  key={i}
                                  className="btn btn-ghost btn-sm"
                                  title={b.naam}
                                  style={{ padding: '0.2rem 0.35rem' }}
                                  onClick={() => setPreview(b)}
                                >
                                  <Eye size={13} style={{ color: 'var(--accent)' }} />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${k.afgetrokken ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>
                            {k.afgetrokken ? 'Opgevoerd' : 'Open'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal(k)}><Pencil size={13} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteKost(k.id)}><Trash2 size={13} style={{ color: 'var(--red)' }} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>Per categorie</h3>
          {perCat.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: '0.825rem' }}>Geen data</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {perCat.map(([cat, bedrag]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text2)' }}>{cat}</span>
                    <span className="mono">{fmtE(bedrag)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(bedrag / totaalAftrekbaar) * 100}%`, background: 'var(--yellow)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal  !== null && <KostModal kost={modal.id ? modal : null} onClose={() => setModal(null)} />}
      {preview !== null && <BijlagePreview bijlage={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
