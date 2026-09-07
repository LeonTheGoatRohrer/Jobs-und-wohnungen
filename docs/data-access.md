# Technische Prüfung der ÖH-Datenquellen

Stand: 07.09.2026

## ÖH Jobbörse

- Öffentliche WordPress-REST-Collection: `https://jobs.oehweb.at/wp-json/wp/v2/job-listings`
- Pagination: `per_page` und `page`, Gesamtseiten über `X-WP-TotalPages`
- REST-Felder: Titel, Beschreibung, Arbeitgeber, Arbeitsort, Kategorien und Beschäftigungsart
- Detailseiten enthalten zusätzlich strukturierte Gültigkeitsdaten; die REST-Beschreibung enthält den vollständigen Inserattext
- CORS: REST-Antworten erlauben `https://leonrohrer.at`; normale HTML-Detailseiten tun dies nicht
- `robots.txt`: nur `/wp-admin/` gesperrt, `admin-ajax.php` erlaubt

## ÖH Wohnungsbörse

- Listen: `/kategorie/wohnung/`, `/kategorie/garconniere/`, `/kategorie/wg/`
- Pagination: `/kategorie/{typ}/page/{n}/`
- Detailseiten: `/wohnung/{slug}/`
- Der Wohnungs-Inhaltstyp ist nicht in der öffentlichen WordPress-REST-Typenliste vorhanden
- Normale Listen- und Detailseiten liefern keinen CORS-Header
- `robots.txt`: nur `/wp-admin/` gesperrt, `admin-ajax.php` erlaubt

## Entscheidung

Eine GitHub Action ruft die öffentlichen Daten regelmäßig ab und erzeugt statische JSON-Dateien. Jobs werden aus der öffentlichen REST-Collection der letzten 15 Tage gelesen; Gehalt, Beginn und Arbeitszeit werden nur bei ausdrücklichen Textmustern übernommen. Wohnungen werden aus Listen- und Detailseiten gelesen. Das ist kein laufender Backend-Server. Der Browser lädt ausschließlich die mit der Website veröffentlichten JSON-Dateien. Der Fetch schlägt vor dem Ersetzen der vorhandenen Dateien fehl, wenn Mindestanzahl, Titel oder Quell-URLs unplausibel sind.
