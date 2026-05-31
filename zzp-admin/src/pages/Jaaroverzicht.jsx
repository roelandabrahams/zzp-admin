import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { parseISO, getYear, format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Download, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const fmt = n => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

export default function Jaaroverzicht() {
  const store = useStore()
  const { facturen, kosten, uren, pensioen, ritten, settings } = store
  const [jaar, setJaar] = useState(new Date().getFullYear())

  const jaren = [...new Set([
    ...facturen.map(f => { try { return getYear(parseISO(f.datum)) } catch { return null } }),
  ].filter(Boolean))].sort((a,b)=>b-a)
  if (!jaren.includes(jaar)) jaren.unshift(jaar)

  const data = useMemo(() => {
    const fy = x => { try { return getYear(parseISO(x)) === jaar } catch { return false } }

    const jFacturen = facturen.filter(f => fy(f.datum))
    const jKosten   = kosten.filter(k => fy(k.datum))
    const jUren     = uren.filter(u => fy(u.datum))
    const jPensioen = pensioen.filter(p => fy(p.datum))
    const jRitten   = ritten.filter(r => fy(r.datum))

    const omzet         = jFacturen.reduce((s,f) => s+(f.bedragExBtw||0), 0)
    const btwOntvangen  = jFacturen.filter(f=>!f.btwVrijgesteld).reduce((s,f) => s+(f.btwBedrag||0), 0)
    const omzetVrij     = jFacturen.filter(f=>f.btwVrijgesteld).reduce((s,f) => s+(f.bedragExBtw||0), 0)
    const omzetBtw      = jFacturen.filter(f=>!f.btwVrijgesteld).reduce((s,f) => s+(f.bedragExBtw||0), 0)

    const kostenTotaal  = jKosten.reduce((s,k) => s+(k.bedrag||0), 0)
    const aftrekbaar    = jKosten.reduce((s,k) => s+(k.spreidenOverJaren?(k.jaarlijkPortie||0):(k.aftrekbaarBedrag||k.bedrag||0)), 0)
    const btwVorderen   = jKosten.reduce((s,k) => s+(k.btwBedrag||0), 0)

    const totaalUren    = jUren.reduce((s,u) => s+(u.uren||0), 0)
    const pensioenGestort = jPensioen.reduce((s,p) => s+(p.bedrag||0), 0)
    const totaalKm      = jRitten.reduce((s,r) => s+(r.totalKm||0), 0)
    const kmVergoeding  = totaalKm * (settings.kmVergoeding || 0.23)

    const winst         = omzet - aftrekbaar
    const zelfstandigenaftrek = 3750
    const mkbAftrek     = Math.round(Math.max(0, winst - zelfstandigenaftrek) * 0.1331)
    const belastbaarInkomen = Math.max(0, winst - zelfstandigenaftrek - mkbAftrek - pensioenGestort)

    const betaaldeFacturen  = jFacturen.filter(f=>f.status==='betaald').length
    const openFacturen      = jFacturen.filter(f=>f.status==='openstaand').length

    // Per maand
    const maanden = Array.from({length:12}, (_,i) => {
      const mFacturen = jFacturen.filter(f => { try { return parseISO(f.datum).getMonth()===i } catch { return false } })
      const mKosten   = jKosten.filter(k => { try { return parseISO(k.datum).getMonth()===i } catch { return false } })
      return {
        naam: ['Jan','Feb','Mrt','Apr','Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec'][i],
        omzet: mFacturen.reduce((s,f)=>s+(f.bedragExBtw||0),0),
        kosten: mKosten.reduce((s,k)=>s+(k.bedrag||0),0),
      }
    })

    return { omzet, btwOntvangen, omzetVrij, omzetBtw, kostenTotaal, aftrekbaar, btwVorderen, totaalUren, pensioenGestort, totaalKm, kmVergoeding, winst, belastbaarInkomen, betaaldeFacturen, openFacturen, maanden, jFacturen, jKosten }
  }, [facturen, kosten, uren, pensioen, ritten, jaar, settings])

  const exportPDF = () => {
    const doc = new jsPDF()
    const blauw = [79, 209, 160]

    doc.setFillColor(...blauw); doc.rect(0,0,210,3,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(30,37,53)
    doc.text(`Jaaroverzicht ${jaar}`, 20, 22)
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(90,97,119)
    doc.text(`${settings.naam || 'ZZP Administratie'} — Gegenereerd op ${format(new Date(),'d MMMM yyyy',{locale:nl})}`, 20, 30)

    // Financieel overzicht
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,37,53)
    doc.text('Financieel Overzicht', 20, 44)
    doc.autoTable({
      startY: 48,
      head: [['Post', 'Bedrag']],
      body: [
        ['Totale omzet (excl. BTW)', fmt(data.omzet)],
        ['  waarvan vrijgesteld (medische diensten)', fmt(data.omzetVrij)],
        ['  waarvan BTW-plichtig', fmt(data.omzetBtw)],
        ['BTW ontvangen', fmt(data.btwOntvangen)],
        ['BTW te vorderen op kosten', fmt(data.btwVorderen)],
        ['Totale kosten (excl. BTW)', fmt(data.kostenTotaal)],
        ['Aftrekbare kosten (dit jaar)', fmt(data.aftrekbaar)],
        ['Winst (omzet - aftrekbaar)', fmt(data.winst)],
        ['Zelfstandigenaftrek', `- ${fmt(3750)}`],
        ['MKB-winstvrijstelling (13,31%)', `- ${fmt(data.winst > 3750 ? Math.round((data.winst-3750)*0.1331) : 0)}`],
        ['Pensioen gestort (jaarruimte)', `- ${fmt(data.pensioenGestort)}`],
        ['Belastbaar inkomen (schatting)', fmt(data.belastbaarInkomen)],
      ],
      headStyles: { fillColor: blauw, textColor: [15,17,23], fontStyle:'bold', fontSize:9 },
      bodyStyles: { fontSize:9, textColor:[30,37,53] },
      columnStyles: { 1: { halign:'right', fontStyle:'bold' } },
      alternateRowStyles: { fillColor:[248,249,252] },
      margin: { left:18, right:18 },
    })

    const y2 = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,37,53)
    doc.text('Uren & Kilometers', 20, y2)
    doc.autoTable({
      startY: y2+4,
      head: [['Post', 'Waarde']],
      body: [
        ['Totaal gefactureerde uren', `${data.totaalUren.toFixed(1)} u`],
        ['Totaal gereden kilometers', `${data.totaalKm} km`],
        ['Kilometervergoeding (€0,23/km)', fmt(data.kmVergoeding)],
        ['Pensioen gestort', fmt(data.pensioenGestort)],
        ['Betaalde facturen', `${data.betaaldeFacturen}`],
        ['Openstaande facturen', `${data.openFacturen}`],
      ],
      headStyles: { fillColor: blauw, textColor:[15,17,23], fontStyle:'bold', fontSize:9 },
      bodyStyles: { fontSize:9, textColor:[30,37,53] },
      columnStyles: { 1: { halign:'right' } },
      alternateRowStyles: { fillColor:[248,249,252] },
      margin: { left:18, right:18 },
    })

    // Maandoverzicht
    const y3 = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,37,53)
    doc.text('Maandoverzicht', 20, y3)
    doc.autoTable({
      startY: y3+4,
      head: [['Maand', 'Omzet', 'Kosten', 'Resultaat']],
      body: data.maanden.map(m => [m.naam, fmt(m.omzet), fmt(m.kosten), fmt(m.omzet-m.kosten)]),
      headStyles: { fillColor: blauw, textColor:[15,17,23], fontStyle:'bold', fontSize:9 },
      bodyStyles: { fontSize:9, textColor:[30,37,53] },
      columnStyles: { 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'} },
      footStyles: { fillColor:[240,250,246], fontStyle:'bold', fontSize:9 },
      foot: [['Totaal', fmt(data.omzet), fmt(data.kostenTotaal), fmt(data.omzet-data.kostenTotaal)]],
      alternateRowStyles: { fillColor:[248,249,252] },
      margin: { left:18, right:18 },
    })

    doc.setFont('helvetica','italic'); doc.setFontSize(8); doc.setTextColor(160,167,183)
    const pageH = doc.internal.pageSize.height
    doc.text('Dit overzicht is indicatief. Laat uw aangifte controleren door een belastingadviseur.', 18, pageH-10)

    doc.save(`jaaroverzicht-${jaar}.pdf`)
  }

  const exportCSV = () => {
    const rows = [
      [`Jaaroverzicht ${jaar} — ${settings.naam}`],
      [],
      ['OMZET'],
      ['Totale omzet excl. BTW', data.omzet],
      ['Vrijgestelde omzet (medisch)', data.omzetVrij],
      ['BTW-plichtige omzet', data.omzetBtw],
      ['BTW ontvangen', data.btwOntvangen],
      [],
      ['KOSTEN'],
      ['Totale kosten', data.kostenTotaal],
      ['Aftrekbaar dit jaar', data.aftrekbaar],
      ['BTW te vorderen', data.btwVorderen],
      [],
      ['RESULTAAT'],
      ['Winst (omzet - aftrekbaar)', data.winst],
      ['Belastbaar inkomen (schatting)', data.belastbaarInkomen],
      ['Pensioen gestort', data.pensioenGestort],
      [],
      ['OVERIG'],
      ['Totaal uren', data.totaalUren],
      ['Totaal km', data.totaalKm],
      ['Kilometervergoeding', data.kmVergoeding],
      [],
      ['MAANDOVERZICHT'],
      ['Maand','Omzet','Kosten','Resultaat'],
      ...data.maanden.map(m => [m.naam, m.omzet.toFixed(2), m.kosten.toFixed(2), (m.omzet-m.kosten).toFixed(2)]),
    ]
    const blob = new Blob([rows.map(r=>Array.isArray(r)?r.join(';'):r).join('\n')], { type:'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `jaaroverzicht-${jaar}.csv`; a.click()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Jaaroverzicht</h2>
          <p>Volledig financieel overzicht voor accountant</p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <select className="form-select" style={{ width:100 }} value={jaar} onChange={e => setJaar(Number(e.target.value))}>
            {jaren.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={16}/> CSV</button>
          <button className="btn btn-primary" onClick={exportPDF}><FileText size={16}/> PDF</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom:'1.5rem' }}>
        <div className="stat-card green"><div className="stat-label">Omzet {jaar}</div><div className="stat-value green mono">{fmt(data.omzet)}</div><div className="stat-sub">excl. BTW</div></div>
        <div className="stat-card yellow"><div className="stat-label">Aftrekbare kosten</div><div className="stat-value yellow mono">{fmt(data.aftrekbaar)}</div><div className="stat-sub">dit belastingjaar</div></div>
        <div className="stat-card blue"><div className="stat-label">Winst</div><div className="stat-value blue mono">{fmt(data.winst)}</div><div className="stat-sub">omzet - kosten</div></div>
        <div className="stat-card"><div className="stat-label">Belastbaar inkomen</div><div className="stat-value mono">{fmt(data.belastbaarInkomen)}</div><div className="stat-sub">na aftrekposten (schatting)</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>Omzet & BTW</h3>
          {[
            ['Totale omzet', fmt(data.omzet), 'var(--text)'],
            ['→ Vrijgesteld (medisch)', fmt(data.omzetVrij), 'var(--accent)'],
            ['→ BTW-plichtig', fmt(data.omzetBtw), 'var(--blue)'],
            ['BTW ontvangen', fmt(data.btwOntvangen), 'var(--yellow)'],
            ['BTW te vorderen op kosten', fmt(data.btwVorderen), 'var(--accent)'],
            ['Saldo BTW', fmt(data.btwOntvangen - data.btwVorderen), data.btwOntvangen-data.btwVorderen >= 0 ? 'var(--red)' : 'var(--accent)'],
          ].map(([l,v,c],i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.875rem' }}>
              <span style={{ color:'var(--text2)' }}>{l}</span>
              <span className="mono" style={{ color:c, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom:'1rem' }}>Kosten & Pensioen</h3>
          {[
            ['Totale kosten', fmt(data.kostenTotaal), 'var(--yellow)'],
            ['Aftrekbaar dit jaar', fmt(data.aftrekbaar), 'var(--text)'],
            ['Kilometervergoeding', fmt(data.kmVergoeding), 'var(--text2)'],
            ['Totaal km', `${data.totaalKm} km`, 'var(--text2)'],
            ['Totaal uren', `${data.totaalUren.toFixed(1)} u`, 'var(--text2)'],
            ['Pensioen gestort', fmt(data.pensioenGestort), 'var(--accent)'],
          ].map(([l,v,c],i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.875rem' }}>
              <span style={{ color:'var(--text2)' }}>{l}</span>
              <span className="mono" style={{ color:c, fontWeight:600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom:'1rem' }}>Maandoverzicht {jaar}</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Maand</th><th style={{ textAlign:'right' }}>Omzet</th><th style={{ textAlign:'right' }}>Kosten</th><th style={{ textAlign:'right' }}>Resultaat</th></tr></thead>
            <tbody>
              {data.maanden.map((m,i) => (
                <tr key={i}>
                  <td>{m.naam}</td>
                  <td className="mono" style={{ textAlign:'right', color:'var(--accent)' }}>{m.omzet > 0 ? fmt(m.omzet) : '—'}</td>
                  <td className="mono" style={{ textAlign:'right', color:'var(--yellow)' }}>{m.kosten > 0 ? fmt(m.kosten) : '—'}</td>
                  <td className="mono" style={{ textAlign:'right', color: m.omzet-m.kosten >= 0 ? 'var(--accent)':'var(--red)', fontWeight:600 }}>{m.omzet > 0 || m.kosten > 0 ? fmt(m.omzet-m.kosten) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid var(--border)' }}>
                <td style={{ fontWeight:600, padding:'0.85rem 1rem' }}>Totaal</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color:'var(--accent)', padding:'0.85rem 1rem' }}>{fmt(data.omzet)}</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color:'var(--yellow)', padding:'0.85rem 1rem' }}>{fmt(data.kostenTotaal)}</td>
                <td className="mono" style={{ textAlign:'right', fontWeight:700, color: data.omzet-data.kostenTotaal >= 0 ? 'var(--accent)':'var(--red)', padding:'0.85rem 1rem' }}>{fmt(data.omzet-data.kostenTotaal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
