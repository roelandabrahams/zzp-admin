import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { parseISO, getYear, getQuarter } from 'date-fns'
import { Download, Info, CheckCircle } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function BtwNL() {
  const { facturen, kosten } = useStore()
  const [jaar, setJaar] = useState(new Date().getFullYear())
  const [kwartaal, setKwartaal] = useState(getQuarter(new Date()))

  const jaren = [...new Set([
    ...facturen.map(f => { try { return getYear(parseISO(f.datum)) } catch { return null } }),
    ...kosten.map(k => { try { return getYear(parseISO(k.datum)) } catch { return null } }),
  ].filter(Boolean))].sort((a, b) => b - a)
  if (!jaren.includes(jaar)) jaren.unshift(jaar)

  const data = useMemo(() => {
    const filter = (d) => {
      try {
        const pd = parseISO(d)
        return getYear(pd) === jaar && getQuarter(pd) === kwartaal
      } catch { return false }
    }

    const kwFacturen = facturen.filter(f => filter(f.datum))
    const kwKosten = kosten.filter(k => filter(k.datum) && (k.land === 'Nederland' || k.land === 'Beide'))

    // Rubriek 1a: leveringen/diensten belast met hoog tarief (21%)
    const omzet21 = kwFacturen.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const btw1a = kwFacturen.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.btwBedrag || 0), 0)

    // Rubriek 1b: laag tarief (9%)
    const omzet9 = kwFacturen.filter(f => f.btwTarief === 9).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const btw1b = kwFacturen.filter(f => f.btwTarief === 9).reduce((s, f) => s + (f.btwBedrag || 0), 0)

    // Rubriek 1c: overig / 0%
    const omzet0 = kwFacturen.filter(f => f.btwTarief === 0).reduce((s, f) => s + (f.bedragExBtw || 0), 0)

    // Rubriek 5b: voorbelasting (BTW op inkopen)
    const voorbelasting = kwKosten.reduce((s, k) => s + (k.btwBedrag || 0), 0)

    const totaalBtwVerschuldigd = btw1a + btw1b
    const teBetalenTerug = totaalBtwVerschuldigd - voorbelasting

    return { omzet21, btw1a, omzet9, btw1b, omzet0, voorbelasting, totaalBtwVerschuldigd, teBetalenTerug, aantalFacturen: kwFacturen.length }
  }, [facturen, kosten, jaar, kwartaal])

  const exportCSV = () => {
    const rows = [
      ['BTW Aangifte NL', `Q${kwartaal} ${jaar}`],
      [],
      ['Rubriek', 'Omschrijving', 'Grondslag', 'BTW'],
      ['1a', 'Leveringen/diensten hoog tarief 21%', data.omzet21, data.btw1a],
      ['1b', 'Leveringen/diensten laag tarief 9%', data.omzet9, data.btw1b],
      ['1c', 'Leveringen/diensten 0%', data.omzet0, 0],
      ['5b', 'Voorbelasting (inkopen)', '', -data.voorbelasting],
      [],
      ['', 'BTW verschuldigd', '', data.totaalBtwVerschuldigd],
      ['', 'Voorbelasting', '', -data.voorbelasting],
      ['', data.teBetalenTerug >= 0 ? 'Te betalen' : 'Te ontvangen', '', Math.abs(data.teBetalenTerug)],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `btw-aangifte-nl-Q${kwartaal}-${jaar}.csv`
    a.click()
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

      <div style={{ background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--blue)' }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Let op:</strong> Als ZZP-huisarts in NL vallen medische diensten mogelijk onder de BTW-vrijstelling (art. 11 lid 1g Wet OB 1968). Controleer met een Nederlandse belastingadviseur of jouw waarneemwerkzaamheden BTW-plichtig zijn. Dit overzicht gaat uit van BTW-plichtige prestaties.
        </div>
      </div>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { rubriek: '1a', label: 'Leveringen/diensten belast met hoog tarief (21%)', grondslag: data.omzet21, btw: data.btw1a },
                { rubriek: '1b', label: 'Leveringen/diensten belast met laag tarief (9%)', grondslag: data.omzet9, btw: data.btw1b },
                { rubriek: '1c', label: 'Leveringen/diensten belast met 0% / overig', grondslag: data.omzet0, btw: null },
              ].map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>Rubriek {r.rubriek}</div>
                  <div style={{ fontSize: '0.875rem' }}>{r.label}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text2)' }}>{fmt(r.grondslag)}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.btw !== null ? fmt(r.btw) : '—'}</div>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '0.9rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>Rubriek 5b</div>
                <div style={{ fontSize: '0.875rem' }}>Voorbelasting (BTW op inkopen NL)</div>
                <div></div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>- {fmt(data.voorbelasting)}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px 130px', alignItems: 'center', padding: '1.25rem 0 0', gap: '1rem' }}>
                <div></div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{data.teBetalenTerug >= 0 ? '🔴 Te betalen aan Belastingdienst' : '🟢 Te ontvangen van Belastingdienst'}</div>
                <div></div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>
                  {fmt(Math.abs(data.teBetalenTerug))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.825rem', color: 'var(--accent)' }}>
            <strong>Indienen:</strong> BTW-aangifte voor Q{kwartaal} {jaar} moet uiterlijk ingediend en betaald zijn vóór {kwartaal === 1 ? '30 april' : kwartaal === 2 ? '31 juli' : kwartaal === 3 ? '31 oktober' : '31 januari'} {kwartaal === 4 ? jaar + 1 : jaar}. Log in op Mijn Belastingdienst Zakelijk.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="stat-card green">
            <div className="stat-label">BTW verschuldigd</div>
            <div className="stat-value green mono">{fmt(data.totaalBtwVerschuldigd)}</div>
            <div className="stat-sub">ontvangen van klanten</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Voorbelasting</div>
            <div className="stat-value blue mono">{fmt(data.voorbelasting)}</div>
            <div className="stat-sub">betaald aan leveranciers</div>
          </div>
          <div className="stat-card" style={{ borderTop: `2px solid ${data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)'}` }}>
            <div className="stat-label">{data.teBetalenTerug >= 0 ? 'Te betalen' : 'Te ontvangen'}</div>
            <div className="stat-value mono" style={{ color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>{fmt(Math.abs(data.teBetalenTerug))}</div>
            <div className="stat-sub">saldo kwartaal</div>
          </div>
          <div className="card-sm">
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: '0.5rem' }}>Bron: {data.aantalFacturen} facturen dit kwartaal</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>Gebaseerd op factuurdatum (kasstelsel). Check met adviseur of factuurstelsel van toepassing is.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
