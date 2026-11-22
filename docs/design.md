# GZN First Drop — Gestaltung und Blickführung

## Startseite

Der weiße Header hält Kollektion und Auswahl erreichbar. Auf Desktop führt der Blick von der typografischen Launch-Headline links über den Hoodies-Button zur Bildfläche rechts. Der Hero lässt abhängig vom Bildschirmrand die Hoodie-Sektion anklingen. Auf Mobil stehen Text und Button vor dem Bild. Direkt nach dem Hero kommen Hoodies, Sweatshirts, T-Shirts und Hosen.

Ein gemeinsames Kampagnenfoto zeigt alle drei Outfits. Der Text steht dunkel auf gebrochenem Weiß. Kühles Blau akzentuiert die Wortmarke, Links und den Tastaturfokus.

## Kampagnenmotiv

Imad ist dreimal im selben Ganzkörpermotiv rechts neben der Headline zu sehen. Joseph Joestar und Jotaro aus JoJo dienen ausschließlich als Posenreferenzen. Im ersten Aufbau hockt ein Imad leicht vorn. Die beiden stehenden Imads stehen dicht beieinander dahinter. Kleidung und Schuhe bleiben im Bild erkennbar.

| Figur | Pose | Outfit |
|---|---|---|
| Imad in der Hocke | Hockt im Dreiviertelprofil. Ein Fuß steht vorne, der andere hinten. Die Arme hängen locker nach unten. Der Blick bleibt ausdruckslos. | Weißes GZN Monogram T-Shirt, schwarze GZN Monogram Hose, weiße Sneaker |
| Imad in Josephs Pose | Breiter Stand wie in der Vorlage, eine offene Hand vor dem Gesicht, der andere Arm seitlich abgesenkt. | Not That Deep Hoodie und Hose in Bordeaux, weiße Sneaker |
| Imad in Jotaros Pose | Zeigt über die Schulter zurück. Sein Rücken zeigt zur Kamera, damit der Rückenprint sichtbar ist. | Blauer Keep Building Hoodie und passende Hose, weiße Sneaker |

Das Kampagnenmotiv ist aus den Produktaufnahmen als gemeinsames Studiofoto generiert und steht im Pull Request zur Sichtprüfung.

## Katalog und Auswahl

Drei Spalten geben den Produkten auf Desktop gleich viel Raum. Beim Hover vergrößert sich das Kartenbild. Nach 180 Millisekunden blendet es auf die Rückseite über. Der Tastaturfokus zeigt die Rückseite ebenfalls verzögert. Bei reduzierter Bewegung wechselt die Ansicht direkt. Mobil führt ein Tap zur Detailseite mit sichtbaren Galeriesteuerelementen und Vorschaubildern. Je nach Quelldatei startet das Detail mit der losen Front, einer Model-Front oder der gefalteten Ansicht. Beide Verdantia-Karten zeigen die gefaltete Front. Beim weißen Monogramm stehen aktuell Modelansichten zur Verfügung.

Die Produktseite zeigt Galerie links und Größenwahl rechts, auf Mobil untereinander. Pfeiltasten wechseln Bilder innerhalb der Galerie. Die native Auswahl-Seitenleiste bündelt Produkte und Mengen. Das E-Mail-Feld erscheint erst nach „Zur Vormerkung“. Der Support-Link wird sichtbar, sobald eine URL konfiguriert ist. Die Größen XS bis XXL sind eine vorläufige Auswahl und werden mit der Produktion abgeglichen.

## Quellen und Prüfkriterien

- Baymard beschreibt den Nutzen zusätzlicher Produktbilder bei visuell geprägten Sortimenten. GZN zeigt die Rückseite bereits in der Übersicht und lässt alle verfügbaren Ansichten in der Galerie durchsehen. [Baymard – Product List Thumbnails](https://baymard.com/blog/Secondary-hover-information)
- Tastaturbedienung, sichtbare Fokusringe, alternative Bildtexte, kleine Bildschirmbreiten und reduzierte Bewegung werden in Gestaltung und Tests berücksichtigt. Für den Launch die Seite zusätzlich manuell mit Tastatur und Screenreader prüfen. [W3C – WCAG 2.2](https://www.w3.org/TR/wcag/)
- Das Produkt-Grid liefert kleine und große WebP-Dateien aus. Bilder unterhalb des sichtbaren Bereichs laden verzögert. Die 71 Originalansichten bleiben in der Quell-ZIP erhalten.
