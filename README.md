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

Les fichiers `data/*.json` du dépôt ne sont plus qu'un **filet de secours** :
ils ne servent que si Google ne répond pas, et la page dit alors clairement
qu'elle affiche une copie qui peut être en retard.

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
| `Nombre personnes` | **ignoré à l'affichage** : le compte est recalculé depuis l'onglet Membres. S'il est rempli et qu'il diverge, la console le signale — la colonne devient un garde-fou |
| `Description` | une à deux phrases, écrites par le pôle |
| `Discord` | *à ajouter* — lien du salon. Sans elle, aucun lien de contact ne s'affiche |
| `Recrute` | *à ajouter* — `oui` affiche la carte « on cherche du monde » |

### Onglet `Membres`

| Colonne | Rôle |
|---|---|
| `Prénom` | obligatoire ; sans lui la ligne est ignorée |
| `Nom` | |
| `Surnom` | affiché en gros. À défaut, c'est le prénom |
| `Pronoms` | **facultatif et déclaratif** : rempli par la personne, jamais deviné. Vide → rien ne s'affiche. Forme retenue au club : `lui/il`, `elle/elle`, `ellui/iel` |
| `Pôle 1`, `Pôle 2` | le `Nom` d'un pôle. Ajouter une colonne `Pôle 3` suffit à en gérer trois, sans toucher au code |
| `Photo` | *à ajouter* — nom de fichier dans `photos/`. Vide → initiales |
| `Actif` | *à ajouter* — `non` conserve la ligne sans l'afficher, plutôt que de la supprimer |

Les noms de colonnes sont appariés **sans tenir compte des accents, de la casse
ni des espaces** : `Prénom`, `prenom` et `PRÉNOM` sont la même colonne. Idem
pour les noms de pôles cités par les membres : `TOURNOIS` trouve `Tournois`.

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
