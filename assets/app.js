// Sportseite – rendert alle Seiten aus den JSON-Dateien im Ordner /data.
// Neue Ergebnisse, Berichte, Spieler oder Galerien = nur die JSON-Dateien ändern.

const DATEN = ["site", "ligen", "vereine", "spieler", "spiele", "galerien", "wechsel", "berichte"];

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
  d.berichteSortiert = [...d.berichte].sort((a, b) => b.datum.localeCompare(a.datum));
  return d;
}

/* ---------- Rahmen: Kopf, Menü, Fuß ---------- */

const BEREICH = {
  start: "start", ligen: "ligen", liga: "ligen", berichte: "berichte", bericht: "berichte",
  galerien: "bilder", galerie: "bilder", wechsel: "wechsel",
  vereine: "mehr", verein: "mehr", spieler: "mehr", spiel: "ergebnisse", partner: "mehr", impressum: "mehr", datenschutz: "mehr"
};

function rahmen(d, seite) {
  const aktiv = BEREICH[seite];
  const cur = (k) => (k === aktiv ? ' aria-current="page"' : "");

  const ausklapp = (key, titel, eintraege) => `
    <div class="menue-punkt">
      <button type="button" aria-expanded="false" aria-controls="ak-${key}"${cur(key)}>${titel}${PFEIL}</button>
      <div class="ausklapp" id="ak-${key}">${eintraege}</div>
    </div>`;
  const punkt = (key, href, titel) => `<div class="menue-punkt"><a href="${href}"${cur(key)}>${titel}</a></div>`;

  const ligenLinks = d.ligen.map((l) => `<a href="liga.html?id=${l.id}">${esc(l.name)}<span class="klein">${esc(l.sportart)}, Saison ${esc(l.saison)}</span></a>`).join("");
  const ergebnisLinks = d.ligen.map((l) => `<a href="liga.html?id=${l.id}#spieltage">${esc(l.kurz)}<span class="klein">Ergebnisse und Spielplan</span></a>`).join("");

  const kopf = document.createElement("div");
  kopf.innerHTML = `
    ${d.site.demo ? `<div class="demo-hinweis">Vorschau mit Beispieldaten. Ergebnisse, Spieler und Berichte sind erfunden.</div>` : ""}
    <header class="kopf">
      <div class="wrap">
        <a class="marke" href="index.html">
          <span class="marke-name">${esc(d.site.name)}</span>
          <span class="marke-claim">${esc(d.site.claim)}</span>
        </a>
        <button type="button" class="menue-knopf" aria-expanded="false" aria-controls="menue">Menü${PFEIL}</button>
      </div>
    </header>
    <nav class="menue" id="menue" aria-label="Hauptmenü">
      <div class="wrap">
        ${punkt("start", "index.html", "Home")}
        ${ausklapp("ligen", "Ligen", ligenLinks)}
        ${ausklapp("ergebnisse", "Ergebnisse", ergebnisLinks)}
        ${punkt("berichte", "berichte.html", "Berichte")}
        ${punkt("bilder", "galerien.html", "Bilder")}
        ${punkt("wechsel", "wechsel.html", "Wechsel")}
        ${ausklapp("mehr", "Mehr", `
          <a href="vereine.html">Vereine</a>
          <a href="partner.html">Partner werden</a>
          <a href="impressum.html">Impressum</a>
          <a href="datenschutz.html">Datenschutz</a>`)}
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

function spielKarte(d, s) {
  const h = d.verein(s.heim), g = d.verein(s.gast);
  const gespielt = Number.isInteger(s.toreHeim);
  const zeile = (v, tore, gegner) => {
    const klasse = !gespielt ? "" : tore > gegner ? " sieger" : tore < gegner ? " verlierer" : "";
    return `
      <div class="zeile${klasse}">
        <span class="verein"><span class="vereinspunkt" style="background:${esc(v?.farbe)}"></span><span>${esc(v?.name)}</span></span>
        ${gespielt ? `<span class="tore">${tore}</span>` : ""}
      </div>`;
  };
  return `
    <a class="karte spiel-karte" href="spiel.html?id=${s.id}">
      <div class="spiel-meta">
        <span>${datumKurz(s.datum)}${gespielt ? "" : `, <span class="anstoss">${esc(s.anstoss)} Uhr</span>`}</span>
        ${s.galerie ? `<span class="fotos">Fotos</span>` : s.topspiel ? `<span class="fotos">Topspiel</span>` : ""}
      </div>
      ${zeile(h, s.toreHeim, s.toreGast)}
      ${zeile(g, s.toreGast, s.toreHeim)}
    </a>`;
}

function berichtKarte(b) {
  const rot = b.kategorie === "Vorschau" ? " rot" : "";
  return `
    <a class="karte bericht-karte" href="bericht.html?id=${b.id}">
      ${foto(b.bild)}
      <div class="inhalt">
        <span class="kategorie${rot}">${esc(b.kategorie)}</span>
        <h3>${esc(b.titel)}</h3>
        <div class="datum">${datumMittel(b.datum)}</div>
      </div>
    </a>`;
}

function galerieKarte(g) {
  return `
    <a class="karte galerie-karte" href="galerie.html?id=${g.id}">
      <div style="position:relative">${foto(g.bilder[0])}<span class="anzahl">${g.bilder.length} Bilder</span></div>
      <div class="inhalt">
        <h3>${esc(g.titel)}</h3>
        <div class="datum">${datumMittel(g.datum)}</div>
      </div>
    </a>`;
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

/* ---------- Seiten ---------- */

const seiten = {
  start(d) {
    const [haupt, ...rest] = [
      ...d.berichteSortiert.filter((b) => b.haupt),
      ...d.berichteSortiert.filter((b) => !b.haupt)
    ];
    const unter = rest.slice(0, 3);
    const hauptSpiel = haupt?.spiel && d.spiel(haupt.spiel);
    const hauptGal = hauptSpiel?.galerie;

    const ligenMitSpielen = d.ligen.filter((l) => letzterSpieltag(d, l.id));
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
            <div class="aufmacher-links">
              ${hauptSpiel ? `<a href="spiel.html?id=${hauptSpiel.id}">Zum Spiel mit allen Toren</a>` : ""}
              ${hauptGal ? `<a href="galerie.html?id=${hauptGal}">Alle Bilder vom Spiel</a>` : ""}
              ${haupt.liga ? `<a href="liga.html?id=${haupt.liga}">Tabelle ${esc(d.liga(haupt.liga)?.kurz)}</a>` : ""}
            </div>
          </div>
        </article>` : ""}

      ${unter.length ? `<div class="raster raster-unter">${unter.map(berichtKarte).join("")}</div>` : ""}

      ${ligenMitSpielen.length ? `
        <section class="abschnitt" aria-labelledby="erg-titel">
          <div class="abschnitt-kopf"><h2 id="erg-titel">Ergebnisse</h2><a href="liga.html?id=${ligenMitSpielen[0].id}" id="erg-link">Tabelle und alle Spiele</a></div>
          <div class="liga-reiter" role="group" aria-label="Liga wählen">
            ${ligenMitSpielen.map((l, i) => `<button type="button" data-liga="${l.id}" aria-pressed="${i === 0}">${esc(l.kurz)}, ${letzterSpieltag(d, l.id)}. Spieltag</button>`).join("")}
          </div>
          ${ligenMitSpielen.map((l, i) => `
            <div class="ergebnis-streifen" data-liga-feld="${l.id}"${i === 0 ? "" : " hidden"}>
              ${d.gespielt.filter((s) => s.liga === l.id && s.spieltag === letzterSpieltag(d, l.id)).map((s) => spielKarte(d, s)).join("")}
            </div>`).join("")}
        </section>` : ""}

      ${gals.length ? `
        <section class="abschnitt" aria-labelledby="bilder-titel">
          <div class="abschnitt-kopf"><h2 id="bilder-titel">Bilder vom Wochenende</h2><a href="galerien.html">Alle Galerien</a></div>
          <div class="raster vier">${gals.map(galerieKarte).join("")}</div>
        </section>` : ""}

      <section class="abschnitt zwei">
        <div>
          ${naechste.length ? `
            <div class="abschnitt-kopf"><h2>Nächste Spiele</h2></div>
            <div class="ergebnis-streifen">${naechste.slice(0, 4).map((s) => spielKarte(d, s)).join("")}</div>` : ""}
          ${rest.length > 3 ? `
            <div class="abschnitt-kopf abschnitt"><h2>Weitere Berichte</h2><a href="berichte.html">Alle Berichte</a></div>
            <div class="raster">${rest.slice(3, 6).map(berichtKarte).join("")}</div>` : ""}
        </div>
        <aside>
          <div class="karte box">
            <h2>Torjäger</h2>
            ${torjaegerListe(d, torjaeger(d).slice(0, 5))}
          </div>
          <div class="karte box" style="margin-top:24px">
            <h2>Wechselticker</h2>
            <ul class="liste">
              ${d.wechsel.slice(0, 3).map((w) => `<li><strong>${esc(w.typ)}:</strong> ${esc(w.name)} ${w.von ? `von ${esc(d.verein(w.von)?.kurz)} ` : ""}zu ${esc(d.verein(w.zu)?.kurz)}<br><span class="leise">${datumMittel(w.datum)}</span></li>`).join("")}
            </ul>
            <p style="margin:12px 0 0"><a class="link" href="wechsel.html">Alle Wechsel</a></p>
          </div>
        </aside>
      </section>`;
  },

  nachStart() {
    // Liga-Reiter auf der Startseite
    const reiter = $$(".liga-reiter button");
    reiter.forEach((b) => b.addEventListener("click", () => {
      reiter.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("[data-liga-feld]").forEach((f) => { f.hidden = f.dataset.ligaFeld !== b.dataset.liga; });
      const link = $("#erg-link");
      if (link) link.href = `liga.html?id=${b.dataset.liga}`;
    }));
  },

  ligen(d) {
    return `
      <div class="seitenkopf"><h1>Ligen</h1><p>Ergebnisse, Tabellen und Torjäger aller abgedeckten Ligen.</p></div>
      <div class="raster">
        ${d.ligen.map((l) => `
          <a class="karte box bericht-karte" href="liga.html?id=${l.id}">
            <span class="kategorie">${esc(l.sportart)}</span>
            <h3>${esc(l.name)}</h3>
            <div class="datum">Saison ${esc(l.saison)}, ${d.vereine.filter((v) => v.liga === l.id).length} Vereine</div>
          </a>`).join("")}
      </div>`;
  },

  liga(d) {
    const l = d.liga(param("id"));
    if (!l) return nichtGefunden("Liga");
    document.title = `${l.name} | ${d.site.name}`;
    const tage = [...new Set(d.spiele.filter((s) => s.liga === l.id).map((s) => s.spieltag))].sort((a, b) => b - a);
    return `
      <div class="seitenkopf"><span class="kategorie">${esc(l.sportart)}, Saison ${esc(l.saison)}</span><h1>${esc(l.name)}</h1></div>
      <div class="zwei">
        <div>
          <div class="abschnitt-kopf"><h2>Tabelle</h2></div>
          ${tabelleHtml(d, l.id)}
          <div id="spieltage">
            ${tage.map((t) => `
              <div class="abschnitt">
                <div class="abschnitt-kopf"><h2>${t}. Spieltag</h2></div>
                <div class="ergebnis-streifen">${d.spiele.filter((s) => s.liga === l.id && s.spieltag === t).map((s) => spielKarte(d, s)).join("")}</div>
              </div>`).join("")}
          </div>
        </div>
        <aside>
          <div class="karte box"><h2>Torjäger</h2>${torjaegerListe(d, torjaeger(d, (s) => s.liga === l.id).slice(0, 10))}</div>
        </aside>
      </div>`;
  },

  berichte(d) {
    return `
      <div class="seitenkopf"><h1>Berichte</h1><p>Spielberichte, Vorschauen und Geschichten aus dem Amateursport der Region.</p></div>
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
          ${weitere.length ? `<div class="abschnitt-kopf abschnitt"><h2>Weitere Berichte</h2></div><div style="display:grid;gap:20px">${weitere.map(berichtKarte).join("")}</div>` : ""}
        </aside>
      </div>`;
  },

  vereine(d) {
    return `
      <div class="seitenkopf"><h1>Vereine</h1><p>Kader, Ergebnisse und Bilder jedes Vereins.</p></div>
      ${d.ligen.map((l) => `
        <section class="abschnitt">
          <div class="abschnitt-kopf"><h2>${esc(l.name)}</h2></div>
          <div class="karte box"><ul class="liste">
            ${d.vereine.filter((v) => v.liga === l.id).map((v) => `<li><span class="vereinspunkt" style="display:inline-block;margin-right:8px;background:${esc(v.farbe)}"></span><a href="verein.html?id=${v.id}">${esc(v.name)}</a> <span class="leise">${esc(v.ort)}</span></li>`).join("")}
          </ul></div>
        </section>`).join("")}`;
  },

  verein(d) {
    const v = d.verein(param("id"));
    if (!v) return nichtGefunden("Verein");
    document.title = `${v.name} | ${d.site.name}`;
    const spiele = d.spiele.filter((s) => s.heim === v.id || s.gast === v.id).sort((a, b) => b.datum.localeCompare(a.datum));
    const kader = d.spieler.filter((s) => s.verein === v.id).sort((a, b) => a.nummer - b.nummer);
    const gals = d.galerien.filter((g) => { const s = d.spiel(g.spiel); return s && (s.heim === v.id || s.gast === v.id); });
    const platz = tabelle(d, v.liga).findIndex((r) => r.id === v.id) + 1;
    return `
      <div class="seitenkopf">
        <span class="kategorie">${esc(d.liga(v.liga)?.name)}${platz ? `, Platz ${platz}` : ""}</span>
        <h1>${esc(v.name)}</h1>
        <p>${esc(v.ort)}</p>
      </div>
      <div class="zwei">
        <div>
          <div class="abschnitt-kopf"><h2>Spiele</h2></div>
          <div class="ergebnis-streifen">${spiele.map((s) => spielKarte(d, s)).join("")}</div>
          ${gals.length ? `<div class="abschnitt"><div class="abschnitt-kopf"><h2>Galerien</h2></div><div class="raster">${gals.map(galerieKarte).join("")}</div></div>` : ""}
        </div>
        <aside>
          <div class="karte">${foto({ titel: "Mannschaftsfoto" })}</div>
          <div class="karte box" style="margin-top:24px">
            <h2>Kader</h2>
            <ul class="liste">
              ${kader.map((s) => `<li><span class="rang">${s.nummer}</span><a href="spieler.html?id=${s.id}">${esc(s.name)}</a> <span class="leise">${esc(s.position)}</span></li>`).join("") || "<li>Kader noch nicht eingetragen.</li>"}
            </ul>
          </div>
        </aside>
      </div>`;
  },

  spieler(d) {
    const sp = d.spielerById(param("id"));
    if (!sp) return nichtGefunden("Spieler");
    document.title = `${sp.name} | ${d.site.name}`;
    const eigeneTore = [];
    d.gespielt.forEach((s) => (s.tore || []).forEach((t) => { if (t.spieler === sp.id) eigeneTore.push({ s, t }); }));
    const einsaetze = d.gespielt.filter((s) => s.heim === sp.verein || s.gast === sp.verein).length;
    const bilder = [];
    d.galerien.forEach((g) => g.bilder.forEach((b) => { if ((b.stichwoerter || []).includes(sp.id)) bilder.push({ g, b }); }));
    return `
      <div class="seitenkopf"><span class="kategorie">${esc(d.verein(sp.verein)?.name)}</span><h1>${esc(sp.name)}</h1></div>
      <div class="karte box profil">
        ${foto({ titel: "Porträt" }, "hoch")}
        <div>
          <div class="rueckennummer">${sp.nummer}</div>
          <p class="leise">${esc(sp.position)}, ${vereinLink(d, sp.verein)}</p>
          <div class="werte">
            <div><strong>${eigeneTore.length}</strong>Tore</div>
            <div><strong>${einsaetze}</strong>Spiele des Vereins</div>
          </div>
          <ul class="torliste">
            ${eigeneTore.map(({ s, t }) => `<li><span class="min">${t.min}'</span><a class="link" href="spiel.html?id=${s.id}">${esc(d.verein(s.heim)?.kurz)} gegen ${esc(d.verein(s.gast)?.kurz)}</a> <span class="leise">${datumMittel(s.datum)}</span></li>`).join("") || "<li>Noch keine Tore.</li>"}
          </ul>
        </div>
      </div>
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
    return `
      <div class="seitenkopf"><span class="kategorie">${esc(d.liga(s.liga)?.name)}, ${s.spieltag}. Spieltag</span><p>${datumLang(s.datum)}, ${esc(s.anstoss)} Uhr</p></div>
      <div class="spielkopf">
        <div class="team"><a href="verein.html?id=${h?.id}">${esc(h?.name)}</a></div>
        <span class="stand${gespielt ? "" : " offen"}">${gespielt ? `${s.toreHeim}:${s.toreGast}` : esc(s.anstoss)}</span>
        <div class="team"><a href="verein.html?id=${g?.id}">${esc(g?.name)}</a></div>
      </div>
      <div class="zwei abschnitt">
        <div>
          ${s.bericht ? `<div class="abschnitt-kopf"><h2>Kurzbericht</h2></div><p style="font-size:19px;margin:0 0 12px">${esc(s.bericht)}</p>` : gespielt ? "" : `<div class="abschnitt-kopf"><h2>Vorschau</h2></div><p>Das Spiel steht noch aus.</p>`}
          ${bericht ? `<p><a class="link" href="bericht.html?id=${bericht.id}">Zum ausführlichen Bericht</a></p>` : ""}
          ${gal ? `
            <div class="abschnitt">
              <div class="abschnitt-kopf"><h2>Bilder</h2><a href="galerie.html?id=${gal.id}">Alle ${gal.bilder.length} Bilder</a></div>
              <div class="bilderraster">${gal.bilder.slice(0, 3).map((b) => `<figure>${foto(b)}<figcaption>${esc(b.titel)}</figcaption></figure>`).join("")}</div>
            </div>` : ""}
        </div>
        <aside>
          ${gespielt ? `
            <div class="karte box">
              <h2>Tore</h2>
              <ul class="torliste">
                ${(s.tore || []).map((t) => {
                  const sp = d.spielerById(t.spieler);
                  return `<li><span class="min">${t.min}'</span>${sp ? `<a class="link" href="spieler.html?id=${sp.id}">${esc(sp.name)}</a>` : "Unbekannt"} <span class="leise">${esc(d.verein(t.verein)?.kurz)}</span></li>`;
                }).join("") || "<li>Keine Tore.</li>"}
              </ul>
            </div>` : ""}
        </aside>
      </div>`;
  },

  galerien(d) {
    const gals = [...d.galerien].sort((a, b) => b.datum.localeCompare(a.datum));
    return `
      <div class="seitenkopf"><h1>Bilder</h1><p>Galerien von jedem Spiel, bei dem wir vor Ort waren. Vereine dürfen die Bilder auf ihren offiziellen Kanälen nutzen, wenn sie uns markieren.</p></div>
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

  wechsel(d) {
    return `
      <div class="seitenkopf"><h1>Wechselticker</h1><p>Spieler- und Trainerwechsel der Region, neueste zuerst.</p></div>
      <div class="karte box"><ul class="liste">
        ${[...d.wechsel].sort((a, b) => b.datum.localeCompare(a.datum)).map((w) => `
          <li>
            <span class="kategorie">${esc(w.typ)}</span><br>
            <strong>${esc(w.name)}</strong> ${w.von ? `von ${vereinLink(d, w.von)} ` : ""}zu ${vereinLink(d, w.zu)}
            <br>${esc(w.text)} <span class="leise">${datumMittel(w.datum)}</span>
          </li>`).join("")}
      </ul></div>`;
  },

  statisch() { return null; }
};

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
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (e) {
    ziel.innerHTML = `<p class="fehler">Die Daten konnten nicht geladen werden (${esc(e.message)}). Die Seite muss über einen Webserver laufen, nicht als Datei.</p>`;
    console.error(e);
  }
})();
