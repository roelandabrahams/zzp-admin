import { useState } from 'react'
import { useStore } from '../store'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Plus, FileDown, Pencil, Trash2, CheckCircle, Clock, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const fmt = (n) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n || 0)

const legeRegel = () => ({ omschrijving: '', uren: '', tarief: '', bedrag: 0 })

function FactuurModal({ factuur, onClose }) {
  const { addFactuur, updateFactuur, opdrachtgevers, settings } = useStore()
  const isEdit = !!factuur?.id

  const [form, setForm] = useState(factuur || {
    opdrachtgever: '',
    opdrachtgeverAdres: '',
    opdrachtgeverBtw: '',
    regels: [legeRegel()],
    betalingstermijn: 30,
    status: 'openstaand',
    notities: '',
    btwTarief: settings.btwtarief || 21,
  })

  const updateRegel = (i, field, val) => {
    const regels = [...form.regels]
    regels[i] = { ...regels[i], [field]: val }
    if (field === 'uren' || field === 'tarief') {
      regels[i].bedrag = (parseFloat(regels[i].uren) || 0) * (parseFloat(regels[i].tarief) || 0)
    }
    if (field === 'bedrag') regels[i].bedrag = parseFloat(val) || 0
    setForm({ ...form, regels })
  }

  const totaalEx = form.regels.reduce((s, r) => s + (parseFloat(r.bedrag) || 0), 0)
  const btwBedrag = totaalEx * (form.btwTarief / 100)
  const totaalInc = totaalEx + btwBedrag

  const handleSubmit = () => {
    const data = { ...form, bedragExBtw: totaalEx, btwBedrag, bedragIncBtw: totaalInc }
    if (isEdit) updateFactuur(factuur.id, data)
    else addFactuur(data)
    onClose()
  }

  const selectOG = (id) => {
    const og = opdrachtgevers.find(o => o.id === Number(id))
    if (og) setForm({ ...form, opdrachtgever: og.naam, opdrachtgeverAdres: og.adres || '', opdrachtgeverBtw: og.btwNummer || '', opdrachtgeverId: og.id })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h3>{isEdit ? 'Factuur bewerken' : 'Nieuwe factuur'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
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
              <label>Opdrachtgever naam *</label>
              <input className="form-input" value={form.opdrachtgever} onChange={e => setForm({ ...form, opdrachtgever: e.target.value })} />
            </div>
            <div className="form-group">
              <label>BTW-nummer opdrachtgever</label>
              <input className="form-input" value={form.opdrachtgeverBtw} onChange={e => setForm({ ...form, opdrachtgeverBtw: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label>Adres opdrachtgever</label>
            <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.opdrachtgeverAdres} onChange={e => setForm({ ...form, opdrachtgeverAdres: e.target.value })} />
          </div>
        </div>

        <div style={{ margin: '1.25rem 0 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Factuurregels</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, regels: [...form.regels, legeRegel()] })}>
            <Plus size={14} /> Regel toevoegen
          </button>
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>Omschrijving</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text3)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', width: 70 }}>Uren</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text3)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', width: 80 }}>Tarief</th>
                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text3)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', width: 90 }}>Bedrag</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.regels.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }} placeholder="Omschrijving dienst" value={r.omschrijving} onChange={e => updateRegel(i, 'omschrijving', e.target.value)} />
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', textAlign: 'right' }} type="number" placeholder="0" value={r.uren} onChange={e => updateRegel(i, 'uren', e.target.value)} />
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', textAlign: 'right' }} type="number" placeholder="0.00" value={r.tarief} onChange={e => updateRegel(i, 'tarief', e.target.value)} />
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem' }}>
                    <input className="form-input" style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }} type="number" value={r.bedrag || ''} onChange={e => updateRegel(i, 'bedrag', e.target.value)} />
                  </td>
                  <td style={{ padding: '0.4rem' }}>
                    {form.regels.length > 1 && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, regels: form.regels.filter((_, j) => j !== i) })}>
                        <X size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text2)' }}>Subtotaal</span>
              <span className="mono">{fmt(totaalEx)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.75rem', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text2)' }}>BTW</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <select className="form-select" style={{ width: 80, fontSize: '0.8rem', padding: '0.2rem 0.4rem' }} value={form.btwTarief} onChange={e => setForm({ ...form, btwTarief: Number(e.target.value) })}>
                  <option value={0}>0%</option>
                  <option value={9}>9%</option>
                  <option value={21}>21%</option>
                </select>
                <span className="mono">{fmt(btwBedrag)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
              <span>Totaal</span>
              <span className="mono text-accent">{fmt(totaalInc)}</span>
            </div>
          </div>
        </div>

        <div className="form-grid form-grid-2" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Betalingstermijn (dagen)</label>
            <input className="form-input" type="number" value={form.betalingstermijn} onChange={e => setForm({ ...form, betalingstermijn: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="openstaand">Openstaand</option>
              <option value="betaald">Betaald</option>
              <option value="concept">Concept</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label>Notities / betalingsinstructies</label>
          <textarea className="form-textarea" value={form.notities} onChange={e => setForm({ ...form, notities: e.target.value })} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.opdrachtgever}>
            {isEdit ? 'Opslaan' : 'Factuur aanmaken'}
          </button>
        </div>
      </div>
    </div>
  )
}

function genereerPDF(factuur, settings) {
  const doc = new jsPDF()
  const accentRGB = [79, 209, 160]

  // Header
  doc.setFillColor(...accentRGB)
  doc.rect(0, 0, 210, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(30, 37, 53)
  doc.text('FACTUUR', 20, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 97, 119)
  doc.text(factuur.nummer || '', 20, 32)

  // Afzender
  doc.setTextColor(30, 37, 53)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(settings.naam || 'Uw naam', 130, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 97, 119)
  const afzenderLines = [
    settings.adres,
    `${settings.postcode} ${settings.stad}`,
    settings.land,
    settings.email,
    settings.telefoon,
    `BTW: ${settings.btwNummer}`,
    settings.bigNummer ? `BIG: ${settings.bigNummer}` : null,
    settings.kvkNummer ? `KvK: ${settings.kvkNummer}` : null,
    `IBAN: ${settings.ibanNL || settings.ibanBE}`,
  ].filter(Boolean)
  afzenderLines.forEach((l, i) => doc.text(l, 130, 27 + i * 5))

  // Factuurinfo
  doc.setFillColor(240, 242, 248)
  doc.roundedRect(18, 42, 80, 28, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 37, 53)
  doc.text('FACTUURGEGEVENS', 23, 49)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 97, 119)
  const datum = factuur.datum ? format(parseISO(factuur.datum), 'd MMMM yyyy', { locale: nl }) : ''
  const vervaldatum = factuur.datum
    ? format(new Date(new Date(factuur.datum).getTime() + (factuur.betalingstermijn || 30) * 86400000), 'd MMMM yyyy', { locale: nl })
    : ''
  doc.text(`Datum: ${datum}`, 23, 56)
  doc.text(`Vervaldatum: ${vervaldatum}`, 23, 61)
  doc.text(`Betalingstermijn: ${factuur.betalingstermijn || 30} dagen`, 23, 66)

  // Ontvanger
  doc.setFillColor(240, 242, 248)
  doc.roundedRect(110, 42, 82, 28, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 37, 53)
  doc.text('FACTUUR VOOR', 115, 49)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90, 97, 119)
  doc.text(factuur.opdrachtgever || '', 115, 56)
  if (factuur.opdrachtgeverAdres) {
    const adresLines = doc.splitTextToSize(factuur.opdrachtgeverAdres, 72)
    adresLines.slice(0, 2).forEach((l, i) => doc.text(l, 115, 61 + i * 5))
  }
  if (factuur.opdrachtgeverBtw) doc.text(`BTW: ${factuur.opdrachtgeverBtw}`, 115, 66)

  // Regels
  const tableData = (factuur.regels || []).map(r => [
    r.omschrijving || '',
    r.uren ? r.uren.toString() : '',
    r.tarief ? fmt(r.tarief) : '',
    fmt(r.bedrag || 0),
  ])

  doc.autoTable({
    startY: 80,
    head: [['Omschrijving', 'Uren', 'Tarief', 'Bedrag']],
    body: tableData,
    headStyles: { fillColor: accentRGB, textColor: [15, 17, 23], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 37, 53] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 18, right: 18 },
  })

  const finalY = doc.lastAutoTable.finalY + 8

  // Totalen
  const totaalEx = factuur.bedragExBtw || 0
  const btwBedrag = factuur.btwBedrag || 0
  const totaalInc = factuur.bedragIncBtw || 0

  doc.setFontSize(9)
  doc.setTextColor(90, 97, 119)
  doc.text('Subtotaal (excl. BTW)', 130, finalY)
  doc.text(fmt(totaalEx), 192, finalY, { align: 'right' })

  doc.text(`BTW ${factuur.btwTarief || 21}%`, 130, finalY + 6)
  doc.text(fmt(btwBedrag), 192, finalY + 6, { align: 'right' })

  doc.setDrawColor(...accentRGB)
  doc.line(130, finalY + 10, 192, finalY + 10)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(79, 209, 160)
  doc.text('TOTAAL', 130, finalY + 17)
  doc.text(fmt(totaalInc), 192, finalY + 17, { align: 'right' })

  // Betaalinstructies
  if (settings.ibanNL || settings.ibanBE) {
    doc.setFillColor(240, 250, 246)
    doc.roundedRect(18, finalY + 25, 172, 18, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(90, 97, 119)
    doc.text(`Gelieve te betalen op ${settings.ibanNL || settings.ibanBE} t.n.v. ${settings.naam} o.v.v. ${factuur.nummer}`, 23, finalY + 33)
    if (settings.ibanBE && settings.ibanNL) doc.text(`Belgisch IBAN ook beschikbaar: ${settings.ibanBE}`, 23, finalY + 39)
  }

  if (factuur.notities) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(140, 147, 163)
    doc.text(factuur.notities, 18, finalY + 50)
  }

  doc.save(`${factuur.nummer || 'factuur'}.pdf`)
}

export default function Facturen() {
  const { facturen, updateFactuur, deleteFactuur } = useStore()
  const settings = useStore(s => s.settings)
  const [modal, setModal] = useState(null) // null | {} | factuur
  const [filter, setFilter] = useState('alle')
  const [zoek, setZoek] = useState('')

  const gefilterd = facturen
    .filter(f => filter === 'alle' || f.status === filter)
    .filter(f => !zoek || f.opdrachtgever?.toLowerCase().includes(zoek.toLowerCase()) || f.nummer?.includes(zoek))
    .sort((a, b) => new Date(b.datum) - new Date(a.datum))

  const totaalOmzet = gefilterd.reduce((s, f) => s + (f.bedragExBtw || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Facturen</h2>
          <p>{gefilterd.length} facturen — totaal {new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(totaalOmzet)} excl. BTW</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Nieuwe factuur
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="tabs" style={{ flex: '1', minWidth: 300 }}>
          {['alle', 'concept', 'openstaand', 'betaald'].map(s => (
            <button key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input className="form-input" style={{ width: 220 }} placeholder="Zoeken op naam / nummer…" value={zoek} onChange={e => setZoek(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {gefilterd.length === 0 ? (
          <div className="empty-state">
            <FileDown />
            <p>Geen facturen gevonden</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nummer</th>
                  <th>Opdrachtgever</th>
                  <th>Datum</th>
                  <th>Excl. BTW</th>
                  <th>BTW</th>
                  <th>Incl. BTW</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {gefilterd.map(f => (
                  <tr key={f.id}>
                    <td className="mono" style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{f.nummer}</td>
                    <td style={{ fontWeight: 500 }}>{f.opdrachtgever}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>
                      {f.datum ? format(parseISO(f.datum), 'd MMM yyyy', { locale: nl }) : '—'}
                    </td>
                    <td className="mono">{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(f.bedragExBtw || 0)}</td>
                    <td className="mono" style={{ color: 'var(--text2)' }}>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(f.btwBedrag || 0)}</td>
                    <td className="mono text-accent" style={{ fontWeight: 600 }}>{new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(f.bedragIncBtw || 0)}</td>
                    <td>
                      <span className={`badge ${f.status === 'betaald' ? 'badge-green' : f.status === 'concept' ? 'badge-gray' : 'badge-yellow'}`}>
                        {f.status?.charAt(0).toUpperCase() + f.status?.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {f.status !== 'betaald' && (
                          <button className="btn btn-ghost btn-sm" title="Markeer betaald" onClick={() => updateFactuur(f.id, { status: 'betaald' })}>
                            <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => genereerPDF(f, settings)}>
                          <FileDown size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(f)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Factuur verwijderen?') && deleteFactuur(f.id)}>
                          <Trash2 size={14} style={{ color: 'var(--red)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <FactuurModal factuur={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
