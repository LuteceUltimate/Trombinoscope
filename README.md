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

## Mettre à jour les données

Pour l'instant, en éditant les deux fichiers de `data/`.

### `data/poles.json`

| Champ | Rôle |
|---|---|
| `id` | clé sans accent ni espace, utilisée par les membres |
| `nom` | ce qui s'affiche — **l'ordre A→Z en découle**, il n'y a pas de colonne d'ordre |
| `couleur` | hexadécimal. La palette vit ici, jamais dans le CSS |
| `description` | une à deux phrases, écrites par le pôle |
| `discord` | lien vers le salon du pôle |
| `recrute` | `true` affiche la carte « on cherche du monde » |

### `data/membres.json`

| Champ | Rôle |
|---|---|
| `prenom` | obligatoire ; sans lui la ligne est ignorée |
| `nom` | |
| `surnom` | affiché en gros. À défaut, c'est le prénom |
| `pronoms` | **facultatif et déclaratif** : rempli par la personne, jamais deviné. Vide → rien ne s'affiche |
| `poles` | liste d'`id`. Accepte `["a","b"]` ou `"a ; b"` |
| `photo` | nom de fichier dans `photos/`. Vide → initiales |
| `actif` | `false` conserve la ligne sans l'afficher, plutôt que de la supprimer |

Le tri se fait sur le nom affiché — surnom, ou prénom à défaut — et il ignore
les accents. Le nombre de membres par pôle est **calculé**, jamais saisi.

Une donnée invalide n'arrête jamais la page : un pôle inconnu est ignoré, une
couleur absente devient grise, une photo introuvable retombe sur les initiales.
Les anomalies sont listées dans la console du navigateur.

## Prochaine étape (V2)

Brancher le tableur du Drive du bureau, publié en CSV. Seul `assets/data.js`
changera : les fonctions `fetchPoles()` et `fetchMembres()` iront chercher le
CSV au lieu du JSON local. Le reste de l'application ignore d'où viennent les
données, et les champs ci-dessus sont déjà nommés comme les colonnes du tableur.
