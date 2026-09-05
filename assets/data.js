/* ============================================================
   data.js — chargement et normalisation
   ------------------------------------------------------------
   Source de vérité : le tableur du Drive du bureau, publié en CSV.
   Instantanés locaux (data/*.json) en filet de secours : si Google
   est injoignable, la page affiche la dernière copie connue plutôt
   qu'une grille vide.

   Le reste de l'application ignore d'où viennent les données.
   ============================================================ */

/* ------------------------------------------------------------
   ⬇️  LA SEULE CHOSE À RENSEIGNER
   Dans le tableur : Fichier › Partager › Publier sur le web,
   choisir l'onglet, format « Valeurs séparées par des virgules
   (.csv) », puis coller les deux URL ci-dessous.
   Laisser vide fait tourner le site sur les instantanés locaux.
   ------------------------------------------------------------ */
export const SOURCE = {
  polesCSV:   "",
  membresCSV: "",

  // Filet de secours, toujours présent dans le dépôt.
  polesJSON:   "data/poles.json",
  membresJSON: "data/membres.json",
};

const GRIS = "#8A9A90"; // repli d'un pôle sans couleur

/** Minuscules sans accents, pour trier, chercher et apparier des en-têtes. */
export const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();

/** « Jean-Loup Quéméner » -> « jean-loup-quemener » */
export const slug = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);

const toBool = (v, defaut = true) => {
  if (v === undefined || v === null || v === "") return defaut;
  if (typeof v === "boolean") return v;
  return !/^(non|no|false|faux|0)$/i.test(String(v).trim());
};

/* ============================================================
   Lecture CSV (RFC 4180 : guillemets, virgules et sauts de ligne
   à l'intérieur d'un champ, guillemet doublé pour l'échapper).
   ============================================================ */
export function parseCSV(txt) {
  const lignes = [];
  let champ = "", ligne = [], dansGuillemets = false;
  const t = String(txt).replace(/^\uFEFF/, ""); // BOM éventuel

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (t[i + 1] === '"') { champ += '"'; i++; }
        else dansGuillemets = false;
      } else champ += c;
      continue;
    }
    if (c === '"') { dansGuillemets = true; continue; }
    if (c === ",") { ligne.push(champ); champ = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { ligne.push(champ); lignes.push(ligne); ligne = []; champ = ""; continue; }
    champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((v) => String(v).trim() !== ""));
}

/** Première ligne = en-têtes. Les clés sont normalisées : « Prénom » -> « prenom ». */
function enObjets(lignes) {
  if (!lignes.length) return [];
  const entetes = lignes[0].map(norm);
  return lignes.slice(1).map((l) => {
    const o = {};
    entetes.forEach((h, i) => { if (h) o[h] = (l[i] ?? "").trim(); });
    return o;
  });
}

/** Première colonne trouvée parmi plusieurs noms possibles. */
const col = (o, ...noms) => {
  for (const n of noms) if (o[n] !== undefined && o[n] !== "") return o[n];
  return "";
};

/** Toutes les colonnes « Pôle 1 », « Pôle 2 »… dans l'ordre. */
const colonnesPoles = (o) =>
  Object.keys(o)
    .filter((k) => /^pole\s*\d*$/.test(k))
    .sort()
    .map((k) => o[k])
    .filter(Boolean);

/* ============================================================
   Passage du tableur à la forme interne.
   Les noms de colonnes sont appariés sans tenir compte des
   accents, de la casse ni des espaces : « Prénom », « prenom »
   et « PRÉNOM » sont la même colonne.
   ============================================================ */

function polesDepuisCSV(objets) {
  return objets.map((o) => ({
    // Dans le tableur, la colonne A « Nom » sert de clé : c'est elle que
    // les colonnes « Pôle 1 » et « Pôle 2 » de l'onglet Membres citent.
    nom:         col(o, "nom", "pole", "nom du pole"),
    couleur:     col(o, "couleur", "color"),
    description: col(o, "description", "descriptif"),
    discord:     col(o, "discord", "salon", "lien discord", "salon discord"),
    recrute:     col(o, "recrute", "recrutement", "cherche du monde"),
    // Colonne facultative, jamais affichée : elle sert de contre-vérification.
    attendu:     col(o, "nombre personnes", "nombre de personnes", "effectif"),
  }));
}

function membresDepuisCSV(objets) {
  return objets.map((o) => ({
    prenom:  col(o, "prenom", "prenom(s)"),
    nom:     col(o, "nom", "nom de famille"),
    surnom:  col(o, "surnom", "pseudo"),
    pronoms: col(o, "pronoms", "pronom"),
    poles:   colonnesPoles(o),
    photo:   col(o, "photo", "photo (fichier)"),
    actif:   col(o, "actif", "active", "membre actif"),
  }));
}

/* ============================================================
   Récupération
   ============================================================ */

async function getTexte(url) {
  const res = await fetch(url, { cache: "no-cache", redirect: "follow" });
  if (!res.ok) throw new Error(`${url} : ${res.status} ${res.statusText}`);
  return { texte: await res.text(), maj: res.headers.get("last-modified") };
}

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url} : ${res.status} ${res.statusText}`);
  return { data: await res.json(), maj: res.headers.get("last-modified") };
}

async function depuisTableur() {
  const [p, m] = await Promise.all([
    getTexte(SOURCE.polesCSV),
    getTexte(SOURCE.membresCSV),
  ]);
  return {
    poles:   polesDepuisCSV(enObjets(parseCSV(p.texte))),
    membres: membresDepuisCSV(enObjets(parseCSV(m.texte))),
    maj: m.maj || p.maj,
    origine: "tableur",
  };
}

async function depuisInstantane() {
  const [p, m] = await Promise.all([
    getJSON(SOURCE.polesJSON),
    getJSON(SOURCE.membresJSON),
  ]);
  return { poles: p.data, membres: m.data, maj: m.maj || p.maj, origine: "instantané" };
}

/* ============================================================
   Normalisation — commune aux deux origines.
   Une donnée sale ne doit jamais produire une page blanche :
   toute anomalie est signalée puis contournée.
   ============================================================ */

function normalisePoles(brut, avertir) {
  const vus = new Set();
  return brut
    .map((p, i) => {
      const nom = String(p.nom ?? "").trim();
      // Le tableur n'a pas de colonne d'identifiant : on le dérive du nom.
      const id = String(p.id ?? "").trim() || slug(nom);
      if (!nom) { avertir(`pôle ligne ${i + 2} : nom manquant, ligne ignorée`); return null; }
      if (vus.has(id)) { avertir(`pôle « ${nom} » : nom en double, seule la première ligne est gardée`); return null; }
      vus.add(id);
      if (!p.couleur) avertir(`pôle « ${nom} » : couleur manquante, gris par défaut`);
      return {
        id,
        nom,
        couleur: String(p.couleur || GRIS).trim(),
        description: String(p.description ?? "").trim(),
        discord: String(p.discord ?? "").trim(),
        recrute: toBool(p.recrute, false),
        attendu: p.attendu === "" || p.attendu === undefined ? null : Number(p.attendu),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function normaliseMembres(brut, cle, avertir) {
  return brut
    .map((m, i) => {
      const prenom = String(m.prenom ?? "").trim();
      if (!prenom) { avertir(`membre ligne ${i + 2} : prénom manquant, ligne ignorée`); return null; }
      if (!toBool(m.actif)) return null; // parti·e : la ligne reste, on ne l'affiche pas

      const nom = String(m.nom ?? "").trim();
      const poles = [];
      for (const ref of toList(m.poles)) {
        const id = cle.get(norm(ref));
        if (!id) { avertir(`membre « ${prenom} ${nom} » : pôle inconnu « ${ref} », ignoré`); continue; }
        if (!poles.includes(id)) poles.push(id);
      }

      const surnom = String(m.surnom ?? "").trim();
      return {
        prenom, nom, surnom,
        pronoms: String(m.pronoms ?? "").trim(),
        poles,
        photo: String(m.photo ?? "").trim(),
        /* Le nom affiché est le surnom, ou le prénom à défaut. C'est ce
           qu'on lit en gros sur la carte, donc c'est la clé de tri. */
        nomAffiche: surnom || prenom,
        slug: slug(`${prenom} ${nom}`),
      };
    })
    .filter(Boolean)
    .sort((a, b) => norm(a.nomAffiche).localeCompare(norm(b.nomAffiche), "fr"));
}

/**
 * Charge, valide, normalise et trie.
 * Tente le tableur, retombe sur les instantanés locaux en cas d'échec.
 * @returns {Promise<{poles:Array, membres:Array, parId:Map, maj:Date|null,
 *                    origine:string, avertissements:string[]}>}
 */
export async function loadData() {
  const avertissements = [];
  const avertir = (msg) => avertissements.push(msg);

  let src;
  if (SOURCE.polesCSV && SOURCE.membresCSV) {
    try {
      src = await depuisTableur();
    } catch (err) {
      avertir(`tableur injoignable (${err.message}) — affichage de la dernière copie connue`);
      src = await depuisInstantane();
    }
  } else {
    src = await depuisInstantane();
  }

  const poles = normalisePoles(src.poles, avertir);

  /* On accepte qu'un membre cite un pôle par son identifiant OU par son nom :
     le tableur cite des noms, les instantanés JSON citent des identifiants. */
  const cle = new Map();
  for (const p of poles) { cle.set(norm(p.id), p.id); cle.set(norm(p.nom), p.id); }

  const membres = normaliseMembres(src.membres, cle, avertir);

  /* La colonne « Nombre personnes » n'est jamais affichée — le compte est
     recalculé. Mais si elle est remplie et qu'elle diverge, c'est le signe
     que le tableur a été édité à la main quelque part : on le dit. */
  for (const p of poles) {
    if (p.attendu === null || Number.isNaN(p.attendu)) continue;
    const reel = membres.filter((m) => m.poles.includes(p.id)).length;
    if (reel !== p.attendu)
      avertir(`pôle « ${p.nom} » : la colonne « Nombre personnes » annonce ${p.attendu}, ` +
              `l'onglet Membres en compte ${reel}. C'est le compte réel qui est affiché.`);
  }

  if (avertissements.length) {
    console.warn(
      `[trombinoscope] ${avertissements.length} anomalie(s) dans les données :\n` +
      avertissements.map((a) => "  · " + a).join("\n")
    );
  }

  const parId = new Map(poles.map((p) => [p.id, p]));
  return {
    poles, membres, parId,
    maj: src.maj ? new Date(src.maj) : null,
    origine: src.origine,
    avertissements,
  };
}
