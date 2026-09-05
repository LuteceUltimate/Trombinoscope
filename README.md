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
assets/fonts/         Urbanist en woff2, romain et italique (licence SIL OFL)
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
| `Photo` | facultative. Lien Drive, URL d'image ou nom de fichier — voir **Les photos** plus bas. Vide → initiales |

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

## Les photos

Le circuit : **un formulaire Google** demande le consentement et un fichier
image → le fichier atterrit dans le Drive du club → la feuille de réponses
reçoit un lien Drive → la colonne `Photo` de l'onglet `Membres` va chercher ce
lien → le site l'affiche.

### Les deux choses à faire une fois

**1. Rendre le dossier des réponses lisible.** Les fichiers déposés par un
formulaire sont **privés par défaut** : sans ça, le site n'affichera que des
initiales, sans erreur visible. Dans le Drive, sur le dossier
`<Nom du formulaire> (File responses)` : *Partager › Tous les utilisateurs
disposant du lien › Lecteur*. Les fichiers déposés ensuite en héritent.

Conséquence à assumer : ces photos deviennent accessibles à qui a le lien.
Mais contrairement à des fichiers commités ici, **c'est réversible** — retirer
le partage ou supprimer le fichier suffit, et la page retombe sur les initiales
toute seule.

**2. Relier les deux feuilles.** L'onglet `Membres` reste la source de vérité ;
la colonne `Photo` va simplement chercher la réponse correspondante. C'est le
tableur qui fait la jointure, pas le code :

```
=SIERREUR(RECHERCHEV($A2&" "&$B2; Réponses!$C:$E; 3; FAUX); "")
```

Deux principes à garder dans cette formule : la clé doit être quelque chose de
stable — l'adresse e-mail collectée par le formulaire vaut mieux qu'un prénom —
et **elle ne doit ramener le lien que si le consentement est « oui »**. Une
personne qui a envoyé un fichier puis changé d'avis ne doit pas voir sa photo
apparaître parce que le fichier existe encore.

### Ce que la colonne accepte

Trois formes, pour ne rien imposer au tableur :

| Contenu de la cellule | Ce que fait le site |
|---|---|
| un lien Drive (`.../open?id=…` ou `.../file/d/…/view`) | affiche la **vignette** redimensionnée par Google, 400 px de large |
| n'importe quelle autre URL d'image | l'utilise telle quelle |
| un simple nom de fichier | le cherche dans `photos/` du dépôt |
| vide | initiales, comme toujours |

Le site ne sert jamais le fichier d'origine : une photo de téléphone pèse
plusieurs mégaoctets, et 400 px couvrent le plus grand usage de la page — la
vue agrandie, 11 rem, sur écran à double densité.

### Ce qu'il faut savoir

L'endpoint de vignette de Drive **n'est pas documenté** par Google et peut
cesser de fonctionner. C'est un risque accepté, parce que l'échec est déjà
géré : une image qui ne charge pas laisse les initiales et la page reste
entière. Rien ne casse, l'affichage se dégrade.

Par ailleurs, afficher les photos depuis Drive transmet l'adresse IP de chaque
visiteur à Google — le même sujet que les polices, qu'on a réglé en les
hébergeant ici.

Les deux points disparaissent le jour du passage sur Cloudflare : l'étape de
construction rapatriera les photos une bonne fois, servies depuis la même
origine que le reste. Le tableur restera la source de vérité, et rien d'autre
ne changera.

## Charte graphique

Deux couleurs, celles du logo : **Maïs `#FFF129`** et **Vert Brunswick
`#00543C`**. Elles sont relevées dans `assets/logo.png`, un export vectoriel
qui ne compte que dix-sept couleurs : c'est la source qui fait foi, devant le
PDF de charte et devant toute copie recompressée, qui décalent l'une et
l'autre.

Elles sont écrites en dur dans `assets/styles.css` — ce sont des
valeurs de marque, pas des données : elles ne changent pas avec la saison,
contrairement aux couleurs des pôles qui, elles, vivent dans le tableur.

**La règle à ne pas casser : le Maïs est une surface, jamais une encre.** Sur
blanc il donne un contraste de 1,2:1 — illisible. Sur le Vert Brunswick, 7,7:1
dans les deux sens. D'où l'usage qu'en fait la charte, et que la page reprend :
jaune sur vert, vert sur jaune, et rien d'autre. Le bandeau de titre est le seul
endroit où la couleur de marque occupe une surface ; partout ailleurs ce sont
les douze couleurs des pôles qui parlent.

Le thème sombre dérive son fond du Vert Brunswick (`#002E21`) et prend le Maïs
comme accent : c'est littéralement l'arrangement du logo.

**La police est Urbanist**, pas Century Gothic. Century Gothic appartient à
Monotype et ne peut pas être livrée dans un dépôt — c'est une limite juridique,
pas technique. Urbanist est la géométrique libre (SIL OFL) la plus proche de son
allure : ce qui distingue Century Gothic de Futura, c'est sa grande hauteur d'x
et ses panses larges et rondes, et c'est exactement le caractère d'Urbanist.
Elle est auto-hébergée, en romain et en italique, donc tout le monde voit la
même page. `Century Gothic` figure quand même en second dans la pile, sans
conséquence pour la mise en page.

Le geste graphique du document est repris : **titre en capitales, gras
italique, souligné d'un filet court**. Les bandeaux de pôle gardent leur filet
vertical coloré — y ajouter du Maïs ferait se disputer deux couleurs sur le
même objet.

**L’écusson** vient du PNG officiel, déjà transparent : la page le recadre au
ras du disque et le réduit à 200 px. Rien à masquer, rien à retoucher.

## Prochaine étape

Décider où le site est publié. Sur GitHub Pages, l'URL est accessible à qui la
connaît, et « publier sur le web » rend le CSV lisible de la même façon : c'est
sans conséquence avec des données fictives, c'en a avec de vrais noms et de
vrais pronoms. Cloudflare Pages avec Access met le site derrière une
authentification par e-mail, gratuitement.
