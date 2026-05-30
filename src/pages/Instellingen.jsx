import { useState } from 'react'
import { useStore } from '../store'
import { Save, Info } from 'lucide-react'

export default function Instellingen() {
  const { settings, updateSettings } = useStore()
  const [form, setForm] = useState({ ...settings })
  const [opgeslagen, setOpgeslagen] = useState(false)

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSave = () => {
    updateSettings(form)
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 2500)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Instellingen</h2>
          <p>Jouw gegevens worden op elke factuur getoond</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> {opgeslagen ? '✓ Opgeslagen' : 'Opslaan'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Persoonlijke gegevens</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Volledige naam</label>
              <input className="form-input" value={form.naam} onChange={f('naam')} placeholder="Dr. Voornaam Achternaam" />
            </div>
            <div className="form-group">
              <label>E-mailadres</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} />
            </div>
            <div className="form-group">
              <label>Telefoonnummer</label>
              <input className="form-input" value={form.telefoon} onChange={f('telefoon')} />
            </div>
            <div className="form-group">
              <label>Adres</label>
              <input className="form-input" value={form.adres} onChange={f('adres')} />
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Postcode</label>
                <input className="form-input" value={form.postcode} onChange={f('postcode')} />
              </div>
              <div className="form-group">
                <label>Stad</label>
                <input className="form-input" value={form.stad} onChange={f('stad')} />
              </div>
            </div>
            <div className="form-group">
              <label>Land (woonland)</label>
              <select className="form-select" value={form.land} onChange={f('land')}>
                <option>België</option>
                <option>Nederland</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Professionele nummers</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>BTW-nummer (NL)</label>
                <input className="form-input" value={form.btwNummer} onChange={f('btwNummer')} placeholder="NL000000000B01" />
              </div>
              <div className="form-group">
                <label>BIG-registratienummer</label>
                <input className="form-input" value={form.bigNummer} onChange={f('bigNummer')} placeholder="90000000" />
              </div>
              <div className="form-group">
                <label>KvK-nummer (NL)</label>
                <input className="form-input" value={form.kvkNummer} onChange={f('kvkNummer')} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.25rem' }}>Bankrekeningen</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>IBAN België (zakelijk)</label>
                <input className="form-input" value={form.ibanBE} onChange={f('ibanBE')} placeholder="BE00 0000 0000 0000" />
              </div>
              <div className="form-group">
                <label>IBAN Nederland (optioneel)</label>
                <input className="form-input" value={form.ibanNL} onChange={f('ibanNL')} placeholder="NL00 BANK 0000 0000 00" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Factuurinstellingen</h3>
          <div className="form-grid">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label>Factuurprefix</label>
                <input className="form-input" value={form.factuurPrefix} onChange={f('factuurPrefix')} placeholder="F" />
              </div>
              <div className="form-group">
                <label>Volgend volgnummer</label>
                <input className="form-input" type="number" value={form.volgnummer} onChange={f('volgnummer')} />
              </div>
            </div>
            <div className="form-group">
              <label>Standaard BTW-tarief (%)</label>
              <select className="form-select" value={form.btwtarief} onChange={f('btwtarief')}>
                <option value={0}>0%</option>
                <option value={9}>9%</option>
                <option value={21}>21%</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>Pensioeninstellingen</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Jaarruimte percentage (%)</label>
              <input className="form-input" type="number" step="0.1" value={form.jaarruimtePercentage} onChange={f('jaarruimtePercentage')} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Standaard 30% (2025). Raadpleeg belastingadviseur.</span>
            </div>
            <div className="form-group">
              <label>Pensioendoel (€)</label>
              <input className="form-input" type="number" value={form.pensioendoel} onChange={f('pensioendoel')} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 'var(--radius)', padding: '1rem', fontSize: '0.825rem', color: 'var(--blue)', display: 'flex', gap: '0.75rem' }}>
        <Info size={16} style={{ flexShrink: 0 }} />
        <div>
          <strong>Grensarbeider NL/BE:</strong> Controleer jaarlijks met een grensarbeiderspecialist (bijv. via het Belgisch-Nederlandse Grensinformatiespreekuur) of je sociale zekerheid, pensioenopbouw en belastingverdrag correct zijn ingericht. De 183-dagenregel en het Belgisch-Nederlands belastingverdrag zijn cruciaal voor jouw situatie.
        </div>
      </div>
    </div>
  )
}
