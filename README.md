# Sportseite

Amateursport im Kreis Sigmaringen: Ergebnisse, Tabellen, Spielberichte, Galerien, Spielerprofile und Wechselticker.

Reine statische Seite (HTML, CSS, JavaScript), kein Build-Schritt. Alle Inhalte kommen aus den JSON-Dateien im Ordner `data/`.

## Live stellen mit Cloudflare Pages

1. Im Cloudflare-Dashboard: Workers & Pages → Erstellen → Pages → Mit Git verbinden.
2. Repo `Sportseite` auswählen.
3. Framework-Preset: Keins. Build-Befehl: leer lassen. Ausgabeverzeichnis: `/`.
4. Speichern und bereitstellen. Die Seite läuft dann unter `<projektname>.pages.dev`.

Jeder Push auf `main` geht danach automatisch live. Eine eigene Domain kann später unter Benutzerdefinierte Domains ergänzt werden.

## Inhalte pflegen

| Datei | Inhalt |
| --- | --- |
| `data/site.json` | Name, Claim, Region. `"demo": true` zeigt den gelben Hinweis oben. |
| `data/ligen.json` | Ligen mit Saison |
| `data/vereine.json` | Vereine, Liga, Vereinsfarbe |
| `data/spieler.json` | Spieler mit Verein, Position, Rückennummer, optional `bild` für das Porträt |
| `data/spiele.json` | Spiele. Ohne `toreHeim`/`toreGast` gilt ein Spiel als noch offen. `tore` = Torschützen mit Minute. |
| `data/galerien.json` | Galerien pro Spiel. `src` = Bildadresse (später aus R2), `stichwoerter` mit Spieler-ID verknüpft Bilder mit dem Spielerprofil. |
| `data/wechsel.json` | Wechselticker. Mit `spieler` (ID) wird der Wechsel mit dem Spielerprofil und dessen Porträt verknüpft. |
| `data/videos.json` | Highlight-Videos. `typ` = Highlights, Tor oder Spieltag; `spiel` verknüpft das Video mit dem Spiel; `src` = Videodatei (später aus R2). |
| `data/berichte.json` | Berichte. `"haupt": true` macht einen Bericht zum Aufmacher auf der Startseite. |

Tabellen und Torjäger werden automatisch aus den Spielen berechnet.

## Seiten

`index.html` Start · `ligen.html` · `liga.html?id=` · `vereine.html` · `verein.html?id=` · `spieler.html?id=` · `spiel.html?id=` · `galerien.html` · `galerie.html?id=` · `berichte.html` (News) · `bericht.html?id=` · `suche.html?q=` · `highlights.html` · `video.html?id=` · `wechsel.html` · `partner.html` · `impressum.html` · `datenschutz.html`

## Lokal ansehen

Die Seite lädt die JSON-Dateien per `fetch`, darum über einen kleinen Webserver öffnen, nicht per Doppelklick:

```
python3 -m http.server
```

Dann `http://localhost:8000` im Browser.

## Vor dem echten Start

- Demo-Daten ersetzen und `"demo": false` setzen
- Impressum und Datenschutzerklärung ausfüllen
- Bilder: verkleinerte JPGs in Cloudflare R2, Originale offline archivieren
- Schriften (Barlow, SIL Open Font License) liegen lokal in `assets/fonts`, es werden keine Google-Server abgefragt

## Weitere Sportarten (Team-Begleitung)

Bei Sportarten neben Fußball begleiten wir meist nur ein Team, nicht die ganze Liga.

- `ligen.json`: Liga mit `"sportart"` (z. B. "Basketball") und `"team"` (ID des begleiteten Teams) anlegen. Optional `"tabelleLink"` (Tabelle beim Verband) und `"hinweis"` (z. B. Saisonpause).
- `vereine.json`: das Team und die Gegner mit dieser Liga eintragen. Gegner bekommen eine eigene Seite mit den Spielen gegen unser Team.
- `spiele.json`: wie bei Fußball, `toreHeim`/`toreGast` ist der Endstand. Dazu optional `"abschnitte"` (Viertel oder Halbzeiten, z. B. `[[18,20],[22,15],[16,21],[22,15]]`) und `"scorer"` (`[{"spieler": "id", "punkte": 24}]`). Kein `spieltag` nötig.
- News, Videos und Galerien erben die Sportart über ihr Spiel. Sie bekommen automatisch ein Etikett, und auf News, Highlights und Bilder erscheinen Filter, sobald es mehr als eine Sportart gibt.
- Eine Team-Liga erscheint erst im Menü, auf der Ligen- und der Vereinsseite, wenn es Inhalt gibt: mindestens ein Spiel mit Kurzbericht, News, Galerie oder Video. Einfach anlegen, es taucht automatisch auf.
- Auf der Startseite erscheint die Sportart als eigener Ergebnis-Reiter nur, wenn das Team am selben Wochenende wie der Fußball gespielt hat.

## Kader

Spieler in `spieler.json` mit `position` eintragen. Die Vereinsseite gruppiert automatisch nach Tor, Abwehr, Mittelfeld, Sturm (bei anderen Sportarten nach deren Positionen) und zeigt den Kader als Raster über die volle Breite.
