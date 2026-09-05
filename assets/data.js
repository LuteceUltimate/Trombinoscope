/* ============================================================
   data.js — chargement et normalisation
   ------------------------------------------------------------
   C'EST LA COUTURE. En V2, seules les fonctions fetchPoles() et
   fetchMembres() changent : elles iront chercher le CSV publié du
   tableur au lieu des fichiers JSON locaux. Tout le reste de
   l'application ignore d'où viennent les données.

   Les objets renvoyés ont exactement la forme des colonnes du
   futur tableur, et le normaliseur accepte déjà la colonne
   « poles » sous forme de chaîne « a ; b » comme un CSV la
   produira, ou de tableau comme un JSON la produit naturellement.

   Principe : une donnée sale ne doit jamais produire une page
   blanche. Toute anomalie est signalée puis contournée.
   ============================================================ */

const SOURCES = {
  poles:   "data/poles.json",
  membres: "data/membres.json",
};

const GRIS = "#8A9A90"; // couleur de repli d'un pôle sans couleur

/** Minuscules sans accents, pour trier et chercher. */
export const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Identifiant de fichier photo : "Jean-Loup Quéméner" -> "jean-loup-quemener" */
export const slug = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** « a ; b » ou ["a","b"] -> ["a","b"] */
const toList = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean);

/** « non », « faux », « 0 », "" -> false ; le reste -> true */
const toBool = (v, defaut = true) => {
  if (v === undefined || v === null || v === "") return defaut;
  if (typeof v === "boolean") return v;
  return !/^(non|no|false|faux|0)$/i.test(String(v).trim());
};

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url} : ${res.status} ${res.statusText}`);
  return { data: await res.json(), maj: res.headers.get("last-modified") };
}

const fetchPoles   = () => getJSON(SOURCES.poles);
const fetchMembres = () => getJSON(SOURCES.membres);

function normalisePoles(brut, avertir) {
  const vus = new Set();
  return brut
    .map((p, i) => {
      const id = String(p.id ?? "").trim();
      if (!id)        { avertir(`pôle ligne ${i + 1} : identifiant manquant, ligne ignorée`); return null; }
      if (vus.has(id)){ avertir(`pôle « ${id} » : identifiant en double, seule la première ligne est gardée`); return null; }
      vus.add(id);
      if (!p.couleur) avertir(`pôle « ${id} » : couleur manquante, gris par défaut`);
      return {
        id,
        nom: String(p.nom ?? id).trim(),
        couleur: String(p.couleur || GRIS).trim(),
        description: String(p.description ?? "").trim(),
        discord: String(p.discord ?? "").trim(),
        recrute: toBool(p.recrute, false),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function normaliseMembres(brut, parId, avertir) {
  return brut
    .map((m, i) => {
      const prenom = String(m.prenom ?? "").trim();
      if (!prenom) { avertir(`membre ligne ${i + 1} : prénom manquant, ligne ignorée`); return null; }
      if (!toBool(m.actif)) return null; // parti·e du club : on garde la ligne, on ne l'affiche pas

      const nom = String(m.nom ?? "").trim();
      const poles = toList(m.poles).filter((id) => {
        if (parId.has(id)) return true;
        avertir(`membre « ${prenom} ${nom} » : pôle inconnu « ${id} », ignoré`);
        return false;
      });

      const surnom = String(m.surnom ?? "").trim();
      return {
        prenom,
        nom,
        surnom,
        pronoms: String(m.pronoms ?? "").trim(),
        poles,
        photo: String(m.photo ?? "").trim(),
        /* Le nom affiché est le surnom, ou le prénom à défaut.
           C'est ce qu'on lit en gros sur la carte, donc c'est la clé de tri. */
        nomAffiche: surnom || prenom,
        slug: slug(`${prenom} ${nom}`),
      };
    })
    .filter(Boolean)
    .sort((a, b) => norm(a.nomAffiche).localeCompare(norm(b.nomAffiche), "fr"));
}

/**
 * Charge, valide, normalise et trie.
 * @returns {Promise<{poles:Array, membres:Array, parId:Map, maj:Date|null, avertissements:string[]}>}
 */
export async function loadData() {
  const avertissements = [];
  const avertir = (msg) => avertissements.push(msg);

  const [p, m] = await Promise.all([fetchPoles(), fetchMembres()]);

  const poles = normalisePoles(p.data, avertir);
  const parId = new Map(poles.map((x) => [x.id, x]));
  const membres = normaliseMembres(m.data, parId, avertir);

  if (avertissements.length) {
    console.warn(
      `[trombinoscope] ${avertissements.length} anomalie(s) dans les données :\n` +
      avertissements.map((a) => "  · " + a).join("\n")
    );
  }

  const brut = m.maj || p.maj;
  return { poles, membres, parId, maj: brut ? new Date(brut) : null, avertissements };
}
