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
3. **Règles de pages dans le socle** : 63 sélecteurs `.mc-*` (Mission Core), `.ap-*`, `.fp-*`, sections « CR » et
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
| **B. CSS par jetons** | Jeu de variables de composant par design (`--sk-*` : surfaces, encre, bords, boutons, barres, bloc) ; composants écrits une fois pour tous les designs à matières ; par design, seulement ce qui est unique (textures, rivets, cadres). Objectif : `designs_skeuo.css` < 400 lignes, < 60 `!important`. | élevé (visuel) | **fait** (première passe, voir ci-dessous) |
| **C. Sortir les exceptions de page** | Règles `.mc-*`, `.fp-*`, CR, planificateur dans la CSS de leur application, sur les jetons du socle ; les pages abandonnent leur `:root` de couleurs pour les jetons communs. | moyen | **en cours** — règles déplacées (voir ci-dessous) ; palettes `:root` des pages à faire |

Ordre : D, A (faits), puis B design par design avec C page par page. Chaque étape : un commit sur `develop`, vérifié sur
les pages témoins (reporting, CR, studio, planificateur, Planning ODV, Apparence ; tons clair et sombre ; console sans
erreur, captures avant / après). Pas de version publiée avant la fin de B.

## Avancement de B et C (30 septembre 2026)

Vérification : banc `tools/skeuo_regression.html` (styles calculés de ~60 composants, pseudo-éléments compris, sur six
pages témoins, quatre designs, deux tons) — **aucun écart** après chaque étape, sauf le correctif voulu ci-dessous.

- **Jetons `--sk-*`** (103) définis dans chaque design et ton ; **composants communs** écrits une fois
  (`html[data-skeuo]`) : en-tête, boutons du menu et de la langue, menus, blocs, sous-titres, sous-cartes, zones de
  dépôt et leur bouton « Choisir », bandeaux, champs, boutons (survol, désactivé), liens-boutons, barre latérale, pied
  de page, barre d'action, outils de bloc, fenêtre Apparence. Les boutons Aqua portent leurs jetons sur eux-mêmes (gel
  local : rouge des boutons « danger »).
- **Sorties du socle** : règles Mission Core → `shared/mission_core/core.css` ; cartes de l'éditeur de mission →
  `mission_editor.html` ; graphiques, cadrans et curseurs → `flight_performance_planner.html` ; vignettes Aqua de
  l'Apparence → `appearance_page.js`. Le socle garde les jetons (`--sk-hb*`, `--sk-pop*`, `--sk-card*`, `--sk-chart-*`…).
- **Correctif** : un commentaire sans ouverture neutralisait la règle des vis de Durci (vis cruciformes découpées dans
  la planche : désormais appliquées).
- **Registre** : `frame` (cadre cousu : Cabinet, Carnet de vol, Durci → `html[data-skeuo="frame"]`) et `base`
  (déclinaison : Carnet de vol → Cabinet, `html[data-design-base="cabinet"]`) remplacent toutes les listes de designs
  de la CSS ; plaques de titre et leurs vis, couleurs de texte des blocs, barres d'état : composants communs des
  designs à cadre (jetons `--sk-plate-*`, `--sk-screw`, `--sk-label-ink`, `--sk-status-*`).
- **Chiffres** (`designs_skeuo.css`, avant → après) : listes de designs `:is(…)` 96 → 0 ; `!important` 551 → 318 ;
  98,8 → 90,8 Ko ; 119 jetons ; règles visant un design précis : Cabinet 104 → 9, Carnet de vol 125 → 28, Durci
  111 → 74, Aqua 87 → 43 ; 723 lignes (les jetons en tête de chaque design ; objectif de 400 lignes non atteint :
  les matières restent très détaillées).
- **Reste** (volontairement design par design, peu de recouvrement) : sélecteurs segmentés, pastilles de code ;
  palettes `:root` des 6 pages qui en ont une (chantier C).

## Phase 2 — supprimer les exceptions (pistes, 30 septembre 2026)

Principe : un design à matières = des jetons et des images aux noms convenus ; plus de règle ni de réglage JS qui
nomme un design, sauf les matières elles-mêmes. État : règles visant un design précis dans `designs_skeuo.css` :
Durci 77, Aqua 43, Carnet de vol 30, Cabinet 9 (+ 54 par la base Cabinet) ; `!important` 320.

### Code

1. **Jetons manquants** (Durci surtout, puis Aqua, Carnet de vol) : couleurs de texte des blocs et des cartes, liens,
   anneau de focus, fonds de tableau, pastilles de code, sélecteurs segmentés, états warn / ok / err, axe des graphiques ;
   police condensée de Durci répétée dans 8 règles → `--sk-font-display`. Objectif : Durci ≤ 15 règles propres.
2. **Tonalité de surface** : Durci est « clair » par sa page mais ses blocs sont sombres ; d'où des exceptions (voile des
   panneaux, encre de la feuille, panneaux assombris). Déclarer la tonalité des surfaces de bloc par design et par ton
   (`surface:"dark"` dans le registre → `html[data-surface]`) et écrire ces règles une fois contre elle.
3. **Couches CSS** (`@layer base, page, skin`) : le socle, les styles des pages et les designs à matières dans trois
   couches ordonnées ; les designs l'emportent sans `!important` (320 → quelques-uns). Chantier le plus rentable, mais
   il touche toutes les pages (styles de page à placer dans `@layer page`) : à faire avec le banc de non-régression.
4. **Feuille de registre** : valeurs par défaut des jetons `--sh-*` (en-tête, cachet, accessoire, marge : absents) sur la
   règle commune ; un design ne déclare que ce qu'il a. `cut_register_sheet.py` écrit lui-même le bloc de jetons
   (fichier `shared/deco/<design>/sheet.css` importé, ou section balisée réécrite) au lieu de l'afficher.
5. **Carnet des aperçus de cartes** : la règle est dans la page Studio ; en faire un composant commun
   (`.repo-notebook`, jetons `--nb-*`) réutilisable par d'autres galeries (Reporting, Planning ODV).
6. **Décor de page déclaratif** (`design_deco.js`) : la frise de Durci (radar, plaque, voyant) est du HTML propre au
   design ; le voyant de sauvegarde est une vraie fonction → composant commun stylé par chaque design ; frises décrites
   par une liste d'éléments (`strip`, `radar`, `plate`, `status`). Poignées latérales de Durci (`body::before/after`,
   `overflow-x:clip`) → objets de marge ordinaires (`SETS.sides`) ou supprimées.
7. **Panneaux** : `PANELS.field.dir:''`, `only`, `clair.alias` (7 thèmes de Cabinet clair renvoyés vers 3 panneaux)
   disparaissent si chaque design a les 9 thèmes × 2 orientations dans `shared/deco/<design>/panels/` (voir assets).
8. **Contrôle des images** (`tools/check_assets.py`, appelé par `bump_versions.py`) : format réel = extension
   (`chart.webp` était un PNG de 2,9 Mo), poids et dimensions maximales par famille, transparence attendue.
9. **Carnet de vol hérite de Cabinet** (`base:"cabinet"`) : il a maintenant sa feuille, ses carnets et ses fonds ;
   revoir ce qui passe encore par la base (54 règles) et ne garder que le commun réel (cadre, plaques, vis).

### Assets à fournir ou à refaire

Suivi détaillé (consignes de génération, intégration) : [ASSETS_A_FOURNIR.md](ASSETS_A_FOURNIR.md) ; état à jour :
`python tools/assets_status.py`.

| Design | Manque | Effet |
| --- | --- | --- |
| Aqua | feuille de registre, carnet ouvert / fermé, appareil de page, panneaux par thème, objets | Aqua rejoint les familles communes (plus de BG spécifique) |
| Carnet de vol | panneaux par thème (9 thèmes, paysage + portrait) ; appareil de page (2 objets) | fin des fonds `BG` et des plans (blueprint) propres au design |
| Cabinet (ton clair) | panneaux ivoire : aérodrome, opérations, familles, récompenses, équipement, radio, heure ; « instruments » en portrait | fin des alias |
| Durci | panneaux « awards » et « families » en paysage | fin de `only` |
| Tous | planche de feuille **sans tableau imprimé** (papier vierge), en-tête et cachet en pièces transparentes, bords droits (sans perspective) | découpe sans effacement ni redressement (`erase`, `shear` supprimés) |
| Durci | frise de pied de page en une image (comme Cabinet et Carnet de vol) | fin du HTML de frise propre à Durci |

Suivi des assets (cahier des charges, consignes de génération, intégration) : `docs/ASSETS_A_FOURNIR.md` (en cours).

### Avancement de la phase 2

- **Fait (30 septembre 2026)** :
  - **4. Feuille de registre** — en-tête, cachet, accessoire, marge gauche et ordre de l'accessoire facultatifs
    (absents par défaut dans les règles communes : Durci ne déclare plus de zéros) ; chaque design a un bloc « découpe »
    balisé dans `designs_skeuo.css`, réécrit par `tools/cut_register_sheet.py <design> --write` (identique après
    réécriture des trois designs), et un bloc « réglages » à la main.
  - **5. Carnet des aperçus** — composant `.repo-notebooks` (galerie) / `.repo-notebook` (carte) de
    `designs_skeuo.css`, jetons `--nb-*` ; le Studio ne garde que les classes et son action (clic = actualiser).
  - **8. Contrôle des images** — `tools/check_assets.py` (format réel, poids > 400 ko, images absentes, orphelines),
    lancé à la fin de `bump_versions.py` (rapport seul) ; état : 181 images, aucune erreur.
  - Hors plan : appareil de page unifié (entre les blocs 3 et 4 pour tous, `DEVICE_AT`, déplaçable), tâches longues
    communes (`AppFramework.task`), panneaux atténués uniformément.
- **Fait (30 septembre 2026, suite)** :
  - **1. Jetons manquants (première passe)** — règles jumelles Cabinet / Durci fusionnées en une règle des designs à
    cadre (`html[data-skeuo="frame"]`) et des jetons : pastille d'étape (`--sk-step-*`), titres et sous-titres des
    sous-cartes (`--sk-card-title-*`, `--sk-card-sub-ink`), zones de dépôt (`--sk-drop-ink`, `--sk-drop-state-ink`,
    `--sk-pick-case` / `-spacing`), icône des bandeaux (`--sk-notice-icon`), anneau de focus (`--sk-focus`), pied de
    page (`--sk-footer-link`, `--sk-footer-shadow`), chiffres alignés des champs, sélecteur segmenté (`--sk-segs-*`,
    `--sk-seg-*` ; le Carnet de vol ne surcharge que ce qui diffère de sa base). Code mort retiré : couleurs du lien
    « choisir » des zones de dépôt (recouvertes par la règle commune), première règle des poignées de Durci.
    Règles visant un design : Durci 74 → 57, base Cabinet 52 → 37, Carnet de vol 29 → 27, Cabinet 9 → 8 ;
    `!important` 327 → 308. Banc de non-régression : aucun écart (48 combinaisons).
  - **1 (suite) et 2. Tonalité de surface** — pastilles de code, polices des boutons et des liens-boutons par jetons ;
    `html[data-surface]` posé par `repository_nav.js` (`designs.list[id].surface`, sinon ton de la page ; suit tout
    changement de ton ou de design) : encadrés d'état écrits pour « surface sombre ». Banc : aucun écart.
  - **1 (suite) et 9** — segments d'Aqua (`--sk-seg-bg`, `--sk-segs-radius`) et entrée courante de la barre latérale
    (`--sk-nav-on-*`, règle de base) ; titre de l'en-tête (`--sk-title-*`) ; plaque de titre du Carnet de vol par les
    jetons `--sk-plate-*` au lieu de deux surcharges `!important` (la seconde recouvrait la première) ; règle morte de
    Durci retirée (capitales des boutons d'outils, sans texte). Banc (référence fraîche) : seul écart attendu.
  - **1 (suite), 6** — barre latérale, bandeaux, sous-cartes, textes courants et police des libellés, emblème, lien
    « choisir », pied de page, graphiques du reporting, cadre de la page, vis des coins : règles jumelles remplacées
    par une règle commune et des jetons, valeurs relevées sur le rendu actuel quand un seul design en avait (défaut
    = rendu des autres). Frise du pied de page déclarative (`foot: ['strip']`, `['plate', 'radar', 'status']`).
    Banc étendu à 9 pages (72 combinaisons) : aucun écart à chaque étape.
    Règles visant un design : Durci 74 → 39, base Cabinet 52 → 19, Carnet de vol 29 → 20, Aqua 41 → 28, Cabinet 9 → 5 ;
    `!important` 327 → 271.
- **Boutons** (décidé le 30 septembre 2026) : convention commune — 1ᵉʳ bouton de l'en-tête principal, les suivants
  secondaires, liens secondaires et « Ajouter des fichiers » secondaires ; ce qui reste propre à chaque design est sa
  matière (bois, cuir, acier, verre, vis, plans, radar).
- **Feuille de registre, suite** : règles communes aux trois designs à feuille par jetons `--sheet-ink`, `--sheet-ink-2`,
  `--sheet-text`, `--sheet-label-ink`, `--sheet-card-bg`, `--sheet-pin` (carte posée = papier punaisé). Barres de
  progression et notifications habillées par jetons (`--sk-prog-*`, `--sk-menu-*`), sans `!important`.

### Phase 3 — couches CSS

- **Constat (essai sur 9 pages, banc « toutes »)** : dans une couche, un `!important` l'emporte sur celui d'une règle
  hors couche (ordre inversé). Mettre les styles de page en couche sans retirer leurs `!important` les fait passer
  devant les designs (660 écarts : cadre des pages, fonds des blocs des CR…). `repository_nav.css` en couche perd face
  aux styles posés par les scripts (hors couche) : icônes d'outils et bouton Menu cassés. Essai retiré (remise de côté
  `git stash` « couches CSS »).
- **Ordre retenu** : (1) retirer les `!important` des styles de page, hors couche, page par page au banc ; (2) mettre
  le socle en couche avec les styles posés par les scripts, et retirer les `!important` du socle ; (3) styles de page
  en couche ; (4) retirer les `!important` des designs.
- **Fait (1, première passe)** : banc par page (`?pages=…`, sélecteurs propres des pages relevés) et design
  « standard » ; `tools/strip_page_important.py` (épargne `@media`, `display: none`, règles des designs, `garder`) ;
  52 `!important` retirés (studio, générateur, planificateur de performances, planning ODV, Landing) : aucun écart.
  Restent côté pages : `mission_core/core.css` (24), `maintenance.css` (2), Paramètres (3) — ils l'emportent sur le
  socle (fonds et boutons des CR, boutons des tableaux en design standard) : ils partiront à l'étape (2).
- **Modèle « app » (1ᵉʳ octobre 2026)** : une seule couche `app` pour le socle, les styles des pages et ceux posés par les
  scripts (ordre et spécificité entre eux inchangés : avec `base < page`, une règle générique de page — `button {…}` —
  passerait devant les composants du socle), `lib` en dessous (MapLibre), designs hors couche. Outils :
  `tools/layer_app.py` (feuilles du socle et pages ; règles des designs gardées hors couche) et garde de `kit.js` (tout
  `<style>` posé par un script rejoint `app`). Banc complet (52 pages × 5 designs × 2 tons, sélecteurs propres en
  empreinte) : **30 914 écarts** à mi-parcours — les `!important` du socle, une fois en couche, l'emportent sur ceux des
  designs (fond du bouton ☰ transparent devant le cuir de Cabinet, en-têtes, boutons d'outils des blocs). Essai remis de
  côté (`git stash` « couches CSS modèle app »).
- **Enseignement** : la mise en couche et le retrait des `!important` d'un fichier vont ensemble ; un `!important` du
  socle ne sert qu'à battre une autre règle de l'application (même couche après mise en couche : la spécificité
  suffit, ou un sélecteur plus précis) ou un design (inutile : les designs seront au-dessus).
- **Fait (2 et 3, 1ᵉʳ octobre 2026)** : socle (`repository_nav.css`, `core.css`, `maintenance.css`, `block_icons.css`),
  styles des pages et styles posés par les scripts en couche `app` ; `@layer lib, app;` en tête de `repository_nav.css`.
  - **`!important` de l'application convertis, pas retirés** : les retirer cassait toutes les règles qu'ils faisaient
    gagner sur une autre règle de l'application (boutons d'outils des blocs, en-tête collant, « × » du collage…).
    `strip_page_important.py --bump` (feuilles, avant `layer_app.py`) et la garde de `kit.js` (styles posés par les
    scripts) en font une règle à la suite, au sélecteur renforcé `:not(#imp)` (spécificité + 1-0-0) : devant les règles
    ordinaires de l'application comme avant, ordre inchangé entre règles converties, derrière les designs hors couche.
    Restent `!important` : `display: none`, blocs `@media`, et `/* garder */` ;
  - `/* garder */` : un `!important` qui doit battre **l'habillage des designs** (aperçus et pastilles de la page
    Apparence) — dans la couche, il l'emporte sur les designs, comme avant ;
  - règles des designs **à spécificité voulue faible** (`:where(…)` positionnement des blocs, graisse par défaut des
    boutons `--sk-btn-weight`) : rangées dans `@layer app` de `designs_skeuo.css` (elles cèdent aux pages, comme avant) ;
  - réglages d'apparence `html[data-icons…]` : traités comme les designs (hors couche) par `layer_pages.est_design` et
    par la garde de `kit.js`, qui découpe un `<style>` posé par un script (règles des designs hors couche, intactes).
- **Méthode du banc** : un *snap* initial sur le panel complet (bouton Référence, liste de plus de 20 pages : mémorisé
  comme snap, `benchSnap`) ; itérations sur un panel réduit mais représentatif (`?pages=` : CR, tableau, Paramètres,
  Apparence, Maintenance, Landing, studio, planning ODV, registre), comparé au snap (empreintes comparées par
  empreinte) ; panel complet en fin, contre le même snap. Détail d'un écart en empreinte : relevé ciblé, ou
  comparaison des styles calculés contre un arbre de travail de référence servi à côté (`/_ref/`, jonction locale).
- **Fait (4, 1ᵉʳ octobre 2026)** : `!important` des designs convertis de la même façon (`strip_page_important.py --bump
  --designs` : règles des designs comprises), partout où il y a des règles de design — `designs.css` 29 → 0,
  `designs_skeuo.css` 279 → 32, et les règles de design du socle et des pages (`core.css` 30, `block_icons.css` 78,
  `repository_nav.css` 4, `maintenance.css` 3, studio, registre, planificateur 22) : l'ordre entre règles des designs est
  inchangé. `build_skeuo_icons_css.py` écrit sa section déjà convertie.
  Restent `!important` : blocs `@media` (impression), `display: none`, et `/* garder */` contre un **style en ligne**
  (seul un `!important` bat un attribut `style`) — fond de `body` posé par les pages (designs à cadre, Aqua), liens
  secondaires des CR (`color: inherit` en ligne), champs de route du studio (`background: transparent` en ligne),
  taille des icônes de la barre latérale (`--rs` en ligne). Banc (panel réduit puis complet, contre le snap) : écarts
  restants identiques à HEAD.
- **C, palettes des pages (2 octobre 2026)** :
  - **Outils à fond sombre** (Landing, planificateur, planning ODV, reporting des opérations) : une palette commune
    `:root[data-tool="dark"]` (`repository_nav.css`, couche app) aux noms de la palette claire de `core.css` (`--bg`,
    `--card`, `--card-2`, `--field`, `--ink`, `--muted`, `--line`, `--soft`, `--accent`, `--accent-2`, `--ok`,
    `--warn`, `--bad`) ; chaque page la demande par `<html data-tool="dark">` et ses variables sont renommées
    (`--panel`→`--card`, `--text`→`--ink`, `--p`→`--card`, `--b`→`--line`, `--mut`→`--muted`, `--good`→`--ok`…) :
    les designs les atteignent. `color-scheme: dark` reste à la page (ODV, planificateur : la Landing et le reporting
    des opérations ne l'avaient pas). Valeurs : celles d'ODV et du planificateur (identiques) ; la Landing et le
    reporting des opérations changent de quelques unités (`#0f1115`→`#101317`…), écarts attendus au banc.
  - **CR Fire / HEMS unifiés** : les pages historiques autonomes (`fire_cr.html`, `fire_reporting.html`,
    `hems_medevac_cr.html`, `hems_medevac_reporting.html`, palette et script propres) sont remplacées, **à la même
    adresse**, par les pages du Mission Core (ex-`*_core_*`, « validation ») — étapes 2a / 2b du plan
    (`mission_report_core_audit.md`, §F–G) : mêmes champs, anciens registres importables depuis la page
    (« Importer l'ancien registre … (CSV) »). Liens CR ⇄ reporting (`families/*.js`), préfixes de `vocab.js`, modèle
    de `new_family_pages.py`, arbre et pages témoins du banc mis à jour ; scripts des seules pages historiques retirés
    (`gaar_reporting.js`, `hems_reporting.js`, `hems_mission_sync.js`). Toutes les familles de CR passent par le Core.
  - **Orphelins** (balayage de `shared/` : aucun `.js` / `.css` sans page ni script qui le charge) : traductions des
    pages historiques (`gaar_i18n.js`, `hems_i18n.js` — chargées par aucune page, seulement citées en commentaire),
    `aircraft_directory.js`, et trois phrases mortes de `reporting_i18n.js` (période « partagée avec HEMS / GAAR »)
    retirées.
- **Renforts inutiles fusionnés** (`:not(#imp)`, 2 octobre 2026) : `tools/imp_audit.html` retire, dans le CSSOM, le
  renfort de chaque règle renforcée (même place dans la feuille), sur les 48 pages de l'arborescence × 5 designs × 2
  tons, et relève avant / après les propriétés qu'elle déclare sur les éléments qu'elle vise (pseudo-éléments compris).
  Inutile = vue quelque part, jamais d'écart, et aucune règle à état (`:hover`, `:focus`, `[open]`…) ne se dispute ses
  propriétés sur ses éléments (état non relevé : renfort gardé). `tools/merge_imp_rules.py` (JSON de l'audit) rend sa
  déclaration à la règle d'origine quand elle la suit (règle reconstituée), sinon retire le renfort du sélecteur :
  113 règles (43 fusionnées, 70 renforts retirés) dans `designs_skeuo.css`, `block_icons.css`, `repository_nav.css`,
  `core.css`, `designs.css` ; 187 renforts restent (écart relevé, règle à état, ou règle jamais vue). Banc (témoins,
  référence prise juste avant) : aucun écart. Les règles posées par les scripts (garde de `kit.js`) ne sont pas
  concernées (sources en `!important`).
- **Suivant** : 7 au fil des assets livrés ([PROMPTS_ASSETS_PHASE2.md](PROMPTS_ASSETS_PHASE2.md)) ; renforts restants
  au cas par cas (spécificité d'un sélecteur plus précis plutôt qu'un id fictif), si la lisibilité le demande.

## Utiliser la boîte à outils (D)

```js
const K = window.RepositoryKit;
K.esc(texte);                         // HTML échappé
K.t(['Bonjour', 'Hello', 'Hallo', 'Hola']);   // langue courante, typographie française appliquée
K.store.get('cle', 'défaut'); K.store.json('cle', {}); K.store.set('cle', 'v'); K.store.setJson('cle', obj);
K.color.contrast('#fff', '#1d3557');  // rapport WCAG
```

Nouveau module : ne plus recopier ces utilitaires ; une page qui charge `repository_nav.js` charge `kit.js` avant lui
et avant tout module qui s'en sert (en tête du `<head>` si des modules sont chargés tôt ; les pages générées la
reprennent de leur modèle).

- **Modules applicatifs, échappement (1ᵉʳ octobre 2026)** : les 24 copies d'`esc` (Mission Core, registre et
  générateur de missions, studio, planificateur de carte, Landing, ODV, Maintenance, icônes…) remplacées par
  `RepositoryKit.esc` (toutes étaient des sous-ensembles : `'` en plus, sans effet en HTML) ; `kit.js` placé en tête des
  quatre pages qui chargeaient ces modules avant lui (studio, générateur, planificateur de carte, reporting des
  opérations) et ajouté à l'outil des icônes. Suivant : traduction d'une ligne et `localStorage` protégé.

## Ajouter un design (A)

Déclarer le design dans `repository_tree` (`designs.list`) ; pour un design à matières : `css:"designs_skeuo.css"`,
`skeuo:true`, `chart:"…"` (facultatif), `icons:"<jeu>"` avec ses images dans `shared/icons/skeuo/<id>/`, logo
`shared/icons/defa/<id>.webp`, décors dans `design_deco.js`. Puis `python tools/build_skeuo_icons_css.py` et
`python tools/bump_versions.py`.
