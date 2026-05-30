# ZZP Admin — Waarnemend Huisarts NL/BE

Persoonlijke administratietool voor een ZZP-huisarts die in België woont en in Nederland werkt.

## Functies

- **Facturen** — aanmaken, PDF genereren, status bijhouden
- **Urenregistratie** — per opdrachtgever, grafisch overzicht
- **Kosten & Aftrekposten** — incl. afschrijving over meerdere jaren, NL én BE
- **BTW Aangifte NL** — kwartaaloverzicht klaar voor Mijn Belastingdienst
- **BTW Aangifte BE** — kwartaal/maand overzicht voor Intervat
- **Pensioen & Beleggen** — jaarruimte berekening, DeGiro + ETF tracker
- **Opdrachtgevers** — adresboek
- **Bestandsopslag** — automatisch opslaan naar JSON op je eigen computer (File System Access API)

## Opslag

De app slaat alle data op in **een .json bestand op jouw computer** — niet in de browser.
Elke wijziging wordt direct automatisch weggeschreven. Na een herlaad open je hetzelfde bestand.

> **Tip:** Sla het bestand op in OneDrive / Dropbox / Google Drive voor automatische cloud-backup én toegang op meerdere apparaten.

> **Browser:** Vereist Chrome of Edge (File System Access API). Firefox wordt niet ondersteund.

## Installatie & lokaal draaien

```bash
# 1. Clone de repository
git clone https://github.com/JOUWGEBRUIKERSNAAM/zzp-admin.git
cd zzp-admin

# 2. Installeer dependencies
npm install

# 3. Start lokaal
npm run dev
```

Open dan http://localhost:5173/zzp-admin/

## Deployen naar GitHub Pages

```bash
# Eenmalig: zet in package.json de homepage in
# "homepage": "https://JOUWGEBRUIKERSNAAM.github.io/zzp-admin"

npm install gh-pages --save-dev

# Deployen
npm run deploy
```

Of gebruik de meegeleverde GitHub Actions workflow (`.github/workflows/deploy.yml`) — elke push naar `main` deployt automatisch.

## Technologie

- React 18 + Vite
- Zustand (state management)
- Recharts (grafieken)
- jsPDF + jsPDF-AutoTable (PDF facturen)
- File System Access API (lokale bestandsopslag)
- GitHub Pages (hosting)

## Disclaimer

Deze tool is een administratiehulpmiddel, geen officieel boekhoudpakket. Laat je belastingaangifte controleren door een erkend accountant of belastingadviseur die bekend is met de grensarbeiderssituatie NL/BE.
