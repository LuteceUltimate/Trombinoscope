# Trombinoscope — Lutèce Ultimate

Page interne du club : les douze pôles, ce qu'ils font, et les personnes qui
les font vivre. Site statique, **sans build ni dépendance** — du HTML, du CSS
et du JavaScript que l'on ouvre et que l'on modifie directement.

> ⚠️ **V1 : données de test.** Les membres de `data/membres.json` sont
> entièrement fictifs. Tant que le site est publié sur GitHub Pages, l'URL est
> accessible à qui la connaît : **aucune donnée réelle ne doit y être poussée.**

## Lancer en local

Le chargement des données passe par `fetch()`, qui ne fonctionne pas en
`file://`. Il faut donc un petit serveur :

```bash
npx serve .          # ou : python -m http.server 8000
```

puis ouvrir l'adresse affichée.

## Structure

```
index.html            la page
assets/styles.css     tout le style : jetons de couleur, thème clair/sombre, composants
assets/data.js        chargement + validation + normalisation des données
assets/app.js         état, filtres, tri, rendu, vue agrandie
assets/fonts/         Archivo et Public Sans en woff2 (licence SIL OFL)
data/poles.json       les douze pôles
data/membres.json     les membres
photos/               une image par personne (voir photos/README.md)
```

Aucune requête vers un domaine tiers : les polices sont hébergées ici.

## D'où viennent les données

**Le tableur du Drive du bureau est la source de vérité.** La page le lit
directement, à chaque chargement. Il n'y a rien à redéployer quand la liste
change : on modifie une ligne, on recharge la page.

Les fichiers `data/*.json` du dépôt sont le **jeu de démonstration** : ils ne
servent que tant que les deux URL ne sont pas renseignées. Une fois le tableur
branché, la page ne retombe **pas** dessus en cas de panne — afficher des
personnes fictives sous le titre « Trombinoscope » serait pire qu'une erreur
franche. Le filet de secours ne redeviendra utile que le jour où l'instantané
contiendra les vraies données, ce qui suppose un dépôt qui n'est pas public.

### Brancher le tableur

1. Dans le tableur : **Fichier › Partager › Publier sur le web**.
2. Choisir l'onglet **Pôles**, format **CSV**, publier, copier l'URL.
3. Recommencer pour l'onglet **Membres**.
4. Coller les deux URL en haut de `assets/data.js` :

```js
export const SOURCE = {
  polesCSV:   "https://docs.google.com/spreadsheets/d/e/…&output=csv",
  membresCSV: "https://docs.google.com/spreadsheets/d/e/…&output=csv",
  …
};
```

Laisser ces deux champs vides fait tourner le site sur les instantanés locaux.

### Onglet `Pôles`

Une ligne d'en-tête, puis une ligne par pôle. **La colonne `Nom` est la clé** :
c'est elle que citent les colonnes `Pôle 1` et `Pôle 2` de l'onglet Membres.

| Colonne | Rôle |
|---|---|
| `Nom` | la clé, et ce qui s'affiche. **L'ordre A→Z en découle** : pas de colonne d'ordre |
| `Couleur` | hexadécimal, `#E04A3C`. La palette vit ici, jamais dans le CSS |
| `Nombre personnes` | **effectif souhaité**, jamais affiché tel quel. S'il dépasse le nombre réel de membres, l'encart « on cherche du monde » apparaît et annonce combien il en manque. Vide = le pôle ne demande rien |
| `Description` | une à deux phrases, écrites par le pôle |
| `Lien discord` | déjà présente, encore vide. Tant qu'elle l'est, aucun lien de contact ne s'affiche |

### Onglet `Membres`

| Colonne | Rôle |
|---|---|
| `Prénom` | obligatoire ; sans lui la ligne est ignorée |
| `Nom` | |
| `Surnom` | affiché en gros. À défaut, c'est le prénom |
| `Pronoms` | **facultatif et déclaratif** : rempli par la personne, jamais deviné. Vide → rien ne s'affiche. Forme retenue au club : `lui/il`, `elle/elle`, `ellui/iel` |
| `Pôle 1`, `Pôle 2` | le `Nom` d'un pôle. Ajouter une colonne `Pôle 3` suffit à en gérer trois, sans toucher au code |
| `Photo` | facultative, absente pour l'instant. Nom de fichier dans `photos/` ; vide → initiales |

Retirer quelqu'un du club, c'est retirer sa ligne du tableur : il n'y a pas de
colonne `Actif`.

Les noms de colonnes sont appariés **sans tenir compte des accents, de la casse
ni des espaces** : `Prénom`, `prenom` et `PRÉNOM` sont la même colonne. Idem
pour les noms de pôles cités par les membres : `TOURNOIS` trouve `Tournois`,
et `Coaching` trouve `Coaching 🫡` — les emoji des noms de pôles ne cassent
rien, ni l'appariement ni les URL de filtre.

### Les couleurs restent lisibles quoi qu'on écrive

La palette vient du tableur, donc n'importe quelle couleur peut y être saisie —
y compris un jaune très clair, illisible en texte sur fond blanc. Le site ne se
sert de la couleur brute que pour les aplats : liseré, pastille active, fond
teinté. Pour le **texte**, il en calcule une variante à teinte constante, dont
seule la clarté est déplacée jusqu'à dépasser le seuil de contraste WCAG AA
(4,5:1) — une fois pour le thème clair, une fois pour le sombre. Avec la palette
actuelle, les douze pôles passent le seuil dans les deux thèmes.

### Ce qui casse, et ce qui ne casse pas

Renommer un pôle dans l'onglet `Pôles` **casse toutes les lignes Membres qui
citaient l'ancien nom** (elles sont signalées en console, pas silencieusement
perdues) et change l'URL des liens filtrés. Tout le reste se rattrape seul :
un pôle inconnu est ignoré, une couleur absente devient grise, une photo
introuvable retombe sur les initiales, un tableur injoignable laisse la
dernière copie connue.

## Prochaine étape

Décider où le site est publié. Sur GitHub Pages, l'URL est accessible à qui la
connaît, et « publier sur le web » rend le CSV lisible de la même façon : c'est
sans conséquence avec des données fictives, c'en a avec de vrais noms et de
vrais pronoms. Cloudflare Pages avec Access met le site derrière une
authentification par e-mail, gratuitement.
