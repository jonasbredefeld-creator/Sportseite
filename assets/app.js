// Flutlicht – rendert alle Seiten aus den JSON-Dateien im Ordner /data.
// Neue Ergebnisse, Berichte, Spieler oder Galerien = nur die JSON-Dateien ändern.

const DATEN = ["site", "ligen", "vereine", "spieler", "spiele", "galerien", "wechsel", "berichte", "videos"];

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const param = (name) => new URLSearchParams(location.search).get(name);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const datumLang = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const datumMittel = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long" });
const datumKurz = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

const PFEIL = `<svg class="pfeil" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const KAMERA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

async function laden() {
  const eintraege = await Promise.all(
    DATEN.map((n) => fetch(`data/${n}.json`).then((r) => {
      if (!r.ok) throw new Error(`data/${n}.json fehlt`);
      return r.json();
    }))
  );
  const d = Object.fromEntries(DATEN.map((n, i) => [n, eintraege[i]]));
  d.verein = (id) => d.vereine.find((v) => v.id === id);
  d.liga = (id) => d.ligen.find((l) => l.id === id);
  d.spielerById = (id) => d.spieler.find((s) => s.id === id);
  d.galerie = (id) => d.galerien.find((g) => g.id === id);
  d.spiel = (id) => d.spiele.find((s) => s.id === id);
  d.gespielt = d.spiele.filter((s) => Number.isInteger(s.toreHeim));
  d.videosSortiert = [...d.videos].sort((a, b) => b.datum.localeCompare(a.datum));
  d.berichteSortiert = [...d.berichte].sort((a, b) => b.datum.localeCompare(a.datum));
  // Sportart: steht an der Liga. News, Videos und Galerien erben sie über ihr Spiel oder ihre Liga.
  d.sportVon = (x) => x?.sport || d.liga(x?.liga)?.sportart || (x?.spiel && d.liga(d.spiel(x.spiel)?.liga)?.sportart) || "Fußball";
  [...d.berichte, ...d.videos, ...d.galerien, ...d.spiele].forEach((x) => { x._sport = d.sportVon(x); });
  // Ligen, in denen wir nur ein Team begleiten (z. B. Basketball, Football)
  d.teamLiga = (id) => !!d.liga(id)?.team;
  // Eine Team-Liga erscheint erst, wenn es Inhalt gibt: ein Spiel mit Bericht, Bildern oder Video
  const hatInhalt = (l) => d.spiele.some((s) => s.liga === l.id && (s.galerie || s.bericht || d.berichte.some((b) => b.spiel === s.id) || d.videos.some((v) => v.spiel === s.id)));
  d.ligenSichtbar = d.ligen.filter((l) => !l.team || hatInhalt(l));
  d.sportarten = [...new Set(d.ligenSichtbar.map((l) => l.sportart))];
  return d;
}

/* ---------- Rahmen: Kopf, Menü, Fuß ---------- */

const BEREICH = {
  start: "start", ligen: "ligen", liga: "ligen", berichte: "berichte", bericht: "berichte",
  galerien: "bilder", galerie: "bilder", transfers: "transfers", highlights: "highlights", video: "highlights",
  verein: "ligen", spieler: "ligen", spiel: "ligen"
};

function rahmen(d, seite) {
  // Team-Seiten anderer Sportarten gehören unter „Ligen“
  const aktiv = seite === "verein" && d.teamLiga(d.verein(param("id"))?.liga) ? "ligen" : BEREICH[seite];
  const cur = (k) => (k === aktiv ? ' aria-current="page"' : "");

  const ausklapp = (key, titel, eintraege) => `
    <div class="menue-punkt">
      <button type="button" aria-expanded="false" aria-controls="ak-${key}"${cur(key)}>${titel}${PFEIL}</button>
      <div class="ausklapp" id="ak-${key}">${eintraege}</div>
    </div>`;
  const punkt = (key, href, titel) => `<div class="menue-punkt"><a href="${href}"${cur(key)}>${titel}</a></div>`;

  // Dropdown nach Sportarten gegliedert. Fußball zuerst, bei Team-Ligen führt der Link direkt zum Team.
  const ligenLinks = d.sportarten.map((sport) => {
    const ls = d.ligenSichtbar.filter((l) => l.sportart === sport);
    const links = ls.map((l) => l.team
      ? `<a href="verein.html?id=${l.team}">${esc(d.verein(l.team)?.name)}<span class="klein">${esc(l.name)}</span></a>`
      : `<a href="liga.html?id=${l.id}">${esc(l.name)}<span class="klein">Tabelle, Ergebnisse und Spielplan</span></a>`).join("");
    return d.sportarten.length > 1 ? `<div class="gruppe">${esc(sport)}</div>${links}` : links;
  }).join("");

  const kopf = document.createElement("div");
  kopf.innerHTML = `
    ${d.site.demo ? `<div class="demo-hinweis">Vorschau mit Beispieldaten. Ergebnisse, Spieler und Berichte sind erfunden.</div>` : ""}
    <header class="kopf">
      <div class="wrap">
        <a class="marke" href="index.html">
          <img class="marke-logo" src="assets/logo-weiss.png" alt="${esc(d.site.name)}" width="906" height="164">
          <span class="marke-claim">${esc(d.site.claim)}</span>
        </a>
        <button type="button" class="menue-knopf" aria-expanded="false" aria-controls="menue">Menü${PFEIL}</button>
      </div>
    </header>
    <nav class="menue" id="menue" aria-label="Hauptmenü">
      <div class="wrap">
        ${punkt("start", "index.html", "Home")}
        ${ausklapp("ligen", "Ligen", ligenLinks)}
        ${punkt("berichte", "berichte.html", "News")}
        ${punkt("highlights", "highlights.html", "Highlights")}
        ${punkt("bilder", "galerien.html", "Bilder")}
        ${punkt("transfers", "transfers.html", "Transfers")}
        <form class="suche" action="suche.html" role="search" autocomplete="off">
          <label class="sr" for="suchfeld">Teams, Spieler und News suchen</label>
          <svg class="lupe" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input id="suchfeld" name="q" type="search" placeholder="Team oder Spieler suchen" value="${esc(param("q") || "")}" aria-controls="such-vorschau" aria-expanded="false">
          <div class="such-vorschau" id="such-vorschau" role="listbox" hidden></div>
        </form>
      </div>
    </nav>`;
  document.body.prepend(...kopf.children);

  // Dropdowns: Klick öffnet, Klick daneben oder Escape schließt
  const knoepfe = $$(".menue-punkt > button");
  const alleZu = (ausser) => knoepfe.forEach((b) => b !== ausser && b.setAttribute("aria-expanded", "false"));
  knoepfe.forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const offen = b.getAttribute("aria-expanded") === "true";
    alleZu(b);
    b.setAttribute("aria-expanded", String(!offen));
  }));
  document.addEventListener("click", (e) => { if (!e.target.closest(".menue-punkt")) alleZu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") alleZu(); });

  // Handy-Menü
  const mk = $(".menue-knopf"), menue = $("#menue");
  mk.addEventListener("click", () => {
    const offen = mk.getAttribute("aria-expanded") === "true";
    mk.setAttribute("aria-expanded", String(!offen));
    menue.classList.toggle("offen", !offen);
  });

  // Live-Vorschlaege beim Tippen
  const feld = $("#suchfeld"), vorschau = $("#such-vorschau");
  const index = suchIndex(d);
  const schliessen = () => { vorschau.hidden = true; feld.setAttribute("aria-expanded", "false"); };
  feld.addEventListener("input", () => {
    const treffer = suchen(index, feld.value).slice(0, 7);
    if (!feld.value.trim()) return schliessen();
    vorschau.innerHTML = treffer.length
      ? treffer.map((t) => `<a role="option" href="${t.href}">${t.bild !== undefined ? portraet({ bild: t.bild }, "mini") : `<span class="such-typ">${esc(t.typ)}</span>`}<span><strong>${esc(t.titel)}</strong><span class="klein">${esc(t.unter)}</span></span></a>`).join("")
        + `<a class="alle" href="suche.html?q=${encodeURIComponent(feld.value)}">Alle Ergebnisse für „${esc(feld.value)}“</a>`
      : `<div class="leer">Nichts gefunden. Probier einen Vereinsnamen, Ort oder Nachnamen.</div>`;
    vorschau.hidden = false;
    feld.setAttribute("aria-expanded", "true");
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".suche")) schliessen(); });
  feld.addEventListener("keydown", (e) => { if (e.key === "Escape") { schliessen(); feld.blur(); } });

  const fuss = document.createElement("footer");
  fuss.className = "fuss";
  fuss.innerHTML = `
    <div class="wrap">
      <div><strong>${esc(d.site.name)}</strong><br>${esc(d.site.claim)}</div>
      <nav aria-label="Fußzeile">
        <a href="partner.html">Partner werden</a>
        <a href="vereine.html">Vereine</a>
        <a href="impressum.html">Impressum</a>
        <a href="datenschutz.html">Datenschutz</a>
      </nav>
    </div>`;
  document.body.append(fuss);
}

/* ---------- Bausteine ---------- */

function foto(bild, klasse = "") {
  const innen = bild?.src
    ? `<img src="${esc(bild.src)}" alt="${esc(bild.titel)}" loading="lazy">`
    : `<div class="foto-leer"><div>${KAMERA}Foto folgt</div></div>`;
  return `<div class="foto ${klasse}">${innen}</div>`;
}

function vereinLink(d, id, kurz = false) {
  const v = d.verein(id);
  if (!v) return esc(id);
  return `<a class="link" href="verein.html?id=${v.id}">${esc(kurz ? v.kurz : v.name)}</a>`;
}

// Kleines Sport-Etikett, nur für Sportarten neben Fußball
const sportMarke = (x) => (x?._sport && x._sport !== "Fußball" ? x._sport : "");
const kategorieText = (x, kat) => [sportMarke(x), kat].filter(Boolean).join(", ");

function spielKarte(d, s) {
  const h = d.verein(s.heim), g = d.verein(s.gast);
  const gespielt = Number.isInteger(s.toreHeim);
  const sm = sportMarke(s);
  const zeile = (v, tore, gegner) => {
    const klasse = !gespielt ? "" : tore > gegner ? " sieger" : tore < gegner ? " verlierer" : "";
    return `
      <div class="zeile${klasse}">
        <span class="verein">${v?.farbe ? `<span class="vereinspunkt" style="background:${esc(v.farbe)}"></span>` : ""}<span>${esc(v?.name)}</span></span>
        ${gespielt ? `<span class="tore">${tore}</span>` : ""}
      </div>`;
  };
  return `
    <a class="karte spiel-karte" href="spiel.html?id=${s.id}">
      <div class="spiel-meta">
        <span>${sm ? `<span class="sport-marke">${sm}</span> ` : ""}${datumKurz(s.datum)}${gespielt ? "" : `, <span class="anstoss">${esc(s.anstoss)} Uhr</span>`}</span>
        ${s.galerie ? `<span class="fotos">Fotos</span>` : s.topspiel ? `<span class="fotos">Topspiel</span>` : ""}
      </div>
      ${zeile(h, s.toreHeim, s.toreGast)}
      ${zeile(g, s.toreGast, s.toreHeim)}
    </a>`;
}

function spielZeile(d, s) {
  const h = d.verein(s.heim), g = d.verein(s.gast);
  const gespielt = Number.isInteger(s.toreHeim);
  const fett = (a, b) => (gespielt && a > b ? " sieger" : "");
  return `
    <a class="spiel-zeile" href="spiel.html?id=${s.id}">
      <span class="wann">${datumKurz(s.datum)}${gespielt ? "" : `<br><span class="anstoss">${esc(s.anstoss)}</span>`}</span>
      <span class="heim${fett(s.toreHeim, s.toreGast)}">${esc(h?.name)}</span>
      <span class="ergebnis${gespielt ? "" : " offen"}">${gespielt ? `${s.toreHeim}:${s.toreGast}` : "–:–"}</span>
      <span class="gast${fett(s.toreGast, s.toreHeim)}">${esc(g?.name)}</span>
      <span class="marken">${s.galerie ? `<span class="marke-foto">Fotos</span>` : ""}${s.topspiel ? `<span class="marke-foto">Topspiel</span>` : ""}</span>
    </a>`;
}

function torVerlauf(d, s) {
  let h = 0, g = 0;
  const zeilen = [...(s.tore || [])].sort((a, b) => a.min - b.min).map((t) => {
    const heim = t.verein === s.heim;
    heim ? h++ : g++;
    const sp = t.spieler && d.spielerById(t.spieler);
    const name = sp ? `<a class="link" href="spieler.html?id=${sp.id}">${esc(sp.name)}</a>` : `<span class="leise">Torschütze nicht gemeldet</span>`;
    const seite = `<span class="tor-text">${name}<span class="tor-min">${t.min}'</span></span>`;
    return `
      <li class="${heim ? "tor-heim" : "tor-gast"}">
        <span class="links">${heim ? seite : ""}</span>
        <span class="zwischen${heim ? " h" : " g"}">${h}:${g}</span>
        <span class="rechts">${heim ? "" : seite}</span>
      </li>`;
  }).join("");
  return zeilen ? `<ol class="torverlauf">${zeilen}</ol>` : `<p class="leise" style="text-align:center;margin:0">Keine Tore.</p>`;
}

function teamZahlen(d, ligaId, vid) {
  const tab = tabelle(d, ligaId);
  const platz = tab.findIndex((r) => r.id === vid) + 1;
  const zeile = tab.find((r) => r.id === vid) || {};
  const letzte = d.gespielt.filter((s) => s.liga === ligaId && (s.heim === vid || s.gast === vid)).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 5);
  const form = letzte.map((s) => {
    const eig = s.heim === vid ? s.toreHeim : s.toreGast, geg = s.heim === vid ? s.toreGast : s.toreHeim;
    return eig > geg ? "S" : eig < geg ? "N" : "U";
  });
  const tj = torjaeger(d, (s) => s.liga === ligaId).filter(([id]) => d.spielerById(id)?.verein === vid).slice(0, 3);
  return { platz, zeile, letzte, form, tj };
}

/* ---------- Team-Ligen (Basketball, Football …) ---------- */

// Ergebnis pro Viertel bzw. Halbzeit als kleine Tabelle
function abschnittTabelle(d, s) {
  const a = s.abschnitte || [];
  if (!a.length) return "";
  const kopf = a.map((_, i) => `<th>${i < 4 ? `${i + 1}.` : "VL"}</th>`).join("");
  const reihe = (v, i) => `<tr><th class="name">${esc(v?.name)}</th>${a.map((x) => `<td>${x[i]}</td>`).join("")}<td class="gesamt">${i ? s.toreGast : s.toreHeim}</td></tr>`;
  return `
    <table class="abschnitte">
      <thead><tr><th class="name">${a.length === 2 ? "Halbzeit" : "Viertel"}</th>${kopf}<th>Gesamt</th></tr></thead>
      <tbody>${reihe(d.verein(s.heim), 0)}${reihe(d.verein(s.gast), 1)}</tbody>
    </table>`;
}

function scorerListe(d, s) {
  const l = s.scorer || [];
  if (!l.length) return "";
  return `
    <div class="karte box">
      <h2>${s._sport === "Basketball" ? "Beste Werfer" : "Punkte"}</h2>
      <ol class="liste">${l.map((x) => { const sp = d.spielerById(x.spieler); return `<li><a href="spieler.html?id=${x.spieler}">${esc(sp?.name)}</a> <span class="leise">${esc(d.verein(sp?.verein)?.kurz)}, ${x.punkte} Punkte</span></li>`; }).join("")}</ol>
    </div>`;
}

// Bilanz des begleiteten Teams aus den eingetragenen Spielen
function bilanz(d, ligaId) {
  const vid = d.liga(ligaId).team;
  const spiele = d.gespielt.filter((s) => s.liga === ligaId && (s.heim === vid || s.gast === vid)).sort((a, b) => b.datum.localeCompare(a.datum));
  const r = { s: 0, n: 0, u: 0, fuer: 0, gegen: 0, form: [], spiele };
  spiele.forEach((s) => {
    const eig = s.heim === vid ? s.toreHeim : s.toreGast, geg = s.heim === vid ? s.toreGast : s.toreHeim;
    r.fuer += eig; r.gegen += geg;
    const e = eig > geg ? "S" : eig < geg ? "N" : "U";
    r[e.toLowerCase()]++;
    if (r.form.length < 5) r.form.push(e);
  });
  return r;
}

const formPunkte = (f) => f.length ? `<span class="form">${f.map((x) => `<span class="f-${x}" title="${x === "S" ? "Sieg" : x === "N" ? "Niederlage" : "Unentschieden"}">${x}</span>`).join("")}</span>` : "–";

function bilanzKarte(d, ligaId) {
  const l = d.liga(ligaId), b = bilanz(d, ligaId), t = d.verein(l.team);
  return `
    <div class="karte box bilanz">
      <h2>Bilanz ${esc(t?.kurz)}</h2>
      <div class="werte">
        <div><strong>${b.s}</strong>Siege</div>
        <div><strong>${b.n}</strong>Niederlagen</div>
        ${b.u ? `<div><strong>${b.u}</strong>Unentsch.</div>` : ""}
      </div>
      <p class="leise" style="margin:0 0 8px">Punkte ${b.fuer}:${b.gegen}, Form ${formPunkte(b.form)}</p>
      ${l.hinweis ? `<p style="margin:12px 0 0">${esc(l.hinweis)}</p>` : ""}
      ${l.tabelleLink ? `<p style="margin:12px 0 0"><a class="link" href="${esc(l.tabelleLink)}" target="_blank" rel="noopener">Tabelle beim Verband</a></p>` : ""}
    </div>`;
}

// Kader nach Positionen gruppiert, als Raster über die volle Breite
const POSITIONEN = ["Tor", "Abwehr", "Mittelfeld", "Sturm", "Guard", "Forward", "Center", "Quarterback", "Running Back", "Trainer"];
const POS_TITEL = { Tor: "Torhüter" };

function kaderHtml(d, v) {
  const kader = d.spieler.filter((s) => s.verein === v.id);
  const gruppen = [...new Set(kader.map((s) => s.position))]
    .sort((a, b) => (POSITIONEN.indexOf(a) + 1 || 99) - (POSITIONEN.indexOf(b) + 1 || 99));
  return `
    <section class="abschnitt" id="kader">
      <div class="abschnitt-kopf"><h2>Kader</h2>${kader.length ? `<span class="leise">${kader.length} Spieler</span>` : ""}</div>
      ${kader.length ? `<div class="karte kader">${gruppen.map((p) => `
        <div class="kader-gruppe">
          <h3>${esc(POS_TITEL[p] || p)}</h3>
          <div class="kader-raster">
            ${kader.filter((s) => s.position === p).sort((a, b) => a.nummer - b.nummer).map((s) => `
              <a class="kader-karte" href="spieler.html?id=${s.id}">
                ${portraet(s, "kader-bild")}
                <span class="kader-nr">${s.nummer}</span>
                <span class="kader-name">${esc(s.name)}</span>
              </a>`).join("")}
          </div>
        </div>`).join("")}</div>` : `<div class="karte box"><p class="leise" style="margin:0">Kader noch nicht eingetragen.</p></div>`}
    </section>`;
}

// Vereinswappen: Logo, wenn eingetragen (Feld "logo" in vereine.json), sonst ein Kürzel
function wappen(v, klasse = "") {
  if (!v) return `<span class="wappen leer ${klasse}" aria-hidden="true"></span>`;
  if (v.logo) return `<img class="wappen ${klasse}" src="${esc(v.logo)}" alt="" loading="lazy">`;
  const w = String(v.kurz || v.name).replace(/[^A-Za-zÄÖÜäöüß0-9 \-\/]/g, "").split(/[\s\-\/]+/).filter(Boolean);
  const kuerzel = (w.length > 1 ? w.map((x) => x[0]).join("") : w[0] || "").slice(0, 3).toUpperCase();
  return `<span class="wappen ${klasse}" aria-hidden="true"${v.farbe ? ` style="background:${esc(v.farbe)};color:#fff"` : ""}>${esc(kuerzel)}</span>`;
}

function berichtKarte(b) {
  const rot = b.kategorie === "Vorschau" ? " rot" : "";
  return `
    <a class="karte bericht-karte" href="bericht.html?id=${b.id}" data-sport="${esc(b._sport)}">
      ${foto(b.bild)}
      <div class="inhalt">
        <span class="kategorie${rot}">${esc(kategorieText(b, b.kategorie))}</span>
        <h3>${esc(b.titel)}</h3>
        <div class="datum">${datumMittel(b.datum)}</div>
      </div>
    </a>`;
}

const PLAY = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="rgba(13,31,120,0.85)"/><path d="M19 15l15 9-15 9z" fill="#fff"/></svg>`;

function videoKarte(v) {
  return `
    <a class="karte video-karte" href="video.html?id=${v.id}" data-sport="${esc(v._sport)}">
      <div class="video-bild">
        ${v.poster ? `<img src="${esc(v.poster)}" alt="" loading="lazy">` : ""}
        <span class="play">${PLAY}</span>
        <span class="dauer">${esc(v.dauer)}</span>
      </div>
      <div class="inhalt">
        <span class="kategorie rot">${esc(kategorieText(v, v.typ))}</span>
        <h3>${esc(v.titel)}</h3>
        <div class="datum">${datumMittel(v.datum)}</div>
      </div>
    </a>`;
}

function portraet(sp, klasse = "") {
  return foto(sp?.bild ? { src: sp.bild, titel: sp.name } : null, `portraet ${klasse}`);
}

function galerieKarte(g) {
  return `
    <a class="karte galerie-karte" href="galerie.html?id=${g.id}" data-sport="${esc(g._sport)}">
      <div style="position:relative">${foto(g.bilder[0])}<span class="anzahl">${g.bilder.length} Bilder</span></div>
      <div class="inhalt">
        ${sportMarke(g) ? `<span class="kategorie">${esc(sportMarke(g))}</span>` : ""}
        <h3>${esc(g.titel)}</h3>
        <div class="datum">${datumMittel(g.datum)}</div>
      </div>
    </a>`;
}

// Aktueller Spieltag: der zuletzt gespielte. Ab vier Tagen vor dem nächsten
// Spieltag (also ab Mittwoch vor einem Sonntag) springt die Anzeige auf den nächsten.
function aktuellerSpieltag(d, ligaId) {
  const spiele = d.spiele.filter((s) => s.liga === ligaId);
  const offen = spiele.filter((s) => !Number.isInteger(s.toreHeim)).sort((a, b) => a.datum.localeCompare(b.datum));
  const letzter = letzterSpieltag(d, ligaId);
  if (offen.length) {
    const naechster = offen[0];
    const umschalten = new Date(naechster.datum + "T00:00:00");
    umschalten.setDate(umschalten.getDate() - 4);
    if (!letzter || new Date() >= umschalten) return naechster.spieltag;
  }
  return letzter ?? Math.min(...spiele.map((s) => s.spieltag));
}

function letzterSpieltag(d, ligaId) {
  const tage = d.gespielt.filter((s) => s.liga === ligaId).map((s) => s.spieltag);
  return tage.length ? Math.max(...tage) : null;
}

function tabelle(d, ligaId) {
  const zeilen = {};
  d.vereine.filter((v) => v.liga === ligaId).forEach((v) => {
    zeilen[v.id] = { id: v.id, sp: 0, s: 0, u: 0, n: 0, tore: 0, gegen: 0, pkt: 0 };
  });
  d.gespielt.filter((s) => s.liga === ligaId).forEach((s) => {
    const h = zeilen[s.heim], g = zeilen[s.gast];
    if (!h || !g) return;
    h.sp++; g.sp++;
    h.tore += s.toreHeim; h.gegen += s.toreGast;
    g.tore += s.toreGast; g.gegen += s.toreHeim;
    if (s.toreHeim > s.toreGast) { h.s++; g.n++; h.pkt += 3; }
    else if (s.toreHeim < s.toreGast) { g.s++; h.n++; g.pkt += 3; }
    else { h.u++; g.u++; h.pkt++; g.pkt++; }
  });
  return Object.values(zeilen).sort((a, b) =>
    b.pkt - a.pkt || (b.tore - b.gegen) - (a.tore - a.gegen) || b.tore - a.tore);
}

function tabelleHtml(d, ligaId) {
  const z = tabelle(d, ligaId);
  return `
    <div class="karte tabelle-wrap"><table>
      <thead><tr><th></th><th>Verein</th><th class="zahl">Sp.</th><th class="zahl">S</th><th class="zahl">U</th><th class="zahl">N</th><th class="zahl">Tore</th><th class="zahl">Diff.</th><th class="zahl">Pkt.</th></tr></thead>
      <tbody>
        ${z.map((r, i) => `
          <tr>
            <td class="platz">${i + 1}</td>
            <td><a href="verein.html?id=${r.id}">${esc(d.verein(r.id)?.name)}</a></td>
            <td class="zahl">${r.sp}</td><td class="zahl">${r.s}</td><td class="zahl">${r.u}</td><td class="zahl">${r.n}</td>
            <td class="zahl">${r.tore}:${r.gegen}</td>
            <td class="zahl">${r.tore - r.gegen > 0 ? "+" : ""}${r.tore - r.gegen}</td>
            <td class="zahl punkte">${r.pkt}</td>
          </tr>`).join("")}
      </tbody>
    </table></div>
    <p class="leise">Tabelle berechnet aus den eingetragenen Ergebnissen.</p>`;
}

function torjaeger(d, filter = () => true) {
  const zahl = {};
  d.gespielt.filter(filter).forEach((s) => (s.tore || []).forEach((t) => {
    if (t.spieler) zahl[t.spieler] = (zahl[t.spieler] || 0) + 1;
  }));
  return Object.entries(zahl).sort((a, b) => b[1] - a[1]);
}

function torjaegerListe(d, eintraege) {
  return `<ol class="liste">${eintraege.map(([id, n], i) => {
    const sp = d.spielerById(id);
    return `<li><span class="rang">${i + 1}</span><a href="spieler.html?id=${id}">${esc(sp?.name)}</a> <span class="leise">${esc(d.verein(sp?.verein)?.kurz)}, ${n} ${n === 1 ? "Tor" : "Tore"}</span></li>`;
  }).join("") || "<li>Noch keine Tore eingetragen.</li>"}</ol>`;
}

/* ---------- Sport-Filter (erscheint erst ab zwei Sportarten) ---------- */

function sportFilter(items) {
  const arten = [...new Set(items.map((x) => x._sport))].sort((a, b) => (a === "Fußball" ? -1 : b === "Fußball" ? 1 : a.localeCompare(b)));
  if (arten.length < 2) return "";
  return `<div class="liga-reiter sport-filter" role="group" aria-label="Sportart wählen">
    <button type="button" data-filter="" aria-pressed="true">Alle</button>
    ${arten.map((a) => `<button type="button" data-filter="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join("")}
  </div>`;
}

function sportFilterAktivieren() {
  const knoepfe = $$(".sport-filter button");
  knoepfe.forEach((b) => b.addEventListener("click", () => {
    knoepfe.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const f = b.dataset.filter;
    $$("#inhalt [data-sport]").forEach((el) => { el.hidden = !!f && el.dataset.sport !== f; });
    // Abschnitte ohne sichtbare Karten ausblenden
    $$("#inhalt section.abschnitt").forEach((sec) => {
      const karten = $$("[data-sport]", sec);
      if (karten.length) sec.hidden = karten.every((k) => k.hidden);
    });
  }));
}

/* ---------- Suche ---------- */

const norm = (s) => String(s ?? "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function suchIndex(d) {
  const e = [];
  d.vereine.forEach((v) => e.push({ typ: "Verein", titel: v.name, unter: [v.ort, d.liga(v.liga)?.name].filter(Boolean).join(", "), href: `verein.html?id=${v.id}`, text: [v.name, v.kurz, v.ort], rang: 3 }));
  d.spieler.forEach((sp) => e.push({ typ: "Spieler", titel: sp.name, unter: `${d.verein(sp.verein)?.name}, ${sp.position}`, href: `spieler.html?id=${sp.id}`, bild: sp.bild || "", text: [sp.name, d.verein(sp.verein)?.kurz], rang: 3, id: sp.id }));
  d.ligen.forEach((l) => e.push({ typ: "Liga", titel: l.name, unter: `${l.sportart}, Saison ${l.saison}`, href: l.team ? `verein.html?id=${l.team}` : `liga.html?id=${l.id}`, text: [l.name, l.kurz, l.sportart], rang: 2 }));
  d.berichte.forEach((b) => { const s = b.spiel && d.spiel(b.spiel); e.push({ typ: "News", titel: b.titel, unter: datumMittel(b.datum), href: `bericht.html?id=${b.id}`, text: [b.titel, b.teaser, s && d.verein(s.heim)?.name, s && d.verein(s.gast)?.name], rang: 1 }); });
  d.videos.forEach((v) => { const s = v.spiel && d.spiel(v.spiel); e.push({ typ: "Video", titel: v.titel, unter: `${v.typ}, ${v.dauer}`, href: `video.html?id=${v.id}`, text: [v.titel, s && d.verein(s.heim)?.name, s && d.verein(s.gast)?.name], rang: 1, video: v }); });
  d.galerien.forEach((g) => e.push({ typ: "Bilder", titel: g.titel, unter: `${g.bilder.length} Bilder, ${datumMittel(g.datum)}`, href: `galerie.html?id=${g.id}`, text: [g.titel], rang: 1, galerie: g }));
  e.forEach((x) => { x.n = norm(x.text.filter(Boolean).join(" ")); });
  return e;
}

function suchen(index, q) {
  const woerter = norm(q).split(/\s+/).filter((w) => w.length > 1);
  if (!woerter.length) return [];
  return index
    .filter((x) => woerter.every((w) => x.n.includes(w)))
    .map((x) => ({ ...x, punkte: x.rang * 10 + (woerter.some((w) => norm(x.titel).startsWith(w)) ? 5 : 0) }))
    .sort((a, b) => b.punkte - a.punkte);
}

/* ---------- Seiten ---------- */

const seiten = {
  start(d) {
    const [haupt, ...rest] = [
      ...d.berichteSortiert.filter((b) => b.haupt),
      ...d.berichteSortiert.filter((b) => !b.haupt)
    ];
    const unter = rest.slice(0, 3);

    // Ergebnis-Reiter: je Fußball-Liga der letzte Spieltag, andere Sportarten nur, wenn sie an diesem Wochenende gespielt haben
    const juengst = d.gespielt.filter((s) => !d.teamLiga(s.liga)).map((s) => s.datum).sort().pop();
    const grenze = juengst ? new Date(juengst + "T12:00:00") - 7 * 864e5 : 0;
    const ergFelder = d.ligenSichtbar.map((l) => {
      if (l.team) {
        const sp = d.gespielt.filter((s) => s.liga === l.id && new Date(s.datum + "T12:00:00") >= grenze).sort((a, b) => b.datum.localeCompare(a.datum));
        return sp.length ? { l, label: l.sportart, href: `verein.html?id=${l.team}`, spiele: sp } : null;
      }
      const t = letzterSpieltag(d, l.id);
      return t ? { l, label: `${l.kurz}, ${t}. Spieltag`, href: `liga.html?id=${l.id}`, spiele: d.gespielt.filter((s) => s.liga === l.id && s.spieltag === t) } : null;
    }).filter(Boolean);
    const naechste = d.spiele.filter((s) => !Number.isInteger(s.toreHeim)).sort((a, b) => a.datum.localeCompare(b.datum));
    const gals = [...d.galerien].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 4);

    return `
      ${haupt ? `
        <article class="karte aufmacher">
          <a href="bericht.html?id=${haupt.id}" tabindex="-1" aria-hidden="true">${foto(haupt.bild)}</a>
          <div class="aufmacher-text">
            <span class="kategorie">${esc(haupt.kategorie)}</span>
            <a href="bericht.html?id=${haupt.id}"><h1>${esc(haupt.titel)}</h1></a>
            <p>${esc(haupt.teaser)}</p>
          </div>
        </article>` : ""}

      ${unter.length ? `<div class="raster raster-unter">${unter.map(berichtKarte).join("")}</div>` : ""}

      ${ergFelder.length ? `
        <section class="abschnitt" aria-labelledby="erg-titel">
          <div class="abschnitt-kopf"><h2 id="erg-titel">Ergebnisse</h2><a href="${ergFelder[0].href}" id="erg-link">Tabelle und alle Spiele</a></div>
          <div class="liga-reiter" role="group" aria-label="Liga wählen">
            ${ergFelder.map((f, i) => `<button type="button" data-liga="${f.l.id}" data-href="${f.href}" data-linktext="${f.l.team ? "Alle Spiele des Teams" : "Tabelle und alle Spiele"}"${f.l.team ? ' class="andere-sportart"' : ""} aria-pressed="${i === 0}">${esc(f.label)}</button>`).join("")}
          </div>
          ${ergFelder.map((f, i) => `
            <div class="ergebnis-streifen" data-liga-feld="${f.l.id}"${i === 0 ? "" : " hidden"}>
              ${f.spiele.map((s) => spielKarte(d, s)).join("")}
            </div>`).join("")}
        </section>` : ""}

      ${d.videos.length ? `
        <section class="abschnitt" aria-labelledby="hl-titel">
          <div class="abschnitt-kopf"><h2 id="hl-titel">Highlights</h2><a href="highlights.html">Alle Videos</a></div>
          <div class="raster vier">${d.videosSortiert.slice(0, 4).map(videoKarte).join("")}</div>
        </section>` : ""}

      ${gals.length ? `
        <section class="abschnitt" aria-labelledby="bilder-titel">
          <div class="abschnitt-kopf"><h2 id="bilder-titel">Bilder vom Wochenende</h2><a href="galerien.html">Alle Galerien</a></div>
          <div class="raster vier">${gals.map(galerieKarte).join("")}</div>
        </section>` : ""}

      ${naechste.length ? `
        <section class="abschnitt" aria-labelledby="naechste-titel">
          <div class="abschnitt-kopf"><h2 id="naechste-titel">Nächste Spiele</h2></div>
          <div class="ergebnis-streifen">${naechste.slice(0, 8).map((s) => spielKarte(d, s)).join("")}</div>
        </section>` : ""}`;
  },

  nachStart() {
    // Liga-Reiter auf der Startseite
    const reiter = $$(".liga-reiter button");
    reiter.forEach((b) => b.addEventListener("click", () => {
      reiter.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("[data-liga-feld]").forEach((f) => { f.hidden = f.dataset.ligaFeld !== b.dataset.liga; });
      const link = $("#erg-link");
      if (link) { link.href = b.dataset.href; link.textContent = b.dataset.linktext; }
    }));
  },

  ligen(d) {
    return `
      <div class="seitenkopf"><h1>Ligen</h1><p>Ergebnisse, Tabellen und Torjäger aller abgedeckten Ligen.</p></div>
      <div class="raster">
        ${d.ligenSichtbar.map((l) => `
          <a class="karte box bericht-karte" href="${l.team ? `verein.html?id=${l.team}` : `liga.html?id=${l.id}`}">
            <span class="kategorie">${esc(l.sportart)}</span>
            <h3>${esc(l.team ? d.verein(l.team)?.name : l.name)}</h3>
            <div class="datum">${l.team ? `${esc(l.name)}, wir begleiten das Team` : `Saison ${esc(l.saison)}, ${d.vereine.filter((v) => v.liga === l.id).length} Vereine`}</div>
          </a>`).join("")}
      </div>`;
  },

  liga(d) {
    const l = d.liga(param("id"));
    if (!l) return nichtGefunden("Liga");
    if (l.team) { location.replace(`verein.html?id=${l.team}`); return ""; }
    document.title = `${l.name} | ${d.site.name}`;
    const tage = [...new Set(d.spiele.filter((s) => s.liga === l.id).map((s) => s.spieltag))].sort((a, b) => a - b);
    const start = aktuellerSpieltag(d, l.id);
    return `
      <div class="seitenkopf"><span class="kategorie">${esc(l.sportart)}, Saison ${esc(l.saison)}</span><h1>${esc(l.name)}</h1></div>
      <div class="zwei">
        <div>
          <section id="spieltage" class="karte" data-tage="${tage.join(",")}" data-aktuell="${start}">
            <div class="spieltag-kopf">
              <h2 id="spieltag-titel"></h2>
              <div class="blaetter-knoepfe">
                <button type="button" class="blaettern" data-richtung="-1" aria-label="Vorheriger Spieltag">${PFEIL}</button>
                <button type="button" class="blaettern" data-richtung="1" aria-label="Nächster Spieltag">${PFEIL}</button>
              </div>
            </div>
            ${tage.map((t) => `
              <div class="spiel-liste" data-spieltag="${t}" hidden>
                ${d.spiele.filter((s) => s.liga === l.id && s.spieltag === t).map((s) => spielZeile(d, s)).join("")}
              </div>`).join("")}
          </section>
          <section class="abschnitt">
            <div class="abschnitt-kopf"><h2>Tabelle</h2></div>
            ${tabelleHtml(d, l.id)}
          </section>
        </div>
        <aside>
          <div class="karte box"><h2>Torjäger</h2>${torjaegerListe(d, torjaeger(d, (s) => s.liga === l.id).slice(0, 10))}</div>
        </aside>
      </div>`;
  },

  nachLiga() {
    const feld = $("#spieltage");
    if (!feld) return;
    const tage = feld.dataset.tage.split(",").map(Number);
    let i = tage.indexOf(Number(feld.dataset.aktuell));
    const zeigen = () => {
      const t = tage[i];
      $$("[data-spieltag]", feld).forEach((el) => { el.hidden = Number(el.dataset.spieltag) !== t; });
      $("#spieltag-titel").textContent = `${t}. Spieltag`;
      $$(".blaettern", feld).forEach((b) => { b.disabled = (b.dataset.richtung === "-1" && i === 0) || (b.dataset.richtung === "1" && i === tage.length - 1); });
    };
    $$(".blaettern", feld).forEach((b) => b.addEventListener("click", () => { i += Number(b.dataset.richtung); zeigen(); }));
    zeigen();
  },

  berichte(d) {
    return `
      <div class="seitenkopf"><h1>News</h1><p>Spielberichte, Vorschauen und Geschichten aus dem Amateursport der Region.</p></div>
      ${sportFilter(d.berichte)}
      <div class="raster">${d.berichteSortiert.map(berichtKarte).join("")}</div>`;
  },

  bericht(d) {
    const b = d.berichte.find((x) => x.id === param("id"));
    if (!b) return nichtGefunden("Bericht");
    document.title = `${b.titel} | ${d.site.name}`;
    const s = b.spiel && d.spiel(b.spiel);
    const weitere = d.berichteSortiert.filter((x) => x.id !== b.id).slice(0, 3);
    return `
      <div class="zwei" style="margin-top:32px">
        <article class="artikel">
          <span class="kategorie${b.kategorie === "Vorschau" ? " rot" : ""}">${esc(b.kategorie)}</span>
          <h1 style="font-size:clamp(28px,4vw,42px);line-height:1.12;font-weight:600;margin:8px 0 10px">${esc(b.titel)}</h1>
          <p class="leise" style="font-size:15px">${datumLang(b.datum)}</p>
          ${foto(b.bild)}
          ${b.bild?.titel ? `<div class="bildtext">${esc(b.bild.titel)}</div>` : ""}
          <p class="einleitung">${esc(b.teaser)}</p>
          ${(b.text || []).map((t) => `<p>${esc(t)}</p>`).join("")}
          ${s?.galerie ? `<p><a class="knopf" href="galerie.html?id=${s.galerie}">Alle Bilder vom Spiel</a></p>` : ""}
        </article>
        <aside>
          ${s ? `<div class="abschnitt-kopf"><h2>Das Spiel</h2></div>${spielKarte(d, s)}` : ""}
          ${weitere.length ? `<div class="abschnitt-kopf abschnitt"><h2>Weitere News</h2></div><div style="display:grid;gap:20px">${weitere.map(berichtKarte).join("")}</div>` : ""}
        </aside>
      </div>`;
  },

  vereine(d) {
    return `
      <div class="seitenkopf"><h1>Vereine</h1><p>Kader, Spiele und Bilder jedes Vereins, sortiert nach Liga.</p></div>
      ${d.ligenSichtbar.map((l) => `
        <section class="abschnitt">
          <div class="abschnitt-kopf"><h2>${l.team ? esc(l.sportart) : esc(l.name)}</h2></div>
          <div class="karte vereins-raster">
            ${d.vereine.filter((v) => (l.team ? v.id === l.team : v.liga === l.id)).sort((x, y) => x.name.localeCompare(y.name, "de")).map((v) => `<a href="verein.html?id=${v.id}">${v.farbe ? `<span class="vereinspunkt" style="display:inline-block;margin-right:8px;background:${esc(v.farbe)}"></span>` : ""}${esc(v.name)}</a>`).join("")}
          </div>
        </section>`).join("")}`;
  },

  verein(d) {
    const v = d.verein(param("id"));
    if (!v) return nichtGefunden("Verein");
    document.title = `${v.name} | ${d.site.name}`;
    const spiele = d.spiele.filter((s) => s.heim === v.id || s.gast === v.id).sort((a, b) => b.datum.localeCompare(a.datum));
    const gals = d.galerien.filter((g) => { const s = d.spiel(g.spiel); return s && (s.heim === v.id || s.gast === v.id); });
    const news = d.berichteSortiert.filter((b) => { const s = b.spiel && d.spiel(b.spiel); return s && (s.heim === v.id || s.gast === v.id); });
    const l = d.liga(v.liga);
    const teamModus = !!l?.team, unserTeam = l?.team === v.id;
    const z = teamModus ? null : teamZahlen(d, v.liga, v.id);

    // Spiele: nächstes Spiel und die letzten fünf sichtbar, der Rest hinter einem Knopf
    const offen = spiele.filter((s) => !Number.isInteger(s.toreHeim)).reverse();
    const gespielt = spiele.filter((s) => Number.isInteger(s.toreHeim));
    const sichtbar = new Set([...offen.slice(0, 1), ...gespielt.slice(0, 5)]);
    const spielListe = `
      <div class="karte">
        <div class="spiel-liste">
          ${spiele.map((s) => `<div${sichtbar.has(s) ? "" : ' class="mehr-spiele" hidden'}>${spielZeile(d, s)}</div>`).join("") || `<p class="leise" style="padding:16px 20px;margin:0">Noch keine Spiele eingetragen.</p>`}
        </div>
        ${spiele.length > sichtbar.size ? `<button type="button" class="alle-zeigen" data-ziel="mehr-spiele" data-text="Weniger anzeigen">Alle ${spiele.length} Spiele anzeigen</button>` : ""}
      </div>`;

    const infoKarte = teamModus ? (unserTeam ? bilanzKarte(d, l.id) : `
      <div class="karte box"><p style="margin:0">In der ${esc(l.name)} begleiten wir die ${vereinLink(d, l.team)}. Hier stehen die Spiele gegen sie.</p></div>`) : `
      <div class="karte box bilanz">
        <h2>${esc(l?.kurz)}</h2>
        <div class="werte">
          <div><strong>${z.platz || "–"}.</strong>Platz</div>
          <div><strong>${z.zeile.pkt ?? 0}</strong>Punkte</div>
          <div><strong>${z.zeile.tore ?? 0}:${z.zeile.gegen ?? 0}</strong>Tore</div>
        </div>
        <p class="leise" style="margin:0 0 12px">Form ${formPunkte(z.form)}</p>
        <a class="link" href="liga.html?id=${l.id}">Zur Tabelle</a>
      </div>`;

    return `
      <div class="seitenkopf">
        <span class="kategorie">${teamModus ? `${esc(l.sportart)}, ` : ""}${esc(l?.name)}</span>
        <h1>${esc(v.name)}</h1>
        ${v.ort ? `<p>${esc(v.ort)}</p>` : ""}
      </div>
      <div class="zwei">
        <div>
          <div class="abschnitt-kopf"><h2>Spiele</h2></div>
          ${spielListe}
          ${news.length ? `<div class="abschnitt"><div class="abschnitt-kopf"><h2>News</h2></div><div class="raster">${news.slice(0, 3).map(berichtKarte).join("")}</div></div>` : ""}
        </div>
        <aside>
          ${infoKarte}
          ${teamModus && !unserTeam ? "" : `<div class="karte" style="margin-top:24px">${foto({ titel: "Mannschaftsfoto" })}</div>`}
        </aside>
      </div>
      ${teamModus && !unserTeam ? "" : kaderHtml(d, v)}
      ${gals.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Bilder</h2><a href="galerien.html">Alle Galerien</a></div><div class="raster vier">${gals.map(galerieKarte).join("")}</div></section>` : ""}`;
  },

  spieler(d) {
    const sp = d.spielerById(param("id"));
    if (!sp) return nichtGefunden("Spieler");
    document.title = `${sp.name} | ${d.site.name}`;
    const eigeneTore = [];
    d.gespielt.forEach((s) => (s.tore || []).forEach((t) => { if (t.spieler === sp.id) eigeneTore.push({ s, t }); }));
    const einsaetze = d.gespielt.filter((s) => s.heim === sp.verein || s.gast === sp.verein).length;
    const punkteSpiele = [];
    d.gespielt.forEach((s) => (s.scorer || []).forEach((x) => { if (x.spieler === sp.id) punkteSpiele.push({ s, x }); }));
    const mitPunkten = d.teamLiga(d.verein(sp.verein)?.liga);
    const summe = punkteSpiele.reduce((a, { x }) => a + x.punkte, 0);
    const bilder = [];
    d.galerien.forEach((g) => g.bilder.forEach((b) => { if ((b.stichwoerter || []).includes(sp.id)) bilder.push({ g, b }); }));
    return `
      <div class="seitenkopf"><span class="kategorie">${esc(d.verein(sp.verein)?.name)}</span><h1>${esc(sp.name)}</h1></div>
      <div class="karte box profil">
        ${portraet(sp, "hoch")}
        <div>
          <div class="rueckennummer">${sp.nummer}</div>
          <p class="leise">${esc(sp.position)}, ${vereinLink(d, sp.verein)}</p>
          <div class="werte">
            ${mitPunkten
              ? `<div><strong>${summe}</strong>Punkte</div><div><strong>${punkteSpiele.length ? (summe / punkteSpiele.length).toFixed(1).replace(".", ",") : "0"}</strong>pro Spiel</div>`
              : `<div><strong>${eigeneTore.length}</strong>Tore</div>`}
            <div><strong>${einsaetze}</strong>Spiele des Vereins</div>
          </div>
          <ul class="torliste">
            ${mitPunkten
              ? punkteSpiele.map(({ s, x }) => `<li><span class="min">${x.punkte}</span><a class="link" href="spiel.html?id=${s.id}">${esc(d.verein(s.heim)?.kurz)} gegen ${esc(d.verein(s.gast)?.kurz)}</a> <span class="leise">${datumMittel(s.datum)}</span></li>`).join("") || "<li>Noch keine Punkte eingetragen.</li>"
              : eigeneTore.map(({ s, t }) => `<li><span class="min">${t.min}'</span><a class="link" href="spiel.html?id=${s.id}">${esc(d.verein(s.heim)?.kurz)} gegen ${esc(d.verein(s.gast)?.kurz)}</a> <span class="leise">${datumMittel(s.datum)}</span></li>`).join("") || "<li>Noch keine Tore.</li>"}
          </ul>
        </div>
      </div>
      ${(() => {
        const ws = d.wechsel.filter((w) => w.spieler === sp.id);
        return ws.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Transfers</h2></div><div class="karte box"><ul class="liste">${ws.map((w) => `<li>${w.von ? `${vereinLink(d, w.von)} → ` : ""}${vereinLink(d, w.zu)} <span class="leise">${datumMittel(w.datum)}</span></li>`).join("")}</ul></div></section>` : "";
      })()}
      ${bilder.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Bilder</h2></div><div class="bilderraster">${bilder.map(({ g, b }) => `<a href="galerie.html?id=${g.id}"><figure>${foto(b)}<figcaption>${esc(b.titel)}</figcaption></figure></a>`).join("")}</div></section>` : ""}`;
  },

  spiel(d) {
    const s = d.spiel(param("id"));
    if (!s) return nichtGefunden("Spiel");
    const h = d.verein(s.heim), g = d.verein(s.gast);
    document.title = `${h?.name} gegen ${g?.name} | ${d.site.name}`;
    const gespielt = Number.isInteger(s.toreHeim);
    const gal = s.galerie && d.galerie(s.galerie);
    const bericht = d.berichte.find((b) => b.spiel === s.id);
    const videos = d.videos.filter((v) => v.spiel === s.id);
    const l = d.liga(s.liga), teamModus = !!l?.team;
    if (teamModus) return spielTeamModus(d, s, { h, g, gespielt, gal, bericht, videos, l });
    const zh = teamZahlen(d, s.liga, s.heim), zg = teamZahlen(d, s.liga, s.gast);

    const vergleich = `
      <div class="karte vergleich">
        <div class="v-kopf"><span>${esc(h?.kurz)}</span><h2>Vergleich</h2><span>${esc(g?.kurz)}</span></div>
        ${[
          ["Tabellenplatz", `${zh.platz}.`, `${zg.platz}.`],
          ["Punkte", zh.zeile.pkt ?? 0, zg.zeile.pkt ?? 0],
          ["Tore", `${zh.zeile.tore ?? 0}:${zh.zeile.gegen ?? 0}`, `${zg.zeile.tore ?? 0}:${zg.zeile.gegen ?? 0}`],
          ["Form", formPunkte(zh.form), formPunkte(zg.form)]
        ].map(([t, a, b]) => `<div class="v-zeile"><span class="a">${a}</span><span class="t">${t}</span><span class="b">${b}</span></div>`).join("")}
      </div>`;
    const letzteSpiele = (z, v) => `
      <div class="karte">
        <div class="spieltag-kopf"><h2 style="font-size:20px">Letzte Spiele ${esc(v?.kurz)}</h2></div>
        <div class="spiel-liste">${z.letzte.map((x) => spielZeile(d, x)).join("") || `<p class="leise" style="padding:0 20px 16px">Noch keine Spiele.</p>`}</div>
      </div>`;
    const torjaegerTeams = (zh.tj.length || zg.tj.length) ? `
      <div class="karte box">
        <h2>Torjäger</h2>
        <ol class="liste">${[...zh.tj, ...zg.tj].sort((a, b) => b[1] - a[1]).map(([id, n]) => { const sp = d.spielerById(id); return `<li><a href="spieler.html?id=${id}">${esc(sp.name)}</a> <span class="leise">${esc(d.verein(sp.verein)?.kurz)}, ${n} ${n === 1 ? "Tor" : "Tore"}</span></li>`; }).join("")}</ol>
      </div>` : "";

    return `
      <div class="seitenkopf"><span class="kategorie">${esc(d.liga(s.liga)?.name)}, ${s.spieltag}. Spieltag</span><p>${datumLang(s.datum)}, ${esc(s.anstoss)} Uhr</p></div>
      <div class="spielkopf">
        <div class="team"><a href="verein.html?id=${h?.id}">${esc(h?.name)}</a></div>
        <span class="stand${gespielt ? "" : " offen"}">${gespielt ? `${s.toreHeim}:${s.toreGast}` : esc(s.anstoss)}</span>
        <div class="team"><a href="verein.html?id=${g?.id}">${esc(g?.name)}</a></div>
      </div>
      ${gespielt ? `<div class="karte verlauf-karte">${torVerlauf(d, s)}</div>` : ""}
      <div class="zwei abschnitt">
        <div>
          ${gespielt ? `
            ${s.bericht ? `<div class="abschnitt-kopf"><h2>Kurzbericht</h2></div><p style="font-size:19px;margin:0 0 12px">${esc(s.bericht)}</p>` : ""}
            ${bericht ? `<p><a class="link" href="bericht.html?id=${bericht.id}">Zum ausführlichen Bericht</a></p>` : ""}
            ${!s.bericht && !bericht && !gal && !videos.length ? `<p class="leise">Bericht, Bilder und Videos gibt es von den Spielen, bei denen wir vor Ort waren.</p>` : ""}
          ` : `
            <div class="abschnitt-kopf"><h2>Vorschau</h2></div>
            ${bericht ? `<a class="karte bericht-zeile" href="bericht.html?id=${bericht.id}"><span class="kategorie rot">${esc(bericht.kategorie)}</span><h3>${esc(bericht.titel)}</h3><p class="leise">${esc(bericht.teaser)}</p></a>` : ""}
            <div class="zwei-gleich">${letzteSpiele(zh, h)}${letzteSpiele(zg, g)}</div>
          `}
          ${videos.length ? `
            <div class="abschnitt">
              <div class="abschnitt-kopf"><h2>Videos</h2></div>
              <div class="raster zwei-spalten">${videos.map(videoKarte).join("")}</div>
            </div>` : ""}
          ${gal ? `
            <div class="abschnitt">
              <div class="abschnitt-kopf"><h2>Bilder</h2><a href="galerie.html?id=${gal.id}">Alle ${gal.bilder.length} Bilder</a></div>
              <div class="bilderraster">${gal.bilder.slice(0, 3).map((b) => `<figure>${foto(b)}<figcaption>${esc(b.titel)}</figcaption></figure>`).join("")}</div>
            </div>` : ""}
        </div>
        <aside>
          ${vergleich}
          ${gespielt ? "" : torjaegerTeams}
          <p style="margin-top:16px"><a class="link" href="liga.html?id=${s.liga}">Zur Tabelle der ${esc(d.liga(s.liga)?.kurz)}</a></p>
        </aside>
      </div>`;
  },

  galerien(d) {
    const gals = [...d.galerien].sort((a, b) => b.datum.localeCompare(a.datum));
    return `
      <div class="seitenkopf"><h1>Bilder</h1><p>Galerien von jedem Spiel, bei dem wir vor Ort waren. Vereine dürfen die Bilder auf ihren offiziellen Kanälen nutzen, wenn sie uns markieren.</p></div>
      ${sportFilter(gals)}
      <div class="raster vier">${gals.map(galerieKarte).join("")}</div>`;
  },

  galerie(d) {
    const g = d.galerie(param("id"));
    if (!g) return nichtGefunden("Galerie");
    document.title = `${g.titel} | ${d.site.name}`;
    return `
      <div class="seitenkopf"><span class="kategorie">${datumLang(g.datum)}</span><h1>${esc(g.titel)}</h1><p>${g.bilder.length} Bilder, Fotos: ${esc(g.fotograf)}${g.spiel ? `. <a class="link" href="spiel.html?id=${g.spiel}">Zum Spiel</a>` : ""}</p></div>
      <div class="bilderraster">${g.bilder.map((b) => `<figure>${foto(b)}<figcaption>${esc(b.titel)}</figcaption></figure>`).join("")}</div>`;
  },

  transfers(d) {
    const liste = [...d.wechsel].sort((a, b) => b.datum.localeCompare(a.datum));
    const monat = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const PRO_SEITE = 25;
    let letzter = "";
    const zeilen = liste.map((w, i) => {
      const versteckt = i >= PRO_SEITE ? ` data-nr="${i}" hidden` : "";
      const sp = w.spieler && d.spielerById(w.spieler);
      const news = w.news && d.berichte.find((b) => b.id === w.news);
      const m = monat(w.datum);
      const kopf = m !== letzter ? `<div class="monat"${versteckt}>${m}</div>` : "";
      letzter = m;
      return `${kopf}
        <div class="wechsel-zeile"${versteckt}>
          <div>
            <span class="kategorie">${esc(w.typ)}${(sp?.position || w.position) ? `, ${esc(sp?.position || w.position)}` : ""}</span>
            <div class="wechsel-name">${sp ? `<a class="link" href="spieler.html?id=${sp.id}">${esc(sp.name)}</a>` : esc(w.name)}</div>
          </div>
          <div class="vereine">
            ${w.von
              ? `<a class="verein-von" href="verein.html?id=${w.von}">${wappen(d.verein(w.von))}<span class="lang">${esc(d.verein(w.von)?.name)}</span><span class="kurz">${esc(d.verein(w.von)?.kurz)}</span></a>`
              : `<span class="verein-von leise"><span>neu</span></span>`}
            <span class="pfeil-rechts" aria-label="wechselt zu">→</span>
            <a class="ziel" href="verein.html?id=${w.zu}">${wappen(d.verein(w.zu))}<span class="lang">${esc(d.verein(w.zu)?.name)}</span><span class="kurz">${esc(d.verein(w.zu)?.kurz)}</span></a>
          </div>
          <div class="rechts">
            <div class="leise">${datumMittel(w.datum)}</div>
            ${news ? `<a class="link" href="bericht.html?id=${news.id}">Zur News</a>` : ""}
          </div>
        </div>`;
    }).join("");
    return `
      <div class="seitenkopf"><h1>Transfers</h1><p>Spieler- und Trainerwechsel der Region, neueste zuerst.</p></div>
      <div class="karte wechsel-tabelle">
        ${zeilen}
        ${liste.length > PRO_SEITE ? `<button type="button" class="alle-zeigen" id="weitere-transfers">Weitere Transfers laden</button>` : ""}
      </div>`;
  },

  highlights(d) {
    const typen = [...new Set(d.videos.map((v) => v.typ))];
    return `
      <div class="seitenkopf"><h1>Highlights</h1><p>Tore, Szenen und Spieltage im Video.</p></div>
      ${sportFilter(d.videos)}
      ${typen.map((t) => `
        <section class="abschnitt">
          <div class="abschnitt-kopf"><h2>${t === "Tor" ? "Einzelne Tore" : t === "Spieltag" ? "Spieltag in 30 Sekunden" : "Spiel-Highlights"}</h2></div>
          <div class="raster vier">${d.videosSortiert.filter((v) => v.typ === t).map(videoKarte).join("")}</div>
        </section>`).join("")}`;
  },

  video(d) {
    const v = d.videos.find((x) => x.id === param("id"));
    if (!v) return nichtGefunden("Video");
    document.title = `${v.titel} | ${d.site.name}`;
    const s = v.spiel && d.spiel(v.spiel);
    const weitere = d.videosSortiert.filter((x) => x.id !== v.id).slice(0, 4);
    return `
      <div class="seitenkopf"><span class="kategorie rot">${esc(v.typ)}</span><h1>${esc(v.titel)}</h1><p>${datumLang(v.datum)}, ${esc(v.dauer)} Minuten</p></div>
      <div class="zwei">
        <div>
          ${v.src
            ? `<video class="player" src="${esc(v.src)}" ${v.poster ? `poster="${esc(v.poster)}"` : ""} controls playsinline preload="metadata"></video>`
            : `<div class="video-bild player"><span class="play">${PLAY}</span><span class="foto-leer" style="align-items:end;padding-bottom:20%">Video folgt</span></div>`}
        </div>
        <aside>${s ? `<div class="abschnitt-kopf"><h2>Das Spiel</h2></div>${spielKarte(d, s)}` : v.liga ? `<p><a class="link" href="liga.html?id=${v.liga}">Zur Tabelle</a></p>` : ""}</aside>
      </div>
      ${weitere.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Weitere Highlights</h2></div><div class="raster vier">${weitere.map(videoKarte).join("")}</div></section>` : ""}`;
  },

  suche(d) {
    const q = param("q") || "";
    document.title = `Suche: ${q} | ${d.site.name}`;
    const treffer = suchen(suchIndex(d), q);
    const gruppe = (typ) => treffer.filter((t) => t.typ === typ);
    const spieler = gruppe("Spieler"), vereine = gruppe("Verein");
    // Bilder: Fotos, auf denen gefundene Spieler markiert sind, plus Galerien gefundener Vereine
    const bilder = [];
    d.galerien.forEach((g) => g.bilder.forEach((b) => {
      if (spieler.some((sp) => (b.stichwoerter || []).includes(sp.id))) bilder.push({ g, b });
    }));
    const vereinIds = vereine.map((v) => v.href.split("=")[1]);
    const gals = [...gruppe("Bilder").map((t) => t.galerie), ...d.galerien.filter((g) => { const s = d.spiel(g.spiel); return s && (vereinIds.includes(s.heim) || vereinIds.includes(s.gast)); })]
      .filter((g, i, a) => a.indexOf(g) === i);
    const videos = [...gruppe("Video").map((t) => t.video), ...d.videos.filter((v) => { const s = v.spiel && d.spiel(v.spiel); return s && (vereinIds.includes(s.heim) || vereinIds.includes(s.gast)); })]
      .filter((v, i, a) => a.indexOf(v) === i);
    const news = gruppe("News"), ligen = gruppe("Liga");
    const nichts = !treffer.length && !bilder.length && !gals.length && !videos.length;
    const liste = (arr) => `<div class="karte box"><ul class="liste">${arr.map((t) => `<li class="kader-zeile">${t.bild !== undefined ? portraet({ bild: t.bild }, "mini") : ""}<a href="${t.href}"><strong>${esc(t.titel)}</strong></a> <span class="leise">${esc(t.unter)}</span></li>`).join("")}</ul></div>`;
    return `
      <div class="seitenkopf"><h1>${q ? `Suche nach „${esc(q)}“` : "Suche"}</h1>
        <p>${q ? (nichts ? "Keine Treffer. Probier einen Vereinsnamen, Ort oder Nachnamen." : "Teams, Spieler, News, Videos und Bilder.") : "Gib oben rechts ein Team oder einen Spieler ein."}</p></div>
      ${vereine.length || spieler.length ? `
        <div class="raster zwei-spalten">
          ${vereine.length ? `<section><div class="abschnitt-kopf"><h2>Teams</h2></div>${liste(vereine)}</section>` : ""}
          ${spieler.length ? `<section><div class="abschnitt-kopf"><h2>Spieler</h2></div>${liste(spieler)}</section>` : ""}
        </div>` : ""}
      ${ligen.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Ligen</h2></div>${liste(ligen)}</section>` : ""}
      ${videos.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Highlights</h2></div><div class="raster vier">${videos.map(videoKarte).join("")}</div></section>` : ""}
      ${bilder.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Bilder</h2></div><div class="bilderraster">${bilder.map(({ g, b }) => `<a href="galerie.html?id=${g.id}"><figure>${foto(b)}<figcaption>${esc(b.titel)}</figcaption></figure></a>`).join("")}</div></section>` : ""}
      ${gals.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>Galerien</h2></div><div class="raster vier">${gals.map(galerieKarte).join("")}</div></section>` : ""}
      ${news.length ? `<section class="abschnitt"><div class="abschnitt-kopf"><h2>News</h2></div><div class="raster">${news.map((t) => berichtKarte(d.berichte.find((b) => `bericht.html?id=${b.id}` === t.href))).join("")}</div></section>` : ""}`;
  },

  statisch() { return null; }
};

// Spielseite für Sportarten, bei denen wir nur ein Team begleiten
function spielTeamModus(d, s, { h, g, gespielt, gal, bericht, videos, l }) {
  const team = d.verein(l.team);
  const b = bilanz(d, l.id);
  return `
    <div class="seitenkopf"><span class="kategorie">${esc(l.sportart)}, ${esc(l.name)}</span><p>${datumLang(s.datum)}, ${esc(s.anstoss)} Uhr</p></div>
    <div class="spielkopf">
      <div class="team"><a href="verein.html?id=${h?.id}">${esc(h?.name)}</a></div>
      <span class="stand${gespielt ? "" : " offen"}">${gespielt ? `${s.toreHeim}:${s.toreGast}` : esc(s.anstoss)}</span>
      <div class="team"><a href="verein.html?id=${g?.id}">${esc(g?.name)}</a></div>
    </div>
    ${gespielt && s.abschnitte?.length ? `<div class="karte verlauf-karte tabelle-wrap">${abschnittTabelle(d, s)}</div>` : ""}
    <div class="zwei abschnitt">
      <div>
        ${gespielt ? `
          ${s.bericht ? `<div class="abschnitt-kopf"><h2>Kurzbericht</h2></div><p style="font-size:19px;margin:0 0 12px">${esc(s.bericht)}</p>` : ""}
          ${bericht ? `<p><a class="link" href="bericht.html?id=${bericht.id}">Zum ausführlichen Bericht</a></p>` : ""}
        ` : `
          <div class="abschnitt-kopf"><h2>Vorschau</h2></div>
          ${bericht ? `<a class="karte bericht-zeile" href="bericht.html?id=${bericht.id}"><span class="kategorie rot">${esc(bericht.kategorie)}</span><h3>${esc(bericht.titel)}</h3><p class="leise">${esc(bericht.teaser)}</p></a>` : ""}
          <div class="karte">
            <div class="spieltag-kopf"><h2 style="font-size:20px">Letzte Spiele ${esc(team?.kurz)}</h2></div>
            <div class="spiel-liste">${b.spiele.slice(0, 5).map((x) => spielZeile(d, x)).join("") || `<p class="leise" style="padding:0 20px 16px">Noch keine Spiele.</p>`}</div>
          </div>
        `}
        ${videos.length ? `
          <div class="abschnitt">
            <div class="abschnitt-kopf"><h2>Videos</h2></div>
            <div class="raster zwei-spalten">${videos.map(videoKarte).join("")}</div>
          </div>` : ""}
        ${gal ? `
          <div class="abschnitt">
            <div class="abschnitt-kopf"><h2>Bilder</h2><a href="galerie.html?id=${gal.id}">Alle ${gal.bilder.length} Bilder</a></div>
            <div class="bilderraster">${gal.bilder.slice(0, 3).map((x) => `<figure>${foto(x)}<figcaption>${esc(x.titel)}</figcaption></figure>`).join("")}</div>
          </div>` : ""}
      </div>
      <aside>
        ${gespielt ? scorerListe(d, s) : ""}
        <div style="margin-top:24px">${bilanzKarte(d, l.id)}</div>
        <p style="margin-top:16px"><a class="link" href="verein.html?id=${team?.id}">Alle Spiele der ${esc(team?.name)}</a></p>
      </aside>
    </div>`;
}

function nichtGefunden(was) {
  return `<div class="seitenkopf"><h1>${was} nicht gefunden</h1><p>Der Link ist veraltet oder falsch. <a class="link" href="index.html">Zur Startseite</a></p></div>`;
}

/* ---------- Start ---------- */

(async function () {
  const seite = document.body.dataset.seite || "statisch";
  const ziel = $("#inhalt");
  try {
    const d = await laden();
    rahmen(d, seite);
    const html = (seiten[seite] || seiten.statisch)(d);
    if (html !== null) ziel.innerHTML = html;
    if (seite === "start") seiten.nachStart();
    if (seite === "liga") seiten.nachLiga();
    sportFilterAktivieren();
    // Transfers: jeweils 25 weitere einblenden
    const weitere = $("#weitere-transfers");
    if (weitere) weitere.addEventListener("click", () => {
      const rest = $$(".wechsel-tabelle [data-nr][hidden]");
      const grenze = rest.length ? Number(rest[0].dataset.nr) + 25 : 0;
      rest.forEach((el) => { if (Number(el.dataset.nr) < grenze) el.hidden = false; });
      if (!$$(".wechsel-tabelle [data-nr][hidden]").length) weitere.remove();
    });
    $$(".alle-zeigen:not(#weitere-transfers)").forEach((b) => {
      const anfang = b.textContent;
      b.addEventListener("click", () => {
        const auf = b.getAttribute("aria-expanded") === "true";
        $$("." + b.dataset.ziel, b.parentElement).forEach((el) => { el.hidden = auf; });
        b.setAttribute("aria-expanded", String(!auf));
        b.textContent = auf ? anfang : b.dataset.text;
      });
    });
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (e) {
    ziel.innerHTML = `<p class="fehler">Die Daten konnten nicht geladen werden (${esc(e.message)}). Die Seite muss über einen Webserver laufen, nicht als Datei.</p>`;
    console.error(e);
  }
})();
