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
| `data/spieler.json` | Spieler mit Verein, Position, Rückennummer |
| `data/spiele.json` | Spiele. Ohne `toreHeim`/`toreGast` gilt ein Spiel als noch offen. `tore` = Torschützen mit Minute. |
| `data/galerien.json` | Galerien pro Spiel. `src` = Bildadresse (später aus R2), `stichwoerter` mit Spieler-ID verknüpft Bilder mit dem Spielerprofil. |
| `data/wechsel.json` | Wechselticker |
| `data/berichte.json` | Berichte. `"haupt": true` macht einen Bericht zum Aufmacher auf der Startseite. |

Tabellen und Torjäger werden automatisch aus den Spielen berechnet.

## Seiten

`index.html` Start · `ligen.html` · `liga.html?id=` · `vereine.html` · `verein.html?id=` · `spieler.html?id=` · `spiel.html?id=` · `galerien.html` · `galerie.html?id=` · `wechsel.html` · `partner.html` · `impressum.html` · `datenschutz.html`

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
