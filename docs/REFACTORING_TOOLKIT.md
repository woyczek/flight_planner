# Refactoring du toolkit (framework commun de la suite)

> **Annonce** : une prochaine version majeure de la suite apportera un **gros changement du toolkit** (socle commun de
> `shared/` : en-tête, barre latérale, blocs, designs, décors, icônes). Les pages garderont leur fonctionnement, mais
> leur apparence dans les designs à matières (Cabinet, Carnet de vol, Durci, Aqua) pourra légèrement bouger. Ce
> document décrit le constat, le plan et l'avancement.

Périmètre : le socle commun de `shared/` — `repository_nav.js`, `app_framework.js`, `block_icons.js/.css`,
`design_deco.js`, `designs.css`, `designs_skeuo.css`, `repository_nav.css`, `appearance_page.js`, `browser_store.js`,
`file_access.js`, `suite_update.js` — et le générateur `tools/build_skeuo_icons_css.py`. Le code métier des
applications (reporting, CR, planificateur, studio…) n'est touché que là où il dépend du socle.

## Constat (septembre 2026)

1. **Designs décrits à cinq endroits** : `repository_nav.js` (palette et relief automatiques des graphiques, jeu
   d'icônes → dossier, logo), `design_deco.js`, `build_skeuo_icons_css.py`, `appearance_page.js`, et la CSS (liste des
   quatre designs à matières recopiée 63 fois). Ajouter un design ou un réglage touchait cinq fichiers.
2. **`designs_skeuo.css` : exceptions empilées** — 695 lignes, 262 `!important` (719 dans toute la CSS du socle),
   ~160 règles par design qui redisent souvent la même chose (`.repo-block` surchargé 77 fois, `.repo-block-tools` 32,
   `.repo-header` 22) ; jetons peu utilisés.
3. **Règles de pages dans le socle** : 63 sélecteurs `.mc-*` (Mission Core), `.ap-*`, `.fp-*`, sections « CR DEFA » et
   « Planificateur » dans `designs_skeuo.css` ; 6 pages ont leur propre palette `:root` que le socle doit contrer
   (contrastes ratés du Planning ODV).
4. **Utilitaires recopiés** : échappement HTML (21 copies), traduction d'une ligne `[fr, en, de, es]` (20 fichiers),
   `localStorage` protégé (~25), luminance et contraste WCAG (3 implémentations).
5. **Code compacté** : 944 lignes de plus de 200 caractères dans `shared/`.

## Plan — quatre chantiers indépendants

| Chantier | Contenu | Risque | État |
|---|---|---|---|
| **D. Boîte à outils commune** | `shared/kit.js` (`window.RepositoryKit`) : `esc`, langue (`lang`, `langIndex`, `t`), stockage protégé (`store`), couleurs (`color` : lecture, hex, luminance, contraste WCAG, HSL, teinte / saturation, clarté). Chargé par chaque page juste avant `repository_nav.js` ; les modules du socle s'en servent à la place de leurs copies. Code compacté reformaté au passage, fichier par fichier. | faible, sans effet visuel | **fait** (socle) ; modules applicatifs au fil de l'eau |
| **A. Registre unique des designs** | `REPOSITORY_TREE.designs.list` devient la seule source : `skeuo` (design à matières), `chart` (palette automatique), `icons` (jeu par défaut, images dans `shared/icons/skeuo/<id du design>`), `emblem`, `css`. Lu par `repository_nav.js` (graphiques, logo, dossier des icônes, attribut `html[data-skeuo]`), `appearance_page.js` (`appearance.iconFolder`), `build_skeuo_icons_css.py` (jeux d'icônes). La CSS commune aux designs à matières s'écrit `html[data-skeuo]` au lieu de la liste des quatre designs. | faible | **fait** |
| **B. CSS par jetons** | Jeu de variables de composant par design (`--sk-*` : surfaces, encre, bords, boutons, barres, bloc) ; composants écrits une fois pour tous les designs à matières ; par design, seulement ce qui est unique (textures, rivets, cadres). Objectif : `designs_skeuo.css` < 400 lignes, < 60 `!important`. | élevé (visuel) | à faire |
| **C. Sortir les exceptions de page** | Règles `.mc-*`, `.fp-*`, CR, planificateur dans la CSS de leur application, sur les jetons du socle ; les pages abandonnent leur `:root` de couleurs pour les jetons communs. | moyen | à faire |

Ordre : D, A (faits), puis B design par design avec C page par page. Chaque étape : un commit sur `develop`, vérifié sur
les pages témoins (reporting, CR, studio, planificateur, Planning ODV, Apparence ; tons clair et sombre ; console sans
erreur, captures avant / après). Pas de version publiée avant la fin de B.

## Utiliser la boîte à outils (D)

```js
const K = window.RepositoryKit;
K.esc(texte);                         // HTML échappé
K.t(['Bonjour', 'Hello', 'Hallo', 'Hola']);   // langue courante, typographie française appliquée
K.store.get('cle', 'défaut'); K.store.json('cle', {}); K.store.set('cle', 'v'); K.store.setJson('cle', obj);
K.color.contrast('#fff', '#1d3557');  // rapport WCAG
```

Nouveau module : ne plus recopier ces utilitaires ; une page qui charge `repository_nav.js` charge `kit.js` juste avant
(insertion faite dans toutes les pages ; les pages générées la reprennent de leur modèle).

## Ajouter un design (A)

Déclarer le design dans `repository_tree` (`designs.list`) ; pour un design à matières : `css:"designs_skeuo.css"`,
`skeuo:true`, `chart:"…"` (facultatif), `icons:"<jeu>"` avec ses images dans `shared/icons/skeuo/<id>/`, logo
`shared/icons/defa/<id>.webp`, décors dans `design_deco.js`. Puis `python tools/build_skeuo_icons_css.py` et
`python tools/bump_versions.py`.
