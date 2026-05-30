import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { parseISO, getYear, getQuarter } from 'date-fns'
import { Download, Info, ShieldCheck } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function BtwNL() {
  const { facturen, kosten } = useStore()
  const [jaar, setJaar]         = useState(new Date().getFullYear())
  const [kwartaal, setKwartaal] = useState(getQuarter(new Date()))

  const jaren = [...new Set([
    ...facturen.map(f => { try { return getYear(parseISO(f.datum)) } catch { return null } }),
    ...kosten.map(k  => { try { return getYear(parseISO(k.datum)) } catch { return null } }),
  ].filter(Boolean))].sort((a, b) => b - a)
  if (!jaren.includes(jaar)) jaren.unshift(jaar)

  const data = useMemo(() => {
    const filter = (d) => {
      try { const pd = parseISO(d); return getYear(pd) === jaar && getQuarter(pd) === kwartaal }
      catch { return false }
    }

    const kwFacturen = facturen.filter(f => filter(f.datum))
    const kwKosten   = kosten.filter(k => filter(k.datum) && (k.land === 'Nederland' || k.land === 'Beide'))

    // Vrijgestelde facturen (art. 11 lid 1g Wet OB — medische diensten)
    const vrijgesteld    = kwFacturen.filter(f => f.btwVrijgesteld)
    const omzetVrijgesteld = vrijgesteld.reduce((s, f) => s + (f.bedragExBtw || 0), 0)

    // BTW-plichtige facturen
    const plichtig       = kwFacturen.filter(f => !f.btwVrijgesteld)
    const omzet21        = plichtig.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const btw1a          = plichtig.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.btwBedrag   || 0), 0)
    const omzet9         = plichtig.filter(f => f.btwTarief === 9).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const btw1b          = plichtig.filter(f => f.btwTarief === 9).reduce((s, f) => s + (f.btwBedrag   || 0), 0)
    const omzet0         = plichtig.filter(f => f.btwTarief === 0).reduce((s, f) => s + (f.bedragExBtw || 0), 0)

    // Rubriek 5b — voorbelasting
    // Let op: bij VOLLEDIG vrijgestelde ondernemer geen recht op vooraftrek!
    // Als er ook plichtige omzet is: vooraftrek pro-rata
    const totaalOmzet    = omzet21 + omzet9 + omzet0 + omzetVrijgesteld
    const plichtigOmzet  = omzet21 + omzet9 + omzet0
    const proRata        = totaalOmzet > 0 ? plichtigOmzet / totaalOmzet : 0
    const voorbelastingRauw = kwKosten.reduce((s, k) => s + (k.btwBedrag || 0), 0)
    const voorbelasting  = Math.round(voorbelastingRauw * proRata * 100) / 100

    const totaalBtwVerschuldigd = btw1a + btw1b
    const teBetalenTerug        = totaalBtwVerschuldigd - voorbelasting

    return {
      omzet21, btw1a, omzet9, btw1b, omzet0,
      omzetVrijgesteld, aantalVrijgesteld: vrijgesteld.length, aantalPlichtig: plichtig.length,
      voorbelasting, voorbelastingRauw, proRata,
      totaalBtwVerschuldigd, teBetalenTerug,
      aantalFacturen: kwFacturen.length,
      volledigVrijgesteld: plichtigOmzet === 0 && omzetVrijgesteld > 0,
    }
  }, [facturen, kosten, jaar, kwartaal])

  const exportCSV = () => {
    const rows = [
      ['BTW Aangifte NL', `Q${kwartaal} ${jaar}`],
      [],
      ['Rubriek', 'Omschrijving', 'Grondslag', 'BTW'],
      ['1a',  'Leveringen/diensten hoog tarief 21%',    data.omzet21,           data.btw1a],
      ['1b',  'Leveringen/diensten laag tarief 9%',     data.omzet9,            data.btw1b],
      ['1c',  'Leveringen/diensten 0%',                 data.omzet0,            0],
      ['3a',  'Vrijgestelde prestaties (art. 11 Wet OB)', data.omzetVrijgesteld, 'n.v.t.'],
      ['5b',  `Voorbelasting (pro-rata ${Math.round(data.proRata * 100)}%)`, '', -data.voorbelasting],
      [],
      ['', 'BTW verschuldigd',   '', data.totaalBtwVerschuldigd],
      ['', 'Voorbelasting',      '', -data.voorbelasting],
      ['', data.teBetalenTerug >= 0 ? 'Te betalen' : 'Te ontvangen', '', Math.abs(data.teBetalenTerug)],
    ]
    const csv  = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `btw-aangifte-nl-Q${kwartaal}-${jaar}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>BTW Aangifte Nederland</h2>
          <p>Kwartaaloverzicht voor de Belastingdienst</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <Download size={16} /> Exporteer CSV
        </button>
      </div>

      {/* Uitlegblok vrijstelling */}
      <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--accent)' }}>
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>BTW-vrijstelling medische diensten</strong> — Als waarnemend huisarts vallen jouw diensten onder art. 11 lid 1g Wet OB 1968 (vrijgestelde prestaties). Zet bij het aanmaken van een factuur de schakelaar "BTW-vrijgesteld" aan. Vrijgestelde omzet verschijnt in rubriek 3a van de aangifte. Je hebt dan <strong>geen recht op vooraftrek</strong> van BTW op kosten. Als je naast vrijgestelde ook BTW-plichtige diensten levert, wordt de vooraftrek automatisch pro-rata berekend.
        </div>
      </div>

      {data.volledigVrijgesteld && (
        <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 'var(--radius)', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.825rem', color: 'var(--yellow)', display: 'flex', gap: '0.6rem' }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>Al jouw facturen dit kwartaal zijn vrijgesteld. Je hoeft mogelijk geen BTW-aangifte in te dienen — check dit met je belastingadviseur. Als je uitsluitend vrijgestelde prestaties levert, kun je je BTW-nummer laten intrekken.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ flex: 'none' }}>
          <label>Jaar</label>
          <select className="form-select" style={{ width: 100 }} value={jaar} onChange={e => setJaar(Number(e.target.value))}>
            {jaren.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 'none' }}>
          <label>Kwartaal</label>
          <select className="form-select" style={{ width: 130 }} value={kwartaal} onChange={e => setKwartaal(Number(e.target.value))}>
            <option value={1}>Q1 (jan–mrt)</option>
            <option value={2}>Q2 (apr–jun)</option>
            <option value={3}>Q3 (jul–sep)</option>
            <option value={4}>Q4 (okt–dec)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Aangifte Q{kwartaal} {jaar}</h3>

            {/* Vrijgestelde omzet — rubriek 3a */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', gap: '1rem', background: 'var(--accent-dim)', margin: '0 -0.1rem', borderRadius: 6, paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>Rubriek 3a</div>
              <div style={{ fontSize: '0.875rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
                  Vrijgestelde prestaties — art. 11 Wet OB (medische diensten)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{data.aantalVrijgesteld} facturen</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--accent)' }}>{fmt(data.omzetVrijgesteld)}</div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text3)' }}>n.v.t.</div>
            </div>

            {/* BTW-plichtige rubrieken */}
            {[
              { rubriek: '1a', label: 'Leveringen/diensten hoog tarief (21%)', grondslag: data.omzet21, btw: data.btw1a },
              { rubriek: '1b', label: 'Leveringen/diensten laag tarief (9%)',  grondslag: data.omzet9,  btw: data.btw1b },
              { rubriek: '1c', label: 'Leveringen/diensten 0% / overig',       grondslag: data.omzet0,  btw: null },
            ].map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>Rubriek {r.rubriek}</div>
                <div style={{ fontSize: '0.875rem' }}>
                  {r.label}
                  {i === 0 && data.aantalPlichtig > 0 && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text3)' }}>{data.aantalPlichtig} facturen</span>}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text2)' }}>{fmt(r.grondslag)}</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.btw !== null ? fmt(r.btw) : '—'}</div>
              </div>
            ))}

            {/* Voorbelasting */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>Rubriek 5b</div>
              <div style={{ fontSize: '0.875rem' }}>
                Voorbelasting (BTW op inkopen NL)
                {data.proRata < 1 && data.proRata > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--yellow)' }}>
                    Pro-rata {Math.round(data.proRata * 100)}% — ruw {fmt(data.voorbelastingRauw)}
                  </div>
                )}
                {data.volledigVrijgesteld && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--red)' }}>
                    Geen vooraftrek bij volledig vrijgestelde prestaties
                  </div>
                )}
              </div>
              <div></div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>- {fmt(data.voorbelasting)}</div>
            </div>

            {/* Totaal */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '1.25rem 0 0', gap: '1rem' }}>
              <div></div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {data.teBetalenTerug >= 0 ? '🔴 Te betalen aan Belastingdienst' : '🟢 Te ontvangen van Belastingdienst'}
              </div>
              <div></div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>
                {fmt(Math.abs(data.teBetalenTerug))}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.825rem', color: 'var(--accent)' }}>
            <strong>Indienen:</strong> BTW-aangifte voor Q{kwartaal} {jaar} moet uiterlijk ingediend en betaald zijn vóór {kwartaal === 1 ? '30 april' : kwartaal === 2 ? '31 juli' : kwartaal === 3 ? '31 oktober' : '31 januari'} {kwartaal === 4 ? jaar + 1 : jaar}. Log in op Mijn Belastingdienst Zakelijk.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="stat-card green">
            <div className="stat-label">Vrijgestelde omzet</div>
            <div className="stat-value green mono">{fmt(data.omzetVrijgesteld)}</div>
            <div className="stat-sub">{data.aantalVrijgesteld} facturen — geen BTW</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">BTW-plichtige omzet</div>
            <div className="stat-value blue mono">{fmt(data.omzet21 + data.omzet9 + data.omzet0)}</div>
            <div className="stat-sub">{data.aantalPlichtig} facturen</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Voorbelasting</div>
            <div className="stat-value yellow mono">{fmt(data.voorbelasting)}</div>
            <div className="stat-sub">
              {data.proRata < 1 ? `Pro-rata ${Math.round(data.proRata * 100)}%` : 'volledig aftrekbaar'}
            </div>
          </div>
          <div className="stat-card" style={{ borderTop: `2px solid ${data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)'}` }}>
            <div className="stat-label">{data.teBetalenTerug >= 0 ? 'Te betalen' : 'Te ontvangen'}</div>
            <div className="stat-value mono" style={{ color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>{fmt(Math.abs(data.teBetalenTerug))}</div>
            <div className="stat-sub">saldo kwartaal</div>
          </div>
          <div className="card-sm" style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text)' }}>BTW-vrijstelling instellen</p>
            <p>Ga naar <strong>Facturen</strong> → maak een nieuwe factuur aan → vink <strong>"BTW-vrijgesteld (art. 11)"</strong> aan. De factuur krijgt dan automatisch €0 BTW.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
