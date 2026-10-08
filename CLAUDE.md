# Règles communes des sessions de travail sur la suite SOG

Lues par toutes les sessions qui travaillent sur ce dépôt. Elles priment sur les habitudes de chacune.

## Règle de codage : la valeur à la source, jamais de retouche après coup

- Un texte, un nom ou une valeur variable (nom de la compagnie, sigle, centre, langue, adresse, version, état) est
  écrit **avec sa valeur au moment où le code le produit** : variable, jeton résolu par la fonction de rendu ou de
  traduction (`K.t`, `K.tf`), attribut posé par le code qui crée l'élément.
- **Interdit : corriger la page après coup.** Pas de `MutationObserver` qui réécrit des textes, pas de remplacement
  global dans le DOM, pas de minuteur de rattrapage. Un observateur n'est admis que pour réagir à un événement (taille,
  visibilité, ajout d'un bloc à initialiser), jamais pour réécrire ce que du code vient d'écrire.
- Une écriture dans le DOM n'a lieu **que si la valeur change** (sinon un observateur, même légitime, se relance).
- Dette connue : le renommage de la compagnie par observateur (en cours de remplacement par des jetons résolus à la
  source) et la traduction des textes fixes par `shared/content_i18n.js`. Ne rien ajouter qui s'appuie dessus : un
  nouveau texte passe par `K.t` / `K.tf` à la source, dans les quatre langues.

## Conventions en vigueur

- Interface en français d'abord, **quatre langues** (fr, en, de, es) ; tout texte écrit en dur est traduit, y compris
  les phrases composées, infobulles et statuts.
- **Des boutons pour l'utilisateur final** : jamais de console ni de fichier à poser à la main ; la page enchaîne.
- Avertissements en notifications flottantes (`AppFramework.notify`).
- Python du lanceur et des outils : **bibliothèque standard** seulement.
- Avant chaque commit :
  1. `python tools/format_sources.py <fichiers touchés>`, puis contrôle par `tools/verify_format.html`
     (arbres syntaxiques identiques) ;
  2. `python tools/bump_versions.py` ;
  3. pages modifiées rechargées, sans erreur JavaScript ;
  4. entrée au CHANGELOG, rubrique « Non publié » ;
  5. aucune marque de conflit : `git grep -l -E "^(<<<<<<<|>>>>>>>) "` vide.
- Commits : préfixes gitmoji, message en français ; develop reçoit des avances rapides seulement (rebase, puis push).
- Chaque session travaille dans son espace et sur sa branche. La refonte v2 vit sur `feature/v2-niveaux`, les comptes
  signés sur `feature/audit-securite` : rien de ces chantiers sur develop sans l'accord de l'utilisateur.
