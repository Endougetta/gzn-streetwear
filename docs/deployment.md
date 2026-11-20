# GZN Deployment und Betrieb

## Geschützte Vorschau

Cloudflare Pages ist mit `Endougetta/gzn-streetwear` verbunden. `feature/review-preview` baut die [geschützte Shop-Vorschau](https://feature-review-preview.gzn-streetwear.pages.dev/) im Testmodus. Auf der Hauptadresse steht ein Platzhalter. Automatische Builds für `main` sind pausiert. Das Repository ist öffentlich.

Die Vorschau verwendet `VITE_HOSTED_REVIEW=1` und simuliert die Vormerkung im Browser. Für einen integrierten Test vor dem Launch braucht es ein eigenes Deployment mit Pages Functions und Testdatenbank. Die optische Vorschau bleibt für die Designabnahme verfügbar.

## Verantwortliche Konten

| Dienst | Zuständigkeit | Stand |
| --- | --- | --- |
| GitHub | Endougetta verwaltet Quellcode und Freigabe. | Repo und Vorschau-PR vorhanden. |
| Cloudflare | GZN verwaltet Pages, Zugriffsschutz, DNS und D1. | Pages, Zugriffsschutz und EU-Test-D1 vorhanden. Die Live-Datenbank steht aus. |
| Resend | GZN verwaltet den Absender, die Versanddomain und die Zustellung. | Konto und Absenderdomain noch zu bestätigen. |
| Vormerkende | Gäste wählen Produkte aus und bestätigen ihre E-Mail-Adresse per Link. | V1 benötigt keine Kundenkonten. |
| GZN-Team | Bestätigte Einträge abrufen und Interessenten persönlich kontaktieren. | CSV-Export vorhanden. Zuständigkeit und Zugriff vor dem Livegang festlegen. |

## Datenbank und Freigabe

1. Die EU-Datenbank `gzn-waitlist-test` enthält die geprüfte Startmigration `0001_waitlist.sql`. Eine getrennte Testumgebung mit Pages Functions und beschränktem Testzugriff einrichten und die Datenbank dort als `DB` anbinden.
2. Versionierte Migration und Bindings zunächst in der Testumgebung prüfen. Erst nach erfolgreichem Test Produktion bereitstellen.
3. Separate D1-Datenbanken für Produktion und Vorschau erstellen. In `wrangler.toml` die lokale Beispiel-ID durch die echte Produktions-ID ersetzen. Für nicht geheimen Preview-Konfigurationscode folgenden Absatz mit echter Preview-ID ergänzen. Bindings sind je Umgebung zu setzen.

```toml
[[env.preview.d1_databases]]
binding = "DB"
database_name = "gzn-preview"
database_id = "PREVIEW_DATABASE_ID"
migrations_dir = "migrations"
```

4. Migration gegen die jeweilige Datenbank ausführen, zum Beispiel `npx wrangler d1 migrations apply gzn-preview --remote`. Vor späteren Änderungen den Plan prüfen und eine Wiederherstellung über D1 Time Travel dokumentieren.
5. In jeder Umgebung `SITE_URL` auf die genau dort verwendete Origin setzen. Für das E-Mail-Frontend eine stabile Preview-URL verwenden. `TOKEN_SECRET` und `ADMIN_TOKEN` separat mit hoher Entropie erstellen und ausschließlich als Runtime-Secrets setzen. `WAITLIST_ENABLED` bleibt in rein visuellen Previews ungesetzt.

Quellen [Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) · [Pages Bindings](https://developers.cloudflare.com/pages/functions/bindings/) · [D1 CLI](https://developers.cloudflare.com/workers/wrangler/commands/d1/) · [Pages Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

## Absender und echte Zustellung

- Resend im gewünschten GZN-Konto einrichten. Ein Google-Konto kann der Anmeldung dienen. Zum Versand an die Zielgruppe eine eigene Versanddomain oder Subdomain hinterlegen, etwa `mail.<GZN-Domain>`, und die im Dashboard ausgegebenen DNS-Einträge verifizieren.
- Einen auf die Absenderdomain beschränkten Versand-API-Key erstellen. `RESEND_API_KEY` als Runtime-Secret und `MAIL_FROM` als Absender der verifizierten Domain konfigurieren. Mit `MAIL_REPLY_TO` können Antworten an ein erreichbares Postfach weitergeleitet werden.
- Erst nach Einrichtung aller Produktionsvoraussetzungen `WAITLIST_ENABLED=1` setzen. Mit mindestens zwei eigenen, erreichbaren Test-Postfächern Zustellung, Spam-Ordner, Bestätigungslink und Artikelliste prüfen. Ein 2xx-Status von Resend zeigt die Annahme durch die API. Die tatsächliche Zustellung wird separat im Resend-Dashboard oder im Postfach geprüft.
- Free-Tarif bei Planung: bis zu 100 Nachrichten pro Tag und 3.000 pro Monat. Die Anwendung lässt standardmäßig je UTC-Tag 45 neue Einträge und bis zu zwei Mails je Eintrag zu. Bei Bestätigungen älterer Anfragen kann die Tagesquote trotzdem erreicht werden. Der Anbieter entscheidet dann über Annahme, der Datenbestand bleibt erhalten.

Quellen [Resend-Tarife](https://resend.com/pricing) · [Domain-Verifizierung](https://resend.com/docs/dashboard/domains/introduction) · [Idempotenz](https://resend.com/docs/dashboard/emails/idempotency-keys)

## Vormerkung und Export

D1 speichert die Artikel atomar mit dem Eintrag. Der Status der ersten und zweiten gesendeten Mail wird getrennt erfasst. Bei einer Störung während der ersten Mail kann derselbe Formularvorgang erneut abgeschickt werden. Der Server verwendet eine stabile Anfrage-ID und Resend einen daraus erzeugten Idempotenzschlüssel. Der Bestätigungslink ist 48 Stunden gültig. Eine Bestätigung erfordert einen Klick auf der Seite und setzt ihren Zeitpunkt einmalig. Bei fehlgeschlagener zweiter Mail kann der Bestätigungslink innerhalb seiner Gültigkeit erneut verwendet werden. Für Hintergrundwiederholungen und Zustellereignisse ist vor hohem Versandvolumen eine Queue oder ein geplanter Worker sinnvoll.

Der personenbezogene CSV-Export erfordert einen separaten Bearer-Token. Der Token gehört weder in URLs noch in Browsercode oder Repository. Die Befehle laufen auf einer autorisierten Workstation mit sicher bereitgestellter Shell-Variable.

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer ${GZN_ADMIN_TOKEN}" \
  -o gzn-vormerkungen.csv "${GZN_SITE_URL}/api/admin"

curl --fail --silent --show-error -X PATCH \
  -H "Authorization: Bearer ${GZN_ADMIN_TOKEN}" \
  "${GZN_SITE_URL}/api/admin?id=${GZN_ENTRY_ID}"
```

Der CSV-Export enthält nur bestätigte Vormerkungen. Bei mehr als 3.000 Artikeln die Antwort-Header beachten und mit `?after=` plus dem Wert von `X-Next-After` weiterblättern. `PATCH` markiert einen Eintrag nach einer persönlichen Kontaktaufnahme. Für eine größere Warteliste sollte die interne Arbeit über eine personengebundene, in Cloudflare Access geschützte Übersicht laufen.

## Vor dem öffentlichen Launch

- [ ] GitHub-PR und CI geprüft, Cloudflare-Vorschau abgesichert, Produktions- und Preview-D1 getrennt
- [ ] Finaler Domainname eingerichtet, echte Zustellung getestet, Testdaten entfernt
- [ ] Impressum und Datenschutzhinweise mit tatsächlichen Angaben veröffentlicht und `VITE_IMPRINT_URL` sowie `VITE_PRIVACY_URL` gesetzt
- [ ] Aufbewahrungsfristen und Löschung für unbestätigte Einträge, Kontaktanfragen und CSV-Exporte festgelegt
- [ ] Ausgewählte Größen, Produktnamen, fehlende Frontansichten und Kampagnenbild geprüft
- [ ] `VITE_SUPPORT_URL` auf die gewählte Projektunterstützung gesetzt, falls sie zum Launch aktiv sein soll
- [ ] Mobilgeräte, verschiedene Browser, Screenreader und Rückfallprozess persönlich geprüft

Rechtsquelle [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
