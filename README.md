# GZN Streetwear — First Drop

Die Website zeigt den ersten GZN-Drop. Besucher sammeln Kleidungsstücke mit Größe und Anzahl, übermitteln ihre Auswahl unverbindlich und bestätigen ihre E-Mail-Adresse. GZN meldet sich persönlich, sobald ein Piece angeboten werden kann.

## Starten

Mit Node.js 24 und npm:

```bash
npm ci
npm run dev
```

Vite startet die Oberfläche. Für den vollständigen Ablauf mit einer isolierten lokalen D1-Datenbank und simuliertem Mailversand:

```bash
npm run build
npx playwright install chromium
npm test
```

Eine lokale Testinstanz kann nach dem Build auch manuell mit `node scripts/test-server.mjs` gestartet werden. Sie verwendet Port 8788 und eine temporäre Datenbank.

## Klickbare Vorschau

GitHub Actions stellt `GZN_Shop_Vorschau.html` im Artefakt `gzn-klickbare-vorschau` bereit. ZIP entpacken und die HTML-Datei im Browser öffnen. Die Datei enthält die Bilder und unterstützt Produktgalerien, Auswahl und eine Testvormerkung ohne Versand.

Für einen eigenen Export nach dem Build `npm run preview:html` ausführen. Das Ergebnis liegt unter `review/`. Der Cloudflare-Build nutzt weiterhin `dist/`.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/` | React-Oberfläche, Warenkorb, Produktkatalog und Regeln für Größen und Mengen |
| `public/products/` | 71 freigegebene Bildansichten für 17 Produkte, je zwei WebP-Auflösungen |
| `functions/api/` | Pages Functions für Vormerkung, Bestätigung und geschützten CSV-Export |
| `migrations/` | D1-Schema und Indizes |
| `scripts/` | Reproduzierbarer Katalogimport und isolierter Testserver |
| `tests/` | Browser- und API-Tests mit lokaler Datenbank |
| `docs/` | [Gestaltung](docs/design.md) und [Deployment und Betrieb](docs/deployment.md) |

Der Katalogimport liest nur die vier Bekleidungskategorien aus dem GZN-Archiv. Farben und Kategorien gehören zur stabilen Produkt-ID. Mauspads und macOS-Metadaten werden ausgelassen. Für einen erneuten Import ist Python mit Pillow erforderlich.

```bash
python3 scripts/import_products.py '/pfad/zur/GZN  MARKE.zip'
```

## Git und Releases

`main` dient als Release-Basis. Änderungen gehen über `feature/*`, Pull Request, CI und geschützte Vorschau. GitHub Actions baut den Shop und prüft Desktop, Mobil und den lokalen API-Ablauf. Das GitHub-Repository ist öffentlich. Zugangsdaten und personenbezogene Vormerkungen bleiben in den geschützten Laufzeitumgebungen.

Der aktuelle Code ist ein lokal testbarer Stand. Für eine Veröffentlichung gelten die Schritte im [Deployment-Runbook](docs/deployment.md).
