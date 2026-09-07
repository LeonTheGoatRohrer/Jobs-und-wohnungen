# Jobs & Wohnungen

Statische, barrierearme Webanwendung für den Bahnhofssozialdienst. Sie durchsucht aktuelle Inserate der ÖH Innsbruck, bewertet sie mit transparenten Regeln, verwaltet eine lokale Auswahl und erzeugt getrennte Job- oder Wohnungs-PDFs mit Direktlinks und QR-Codes.

Produktions-URL: <https://leonrohrer.at/Jobs-und-wohnungen/>

## Architektur

- Vue 3, TypeScript und Vite
- kein Server, keine Datenbank, keine API-Schlüssel
- `OehJobsProvider` und `OehHousingProvider` laden statische JSON-Dateien
- GitHub Actions ruft öffentliche ÖH-Seiten alle sechs Stunden ab, validiert sie und veröffentlicht die Website
- Auswahl und manuelle PDF-Korrekturen bleiben ausschließlich im Browser (`localStorage`)
- PDF-Erzeugung und QR-Codes laufen vollständig im Browser; die Bibliotheken werden erst bei Bedarf geladen

Die technische Quellenprüfung und Architekturentscheidung stehen in [docs/data-access.md](docs/data-access.md).

## Installation und Entwicklung

Voraussetzung: Node.js 22 oder neuer.

```bash
npm ci
npm run fetch:data
npm run dev
```

## Tests und Build

```bash
npm test
npm run build
npm run test:e2e
```

Die Unit- und Component-Tests decken Parser-Fixtures, Regionen, Suchfilter, Ranking, Sortierung, Preisbehandlung, fehlende Felder, Auswahlpersistenz, PDF-Dateinamen, Original-URLs und zentrale Komponenten ab. Playwright prüft Jobs, Wohnungen, Reload, leere Ergebnisse und Datenfehler in Desktop- und Mobilansicht.

## Datenaktualisierung

`npm run fetch:data` liest nur öffentlich zugängliche Seiten der ÖH. Zuerst werden alle neuen Dateien in einem temporären Ordner erzeugt. Erst nach Mindestmengen-, Titel-, URL-, Quellen- und Fehlerseitenprüfung ersetzen sie die bestehenden Daten. Ein fehlgeschlagener Abruf beendet den Workflow; die zuletzt funktionierende GitHub-Pages-Version bleibt online.

## PDF-System

Die PDFs enthalten echten Text, klickbare Original-Links, QR-Codes mit exakt derselben `originalUrl`, Erstellungsdatum, Aktualitätshinweis und Seitenzahlen. Jobs und Wohnungen können nicht gemischt exportiert werden. Fehlende Felder erscheinen als „nicht angegeben“.

## GitHub Pages

Das bestehende User-Pages-Repository `LeonTheGoatRohrer.github.io` bedient die Custom Domain `leonrohrer.at`. Dieses Projekt ist deshalb eine Project Page mit Vite-Basis `/Jobs-und-wohnungen/`. Der Workflow `.github/workflows/pages.yml` testet, baut und veröffentlicht `dist` als Pages-Artefakt.

## Branding und bekannte Grenzen

- Im Ausgangsordner war kein offiziell freigegebenes Caritas-Logo vorhanden. Deshalb wurde keines erfunden oder nachgezeichnet. Ein autorisiertes `public/branding/caritas-logo.svg` muss noch bereitgestellt und anschließend in UI/PDF eingebunden werden.
- ÖH-Inserate sind redaktionell uneinheitlich. Der Parser übernimmt nur explizite Angaben; nicht verlässlich erkennbare Werte bleiben leer.
- Öffentliche Erreichbarkeit wird nur erwähnt, wenn sie im Inserat nachvollziehbar angegeben ist; es wird keine Entfernung vorgetäuscht.
- Änderungen an der externen HTML-Struktur können Parseranpassungen erfordern. Fixtures und Validierung verhindern eine unbemerkte Veröffentlichung offensichtlich defekter Daten.
