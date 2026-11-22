# Kostenloser Gmail-Versand mit Google Apps Script

Diese Variante versendet über ein normales Gmail-Postfach. Sie braucht keine eigene Versanddomain und kein Google-Cloud-IAM-Projekt. Google Apps Script sendet die Nachrichten mit `MailApp`; der Dienst kann damit E-Mails senden, aber nicht den Gmail-Posteingang lesen. Verbraucher-Gmail-Konten haben laut Google ein Tageskontingent von 100 Empfängern. Deshalb begrenzt der Shop neue Vormerkungen bei aktiviertem Apps-Script-Versand auf 30 pro Tag: selbst wenn alle drei Nachrichten pro Vormerkung gesendet werden, bleibt der Shop unter diesem Kontingent.

## Was der Versand übermittelt

Cloudflare sendet an das Google Apps Script nur die für den Versand nötigen Nachrichtendaten: Empfängeradresse, Betreff, Text-/HTML-Nachricht und Antwortadresse. Die Nachrichten enthalten je nach Vorgang Vor- und Nachname, E-Mail-Adresse, Produkte, Farbe, Größe, Menge sowie bei der Bestätigung den befristeten Bestätigungslink. D1 bleibt die Datenbank der Vormerkungen.

## Einrichtung im Gmail-Konto

1. Melde dich bei [Google Apps Script](https://script.google.com/) mit dem Gmail-Konto an, das als Absender erscheinen soll. Für `boubimad03@gmail.com` muss das Script in diesem Konto angelegt und autorisiert werden.
2. Erstelle ein neues eigenständiges Script und ersetze den Inhalt der Datei durch `scripts/google-mailer.gs` aus diesem Repository.
3. Öffne **Projekteinstellungen** und füge unter **Skript-Properties** den Eintrag `GZN_MAIL_TOKEN` hinzu. Erzeuge dafür einen zufälligen, mindestens 32 Zeichen langen Wert. Verwende denselben Wert später als Cloudflare Secret `GOOGLE_APPS_SCRIPT_TOKEN`. Sende ihn nicht im Chat und schreibe ihn nicht in GitHub.
4. Wähle **Bereitstellen → Neue Bereitstellung → Web-App**. Setze **Ausführen als** auf dein Gmail-Konto und **Zugriff** auf **Jeder**. Das öffentliche Deployment ist durch den geheimen Token geschützt. Kopiere anschließend die URL, die auf `/exec` endet.
5. Google zeigt eine Berechtigungsabfrage für den Mailversand. Bestätige sie selbst im eingeloggten Gmail-Konto. Der Script-Code verwendet `MailApp`, nicht `GmailApp`, und liest keine E-Mails.
6. In Cloudflare Pages Production legst du `GOOGLE_APPS_SCRIPT_URL` und `GOOGLE_APPS_SCRIPT_TOKEN` als Secrets an. Setze außerdem `TOKEN_SECRET` mit einem eigenen zufälligen Wert von mindestens 32 Zeichen. `MAIL_FROM` muss zum Gmail-Konto passen, das das Script ausführt; `OWNER_EMAIL` bleibt das Postfach für Betreiber-Benachrichtigungen.

## Aktivierung in Cloudflare

Vor der Aktivierung müssen der Versandendpunkt bereitgestellt, der Token in beiden Diensten identisch gesetzt und die Gmail-Berechtigung erteilt sein. Danach:

- `WAITLIST_ENABLED=1` setzen.
- Im Pages-Build-Befehl `VITE_WAITLIST_PAUSED=1` entfernen, damit das Formular nicht mehr pausiert ist.
- Eine eigene Vormerkung absenden und den Bestätigungslink testen. Prüfe danach sowohl die Betreiber-Benachrichtigung als auch die Kundenbestätigung.
- D1 speichert den Eintrag vor dem Versand. Falls eine E-Mail fehlschlägt, bleiben die Angaben in D1 und der Vorgang kann erneut versucht werden.

Das Gmail-Kontingent ist für eine erste, kleine Interessentenrunde gedacht. Wenn die Nachfrage wächst oder E-Mails zuverlässig in größerem Umfang ankommen müssen, sollte später ein Anbieter mit eigener verifizierter Versanddomain eingesetzt werden.
