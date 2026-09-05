/* ============================================================
   app.js — état, rendu, filtres, vue agrandie
   Ne sait rien de l'origine des données : voir data.js.
   ============================================================ */

import { loadData, norm } from "./data.js";

const $ = (sel) => document.querySelector(sel);
const el = {
  filtres: $("#filters"),
  resultats: $("#resultats"),
  compte: $("#count"),
  recherche: $("#q"),
  maj: $("#maj"),
  origine: $("#origine"),
  zoom: $("#zoom"),
  zoomBody: $("#zoom-body"),
};

const ICONE_DISCORD =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.3.5c1.6.4 2.9 1 4.2 1.8a15.7 15.7 0 0 0-14.6 0A16 16 0 0 1 9 3.5L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.7 8.9-.1 13.3.3 17.6a19.9 19.9 0 0 0 6 3l1.2-1.9c-1-.4-2-.9-2.8-1.5l.7-.5a14.2 14.2 0 0 0 13.2 0l.7.5c-.9.6-1.8 1.1-2.8 1.5l1.2 2a19.8 19.8 0 0 0 6-3c.5-5-.8-9.4-3.4-13.3ZM8.3 15c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4s2.2 1.1 2.2 2.4c0 1.3-1 2.4-2.2 2.4Zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4s2.2 1.1 2.2 2.4c0 1.3-1 2.4-2.2 2.4Z"/></svg>';

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- État ---------- */
const etat = { group: "pole", filtres: new Set(), q: "" };
let DONNEES = { poles: [], membres: [], parId: new Map() };

/* ---------- L'état vit dans l'URL ----------
   replaceState et non pushState : filtrer n'est pas naviguer.
   On ne veut pas que « retour » défasse un clic de pastille. */
function lireURL() {
  const p = new URLSearchParams(location.search);
  if (p.get("tri") === "alpha") etat.group = "alpha";
  const poles = (p.get("pole") || "").split(",").map((s) => s.trim()).filter(Boolean);
  poles.forEach((id) => etat.filtres.add(id));
  etat.q = p.get("q") || "";
}

function ecrireURL() {
  const p = new URLSearchParams();
  if (etat.group === "alpha") p.set("tri", "alpha");
  if (etat.filtres.size) p.set("pole", [...etat.filtres].join(","));
  if (etat.q) p.set("q", etat.q);
  // la virgule est lisible et légale dans une query string : on la garde telle quelle
  const qs = p.toString().replace(/%2C/g, ",");
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

/* ---------- Fragments ---------- */
const railHTML = (m) =>
  (m.poles.length ? m.poles : [null])
    .map((id) =>
      id
        ? `<i style="background:${esc(DONNEES.parId.get(id).couleur)}"></i>`
        : `<i style="background:var(--line-2)"></i>`)
    .join("");

const chipsHTML = (m) =>
  m.poles.length
    ? m.poles
        .map((id) => {
          const p = DONNEES.parId.get(id);
          return `<span class="chip" style="--c:${esc(p.couleur)}">${esc(p.nom)}</span>`;
        })
        .join("")
    : `<span class="chip empty">Pas encore de pôle</span>`;

const initiales = (m) => (m.prenom[0] + (m.nom[0] || "")).toUpperCase();

/* La photo se superpose aux initiales : si elle échoue, on la retire
   et les initiales sont déjà là. Aucun trou possible dans la grille. */
function avatarHTML(m, classe) {
  const principal = m.poles[0];
  const couleur = principal ? DONNEES.parId.get(principal).couleur : null;
  const style = couleur ? ` style="--c:${esc(couleur)}"` : "";
  const img = m.photo
    ? `<img src="photos/${esc(m.photo)}" alt="" loading="lazy" decoding="async">`
    : "";
  return `<div class="${classe}${couleur ? "" : " none"}"${style}><span>${esc(initiales(m))}</span>${img}</div>`;
}

const pronomsHTML = (m) =>
  m.pronoms ? `<span class="pron">${esc(m.pronoms)}</span>` : "";

function carteHTML(m, i) {
  return `<button type="button" class="card" data-i="${i}">
  <span class="rail">${railHTML(m)}</span>
  <span class="card-body">
    <span class="head">${avatarHTML(m, "avatar")}
      <span class="who">
        <span class="nickrow"><span class="nick">${esc(m.nomAffiche)}</span>${pronomsHTML(m)}</span>
        <span class="full">${esc(m.prenom)} ${esc(m.nom)}</span>
      </span>
    </span>
    <span class="chips">${chipsHTML(m)}</span>
  </span>
</button>`;
}

/* ---------- Filtrage ----------
   Les pastilles filtrent en OU : chercher quelqu'un, ce n'est pas
   croiser deux critères. Le ET est une question de bureau, pas de membre. */
function correspond(m) {
  if (etat.filtres.size && !m.poles.some((id) => etat.filtres.has(id))) return false;
  if (!etat.q) return true;
  const nomsPoles = m.poles.map((id) => DONNEES.parId.get(id).nom).join(" ");
  return norm(`${m.prenom} ${m.nom} ${m.surnom} ${nomsPoles}`).includes(norm(etat.q));
}

/* ---------- Rendu ---------- */
const indexDe = new Map(); // carte -> membre, pour la vue agrandie

function bandeauHTML(pole, membres) {
  const n = membres.length;
  const cartes = membres.map((m) => carteHTML(m, indexDe.get(m))).join("");
  const renfort = pole.recrute
    ? `<div class="recruit"><b>On cherche du monde</b><span>Écrivez dans le salon du pôle</span></div>`
    : "";
  const lien = pole.discord
    ? `<a class="blink" href="${esc(pole.discord)}" rel="noopener">${ICONE_DISCORD} Salon Discord</a>`
    : "";
  return `<section class="pole-band" style="--c:${esc(pole.couleur)}">
  <div class="band-head">
    <div class="band-title">
      <h2>${esc(pole.nom)}</h2>
      <span class="band-n">${n} membre${n > 1 ? "s" : ""}</span>
    </div>
    ${pole.description ? `<p class="band-desc">${esc(pole.description)}</p>` : ""}
    ${lien}
  </div>
  <div class="grid">${cartes}${renfort}</div>
</section>`;
}

function sansPoleHTML(membres) {
  const cartes = membres.map((m) => carteHTML(m, indexDe.get(m))).join("");
  return `<section class="pole-band" style="--c:var(--ink-3)">
  <div class="band-head" style="border-left-color:var(--line-2)">
    <div class="band-title">
      <h2 style="color:var(--ink-3)">Pas encore de pôle</h2>
      <span class="band-n">${membres.length}</span>
    </div>
    <p class="band-desc">Envie d'en rejoindre un ? Tout est ouvert, il suffit d'écrire dans le salon.</p>
  </div>
  <div class="grid">${cartes}</div>
</section>`;
}

function rendre() {
  const trouves = DONNEES.membres.filter(correspond);
  const total = DONNEES.membres.length;

  el.compte.textContent =
    trouves.length === total
      ? `${total} personne${total > 1 ? "s" : ""}`
      : `${trouves.length} sur ${total}`;

  if (!trouves.length) {
    el.resultats.innerHTML =
      `<p class="state">Personne ne correspond. Essayez un surnom, ou retirez un filtre.</p>`;
    return;
  }

  if (etat.group === "alpha") {
    el.resultats.innerHTML =
      `<div class="grid">${trouves.map((m) => carteHTML(m, indexDe.get(m))).join("")}</div>`;
  } else {
    const bandeaux = DONNEES.poles
      .filter((p) => !etat.filtres.size || etat.filtres.has(p.id))
      .map((p) => {
        const gens = trouves.filter((m) => m.poles.includes(p.id));
        return gens.length || p.recrute ? bandeauHTML(p, gens) : "";
      });

    const orphelins = trouves.filter((m) => !m.poles.length);
    if (orphelins.length && !etat.filtres.size) bandeaux.push(sansPoleHTML(orphelins));

    el.resultats.innerHTML = `<div class="groupwrap">${bandeaux.join("")}</div>`;
  }

  // Photo introuvable : on la retire, les initiales sont dessous.
  el.resultats.querySelectorAll(".avatar img").forEach((img) => {
    img.addEventListener("error", () => img.remove(), { once: true });
  });
}

/* ---------- Vue agrandie ----------
   Les mêmes champs, en plus grand. Aucune information nouvelle :
   c'est ce qui rend le clic sans enjeu. */
let focusAvant = null;

function ouvrirZoom(m) {
  focusAvant = document.activeElement;
  el.zoomBody.innerHTML = `<div class="zoom-card">
  <div class="rail">${railHTML(m)}</div>
  <button type="button" class="zoom-close" data-close aria-label="Fermer">&#10005;</button>
  <div class="zoom-in">
    ${avatarHTML(m, "zoom-av")}
    <p class="zoom-name">${esc(m.nomAffiche)}</p>
    ${m.pronoms ? `<span class="zoom-pron">${esc(m.pronoms)}</span>` : ""}
    <p class="zoom-full">${esc(m.prenom)} ${esc(m.nom)}</p>
    <div class="chips">${chipsHTML(m)}</div>
  </div>
</div>`;
  el.zoomBody.querySelectorAll(".zoom-av img").forEach((img) => {
    img.addEventListener("error", () => img.remove(), { once: true });
  });
  el.zoom.showModal();
}

el.zoom.addEventListener("click", (e) => {
  // Clic sur le fond : la boîte de dialogue elle-même est la zone hors carte.
  if (e.target === el.zoom || e.target.closest("[data-close]")) el.zoom.close();
});
el.zoom.addEventListener("close", () => {
  el.zoomBody.innerHTML = "";
  if (focusAvant && document.contains(focusAvant)) focusAvant.focus();
  focusAvant = null;
});

/* ---------- Interactions ---------- */
el.resultats.addEventListener("click", (e) => {
  const carte = e.target.closest(".card");
  if (!carte) return;
  const m = DONNEES.membres[Number(carte.dataset.i)];
  if (m) ouvrirZoom(m);
});

el.filtres.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.hasAttribute("data-reset")) etat.filtres.clear();
  else {
    const id = b.dataset.id;
    etat.filtres.has(id) ? etat.filtres.delete(id) : etat.filtres.add(id);
  }
  syncFiltres();
  ecrireURL();
  rendre();
});

document.querySelectorAll(".seg button").forEach((b) => {
  b.addEventListener("click", () => {
    etat.group = b.dataset.group;
    document.querySelectorAll(".seg button")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    ecrireURL();
    rendre();
  });
});

let minuteur;
el.recherche.addEventListener("input", () => {
  etat.q = el.recherche.value;
  rendre();
  clearTimeout(minuteur);
  minuteur = setTimeout(ecrireURL, 400); // on n'écrit pas l'URL à chaque frappe
});

function syncFiltres() {
  el.filtres.querySelectorAll("[data-id]").forEach((b) =>
    b.setAttribute("aria-pressed", String(etat.filtres.has(b.dataset.id))));
}

function monterFiltres() {
  el.filtres.innerHTML =
    DONNEES.poles
      .map((p) => `<button type="button" class="fchip" data-id="${esc(p.id)}" aria-pressed="false"
        style="--c:${esc(p.couleur)};--ct:${contraste(p.couleur)}">${esc(p.nom)}</button>`)
      .join("") +
    `<button type="button" class="fchip reset" data-reset>Tout afficher</button>`;
}

/* Noir ou blanc sur la couleur pleine, selon sa luminance perçue. */
function contraste(hex) {
  const h = String(hex).replace("#", "");
  if (h.length !== 6) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.45 ? "#101010" : "#ffffff";
}

/* ---------- Démarrage ---------- */
(async function init() {
  lireURL();
  try {
    DONNEES = await loadData();
  } catch (err) {
    console.error(err);
    el.resultats.innerHTML =
      `<p class="state error">Impossible de charger la liste.<br>Réessayez dans un instant.</p>`;
    return;
  }

  DONNEES.membres.forEach((m, i) => indexDe.set(m, i));

  if (DONNEES.maj) {
    el.maj.dateTime = DONNEES.maj.toISOString().slice(0, 10);
    el.maj.textContent = DONNEES.maj.toLocaleDateString("fr-FR",
      { day: "numeric", month: "long", year: "numeric" });
  }

  /* Une page datee est une page qu'on croit. Et si le tableur n'a pas
     repondu, il faut le dire : afficher une vieille copie sans prevenir
     est pire que ne rien afficher. */
  if (DONNEES.origine !== "tableur" && el.origine) {
    el.origine.hidden = false;
    el.origine.textContent =
      "Le tableur n’a pas répondu : cette liste est la dernière copie connue, elle peut être en retard.";
  }

  monterFiltres();
  syncFiltres();
  el.recherche.value = etat.q;
  document.querySelectorAll(".seg button").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.group === etat.group)));

  rendre();
})();
