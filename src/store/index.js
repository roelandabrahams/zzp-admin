import { create } from 'zustand'

const initialSettings = {
  naam: '',
  adres: '',
  postcode: '',
  stad: '',
  land: 'België',
  email: '',
  telefoon: '',
  btwNummer: '',
  bigNummer: '',
  ibanBE: '',
  ibanNL: '',
  kvkNummer: '',
  volgnummer: 1,
  factuurPrefix: 'F',
  btwtarief: 21,
  jaarruimtePercentage: 30,
  pensioendoel: 500000,
}

const emptyState = {
  settings: initialSettings,
  facturen: [],
  uren: [],
  kosten: [],
  pensioen: [],
  opdrachtgevers: [],
}

// ─── File System Access API helpers ───────────────────────────────────────────

// We store the FileSystemFileHandle in memory (not serialisable to disk).
// The handle survives page navigation within the same tab, but NOT a full reload.
// On reload the user must re-open the same file – we then read it back automatically.
let _fileHandle = null   // FileSystemFileHandle | null

async function writeToFile(handle, data) {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

function snapshot(state) {
  return {
    settings:        state.settings,
    facturen:        state.facturen,
    uren:            state.uren,
    kosten:          state.kosten,
    pensioen:        state.pensioen,
    opdrachtgevers:  state.opdrachtgevers,
    versie:          1,
    opgeslagenOp:    new Date().toISOString(),
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create((set, get) => ({
  ...emptyState,

  // Status
  fileHandle:   null,   // we mirror _fileHandle here so components can react
  bestandsnaam: null,
  opslagStatus: 'geen', // 'geen' | 'verbonden' | 'bezig' | 'opgeslagen' | 'fout'
  foutmelding:  null,

  // ── Intern: sla op na elke mutatie ─────────────────────────────────────────
  _autosave: async () => {
    if (!_fileHandle) return
    set({ opslagStatus: 'bezig' })
    try {
      await writeToFile(_fileHandle, snapshot(get()))
      set({ opslagStatus: 'opgeslagen' })
    } catch (e) {
      set({ opslagStatus: 'fout', foutmelding: e.message })
    }
  },

  // ── Bestand koppelen (nieuw of bestaand) ────────────────────────────────────
  koppelBestand: async () => {
    if (!('showSaveFilePicker' in window)) {
      alert('Je browser ondersteunt de File System Access API niet. Gebruik Chrome of Edge.')
      return false
    }
    try {
      // Probeer eerst een bestaand bestand te openen
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'ZZP Admin Data', accept: { 'application/json': ['.json'] } }],
        excludeAcceptAllOption: true,
      })
      const file = await handle.getFile()
      const text = await file.text()
      const data = JSON.parse(text)
      _fileHandle = handle
      set({
        settings:        data.settings        || initialSettings,
        facturen:        data.facturen        || [],
        uren:            data.uren            || [],
        kosten:          data.kosten          || [],
        pensioen:        data.pensioen        || [],
        opdrachtgevers:  data.opdrachtgevers  || [],
        fileHandle:      handle,
        bestandsnaam:    handle.name,
        opslagStatus:    'verbonden',
      })
      return true
    } catch (e) {
      if (e.name === 'AbortError') return false  // gebruiker klikte Annuleren
      // Bestand bestaat nog niet → maak nieuw aan
      return get().nieuwBestand()
    }
  },

  // ── Nieuw bestand aanmaken ──────────────────────────────────────────────────
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

  // ── Bestand loskoppelen ─────────────────────────────────────────────────────
  losKoppelen: () => {
    _fileHandle = null
    set({ fileHandle: null, bestandsnaam: null, opslagStatus: 'geen' })
  },

  // ── Handmatige backup download (altijd beschikbaar) ─────────────────────────
  downloadBackup: () => {
    const data = snapshot(get())
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zzp-admin-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  // ─── Settings ───────────────────────────────────────────────────────────────
  updateSettings: (data) => {
    set((s) => ({ settings: { ...s.settings, ...data } }))
    get()._autosave()
  },

  // ─── Facturen ───────────────────────────────────────────────────────────────
  addFactuur: (f) => {
    const s = get().settings
    const nr = `${s.factuurPrefix}${new Date().getFullYear()}-${String(s.volgnummer).padStart(3, '0')}`
    set((st) => ({
      facturen: [...st.facturen, { ...f, id: Date.now(), nummer: nr, datum: new Date().toISOString() }],
      settings: { ...st.settings, volgnummer: st.settings.volgnummer + 1 },
    }))
    get()._autosave()
  },
  updateFactuur: (id, data) => {
    set((s) => ({ facturen: s.facturen.map((f) => (f.id === id ? { ...f, ...data } : f)) }))
    get()._autosave()
  },
  deleteFactuur: (id) => {
    set((s) => ({ facturen: s.facturen.filter((f) => f.id !== id) }))
    get()._autosave()
  },

  // ─── Uren ────────────────────────────────────────────────────────────────────
  addUren: (u) => {
    set((s) => ({ uren: [...s.uren, { ...u, id: Date.now() }] }))
    get()._autosave()
  },
  updateUren: (id, data) => {
    set((s) => ({ uren: s.uren.map((u) => (u.id === id ? { ...u, ...data } : u)) }))
    get()._autosave()
  },
  deleteUren: (id) => {
    set((s) => ({ uren: s.uren.filter((u) => u.id !== id) }))
    get()._autosave()
  },

  // ─── Kosten ──────────────────────────────────────────────────────────────────
  addKost: (k) => {
    set((s) => ({ kosten: [...s.kosten, { ...k, id: Date.now() }] }))
    get()._autosave()
  },
  updateKost: (id, data) => {
    set((s) => ({ kosten: s.kosten.map((k) => (k.id === id ? { ...k, ...data } : k)) }))
    get()._autosave()
  },
  deleteKost: (id) => {
    set((s) => ({ kosten: s.kosten.filter((k) => k.id !== id) }))
    get()._autosave()
  },

  // ─── Pensioen ────────────────────────────────────────────────────────────────
  addPensioen: (p) => {
    set((s) => ({ pensioen: [...s.pensioen, { ...p, id: Date.now() }] }))
    get()._autosave()
  },
  updatePensioen: (id, data) => {
    set((s) => ({ pensioen: s.pensioen.map((p) => (p.id === id ? { ...p, ...data } : p)) }))
    get()._autosave()
  },
  deletePensioen: (id) => {
    set((s) => ({ pensioen: s.pensioen.filter((p) => p.id !== id) }))
    get()._autosave()
  },

  // ─── Opdrachtgevers ──────────────────────────────────────────────────────────
  addOpdrachtgever: (o) => {
    set((s) => ({ opdrachtgevers: [...s.opdrachtgevers, { ...o, id: Date.now() }] }))
    get()._autosave()
  },
  updateOpdrachtgever: (id, data) => {
    set((s) => ({ opdrachtgevers: s.opdrachtgevers.map((o) => (o.id === id ? { ...o, ...data } : o)) }))
    get()._autosave()
  },
  deleteOpdrachtgever: (id) => {
    set((s) => ({ opdrachtgevers: s.opdrachtgevers.filter((o) => o.id !== id) }))
    get()._autosave()
  },

  // ─── Legacy import (JSON string) ─────────────────────────────────────────────
  importData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      set({
        settings:       data.settings       || initialSettings,
        facturen:       data.facturen       || [],
        uren:           data.uren           || [],
        kosten:         data.kosten         || [],
        pensioen:       data.pensioen       || [],
        opdrachtgevers: data.opdrachtgevers || [],
      })
      get()._autosave()
      return true
    } catch {
      return false
    }
  },
}))
