import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { parseISO, getYear } from 'date-fns'
import { Info, TrendingUp, AlertCircle } from 'lucide-react'

const fmt  = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)
const fmtP = n => `${n.toFixed(1)}%`

// NL IB 2025 tarieven box 1 (tot AOW-leeftijd)
function berekenIBNL(belastbaarInkomen) {
  if (belastbaarInkomen <= 0) return 0
  // Schijf 1: t/m €38.441 → 35,82%  (2025 indicatief)
  // Schijf 2: €38.441–€76.817 → 37,48%
  // Schijf 3: boven €76.817 → 49,50%
  const s1max = 38441, s2max = 76817
  let belasting = 0
  if (belastbaarInkomen > s2max) {
    belasting += (belastbaarInkomen - s2max) * 0.4950
    belasting += (s2max - s1max) * 0.3748
    belasting += s1max * 0.3582
  } else if (belastbaarInkomen > s1max) {
    belasting += (belastbaarInkomen - s1max) * 0.3748
    belasting += s1max * 0.3582
  } else {
    belasting += belastbaarInkomen * 0.3582
  }
  return Math.round(belasting)
}

// Arbeidskorting 2025 (indicatief)
function berekenArbeidskorting(inkomen) {
  if (inkomen < 11491) return Math.round(inkomen * 0.08231)
  if (inkomen < 24821) return Math.round(945 + (inkomen - 11491) * 0.32832)
  if (inkomen < 39958) return Math.round(5322 + (inkomen - 24821) * 0.02471)
  if (inkomen < 124935) return Math.round(5696 - (inkomen - 39958) * 0.06510)
  return 0
}

// Algemene heffingskorting 2025 (indicatief)
function berekenAHK(inkomen) {
  if (inkomen < 24813) return 3070
  if (inkomen < 75518) return Math.round(3070 - (inkomen - 24813) * 0.06095)
  return 0
}

export default function Belasting() {
  const { facturen, kosten, pensioen, settings } = useStore()
  const [jaar, setJaar] = useState(new Date().getFullYear())
  const [handmatigInkomen, setHandmatigInkomen] = useState('')
  const [handmatigKosten, setHandmatigKosten] = useState('')

  const jaren = [...new Set(facturen.map(f => { try { return getYear(parseISO(f.datum)) } catch { return null } }).filter(Boolean))].sort((a,b)=>b-a)
  if (!jaren.includes(jaar)) jaren.unshift(jaar)

  const berekening = useMemo(() => {
    const filterJaar = f => { try { return getYear(parseISO(f.datum)) === jaar } catch { return false } }

    const omzet = handmatigInkomen !== ''
      ? parseFloat(handmatigInkomen) || 0
      : facturen.filter(filterJaar).reduce((s,f) => s+(f.bedragExBtw||0), 0)

    const kostenTotaal = handmatigKosten !== ''
      ? parseFloat(handmatigKosten) || 0
      : kosten.filter(filterJaar).reduce((s,k) => s+(k.spreidenOverJaren?(k.jaarlijkPortie||0):(k.aftrekbaarBedrag||k.bedrag||0)), 0)

    const winst = Math.max(0, omzet - kostenTotaal)

    // NL aftrekposten ZZP
    const zelfstandigenaftrek  = 3750   // 2025
    const mkbWinstvrijstelling = 0.1331 // 13,31%
    const startersaftrek       = 0      // alleen eerste 3 jaar
    const pensioenJaar         = pensioen.filter(filterJaar).reduce((s,p) => s+(p.bedrag||0), 0)

    const grondslag1 = Math.max(0, winst - zelfstandigenaftrek - startersaftrek)
    const mkbAftrek  = Math.round(grondslag1 * mkbWinstvrijstelling)
    const grondslag2 = Math.max(0, grondslag1 - mkbAftrek)
    const grondslagNaPensioen = Math.max(0, grondslag2 - pensioenJaar)

    const ibBruto       = berekenIBNL(grondslagNaPensioen)
    const arbeidskorting = berekenArbeidskorting(winst)
    const ahk            = berekenAHK(grondslagNaPensioen)
    const ibNetto        = Math.max(0, ibBruto - arbeidskorting - ahk)

    // Effectief tarief
    const effectiefTarief = winst > 0 ? (ibNetto / winst) * 100 : 0

    // Netto over
    const nettoOver = winst - ibNetto - pensioenJaar - kostenTotaal

    // Belgische aangifte — buitenlands inkomen
    // Als grensarbeider: inkomen belast in NL, vrijgesteld in BE maar meetelt voor progressievoorbehoud
    // Belgische belasting = 0 op NL inkomen, maar kan gemeentebelasting beïnvloeden
    const gemeenteBelasting = Math.round(grondslagNaPensioen * 0.07) // ~7% indicatief

    return {
      omzet, kostenTotaal, winst,
      zelfstandigenaftrek, mkbAftrek, grondslag2, grondslagNaPensioen,
      pensioenJaar, ibBruto, arbeidskorting, ahk, ibNetto,
      effectiefTarief, nettoOver, gemeenteBelasting,
    }
  }, [facturen, kosten, pensioen, jaar, handmatigInkomen, handmatigKosten])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Belastingschatting</h2>
          <p>IB Nederland + Belgische grensarbeider situatie</p>
        </div>
      </div>

      <div style={{ background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:'var(--radius)', padding:'1rem', marginBottom:'1.5rem', display:'flex', gap:'0.75rem', fontSize:'0.825rem', color:'var(--yellow)' }}>
        <AlertCircle size={18} style={{ flexShrink:0 }}/>
        <div>
          <strong>Indicatieve schatting</strong> — Tarieven zijn gebaseerd op 2025. Dit is een hulpmiddel, geen officieel advies. Laat je aangifte altijd controleren door een belastingadviseur die bekend is met de NL/BE grensarbeiderssituatie.
        </div>
      </div>

      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap', alignItems:'flex-end' }}>
        <div className="form-group" style={{ flex:'none' }}>
          <label>Jaar</label>
          <select className="form-select" style={{ width:100 }} value={jaar} onChange={e => setJaar(Number(e.target.value))}>
            {jaren.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex:'none' }}>
          <label>Omzet handmatig invoeren (optioneel)</label>
          <input className="form-input" type="number" style={{ width:180 }} placeholder={`Automatisch: ${fmt(berekening.omzet)}`} value={handmatigInkomen} onChange={e => setHandmatigInkomen(e.target.value)} />
        </div>
        <div className="form-group" style={{ flex:'none' }}>
          <label>Kosten handmatig (optioneel)</label>
          <input className="form-input" type="number" style={{ width:180 }} placeholder={`Automatisch: ${fmt(berekening.kostenTotaal)}`} value={handmatigKosten} onChange={e => setHandmatigKosten(e.target.value)} />
        </div>
        {(handmatigInkomen||handmatigKosten) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setHandmatigInkomen(''); setHandmatigKosten('') }}>Reset</button>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        {/* NL berekening */}
        <div className="card">
          <h3 style={{ marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            🇳🇱 Inkomstenbelasting Nederland {jaar}
          </h3>
          {[
            { label:'Omzet uit onderneming',        waarde: berekening.omzet,             kleur:'var(--text)' },
            { label:'Aftrekbare kosten',             waarde:-berekening.kostenTotaal,      kleur:'var(--yellow)', prefix:'−' },
            { label:'Winst uit onderneming',         waarde: berekening.winst,             kleur:'var(--text)', vet:true },
            { label:`Zelfstandigenaftrek`,           waarde:-berekening.zelfstandigenaftrek, kleur:'var(--accent)', prefix:'−' },
            { label:`MKB-winstvrijstelling (13,31%)`, waarde:-berekening.mkbAftrek,        kleur:'var(--accent)', prefix:'−' },
            { label:`Jaarruimte pensioen gestort`,   waarde:-berekening.pensioenJaar,      kleur:'var(--accent)', prefix:'−' },
            { label:'Belastbaar inkomen box 1',      waarde: berekening.grondslagNaPensioen, kleur:'var(--text)', vet:true, lijn:true },
            { label:'IB berekend (schijven)',        waarde: berekening.ibBruto,           kleur:'var(--red)' },
            { label:'Arbeidskorting',                waarde:-berekening.arbeidskorting,    kleur:'var(--accent)', prefix:'−' },
            { label:'Algemene heffingskorting',      waarde:-berekening.ahk,               kleur:'var(--accent)', prefix:'−' },
            { label:'Te betalen IB (schatting)',     waarde: berekening.ibNetto,           kleur:'var(--red)', vet:true, lijn:true },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.55rem 0', borderTop: r.lijn ? '1px solid var(--border)':undefined, marginTop: r.lijn ? '0.4rem':undefined }}>
              <span style={{ fontSize:'0.875rem', color: r.vet?'var(--text)':'var(--text2)', fontWeight: r.vet?600:400 }}>{r.label}</span>
              <span className="mono" style={{ color:r.kleur, fontWeight: r.vet?700:500, fontSize: r.vet?'1rem':'0.875rem' }}>
                {r.waarde < 0 && !r.prefix ? '−' : r.prefix||''}{fmt(Math.abs(r.waarde))}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="stat-card red">
            <div className="stat-label">Te betalen IB NL</div>
            <div className="stat-value red mono">{fmt(berekening.ibNetto)}</div>
            <div className="stat-sub">schatting {jaar}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Effectief tarief</div>
            <div className="stat-value green mono">{fmtP(berekening.effectiefTarief)}</div>
            <div className="stat-sub">IB / winst</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Netto over</div>
            <div className="stat-value blue mono">{fmt(berekening.nettoOver)}</div>
            <div className="stat-sub">na IB + pensioen + kosten</div>
          </div>

          <div className="card-sm">
            <div style={{ fontWeight:600, marginBottom:'0.5rem', fontSize:'0.875rem' }}>🇧🇪 België — grensarbeider</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text2)', lineHeight:1.7 }}>
              <p>Jouw NL-inkomen is op basis van het belastingverdrag NL/BE <strong style={{ color:'var(--accent)' }}>belast in Nederland</strong>, niet in België.</p>
              <p style={{ marginTop:'0.5rem' }}>In je Belgische aangifte vermeld je het NL-inkomen als <strong>vrijgesteld inkomen met progressievoorbehoud</strong>. Dit kan je Belgische belasting op andere inkomsten licht verhogen.</p>
              <p style={{ marginTop:'0.5rem' }}>Gemeentebelasting (indicatief ~7%):<br/><strong style={{ color:'var(--yellow)', fontFamily:'var(--font-mono)' }}>{fmt(berekening.gemeenteBelasting)}</strong></p>
              <p style={{ marginTop:'0.5rem', color:'var(--text3)' }}>Laat dit jaarlijks bevestigen door een grensarbeiderspecialist.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Maandelijkse reservering */}
      <div className="card">
        <h3 style={{ marginBottom:'1rem' }}>💰 Maandelijkse reservering</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
          {[
            { label:'IB reservering/maand', bedrag: berekening.ibNetto/12, kleur:'var(--red)', tip:'Zet dit maandelijks apart op een spaarrekening' },
            { label:'Pensioen gestort/maand', bedrag: berekening.pensioenJaar/12, kleur:'var(--blue)', tip:'Huidig tempo pensioenopbouw' },
            { label:'Totaal reservering/maand', bedrag: (berekening.ibNetto+berekening.pensioenJaar)/12, kleur:'var(--yellow)', tip:'IB + pensioen samen' },
            { label:'Vrij besteedbaar/maand', bedrag: berekening.nettoOver/12, kleur:'var(--accent)', tip:'Na alle afdrachten en reserveringen' },
          ].map((r,i) => (
            <div key={i} style={{ background:'var(--bg3)', borderRadius:'var(--radius)', padding:'1rem', borderTop:`2px solid ${r.kleur}` }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'0.4rem' }}>{r.label}</div>
              <div className="mono" style={{ fontSize:'1.3rem', fontWeight:600, color:r.kleur }}>{fmt(r.bedrag)}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginTop:'0.3rem' }}>{r.tip}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
