import { create } from 'zustand'

const initialSettings = {
  naam: '', adres: '', postcode: '', stad: '', land: 'België',
  email: '', telefoon: '', btwNummer: '', bigNummer: '',
  ibanBE: '', ibanNL: '', kvkNummer: '',
  volgnummer: 1, offerteVolgnummer: 1,
  factuurPrefix: 'F', offertePrefix: 'O',
  btwtarief: 21, jaarruimtePercentage: 30, pensioendoel: 500000,
  kmVergoeding: 0.23,
  geboortejaar: 1985,
}

const emptyState = {
  settings: initialSettings,
  facturen: [], uren: [], kosten: [], pensioen: [],
  opdrachtgevers: [], ritten: [], offertes: [], contracten: [],
}

let _fileHandle = null

async function writeToFile(handle, data) {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

function snapshot(state) {
  return {
    settings: state.settings, facturen: state.facturen, uren: state.uren,
    kosten: state.kosten, pensioen: state.pensioen, opdrachtgevers: state.opdrachtgevers,
    ritten: state.ritten, offertes: state.offertes, contracten: state.contracten,
    versie: 2, opgeslagenOp: new Date().toISOString(),
  }
}

export const useStore = create((set, get) => ({
  ...emptyState,
  fileHandle: null, bestandsnaam: null,
  opslagStatus: 'geen', foutmelding: null,

  _autosave: async () => {
    if (!_fileHandle) return
    set({ opslagStatus: 'bezig' })
    try { await writeToFile(_fileHandle, snapshot(get())); set({ opslagStatus: 'opgeslagen' }) }
    catch (e) { set({ opslagStatus: 'fout', foutmelding: e.message }) }
  },

  koppelBestand: async () => {
    if (!('showSaveFilePicker' in window)) { alert('Gebruik Chrome of Edge.'); return false }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'ZZP Admin Data', accept: { 'application/json': ['.json'] } }],
        excludeAcceptAllOption: true,
      })
      const file = await handle.getFile()
      const data = JSON.parse(await file.text())
      _fileHandle = handle
      set({
        settings: data.settings || initialSettings,
        facturen: data.facturen || [], uren: data.uren || [],
        kosten: data.kosten || [], pensioen: data.pensioen || [],
        opdrachtgevers: data.opdrachtgevers || [],
        ritten: data.ritten || [], offertes: data.offertes || [],
        contracten: data.contracten || [],
        fileHandle: handle, bestandsnaam: handle.name, opslagStatus: 'verbonden',
      })
      return true
    } catch (e) {
      if (e.name === 'AbortError') return false
      return get().nieuwBestand()
    }
  },

  nieuwBestand: async () => {
    if (!('showSaveFilePicker' in window)) return false
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `zzp-admin-${new Date().getFullYear()}.json`,
        types: [{ description: 'ZZP Admin Data', accept: { 'application/json': ['.json'] } }],
      })
      _fileHandle = handle
      await writeToFile(handle, snapshot(get()))
      set({ fileHandle: handle, bestandsnaam: handle.name, opslagStatus: 'opgeslagen' })
      return true
    } catch (e) {
      if (e.name !== 'AbortError') set({ opslagStatus: 'fout', foutmelding: e.message })
      return false
    }
  },

  losKoppelen: () => { _fileHandle = null; set({ fileHandle: null, bestandsnaam: null, opslagStatus: 'geen' }) },

  downloadBackup: () => {
    const blob = new Blob([JSON.stringify(snapshot(get()), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `zzp-admin-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  },

  importData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      set({
        settings: data.settings || initialSettings,
        facturen: data.facturen || [], uren: data.uren || [],
        kosten: data.kosten || [], pensioen: data.pensioen || [],
        opdrachtgevers: data.opdrachtgevers || [],
        ritten: data.ritten || [], offertes: data.offertes || [],
        contracten: data.contracten || [],
      })
      get()._autosave(); return true
    } catch { return false }
  },

  updateSettings: (data) => { set(s => ({ settings: { ...s.settings, ...data } })); get()._autosave() },

  // Facturen
  addFactuur: (f) => {
    const s = get().settings
    const nr = `${s.factuurPrefix}${new Date().getFullYear()}-${String(s.volgnummer).padStart(3,'0')}`
    set(st => ({ facturen: [...st.facturen, { ...f, id: Date.now(), nummer: nr, datum: new Date().toISOString() }], settings: { ...st.settings, volgnummer: st.settings.volgnummer + 1 } }))
    get()._autosave()
  },
  updateFactuur: (id, data) => { set(s => ({ facturen: s.facturen.map(f => f.id===id?{...f,...data}:f) })); get()._autosave() },
  deleteFactuur: (id) => { set(s => ({ facturen: s.facturen.filter(f => f.id!==id) })); get()._autosave() },

  // Uren
  addUren: (u) => { set(s => ({ uren: [...s.uren, { ...u, id: Date.now() }] })); get()._autosave() },
  updateUren: (id, data) => { set(s => ({ uren: s.uren.map(u => u.id===id?{...u,...data}:u) })); get()._autosave() },
  deleteUren: (id) => { set(s => ({ uren: s.uren.filter(u => u.id!==id) })); get()._autosave() },

  // Kosten
  addKost: (k) => { set(s => ({ kosten: [...s.kosten, { ...k, id: Date.now() }] })); get()._autosave() },
  updateKost: (id, data) => { set(s => ({ kosten: s.kosten.map(k => k.id===id?{...k,...data}:k) })); get()._autosave() },
  deleteKost: (id) => { set(s => ({ kosten: s.kosten.filter(k => k.id!==id) })); get()._autosave() },

  // Pensioen
  addPensioen: (p) => { set(s => ({ pensioen: [...s.pensioen, { ...p, id: Date.now() }] })); get()._autosave() },
  updatePensioen: (id, data) => { set(s => ({ pensioen: s.pensioen.map(p => p.id===id?{...p,...data}:p) })); get()._autosave() },
  deletePensioen: (id) => { set(s => ({ pensioen: s.pensioen.filter(p => p.id!==id) })); get()._autosave() },

  // Opdrachtgevers
  addOpdrachtgever: (o) => { set(s => ({ opdrachtgevers: [...s.opdrachtgevers, { ...o, id: Date.now() }] })); get()._autosave() },
  updateOpdrachtgever: (id, data) => { set(s => ({ opdrachtgevers: s.opdrachtgevers.map(o => o.id===id?{...o,...data}:o) })); get()._autosave() },
  deleteOpdrachtgever: (id) => { set(s => ({ opdrachtgevers: s.opdrachtgevers.filter(o => o.id!==id) })); get()._autosave() },

  // Ritten (kilometerregistratie)
  addRit: (r) => { set(s => ({ ritten: [...s.ritten, { ...r, id: Date.now() }] })); get()._autosave() },
  updateRit: (id, data) => { set(s => ({ ritten: s.ritten.map(r => r.id===id?{...r,...data}:r) })); get()._autosave() },
  deleteRit: (id) => { set(s => ({ ritten: s.ritten.filter(r => r.id!==id) })); get()._autosave() },

  // Offertes
  addOfferte: (o) => {
    const s = get().settings
    const nr = `${s.offertePrefix}${new Date().getFullYear()}-${String(s.offerteVolgnummer).padStart(3,'0')}`
    set(st => ({ offertes: [...st.offertes, { ...o, id: Date.now(), nummer: nr, datum: new Date().toISOString() }], settings: { ...st.settings, offerteVolgnummer: st.settings.offerteVolgnummer + 1 } }))
    get()._autosave()
  },
  updateOfferte: (id, data) => { set(s => ({ offertes: s.offertes.map(o => o.id===id?{...o,...data}:o) })); get()._autosave() },
  deleteOfferte: (id) => { set(s => ({ offertes: s.offertes.filter(o => o.id!==id) })); get()._autosave() },
  offerteNaarFactuur: (offerteId) => {
    const offerte = get().offertes.find(o => o.id === offerteId)
    if (!offerte) return
    get().addFactuur({ ...offerte, status: 'openstaand', btwVrijgesteld: offerte.btwVrijgesteld ?? true })
    get().updateOfferte(offerteId, { status: 'omgezet' })
  },

  // Contracten
  addContract: (c) => { set(s => ({ contracten: [...s.contracten, { ...c, id: Date.now() }] })); get()._autosave() },
  updateContract: (id, data) => { set(s => ({ contracten: s.contracten.map(c => c.id===id?{...c,...data}:c) })); get()._autosave() },
  deleteContract: (id) => { set(s => ({ contracten: s.contracten.filter(c => c.id!==id) })); get()._autosave() },
}))
