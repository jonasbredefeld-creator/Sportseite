// Sportseite – rendert alle Seiten aus den JSON-Dateien im Ordner /data.
// Neue Ergebnisse, Spieler oder Galerien = nur die JSON-Dateien ändern.

const DATEN = ["site", "ligen", "vereine", "spieler", "spiele", "galerien", "wechsel"];
const NAV = [
  ["index.html", "Start", "start"],
  ["ligen.html", "Ligen", "ligen"],
  ["vereine.html", "Vereine", "vereine"],
  ["galerien.html", "Galerien", "galerien"],
  ["wechsel.html", "Wechselticker", "wechsel"],
  ["partner.html", "Partner", "partner"]
];

const $ = (sel) => document.querySelector(sel);
const param = (name) => new URLSearchParams(location.search).get(name);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const datumLang = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const datumKurz = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

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
  d.gespielt = d.spiele.filter((s) => Number.isInteger(s.toreHeim));
  return d;
}

/* ---------- Rahmen: Kopf, Navigation, Fuß ---------- */

function rahmen(d, seite) {
  const kopf = document.createElement("div");
  kopf.innerHTML = `
    ${d.site.demo ? `<div class="demo-hinweis">Vorschau mit Beispieldaten. Ergebnisse, Spieler und Berichte sind erfunden.</div>` : ""}
    <header class="kopf">
      <div class="wrap">
        <a class="marke" href="index.html">${esc(d.site.name)}<small>${esc(d.site.claim)}</small></a>
        <nav class="nav" aria-label="Hauptmenü">
          ${NAV.map(([href, text, key]) => `<a href="${href}"${key === seite ? ' aria-current="page"' : ""}>${text}</a>`).join("")}
        </nav>
      </div>
    </header>`;
  document.body.prepend(...kopf.children);

  const fuss = document.createElement("footer");
  fuss.className = "fuss";
  fuss.innerHTML = `
    <div class="wrap">
      <div>${esc(d.site.name)} · ${esc(d.site.region)}</div>
      <div><a href="partner.html">Partner werden</a> &nbsp; <a href="impressum.html">Impressum</a> &nbsp; <a href="datenschutz.html">Datenschutz</a></div>
    </div>`;
  document.body.append(fuss);
}

/* ---------- Bausteine ---------- */

function vereinLink(d, id, kurz = false) {
  const v = d.verein(id);
  if (!v) return esc(id);
  return `<a href="verein.html?id=${v.id}">${esc(kurz ? v.kurz : v.name)}</a>`;
}

function ergebnisZeile(d, s) {
  const h = d.verein(s.heim), g = d.verein(s.gast);
  const stand = Number.isInteger(s.toreHeim)
    ? `<span class="stand">${s.toreHeim}:${s.toreGast}</span>`
    : `<span class="stand offen">${esc(s.anstoss)}</span>`;
  return `
    <a class="ergebnis" href="spiel.html?id=${s.id}">
      <span class="team heim"><span class="lang">${esc(h?.name)}</span><span class="kurz">${esc(h?.kurz)}</span></span>
      ${stand}
      <span class="team gast"><span class="lang">${esc(g?.name)}</span><span class="kurz">${esc(g?.kurz)}</span>${s.galerie ? ` <span class="foto-marke">Fotos</span>` : ""}</span>
    </a>`;
}

function foto(bild, klasse = "") {
  const inhalt = bild?.src ? `<img src="${esc(bild.src)}" alt="${esc(bild.titel)}" loading="lazy">` : "";
  return `<div class="foto ${klasse}">${inhalt}${bild?.titel ? `<div class="bildtitel">${esc(bild.titel)}</div>` : ""}</div>`;
}

function galerieKarte(d, g) {
  return `
    <a class="galerie-karte" href="galerie.html?id=${g.id}">
      ${foto(g.bilder[0])}
      <h3>${esc(g.titel)}</h3>
      <p>${datumLang(g.datum)}, ${g.bilder.length} Bilder</p>
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
    <div class="tabelle-wrap"><table>
      <thead><tr><th></th><th>Verein</th><th class="zahl">Sp.</th><th class="zahl">S</th><th class="zahl">U</th><th class="zahl">N</th><th class="zahl">Tore</th><th class="zahl">Diff.</th><th class="zahl">Pkt.</th></tr></thead>
      <tbody>
        ${z.map((r, i) => `
          <tr>
            <td class="platz">${i + 1}</td>
            <td>${vereinLink(d, r.id)}</td>
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

/* ---------- Seiten ---------- */

const seiten = {
  start(d) {
    const tafeln = d.ligen.map((l) => {
      const tag = letzterSpieltag(d, l.id);
      if (!tag) return "";
      const spiele = d.gespielt.filter((s) => s.liga === l.id && s.spieltag === tag);
      return `<div class="tafel-liga">${esc(l.kurz)}, ${tag}. Spieltag</div>${spiele.map((s) => ergebnisZeile(d, s)).join("")}`;
    }).join("");

    const neueGal = [...d.galerien].sort((a, b) => b.datum.localeCompare(a.datum));
    const top = neueGal[0];
    const naechste = d.spiele.filter((s) => !Number.isInteger(s.toreHeim)).sort((a, b) => a.datum.localeCompare(b.datum));
    const topspiel = naechste.find((s) => s.topspiel) || naechste[0];
    const tore = torjaeger(d).slice(0, 5);

    return `
      <section class="tafel" aria-labelledby="ergebnisse-titel">
        <div class="tafel-kopf">
          <h2 id="ergebnisse-titel">Ergebnisse vom Wochenende</h2>
          <a href="ligen.html">Alle Ligen und Tabellen</a>
        </div>
        ${tafeln}
      </section>

      <div class="zwei abstand">
        <div>
          ${top ? `
            <h2>Neue Bilder</h2>
            <a class="galerie-karte" href="galerie.html?id=${top.id}">
              ${foto(top.bilder[0], "gross")}
              <h3>${esc(top.titel)}</h3>
              <p>${datumLang(top.datum)}, ${top.bilder.length} Bilder</p>
            </a>
            <div class="raster abstand">${neueGal.slice(1, 3).map((g) => galerieKarte(d, g)).join("")}</div>` : ""}
        </div>
        <aside>
          ${topspiel ? `
            <h2>Nächstes Topspiel</h2>
            <div class="block">
              <h3>${vereinLink(d, topspiel.heim)} gegen ${vereinLink(d, topspiel.gast)}</h3>
              <p class="leise">${esc(d.liga(topspiel.liga)?.name)}, ${datumLang(topspiel.datum)}, ${esc(topspiel.anstoss)} Uhr</p>
            </div>` : ""}
          <h2>Torjäger</h2>
          <div class="block">
            <ol class="liste">
              ${tore.map(([id, n]) => {
                const sp = d.spielerById(id);
                return `<li><a href="spieler.html?id=${id}">${esc(sp?.name)}</a>, ${vereinLink(d, sp?.verein, true)}<span class="leise">, ${n} ${n === 1 ? "Tor" : "Tore"}</span></li>`;
              }).join("")}
            </ol>
          </div>
          <h2>Wechselticker</h2>
          <div class="block">
            <ul class="liste">
              ${d.wechsel.slice(0, 3).map((w) => `<li><strong>${esc(w.typ)}:</strong> ${esc(w.name)} ${w.von ? `von ${vereinLink(d, w.von, true)} ` : ""}zu ${vereinLink(d, w.zu, true)}<br><span class="leise">${datumKurz(w.datum)}</span></li>`).join("")}
            </ul>
            <p><a href="wechsel.html">Alle Wechsel</a></p>
          </div>
        </aside>
      </div>`;
  },

  ligen(d) {
    return `
      <div class="seitenkopf"><h1>Ligen</h1><p>Ergebnisse, Tabellen und Torjäger aller abgedeckten Ligen.</p></div>
      <div class="raster">
        ${d.ligen.map((l) => `
          <a class="block galerie-karte" href="liga.html?id=${l.id}">
            <h3>${esc(l.name)}</h3>
            <p>${esc(l.sportart)}, Saison ${esc(l.saison)}, ${d.vereine.filter((v) => v.liga === l.id).length} Vereine</p>
          </a>`).join("")}
      </div>`;
  },

  liga(d) {
    const l = d.liga(param("id"));
    if (!l) return nichtGefunden("Liga");
    document.title = `${l.name} | ${d.site.name}`;
    const tage = [...new Set(d.spiele.filter((s) => s.liga === l.id).map((s) => s.spieltag))].sort((a, b) => b - a);
    const tore = torjaeger(d, (s) => s.liga === l.id).slice(0, 10);
    return `
      <div class="seitenkopf"><h1>${esc(l.name)}</h1><p>${esc(l.sportart)}, Saison ${esc(l.saison)}</p></div>
      <h2>Tabelle</h2>
      ${tabelleHtml(d, l.id)}
      <h2>Spieltage</h2>
      ${tage.map((t) => `
        <section class="tafel abstand">
          <div class="tafel-kopf"><h2>${t}. Spieltag</h2></div>
          ${d.spiele.filter((s) => s.liga === l.id && s.spieltag === t).map((s) => ergebnisZeile(d, s)).join("")}
        </section>`).join("")}
      <h2>Torjäger</h2>
      <div class="block">
        <ol class="liste">
          ${tore.map(([id, n]) => {
            const sp = d.spielerById(id);
            return `<li><a href="spieler.html?id=${id}">${esc(sp?.name)}</a>, ${vereinLink(d, sp?.verein)}<span class="leise">, ${n} ${n === 1 ? "Tor" : "Tore"}</span></li>`;
          }).join("") || "<li>Noch keine Tore eingetragen.</li>"}
        </ol>
      </div>`;
  },

  vereine(d) {
    return `
      <div class="seitenkopf"><h1>Vereine</h1><p>Kader, Ergebnisse und Bilder jedes Vereins.</p></div>
      ${d.ligen.map((l) => `
        <h2>${esc(l.name)}</h2>
        <div class="block"><ul class="liste">
          ${d.vereine.filter((v) => v.liga === l.id).map((v) => `<li><span class="farbpunkt" style="background:${esc(v.farbe)}"></span><a href="verein.html?id=${v.id}">${esc(v.name)}</a> <span class="leise">${esc(v.ort)}</span></li>`).join("")}
        </ul></div>`).join("")}`;
  },

  verein(d) {
    const v = d.verein(param("id"));
    if (!v) return nichtGefunden("Verein");
    document.title = `${v.name} | ${d.site.name}`;
    const spiele = d.spiele.filter((s) => s.heim === v.id || s.gast === v.id).sort((a, b) => b.datum.localeCompare(a.datum));
    const kader = d.spieler.filter((s) => s.verein === v.id).sort((a, b) => a.nummer - b.nummer);
    const gals = d.galerien.filter((g) => {
      const s = d.spiele.find((x) => x.id === g.spiel);
      return s && (s.heim === v.id || s.gast === v.id);
    });
    const platz = tabelle(d, v.liga).findIndex((r) => r.id === v.id) + 1;
    return `
      <div class="seitenkopf">
        <h1><span class="farbpunkt" style="background:${esc(v.farbe)};width:18px;height:18px"></span>${esc(v.name)}</h1>
        <p>${esc(v.ort)}, ${esc(d.liga(v.liga)?.name)}${platz ? `, aktuell Platz ${platz}` : ""}</p>
      </div>
      <div class="zwei">
        <div>
          <h2>Spiele</h2>
          <div class="tafel">${spiele.map((s) => ergebnisZeile(d, s)).join("")}</div>
          ${gals.length ? `<h2>Galerien</h2><div class="raster">${gals.map((g) => galerieKarte(d, g)).join("")}</div>` : ""}
        </div>
        <aside>
          <h2>Mannschaftsfoto</h2>
          ${foto({ titel: "Mannschaftsfoto folgt" })}
          <h2>Kader</h2>
          <div class="block"><ul class="liste">
            ${kader.map((s) => `<li><strong>${s.nummer}</strong> &nbsp;<a href="spieler.html?id=${s.id}">${esc(s.name)}</a> <span class="leise">${esc(s.position)}</span></li>`).join("") || "<li>Kader noch nicht eingetragen.</li>"}
          </ul></div>
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
      <div class="seitenkopf"><h1>${esc(sp.name)}</h1><p>${vereinLink(d, sp.verein)}, ${esc(sp.position)}</p></div>
      <div class="profil">
        ${foto({ titel: "Porträt folgt" }, "portraet")}
        <div>
          <div class="rueckennummer">${sp.nummer}</div>
          <div class="werte">
            <div><strong>${eigeneTore.length}</strong>Tore</div>
            <div><strong>${einsaetze}</strong>Spiele des Vereins</div>
          </div>
          <h3>Tore</h3>
          <ul class="torliste">
            ${eigeneTore.map(({ s, t }) => `<li><span class="min">${t.min}'</span><a href="spiel.html?id=${s.id}">${esc(d.verein(s.heim)?.kurz)} gegen ${esc(d.verein(s.gast)?.kurz)}</a> <span class="leise">${datumKurz(s.datum)}</span></li>`).join("") || "<li>Noch keine Tore.</li>"}
          </ul>
        </div>
      </div>
      ${bilder.length ? `<h2>Bilder</h2><div class="bilderraster">${bilder.map(({ g, b }) => `<a href="galerie.html?id=${g.id}">${foto(b)}</a>`).join("")}</div>` : ""}`;
  },

  spiel(d) {
    const s = d.spiele.find((x) => x.id === param("id"));
    if (!s) return nichtGefunden("Spiel");
    const h = d.verein(s.heim), g = d.verein(s.gast);
    document.title = `${h?.name} gegen ${g?.name} | ${d.site.name}`;
    const gespielt = Number.isInteger(s.toreHeim);
    const gal = s.galerie && d.galerie(s.galerie);
    return `
      <div class="seitenkopf"><p>${esc(d.liga(s.liga)?.name)}, ${s.spieltag}. Spieltag, ${datumLang(s.datum)}, ${esc(s.anstoss)} Uhr</p></div>
      <div class="spielkopf">
        <div class="team heim">${vereinLink(d, s.heim)}</div>
        <span class="stand${gespielt ? "" : " offen"}">${gespielt ? `${s.toreHeim}:${s.toreGast}` : esc(s.anstoss)}</span>
        <div class="team">${vereinLink(d, s.gast)}</div>
      </div>
      <div class="zwei abstand">
        <div>
          ${s.bericht ? `<h2>Bericht</h2><p>${esc(s.bericht)}</p>` : gespielt ? "" : "<h2>Vorschau</h2><p>Das Spiel steht noch aus.</p>"}
          ${gal ? `<h2>Bilder</h2><div class="bilderraster">${gal.bilder.slice(0, 3).map((b) => foto(b)).join("")}</div><p class="abstand"><a class="knopf" href="galerie.html?id=${gal.id}">Alle ${gal.bilder.length} Bilder ansehen</a></p>` : ""}
        </div>
        <aside>
          ${gespielt ? `
            <h2>Tore</h2>
            <div class="block"><ul class="torliste">
              ${(s.tore || []).map((t) => {
                const sp = d.spielerById(t.spieler);
                return `<li><span class="min">${t.min}'</span>${sp ? `<a href="spieler.html?id=${sp.id}">${esc(sp.name)}</a>` : "Unbekannt"} <span class="leise">${esc(d.verein(t.verein)?.kurz)}</span></li>`;
              }).join("") || "<li>Keine Tore.</li>"}
            </ul></div>` : ""}
        </aside>
      </div>`;
  },

  galerien(d) {
    const gals = [...d.galerien].sort((a, b) => b.datum.localeCompare(a.datum));
    return `
      <div class="seitenkopf"><h1>Galerien</h1><p>Bilder von jedem Spiel, bei dem wir vor Ort waren. Vereine dürfen sie auf ihren offiziellen Kanälen nutzen, wenn sie uns markieren.</p></div>
      <div class="raster">${gals.map((g) => galerieKarte(d, g)).join("")}</div>`;
  },

  galerie(d) {
    const g = d.galerie(param("id"));
    if (!g) return nichtGefunden("Galerie");
    document.title = `${g.titel} | ${d.site.name}`;
    return `
      <div class="seitenkopf"><h1>${esc(g.titel)}</h1><p>${datumLang(g.datum)}, ${g.bilder.length} Bilder, Fotos: ${esc(g.fotograf)}${g.spiel ? `, <a href="spiel.html?id=${g.spiel}">zum Spielbericht</a>` : ""}</p></div>
      <div class="bilderraster">${g.bilder.map((b) => foto(b)).join("")}</div>`;
  },

  wechsel(d) {
    return `
      <div class="seitenkopf"><h1>Wechselticker</h1><p>Spieler- und Trainerwechsel der Region, neueste zuerst.</p></div>
      <div class="block"><ul class="liste">
        ${[...d.wechsel].sort((a, b) => b.datum.localeCompare(a.datum)).map((w) => `
          <li>
            <strong>${esc(w.typ)}:</strong> ${esc(w.name)} ${w.von ? `von ${vereinLink(d, w.von)} ` : ""}zu ${vereinLink(d, w.zu)}
            <br>${esc(w.text)} <span class="leise">${datumLang(w.datum)}</span>
          </li>`).join("")}
      </ul></div>`;
  },

  statisch() { return null; }
};

function nichtGefunden(was) {
  return `<div class="seitenkopf"><h1>${was} nicht gefunden</h1><p>Der Link ist veraltet oder falsch. <a href="index.html">Zur Startseite</a></p></div>`;
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
  } catch (e) {
    ziel.innerHTML = `<p class="fehler">Die Daten konnten nicht geladen werden (${esc(e.message)}). Die Seite muss über einen Webserver laufen, nicht als Datei.</p>`;
    console.error(e);
  }
})();
