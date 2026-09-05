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
  // Onglet « Pôles »   : Nom | Couleur | Nombre personnes | Description | Lien discord
  polesCSV:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdhs4kUMHzROG-BMBG44YE4eRa6AJ1dqtWGaeGNVPZ52a2mPPU7LzIAD0DIa2Ids_IqMyVVC38BGxk/pub?gid=299606187&single=true&output=csv",
  // Onglet « Membres » : Prénom | Nom | Surnom | Pronoms | Pôle 1 | Pôle 2
  membresCSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdhs4kUMHzROG-BMBG44YE4eRa6AJ1dqtWGaeGNVPZ52a2mPPU7LzIAD0DIa2Ids_IqMyVVC38BGxk/pub?gid=0&single=true&output=csv",

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
   Lisibilité des couleurs
   ------------------------------------------------------------
   La palette vient du tableur : n'importe qui peut y écrire un
   jaune très clair ou un brun très sombre. Prendre la couleur
   brute comme couleur de texte donnerait, tôt ou tard, un titre
   illisible. On garde donc la teinte et la saturation, et on ne
   déplace que la clarté jusqu'à obtenir un contraste correct sur
   le fond de la page — une fois pour le thème clair, une fois
   pour le sombre. La couleur brute reste utilisée partout où
   elle est un aplat : liseré, pastille active, pavé de palette.
   ============================================================ */

const FOND_CLAIR = [240, 243, 238];  // --ground, thème clair
const FOND_SOMBRE = [13, 31, 23];    // --ground, thème sombre
const CIBLE = 4.5;                   // WCAG AA, texte normal

const hex2rgb = (h) => {
  const x = String(h).replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(x)) return null;
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};
const rgb2hex = (c) =>
  "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const canal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = (c) => 0.2126 * canal(c[0]) + 0.7152 * canal(c[1]) + 0.0722 * canal(c[2]);
const contraste = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

function rgb2hsl(rgb) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}
function hsl2rgb(hsl) {
  const h = hsl[0], s = hsl[1], l = hsl[2];
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map((v) => v * 255);
}

/** Variante de la couleur, lisible sur le fond donné, à teinte constante. */
export function lisible(couleur, fond, cible = CIBLE) {
  const rgb = hex2rgb(couleur);
  if (!rgb) return luminance(fond) > 0.5 ? "#111111" : "#EEEEEE";
  const hsl = rgb2hsl(rgb);
  const fondClair = luminance(fond) > 0.5;
  let l = hsl[2];
  for (let i = 0; i <= 100; i++) {
    const c = hsl2rgb([hsl[0], hsl[1], l]);
    if (contraste(c, fond) >= cible) return rgb2hex(c);
    l += fondClair ? -0.01 : 0.01;
    if (l < 0 || l > 1) break;
  }
  return fondClair ? "#111111" : "#EEEEEE";
}

/* ============================================================
   Photos
   ------------------------------------------------------------
   La cellule « Photo » peut contenir trois choses, selon d'où
   elle vient. On accepte les trois plutôt que d'imposer une
   forme au tableur :

   1. un lien Google Drive, tel que le formulaire le dépose
      (« .../open?id=… » ou « .../file/d/…/view ») ;
   2. n'importe quelle autre URL d'image, prise telle quelle ;
   3. un simple nom de fichier, cherché dans photos/ du dépôt.

   Pour Drive, on ne sert pas le fichier d'origine — une photo
   de téléphone pèse plusieurs mégaoctets — mais la vignette
   redimensionnée par Google. 400 px de large couvre le plus
   grand usage de la page (la vue agrandie, 11 rem, en écran
   à double densité).

   Cet endpoint n'est pas documenté par Google : il peut cesser
   de fonctionner. C'est acceptable ici parce que l'échec est
   déjà géré — une image qui ne charge pas laisse les initiales,
   et la page reste entière. Le jour où le site passe sur
   Cloudflare, l'étape de construction pourra rapatrier ces
   photos une bonne fois pour toutes : même origine, plus de
   dépendance à Drive, et plus aucune adresse IP de visiteur
   transmise à Google.
   ============================================================ */

const TAILLE_PHOTO = 400;

/** Identifiant Drive : 25 caractères ou plus, lettres, chiffres, - et _ */
const idDrive = (s) => {
  const m = String(s).match(/\/d\/([-\w]{25,})|[?&]id=([-\w]{25,})/);
  return m ? (m[1] || m[2]) : null;
};

const vignetteDrive = (id) =>
  "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + TAILLE_PHOTO;

/** Valeur de la colonne « Photo » -> URL utilisable dans un <img>, ou "". */
export function urlPhoto(valeur) {
  // Un formulaire qui autorise plusieurs fichiers colle plusieurs liens :
  // on ne garde que le premier.
  const s = String(valeur ?? "").split(/[,\n]/)[0].trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s)) {
    if (/(drive|docs)\.google\.com/i.test(s)) {
      const id = idDrive(s);
      return id ? vignetteDrive(id) : s;
    }
    return s;
  }
  if (/^[-\w]{25,}$/.test(s)) return vignetteDrive(s); // un identifiant nu
  return "photos/" + s;                                 // un fichier du dépôt
}

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

/** Première colonne trouvée parmi plusieurs noms exacts. */
const col = (o, ...noms) => {
  for (const n of noms) if (o[n] !== undefined && o[n] !== "") return o[n];
  return "";
};

/* Filet pour les en-têtes qu'on renomme : « Nombre personnes » est devenu
   « Nombre personnes minimum » du jour au lendemain. On cherche donc aussi
   la première colonne dont l'en-tête contient tous les mots donnés.
   Réservé aux colonnes sans ambiguïté : surtout pas pour « nom », qui est
   contenu dans « prenom » et dans « surnom ». */
const colContient = (o, ...mots) => {
  for (const k of Object.keys(o)) {
    if (mots.every((m) => k.includes(m)) && o[k] !== "") return o[k];
  }
  return "";
};

/** Toutes les colonnes « Pôle 1 », « Pôle 2 »… dans l'ordre. */
const colonnesPoles = (o) =>
  Object.keys(o)
    // « Pôle 1 », « Pôle 2 », mais aussi « Pôle principal » / « Pôle secondaire »
    .filter((k) => /^pole\b/.test(k))
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
    couleur:     col(o, "couleur", "color") || colContient(o, "couleur"),
    description: col(o, "description", "descriptif") || colContient(o, "description"),
    discord:     col(o, "discord", "lien discord", "salon discord") || colContient(o, "discord"),
    /* Effectif souhaité par le pôle. Jamais affiché tel quel : il sert
       uniquement à décider si l'encart « on cherche du monde » apparaît. */
    voulu:       col(o, "nombre personnes", "nombre de personnes", "effectif") ||
                 colContient(o, "nombre", "personne"),
  }));
}

function membresDepuisCSV(objets) {
  return objets.map((o) => ({
    prenom:  col(o, "prenom", "prenom(s)"),
    nom:     col(o, "nom", "nom de famille"),
    surnom:  col(o, "surnom", "pseudo"),
    pronoms: col(o, "pronoms", "pronom"),
    poles:   colonnesPoles(o),
    photo:   col(o, "photo") || colContient(o, "photo"),
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
        voulu: p.voulu === "" || p.voulu === undefined ? null : Number(p.voulu),
        txtClair: lisible(p.couleur || GRIS, FOND_CLAIR),
        txtSombre: lisible(p.couleur || GRIS, FOND_SOMBRE),
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
        /* On essaie le libellé tel quel, puis sa forme sans emoji ni
           ponctuation : le tableur écrit « Coaching 🫡 » dans l'onglet
           Pôles, un membre peut très bien écrire « Coaching ». */
        const id = cle.get(norm(ref)) || cle.get(slug(ref));
        if (!id) { avertir(`membre « ${prenom} ${nom} » : pôle inconnu « ${ref} », ignoré`); continue; }
        if (!poles.includes(id)) poles.push(id);
      }

      const surnom = String(m.surnom ?? "").trim();
      return {
        prenom, nom, surnom,
        pronoms: String(m.pronoms ?? "").trim(),
        poles,
        photo: urlPhoto(m.photo),
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

  /* Tant que les deux URL ne sont pas renseignées, le site tourne sur les
     instantanés du dépôt — le jeu de démonstration.

     Une fois le tableur branché, on NE retombe PAS dessus en cas de panne :
     afficher des personnes fictives sous le titre « Trombinoscope » serait
     pire qu'une erreur franche. Le filet de secours ne redeviendra utile
     que le jour où l'instantané contiendra les vraies données — ce qui
     suppose un dépôt qui n'est pas public. */
  const branche = Boolean(SOURCE.polesCSV && SOURCE.membresCSV);
  const src = branche ? await depuisTableur() : await depuisInstantane();

  const poles = normalisePoles(src.poles, avertir);

  /* On accepte qu'un membre cite un pôle par son identifiant OU par son nom :
     le tableur cite des noms, les instantanés JSON citent des identifiants. */
  const cle = new Map();
  for (const p of poles) {
    cle.set(norm(p.id), p.id);   // « coaching »
    cle.set(norm(p.nom), p.id);  // « coaching 🫡 », emoji compris
  }

  const membres = normaliseMembres(src.membres, cle, avertir);

  /* « Nombre personnes » est l'effectif souhaité par le pôle. Le compte réel
     est toujours recalculé ; la comparaison des deux décide simplement si
     l'encart « on cherche du monde » s'affiche, et combien il en manque.
     Colonne vide = le pôle ne demande rien. */
  for (const p of poles) {
    const reel = membres.filter((m) => m.poles.includes(p.id)).length;
    if (p.voulu === null || Number.isNaN(p.voulu) || p.voulu <= reel) {
      p.recrute = false;
      p.manque = 0;
    } else {
      p.recrute = true;
      p.manque = p.voulu - reel;
    }
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
    /* Un tableur publie par Google ne renvoie ni Last-Modified ni ETag :
       impossible de savoir quand il a ete edite. Mais comme la page le lit
       a chaque chargement, l'information utile n'est pas la date de la
       derniere modification -- c'est le fait que ces donnees viennent
       d'etre lues. C'est ce qu'on affiche. */
    lu: new Date(),
    origine: src.origine,
    avertissements,
  };
}
