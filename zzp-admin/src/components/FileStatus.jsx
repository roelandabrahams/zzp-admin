import { useStore } from '../store'
import { HardDrive, FolderOpen, FilePlus, CheckCircle, Loader, AlertTriangle, X, Download } from 'lucide-react'

const STATUS_ICONS = {
  geen:       <HardDrive size={14} />,
  verbonden:  <CheckCircle size={14} />,
  bezig:      <Loader size={14} className="spin" />,
  opgeslagen: <CheckCircle size={14} />,
  fout:       <AlertTriangle size={14} />,
}

const STATUS_LABELS = {
  geen:       'Geen bestand gekoppeld',
  verbonden:  'Gekoppeld',
  bezig:      'Opslaan…',
  opgeslagen: 'Automatisch opgeslagen',
  fout:       'Opslagfout',
}

const STATUS_COLORS = {
  geen:       { bg: 'var(--yellow-dim)', border: 'var(--yellow)', color: 'var(--yellow)' },
  verbonden:  { bg: 'var(--accent-dim)', border: 'var(--accent)', color: 'var(--accent)' },
  bezig:      { bg: 'var(--blue-dim)',   border: 'var(--blue)',   color: 'var(--blue)'   },
  opgeslagen: { bg: 'var(--accent-dim)', border: 'var(--accent)', color: 'var(--accent)' },
  fout:       { bg: 'var(--red-dim)',    border: 'var(--red)',    color: 'var(--red)'    },
}

export default function FileStatus() {
  const { opslagStatus, bestandsnaam, foutmelding, koppelBestand, nieuwBestand, losKoppelen, downloadBackup } = useStore()
  const c = STATUS_COLORS[opslagStatus] || STATUS_COLORS.geen
  const isGekoppeld = opslagStatus !== 'geen'

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin 1s linear infinite; display: inline-block; }
      `}</style>

      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius)',
        padding: '0.55rem 1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.825rem',
        color: c.color,
      }}>
        {STATUS_ICONS[opslagStatus]}

        <span style={{ fontWeight: 500 }}>{STATUS_LABELS[opslagStatus]}</span>

        {bestandsnaam && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', opacity: 0.8 }}>
            — {bestandsnaam}
          </span>
        )}

        {opslagStatus === 'fout' && foutmelding && (
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{foutmelding}</span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Acties */}
        {!isGekoppeld && (
          <>
            <button
              onClick={koppelBestand}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'var(--yellow)', color: '#0f1117',
                border: 'none', borderRadius: 6, padding: '0.3rem 0.75rem',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <FolderOpen size={13} /> Bestand openen
            </button>
            <button
              onClick={nieuwBestand}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'transparent', color: 'var(--yellow)',
                border: '1px solid var(--yellow)', borderRadius: 6, padding: '0.3rem 0.75rem',
                fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <FilePlus size={13} /> Nieuw bestand
            </button>
          </>
        )}

        {isGekoppeld && (
          <>
            <button
              onClick={downloadBackup}
              title="Extra backup downloaden"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: 'transparent', color: c.color,
                border: `1px solid ${c.border}`, borderRadius: 6, padding: '0.25rem 0.6rem',
                fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <Download size={12} /> Backup
            </button>
            <button
              onClick={losKoppelen}
              title="Bestand loskoppelen"
              style={{
                display: 'flex', alignItems: 'center',
                background: 'transparent', color: c.color, opacity: 0.6,
                border: 'none', borderRadius: 6, padding: '0.25rem',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>

      {/* Uitleg als nog niet gekoppeld */}
      {!isGekoppeld && (
        <div style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: 1.7,
        }}>
          <p style={{ fontWeight: 600, marginBottom: '0.6rem', color: 'var(--text)' }}>
            📂 Koppel een gegevensbestand om te beginnen
          </p>
          <p style={{ color: 'var(--text2)', marginBottom: '0.75rem' }}>
            De app slaat al je gegevens op in een <strong style={{ color: 'var(--text)' }}>.json bestand op jouw computer</strong> —
            niet in de browser. Elke wijziging wordt direct automatisch weggeschreven.
            Bij herladen open je hetzelfde bestand en al je data is er meteen weer.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, background: 'var(--bg2)', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '0.3rem', fontSize: '0.8rem' }}>📁 Eerste keer</p>
              <p style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>Klik "Nieuw bestand" en kies een map op je computer (bijv. <code style={{ background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>Documenten/ZZP</code>).</p>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: 'var(--bg2)', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--blue)', marginBottom: '0.3rem', fontSize: '0.8rem' }}>🔄 Na herladen</p>
              <p style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>Klik "Bestand openen" en selecteer hetzelfde <code style={{ background: 'var(--bg3)', padding: '1px 4px', borderRadius: 3 }}>.json</code> bestand. Alles staat er weer.</p>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: 'var(--bg2)', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--yellow)', marginBottom: '0.3rem', fontSize: '0.8rem' }}>☁️ Tip: sync</p>
              <p style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>Sla het bestand op in OneDrive, Dropbox of Google Drive voor automatische cloud-backup én toegang op meerdere apparaten.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
