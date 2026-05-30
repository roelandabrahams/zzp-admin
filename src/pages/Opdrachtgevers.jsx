import { useState } from 'react'
import { useStore } from '../store'
import { Plus, Pencil, Trash2, X, Users } from 'lucide-react'

function OGModal({ og, onClose }) {
  const { addOpdrachtgever, updateOpdrachtgever } = useStore()
  const isEdit = !!og?.id
  const [form, setForm] = useState(og || {
    naam: '', contactpersoon: '', email: '', telefoon: '',
    adres: '', postcode: '', stad: '', land: 'Nederland',
    btwNummer: '', kvkNummer: '', notities: '',
  })

  const f = (k) => (v) => setForm({ ...form, [k]: v.target.value })

  const handleSubmit = () => {
    if (isEdit) updateOpdrachtgever(og.id, form)
    else addOpdrachtgever(form)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{isEdit ? 'Opdrachtgever bewerken' : 'Opdrachtgever toevoegen'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Naam praktijk / organisatie *</label>
            <input className="form-input" value={form.naam} onChange={f('naam')} placeholder="bijv. Huisartsenpraktijk De Wilgen" />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>Contactpersoon</label>
              <input className="form-input" value={form.contactpersoon} onChange={f('contactpersoon')} />
            </div>
            <div className="form-group">
              <label>Land</label>
              <select className="form-select" value={form.land} onChange={f('land')}>
                <option>Nederland</option>
                <option>België</option>
              </select>
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={f('email')} />
            </div>
            <div className="form-group">
              <label>Telefoon</label>
              <input className="form-input" value={form.telefoon} onChange={f('telefoon')} />
            </div>
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
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label>BTW-nummer</label>
              <input className="form-input" value={form.btwNummer} onChange={f('btwNummer')} />
            </div>
            <div className="form-group">
              <label>KvK-nummer</label>
              <input className="form-input" value={form.kvkNummer} onChange={f('kvkNummer')} />
            </div>
          </div>
          <div className="form-group">
            <label>Notities</label>
            <textarea className="form-textarea" value={form.notities} onChange={f('notities')} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.naam}>Opslaan</button>
        </div>
      </div>
    </div>
  )
}

export default function Opdrachtgevers() {
  const { opdrachtgevers, deleteOpdrachtgever } = useStore()
  const [modal, setModal] = useState(null)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Opdrachtgevers</h2>
          <p>{opdrachtgevers.length} opdrachtgevers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Toevoegen
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {opdrachtgevers.length === 0 ? (
          <div className="empty-state"><Users /><p>Nog geen opdrachtgevers toegevoegd</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Land</th>
                  <th>Contactpersoon</th>
                  <th>E-mail</th>
                  <th>BTW-nummer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opdrachtgevers.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.naam}</td>
                    <td><span className={`badge ${o.land === 'Nederland' ? 'badge-blue' : 'badge-yellow'}`}>{o.land}</span></td>
                    <td style={{ color: 'var(--text2)' }}>{o.contactpersoon || '—'}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.825rem' }}>{o.email || '—'}</td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{o.btwNummer || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(o)}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => confirm('Verwijderen?') && deleteOpdrachtgever(o.id)}><Trash2 size={14} style={{ color: 'var(--red)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && <OGModal og={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  )
}
