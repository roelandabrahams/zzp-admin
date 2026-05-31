import { useState } from 'react'
import { useStore } from '../store'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, FileText, ArrowRight, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const fmt = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)
const legeRegel = () => ({ omschrijving: '', uren: '', tarief: '', bedrag: 0 })

function OfferteModal({ offerte, onClose }) {
  const { addOfferte, updateOfferte, opdrachtgevers, settings } = useStore()
  const isEdit = !!offerte?.id
  const [form, setForm] = useState(offerte || {
    opdrachtgever: '', opdrachtgeverAdres: '', opdrachtgeverBtw: '',
    regels: [legeRegel()],
    geldigTot: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    btwVrijgesteld: true,
    btwTarief: 21,
    status: 'concept',
    notities: 'Deze offerte is geldig tot de hierboven vermelde datum.\n\nBij akkoord ontvangen wij graag een schriftelijke bevestiging.',
  })

  const updateRegel = (i, field, val) => {
    const regels = [...form.regels]
    regels[i] = { ...regels[i], [field]: val }
    if (field === 'uren' || field === 'tarief')
      regels[i].bedrag = (parseFloat(regels[i].uren)||0) * (parseFloat(regels[i].tarief)||0)
    if (field === 'bedrag') regels[i].bedrag = parseFloat(val)||0
    setForm({ ...form, regels })
  }

  const totaalEx  = form.regels.reduce((s,r) => s + (parseFloat(r.bedrag)||0), 0)
  const btwBedrag = form.btwVrijgesteld ? 0 : totaalEx * (form.btwTarief/100)
  const totaalInc = totaalEx + btwBedrag

  const handleSubmit = () => {
    const data = { ...form, bedragExBtw: totaalEx, btwBedrag, bedragIncBtw: totaalInc }
    if (isEdit) updateOfferte(offerte.id, data)
    else addOfferte(data)
    onClose()
  }

  const selectOG = id => {
    const og = opdrachtgevers.find(o => o.id === Number(id))
    if (og) setForm({ ...form, opdrachtgever: og.naam, opdrachtgeverAdres: og.adres||'', opdrachtgeverBtw: og.btwNummer||'' })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Offerte bewerken' : 'Nieuwe offerte'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="form-grid">
          {opdrachtgevers.length > 0 && (
            <div className="form-group">
              <label>Selecteer opdrachtgever</label>
              <select className="form-select" onChange={e => selectOG(e.target.value)} defaultValue="">
                <option value="">— kies uit lijst —</option>
                {opdrachtgevers.map(o => <option key={o.id} value={o.id}>{o.naam}</option>)}
              </select>
            </div>
          )}
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Opdrachtgever *</label>
              <input className="form-input" value={form.opdrachtgever} onChange={e => setForm({...form,opdrachtgever:e.target.value})} />
            </div>
            <div className="form-group">
              <label>Geldig tot</label>
              <input className="form-input" type="date" value={form.geldigTot} onChange={e => setForm({...form,geldigTot:e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label>Adres opdrachtgever</label>
            <textarea className="form-textarea" style={{ minHeight:56 }} value={form.opdrachtgeverAdres} onChange={e => setForm({...form,opdrachtgeverAdres:e.target.value})} />
          </div>
        </div>

        <div style={{ margin:'1.25rem 0 0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3>Regels</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setForm({...form, regels:[...form.regels,legeRegel()]})}>
            <Plus size={14}/> Regel toevoegen
          </button>
        </div>

        <div style={{ background:'var(--bg3)', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:'1rem' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.825rem' }}>
            <thead><tr>
              <th style={{ padding:'0.6rem 0.75rem', textAlign:'left', color:'var(--text3)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase' }}>Omschrijving</th>
              <th style={{ padding:'0.6rem 0.5rem', textAlign:'right', color:'var(--text3)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase', width:70 }}>Uren</th>
              <th style={{ padding:'0.6rem 0.5rem', textAlign:'right', color:'var(--text3)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase', width:80 }}>Tarief</th>
              <th style={{ padding:'0.6rem 0.5rem', textAlign:'right', color:'var(--text3)', fontWeight:600, fontSize:'0.72rem', textTransform:'uppercase', width:90 }}>Bedrag</th>
              <th style={{ width:36 }}></th>
            </tr></thead>
            <tbody>
              {form.regels.map((r,i) => (
                <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'0.4rem 0.5rem' }}><input className="form-input" style={{ fontSize:'0.8rem', padding:'0.3rem 0.5rem' }} placeholder="Omschrijving" value={r.omschrijving} onChange={e => updateRegel(i,'omschrijving',e.target.value)} /></td>
                  <td style={{ padding:'0.4rem 0.5rem' }}><input className="form-input" style={{ fontSize:'0.8rem', padding:'0.3rem 0.5rem', textAlign:'right' }} type="number" placeholder="0" value={r.uren} onChange={e => updateRegel(i,'uren',e.target.value)} /></td>
                  <td style={{ padding:'0.4rem 0.5rem' }}><input className="form-input" style={{ fontSize:'0.8rem', padding:'0.3rem 0.5rem', textAlign:'right' }} type="number" placeholder="0.00" value={r.tarief} onChange={e => updateRegel(i,'tarief',e.target.value)} /></td>
                  <td style={{ padding:'0.4rem 0.5rem' }}><input className="form-input" style={{ fontSize:'0.8rem', padding:'0.3rem 0.5rem', textAlign:'right', fontFamily:'var(--font-mono)' }} type="number" value={r.bedrag||''} onChange={e => updateRegel(i,'bedrag',e.target.value)} /></td>
                  <td style={{ padding:'0.4rem' }}>{form.regels.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => setForm({...form,regels:form.regels.filter((_,j)=>j!==i)})}><X size={13}/></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: form.btwVrijgesteld ? 'var(--accent-dim)' : 'var(--bg3)', border:`1px solid ${form.btwVrijgesteld ? 'var(--accent)' : 'var(--border)'}`, borderRadius:'var(--radius)', padding:'0.75rem 1rem', marginBottom:'0.75rem' }}>
          <div>
            <div style={{ fontWeight:600, fontSize:'0.875rem', color: form.btwVrijgesteld ? 'var(--accent)' : 'var(--text)' }}>BTW-vrijgesteld (art. 11 Wet OB)</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text3)', marginTop:'0.15rem' }}>{form.btwVrijgesteld ? 'Medische dienst — geen BTW' : 'BTW-plichtig'}</div>
          </div>
          <input type="checkbox" checked={form.btwVrijgesteld} onChange={e => setForm({...form,btwVrijgesteld:e.target.checked})} style={{ width:18, height:18, accentColor:'var(--accent)', cursor:'pointer' }} />
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
          <div style={{ background:'var(--bg3)', borderRadius:'var(--radius)', padding:'1rem 1.25rem', minWidth:220 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.825rem', marginBottom:'0.4rem' }}>
              <span style={{ color:'var(--text2)' }}>Subtotaal</span><span className="mono">{fmt(totaalEx)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.825rem', marginBottom:'0.75rem' }}>
              <span style={{ color:'var(--text2)' }}>BTW</span>
              <span className="mono" style={{ color: form.btwVrijgesteld ? 'var(--accent)' : 'var(--text)' }}>
                {form.btwVrijgesteld ? 'Vrijgesteld' : fmt(btwBedrag)}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, borderTop:'1px solid var(--border)', paddingTop:'0.5rem' }}>
              <span>Totaal</span><span className="mono text-accent">{fmt(totaalInc)}</span>
            </div>
          </div>
        </div>

        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label>Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
              <option value="concept">Concept</option>
              <option value="verzonden">Verzonden</option>
              <option value="akkoord">Akkoord</option>
              <option value="afgewezen">Afgewezen</option>
              <option value="omgezet">Omgezet naar factuur</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop:'0.75rem' }}>
          <label>Notities / voorwaarden</label>
          <textarea className="form-textarea" value={form.notities} onChange={e => setForm({...form,notities:e.target.value})} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.opdrachtgever}>
            {isEdit ? 'Opslaan' : 'Offerte aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}

function genereerOffertePDF(offerte, settings) {
  const doc = new jsPDF()
  doc.setFillColor(96, 152, 240)
  doc.rect(0, 0, 210, 3, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(30,37,53)
  doc.text('OFFERTE', 20, 25)
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(90,97,119)
  doc.text(offerte.nummer || '', 20, 32)
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(30,37,53)
  doc.text(settings.naam || '', 130, 20)
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(90,97,119)
  const lines = [settings.adres, `${settings.postcode} ${settings.stad}`, settings.land, settings.email, `BIG: ${settings.bigNummer}`].filter(Boolean)
  lines.forEach((l,i) => doc.text(l, 130, 27+i*5))
  doc.setFillColor(240,242,248)
  doc.roundedRect(18,42,80,22,3,3,'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,37,53)
  doc.text('OFFERTEGEGEVENS',23,49)
  doc.setFont('helvetica','normal'); doc.setTextColor(90,97,119)
  const d = offerte.datum ? format(parseISO(offerte.datum),'d MMMM yyyy',{locale:nl}) : ''
  const geld = offerte.geldigTot ? format(parseISO(offerte.geldigTot),'d MMMM yyyy',{locale:nl}) : ''
  doc.text(`Datum: ${d}`,23,55); doc.text(`Geldig tot: ${geld}`,23,60)
  doc.setFillColor(240,242,248); doc.roundedRect(110,42,82,22,3,3,'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,37,53); doc.text('VOOR',115,49)
  doc.setFont('helvetica','normal'); doc.setTextColor(90,97,119)
  doc.text(offerte.opdrachtgever||'',115,55)
  if (offerte.opdrachtgeverAdres) doc.splitTextToSize(offerte.opdrachtgeverAdres,72).slice(0,2).forEach((l,i)=>doc.text(l,115,60+i*5))
  doc.autoTable({ startY:74, head:[['Omschrijving','Uren','Tarief','Bedrag']], body:(offerte.regels||[]).map(r=>[r.omschrijving||'',r.uren||'',r.tarief?fmt(r.tarief):'',fmt(r.bedrag||0)]), headStyles:{fillColor:[96,152,240],textColor:[15,17,23],fontStyle:'bold',fontSize:9}, bodyStyles:{fontSize:9,textColor:[30,37,53]}, columnStyles:{1:{halign:'right'},2:{halign:'right'},3:{halign:'right'}}, alternateRowStyles:{fillColor:[248,249,252]}, margin:{left:18,right:18} })
  const y = doc.lastAutoTable.finalY + 8
  doc.setFontSize(9); doc.setTextColor(90,97,119)
  doc.text('Subtotaal (excl. BTW)',130,y); doc.text(fmt(offerte.bedragExBtw||0),192,y,{align:'right'})
  doc.text(offerte.btwVrijgesteld?'BTW (vrijgesteld art. 11)':`BTW ${offerte.btwTarief||21}%`,130,y+6)
  doc.text(offerte.btwVrijgesteld?'€ 0,00':fmt(offerte.btwBedrag||0),192,y+6,{align:'right'})
  doc.setDrawColor(96,152,240); doc.line(130,y+10,192,y+10)
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(96,152,240)
  doc.text('TOTAAL',130,y+17); doc.text(fmt(offerte.bedragIncBtw||0),192,y+17,{align:'right'})
  if (offerte.notities) { doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(140,147,163); doc.splitTextToSize(offerte.notities,172).forEach((l,i)=>doc.text(l,18,y+28+i*5)) }
  doc.save(`${offerte.nummer||'offerte'}.pdf`)
}

export default function Offertes() {
  const { offertes, updateOfferte, deleteOfferte, offerteNaarFactuur } = useStore()
  const settings = useStore(s => s.settings)
  const [modal, setModal] = useState(null)
  const [filter, setFilter] = useState('alle')

  const gefilterd = offertes
    .filter(o => filter==='alle' || o.status===filter)
    .sort((a,b) => new Date(b.datum)-new Date(a.datum))

  const STATUS = { concept:'badge-gray', verzonden:'badge-blue', akkoord:'badge-green', afgewezen:'badge-red', omgezet:'badge-yellow' }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Offertes</h2>
          <p>{offertes.length} offertes — {offertes.filter(o=>o.status==='akkoord').length} akkoord</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={16}/> Nieuwe offerte</button>
      </div>

      <div className="tabs" style={{ marginBottom:'1.5rem' }}>
        {['alle','concept','verzonden','akkoord','afgewezen','omgezet'].map(s => (
          <button key={s} className={`tab ${filter===s?'active':''}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        {gefilterd.length === 0 ? (
          <div className="empty-state"><FileText/><p>Geen offertes gevonden</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nummer</th><th>Opdrachtgever</th><th>Datum</th><th>Geldig tot</th><th>Bedrag</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {gefilterd.map(o => (
                  <tr key={o.id}>
                    <td className="mono" style={{ color:'var(--text2)', fontSize:'0.8rem' }}>{o.nummer}</td>
                    <td style={{ fontWeight:500 }}>{o.opdrachtgever}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.825rem' }}>{o.datum ? format(parseISO(o.datum),'d MMM yyyy',{locale:nl}) : '—'}</td>
                    <td style={{ color:'var(--text2)', fontSize:'0.825rem' }}>{o.geldigTot ? format(parseISO(o.geldigTot),'d MMM yyyy',{locale:nl}) : '—'}</td>
                    <td className="mono text-accent" style={{ fontWeight:600 }}>{fmt(o.bedragExBtw||0)}</td>
                    <td><span className={`badge ${STATUS[o.status]||'badge-gray'}`}>{o.status?.charAt(0).toUpperCase()+o.status?.slice(1)}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:'0.25rem' }}>
                        {o.status === 'akkoord' && (
                          <button className="btn btn-ghost btn-sm" title="Omzetten naar factuur" onClick={() => { if(confirm('Offerte omzetten naar factuur?')) offerteNaarFactuur(o.id) }}>
                            <ArrowRight size={14} style={{ color:'var(--accent)' }}/>
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => genereerOffertePDF(o, settings)}><Download size={14}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(o)}><Pencil size={14}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteOfferte(o.id)}><Trash2 size={14} style={{ color:'var(--red)' }}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal !== null && <OfferteModal offerte={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
