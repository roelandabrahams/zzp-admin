import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { parseISO, getYear, getQuarter, getMonth } from 'date-fns'
import { Download, Info, AlertCircle } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function BtwBE() {
  const { facturen, kosten } = useStore()
  const [jaar, setJaar] = useState(new Date().getFullYear())
  const [periode, setPeriode] = useState('kwartaal')
  const [kwartaal, setKwartaal] = useState(getQuarter(new Date()))
  const [maand, setMaand] = useState(new Date().getMonth())

  const jaren = [...new Set([
    ...facturen.map(f => { try { return getYear(parseISO(f.datum)) } catch { return null } }),
    ...kosten.map(k => { try { return getYear(parseISO(k.datum)) } catch { return null } }),
  ].filter(Boolean))].sort((a, b) => b - a)
  if (!jaren.includes(jaar)) jaren.unshift(jaar)

  const data = useMemo(() => {
    const filter = (d) => {
      try {
        const pd = parseISO(d)
        if (getYear(pd) !== jaar) return false
        if (periode === 'kwartaal') return getQuarter(pd) === kwartaal
        return getMonth(pd) === maand
      } catch { return false }
    }

    // In België als grensarbeider: Belgisch werk -> mogelijk Belgische BTW
    // Maar als je enkel in NL werkt: Belgische BTW aangifte kan nihil zijn
    // We tonen kosten gemaakt in BE die aftrekbaar zijn

    const beKosten = kosten.filter(k => filter(k.datum) && (k.land === 'België' || k.land === 'Beide'))
    const beFacturen = facturen.filter(f => filter(f.datum)) // optioneel: als je ook BE klanten hebt

    // Rooster 03: Maatstaf van heffing (omzet BE)
    const omzet21 = beFacturen.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.bedragExBtw || 0), 0)
    const omzet6 = beFacturen.filter(f => f.btwTarief === 6).reduce((s, f) => s + (f.bedragExBtw || 0), 0)

    // Rooster 54: Verschuldigde BTW
    const btw21 = beFacturen.filter(f => (f.btwTarief || 21) === 21).reduce((s, f) => s + (f.btwBedrag || 0), 0)
    const btw6 = beFacturen.filter(f => f.btwTarief === 6).reduce((s, f) => s + (f.btwBedrag || 0), 0)

    // Rooster 59: Vooraftrek
    const vooraftrek = beKosten.reduce((s, k) => s + (k.btwBedrag || 0), 0)

    const verschuldigd = btw21 + btw6
    const teBetalenTerug = verschuldigd - vooraftrek

    return { omzet21, omzet6, btw21, btw6, vooraftrek, verschuldigd, teBetalenTerug, aantalKosten: beKosten.length, aantalFacturen: beFacturen.length }
  }, [facturen, kosten, jaar, periode, kwartaal, maand])

  const exportCSV = () => {
    const rows = [
      ['BTW Aangifte België', `${periode === 'kwartaal' ? `Q${kwartaal}` : `Maand ${maand + 1}`} ${jaar}`],
      [],
      ['Rooster', 'Omschrijving', 'Bedrag'],
      ['03', 'Maatstaf van heffing 21%', data.omzet21],
      ['01', 'Maatstaf van heffing 6%', data.omzet6],
      ['54', 'Verschuldigde BTW', data.verschuldigd],
      ['59', 'Aftrekbare voorbelasting', data.vooraftrek],
      ['71/72', data.teBetalenTerug >= 0 ? 'Te betalen (rooster 71)' : 'Te ontvangen (rooster 72)', Math.abs(data.teBetalenTerug)],
    ]
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `btw-aangifte-be-${periode === 'kwartaal' ? `Q${kwartaal}` : `M${maand + 1}`}-${jaar}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const maandNamen = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>BTW Aangifte België</h2>
          <p>Btw-aangifte voor de FOD Financiën (Intervat)</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <Download size={16} /> Exporteer CSV
        </button>
      </div>

      <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--yellow)' }}>
        <AlertCircle size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Grensarbeider situatie:</strong> Als je in België woont maar uitsluitend werkt voor Nederlandse opdrachtgevers, dan zijn je medische diensten doorgaans onderworpen aan <strong>Nederlandse BTW</strong>. Je Belgische BTW-aangifte kan dan nihil zijn voor omzet, maar je kunt wél Belgische BTW terugvorderen op Belgische aankopen. Laat dit bevestigen door een Belgische accountant.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 'none' }}>
          <label>Jaar</label>
          <select className="form-select" style={{ width: 100 }} value={jaar} onChange={e => setJaar(Number(e.target.value))}>
            {jaren.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 'none' }}>
          <label>Aangifte periode</label>
          <select className="form-select" style={{ width: 160 }} value={periode} onChange={e => setPeriode(e.target.value)}>
            <option value="kwartaal">Kwartaalaangifte</option>
            <option value="maand">Maandaangifte</option>
          </select>
        </div>
        {periode === 'kwartaal' ? (
          <div className="form-group" style={{ flex: 'none' }}>
            <label>Kwartaal</label>
            <select className="form-select" style={{ width: 130 }} value={kwartaal} onChange={e => setKwartaal(Number(e.target.value))}>
              <option value={1}>Q1 (jan–mrt)</option>
              <option value={2}>Q2 (apr–jun)</option>
              <option value={3}>Q3 (jul–sep)</option>
              <option value={4}>Q4 (okt–dec)</option>
            </select>
          </div>
        ) : (
          <div className="form-group" style={{ flex: 'none' }}>
            <label>Maand</label>
            <select className="form-select" style={{ width: 150 }} value={maand} onChange={e => setMaand(Number(e.target.value))}>
              {maandNamen.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>
              Aangifte {periode === 'kwartaal' ? `Q${kwartaal}` : maandNamen[maand]} {jaar}
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Afdeling 1 — Verschuldigde belasting
              </div>
              {[
                { rooster: '03', label: 'Maatstaf van heffing — 21%', bedrag: data.omzet21, isBtw: false },
                { rooster: '54', label: 'BTW 21% verschuldigd', bedrag: data.btw21, isBtw: true },
                { rooster: '01', label: 'Maatstaf van heffing — 6%', bedrag: data.omzet6, isBtw: false },
                { rooster: '56', label: 'BTW 6% verschuldigd', bedrag: data.btw6, isBtw: true },
              ].map(r => (
                <div key={r.rooster} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px', gap: '1rem', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg3)', padding: '0.2rem 0.5rem', borderRadius: 4, textAlign: 'center', color: 'var(--text2)' }}>{r.rooster}</div>
                  <div style={{ fontSize: '0.875rem' }}>{r.label}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: r.isBtw ? 600 : 400, color: r.isBtw ? 'var(--text)' : 'var(--text2)' }}>{fmt(r.bedrag)}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Afdeling 2 — Aftrekbare belasting
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px', gap: '1rem', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'var(--bg3)', padding: '0.2rem 0.5rem', borderRadius: 4, textAlign: 'center', color: 'var(--text2)' }}>59</div>
                <div style={{ fontSize: '0.875rem' }}>Aftrekbare voorbelasting (Belgische aankopen)</div>
                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>- {fmt(data.vooraftrek)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 130px', gap: '1rem', alignItems: 'center', padding: '1rem 0 0' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: data.teBetalenTerug >= 0 ? 'var(--red-dim)' : 'var(--accent-dim)', padding: '0.2rem 0.5rem', borderRadius: 4, textAlign: 'center', color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>
                {data.teBetalenTerug >= 0 ? '71' : '72'}
              </div>
              <div style={{ fontWeight: 600 }}>{data.teBetalenTerug >= 0 ? 'Te betalen aan FOD Financiën' : 'Krediet / terug te ontvangen'}</div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>
                {fmt(Math.abs(data.teBetalenTerug))}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.825rem', color: 'var(--accent)' }}>
            <strong>Indienen via Intervat:</strong> Kwartaalaangiftes moeten ingediend zijn vóór de 20e van de maand volgend op het kwartaal. Login op intervat.minfinbe. Als je minder dan €2,5M omzet maakt, mag je kwartaalaangifte doen.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="stat-card green">
            <div className="stat-label">BE omzet</div>
            <div className="stat-value green mono">{fmt(data.omzet21 + data.omzet6)}</div>
            <div className="stat-sub">{data.aantalFacturen} facturen</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Vooraftrek</div>
            <div className="stat-value blue mono">{fmt(data.vooraftrek)}</div>
            <div className="stat-sub">{data.aantalKosten} Belgische kosten</div>
          </div>
          <div className="stat-card" style={{ borderTop: `2px solid ${data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)'}` }}>
            <div className="stat-label">{data.teBetalenTerug >= 0 ? 'Te betalen' : 'Te ontvangen'}</div>
            <div className="stat-value mono" style={{ color: data.teBetalenTerug >= 0 ? 'var(--red)' : 'var(--accent)' }}>{fmt(Math.abs(data.teBetalenTerug))}</div>
            <div className="stat-sub">saldo periode</div>
          </div>

          <div className="card-sm" style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text)' }}>Deadlines {new Date().getFullYear()}</p>
            {[
              { kw: 'Q1', deadline: '20 april' },
              { kw: 'Q2', deadline: '20 juli' },
              { kw: 'Q3', deadline: '20 oktober' },
              { kw: 'Q4', deadline: '20 januari' },
            ].map(d => (
              <div key={d.kw} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{d.kw}</span>
                <span className="mono">{d.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
