import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { format, parseISO, getYear, getMonth, getDaysInMonth, startOfMonth, getDay, eachDayOfInterval, startOfYear, endOfYear, isSameDay } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, Trash2, Info, AlertTriangle, CheckCircle } from 'lucide-react'

const LANDEN = ['Nederland', 'België', 'Thuis (BE)', 'Vakantie', 'Cursus NL', 'Cursus BE', 'Anders']
const LAND_KLEUR = {
  'Nederland':   { bg:'var(--blue-dim)',   border:'var(--blue)',   text:'var(--blue)'   },
  'België':      { bg:'var(--yellow-dim)', border:'var(--yellow)', text:'var(--yellow)' },
  'Thuis (BE)':  { bg:'var(--yellow-dim)', border:'var(--yellow)', text:'var(--yellow)' },
  'Vakantie':    { bg:'var(--accent-dim)', border:'var(--accent)', text:'var(--accent)' },
  'Cursus NL':   { bg:'var(--blue-dim)',   border:'var(--blue)',   text:'var(--blue)'   },
  'Cursus BE':   { bg:'var(--yellow-dim)', border:'var(--yellow)', text:'var(--yellow)' },
  'Anders':      { bg:'var(--bg3)',        border:'var(--border)', text:'var(--text2)'  },
}
const isNL = l => ['Nederland','Cursus NL'].includes(l)

function DagModal({ datum, bestaand, onSave, onClose }) {
  const [land, setLand] = useState(bestaand?.land || 'Nederland')
  const [notitie, setNotitie] = useState(bestaand?.notitie || '')
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:380 }}>
        <div className="modal-header">
          <h3>{format(datum,'EEEE d MMMM yyyy',{locale:nl})}</h3>
        </div>
        <div className="form-grid" style={{ marginTop:'0.5rem' }}>
          <div className="form-group">
            <label>Werkland</label>
            <select className="form-select" value={land} onChange={e => setLand(e.target.value)}>
              {LANDEN.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Notitie (optioneel)</label>
            <input className="form-input" value={notitie} onChange={e => setNotitie(e.target.value)} placeholder="bijv. Praktijk de Wilgen" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={() => onSave({ datum: format(datum,'yyyy-MM-dd'), land, notitie })}>Opslaan</button>
        </div>
      </div>
    </div>
  )
}

export default function Dagen() {
  const { ritten } = useStore() // hergebruik voor context, maar dagen zijn eigen state via dagregistraties
  const [dagRegistraties, setDagRegistraties] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zzp-dagregistraties') || '[]') } catch { return [] }
  })
  const [jaar, setJaar] = useState(new Date().getFullYear())
  const [maand, setMaand] = useState(new Date().getMonth())
  const [dagModal, setDagModal] = useState(null) // Date object

  // Sla op in localStorage als fallback (dagen zitten niet in de store om de store simpel te houden)
  // In een echte situatie zou je dit in de store stoppen; hier is het een simpele lokale oplossing
  const slaOpDag = (dag) => {
    const bestaandIdx = dagRegistraties.findIndex(d => d.datum === dag.datum)
    let nieuw
    if (bestaandIdx >= 0) { nieuw = [...dagRegistraties]; nieuw[bestaandIdx] = dag }
    else nieuw = [...dagRegistraties, dag]
    setDagRegistraties(nieuw)
    try { localStorage.setItem('zzp-dagregistraties', JSON.stringify(nieuw)) } catch {}
    setDagModal(null)
  }

  const verwijderDag = (datum) => {
    const nieuw = dagRegistraties.filter(d => d.datum !== datum)
    setDagRegistraties(nieuw)
    try { localStorage.setItem('zzp-dagregistraties', JSON.stringify(nieuw)) } catch {}
  }

  const jaarRegistraties = useMemo(() =>
    dagRegistraties.filter(d => d.datum?.startsWith(String(jaar)))
  , [dagRegistraties, jaar])

  const aantalNL     = jaarRegistraties.filter(d => isNL(d.land)).length
  const aantalBE     = jaarRegistraties.filter(d => !isNL(d.land)).length
  const totaalDagen  = jaarRegistraties.length
  const grens183     = 183

  // Kalender voor geselecteerde maand
  const eersteVanMaand = new Date(jaar, maand, 1)
  const dagInWeek = (getDay(eersteVanMaand) + 6) % 7 // Ma=0
  const aantalDagen = getDaysInMonth(eersteVanMaand)
  const dagenInMaand = Array.from({ length: aantalDagen }, (_, i) => new Date(jaar, maand, i+1))

  const getDagReg = (d) => dagRegistraties.find(r => r.datum === format(d,'yyyy-MM-dd'))

  const maandNamen = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>183-Dagenkalender</h2>
          <p>Werkdagen NL vs België — belastingverdrag</p>
        </div>
      </div>

      <div style={{ background:'var(--blue-dim)', border:'1px solid var(--blue)', borderRadius:'var(--radius)', padding:'1rem', marginBottom:'1.5rem', display:'flex', gap:'0.75rem', fontSize:'0.825rem', color:'var(--blue)' }}>
        <Info size={18} style={{ flexShrink:0 }}/>
        <div>
          <strong>183-dagenregel:</strong> Als je meer dan 183 dagen per jaar <em>in Nederland werkt</em>, ben je voor die periode belastingplichtig in Nederland (wat al het geval is als ZZP). Als je méér dan 183 dagen <em>niet</em> in NL werkt, kan dit gevolgen hebben voor je sociale zekerheid (A1-verklaring). Klik op een dag om je werklocatie te registreren.
        </div>
      </div>

      {/* Status banner */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' }}>
        <div className="stat-card blue">
          <div className="stat-label">Dagen NL {jaar}</div>
          <div className="stat-value blue mono">{aantalNL}</div>
          <div className="stat-sub">van {totaalDagen} geregistreerd</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Dagen BE/overig</div>
          <div className="stat-value yellow mono">{aantalBE}</div>
          <div className="stat-sub">België + vakantie + anders</div>
        </div>
        <div className={`stat-card ${aantalNL >= grens183 ? 'green' : 'yellow'}`}>
          <div className="stat-label">183-dagengrens NL</div>
          <div className={`stat-value mono ${aantalNL >= grens183 ? 'green' : 'yellow'}`}>{aantalNL}/{grens183}</div>
          <div className="stat-sub">{aantalNL >= grens183 ? '✓ Boven drempel' : `Nog ${grens183-aantalNL} dagen`}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">NL aandeel</div>
          <div className="stat-value mono" style={{ color:'var(--text)' }}>{totaalDagen > 0 ? ((aantalNL/totaalDagen)*100).toFixed(0) : 0}%</div>
          <div className="stat-sub">van geregistreerde dagen</div>
        </div>
      </div>

      {/* A1-waarschuwing */}
      {aantalBE > 24 && aantalBE/(aantalNL||1) > 0.25 && (
        <div style={{ background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:'var(--radius)', padding:'0.875rem 1rem', marginBottom:'1.5rem', display:'flex', gap:'0.6rem', fontSize:'0.825rem', color:'var(--yellow)' }}>
          <AlertTriangle size={16} style={{ flexShrink:0 }}/>
          <span>Je werkt een aanzienlijk deel buiten Nederland. Controleer of je A1-verklaring (sociale zekerheid) nog klopt. Bij meer dan 25% thuiswerken/BE kan België sociale premies gaan heffen.</span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1.5rem' }}>
        {/* Kalender */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { if(maand===0){setMaand(11);setJaar(j=>j-1)}else setMaand(m=>m-1) }}>←</button>
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
              <select className="form-select" style={{ width:140 }} value={maand} onChange={e=>setMaand(Number(e.target.value))}>
                {maandNamen.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
              <select className="form-select" style={{ width:90 }} value={jaar} onChange={e=>setJaar(Number(e.target.value))}>
                {[jaar-1,jaar,jaar+1].map(j=><option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { if(maand===11){setMaand(0);setJaar(j=>j+1)}else setMaand(m=>m+1) }}>→</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px', marginBottom:'4px' }}>
            {['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:'0.7rem', fontWeight:600, color:'var(--text3)', padding:'0.25rem 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'3px' }}>
            {Array.from({length: dagInWeek}, (_,i) => <div key={`empty-${i}`}/>)}
            {dagenInMaand.map(dag => {
              const reg = getDagReg(dag)
              const isVandaag = isSameDay(dag, new Date())
              const kleur = reg ? LAND_KLEUR[reg.land] || LAND_KLEUR['Anders'] : null
              return (
                <div
                  key={dag.toISOString()}
                  onClick={() => setDagModal(dag)}
                  title={reg ? `${reg.land}${reg.notitie ? ' — '+reg.notitie : ''}` : 'Klik om te registreren'}
                  style={{
                    aspectRatio:'1',
                    borderRadius:6,
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    cursor:'pointer',
                    background: kleur ? kleur.bg : (isVandaag ? 'var(--bg3)' : 'transparent'),
                    border: `1px solid ${kleur ? kleur.border : (isVandaag ? 'var(--accent)' : 'var(--border)')}`,
                    transition:'var(--transition)',
                    fontSize:'0.75rem',
                    color: kleur ? kleur.text : (isVandaag ? 'var(--accent)' : 'var(--text2)'),
                    fontWeight: isVandaag ? 700 : 400,
                    position:'relative',
                  }}
                >
                  {dag.getDate()}
                  {reg && <div style={{ fontSize:'0.5rem', marginTop:1, lineHeight:1, opacity:0.8, textAlign:'center', maxWidth:'90%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {reg.land === 'Nederland' ? 'NL' : reg.land === 'Vakantie' ? '✈' : 'BE'}
                  </div>}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:'1rem', display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
            {Object.entries(LAND_KLEUR).map(([l,k]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.72rem', color:k.text }}>
                <div style={{ width:10, height:10, borderRadius:2, background:k.bg, border:`1px solid ${k.border}` }}/>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Rechterkolom: jaaroverzicht per maand */}
        <div className="card">
          <h3 style={{ marginBottom:'1rem', fontSize:'0.875rem' }}>Maandoverzicht {jaar}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
            {maandNamen.map((naam,i) => {
              const maandRegs = jaarRegistraties.filter(d => {
                try { return getMonth(parseISO(d.datum)) === i } catch { return false }
              })
              const nlDagen = maandRegs.filter(d => isNL(d.land)).length
              const beDagen = maandRegs.filter(d => !isNL(d.land)).length
              const totaal = maandRegs.length
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr 40px 40px', alignItems:'center', gap:'0.5rem', padding:'0.35rem 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onClick={() => { setMaand(i); setJaar(jaar) }}>
                  <span style={{ fontSize:'0.8rem', color:'var(--text2)' }}>{naam}</span>
                  <div style={{ display:'flex', height:8, borderRadius:4, overflow:'hidden', background:'var(--bg3)' }}>
                    {totaal > 0 && <>
                      <div style={{ width:`${(nlDagen/totaal)*100}%`, background:'var(--blue)' }}/>
                      <div style={{ width:`${(beDagen/totaal)*100}%`, background:'var(--yellow)' }}/>
                    </>}
                  </div>
                  <span className="mono" style={{ fontSize:'0.72rem', color:'var(--blue)', textAlign:'right' }}>{nlDagen}NL</span>
                  <span className="mono" style={{ fontSize:'0.72rem', color:'var(--yellow)', textAlign:'right' }}>{beDagen}BE</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:'0.3rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.825rem', fontWeight:600 }}>
              <span>Totaal NL</span><span className="mono" style={{ color:'var(--blue)' }}>{aantalNL} dagen</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.825rem', fontWeight:600 }}>
              <span>Totaal overig</span><span className="mono" style={{ color:'var(--yellow)' }}>{aantalBE} dagen</span>
            </div>
          </div>
        </div>
      </div>

      {dagModal && (
        <DagModal
          datum={dagModal}
          bestaand={getDagReg(dagModal)}
          onSave={slaOpDag}
          onClose={() => setDagModal(null)}
        />
      )}
    </div>
  )
}
