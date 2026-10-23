# Règles communes des sessions de travail sur la suite SOG

Lues par toutes les sessions qui travaillent sur ce dépôt. Elles priment sur les habitudes de chacune.

## Règle de codage : la valeur à la source, le moins possible de retouches après coup

- Un texte, un nom ou une valeur variable (nom de la compagnie, sigle, centre, langue, adresse, version, état) est
  écrit **avec sa valeur au moment où le code le produit** : variable, jeton résolu par la fonction de rendu ou de
  traduction (`K.t`, `K.tf`), attribut posé par le code qui crée l'élément.
- **Corriger la page après coup, le moins possible.** Éviter les `MutationObserver` qui réécrivent des textes, les
  remplacements globaux dans le DOM et les minuteurs de rattrapage : un observateur sert d'abord à réagir à un événement
  (taille, visibilité, ajout d'un bloc à initialiser). S'il faut vraiment réécrire après coup, le justifier en
  commentaire et le protéger contre ses propres écritures.
- Une écriture dans le DOM n'a lieu **que si la valeur change** (sinon un observateur, même légitime, se relance).
- Dette connue : le renommage de la compagnie par observateur (en cours de remplacement par des jetons résolus à la
  source) et la traduction des textes fixes par `shared/content_i18n.js`. Ne rien ajouter qui s'appuie dessus : un
  nouveau texte passe par `K.t` / `K.tf` à la source, dans les quatre langues.

## Conventions en vigueur

- Interface en français d'abord, **quatre langues** (fr, en, de, es) ; tout texte écrit en dur est traduit, y compris
  les phrases composées, infobulles et statuts.
- **Dépôt en anglais** (décision du 12 octobre 2026) : README, `docs/README.md`, `docs/technique/*`, `INSTALL.md`,
  `VERSION.md` et le CHANGELOG s'écrivent en anglais ; les tutoriels (`docs/tutorial/`) en anglais, traduits en
  français ; les manuels (aide en ligne) restent en quatre langues, français d'abord. Les documents publiés du dépôt
  (tout `docs/technique/*`, historique compris, journal des bugs inclus) sont traduits en anglais ou rendus bilingues ;
  tout document ou toute section nouvelle est en anglais.
- **Des boutons pour l'utilisateur final** : jamais de console ni de fichier à poser à la main ; la page enchaîne.
- **Ergonomie : la session en charge a la vision d'ensemble** (décision de l'utilisateur du 12 octobre 2026). Une
  demande d'ergonomie formulée « du genre … » est une intention, pas une spécification : la session peut ne pas
  l'appliquer telle quelle, refuser en argumentant, reformuler ou proposer autre chose, et demander confirmation
  quand le choix engage l'ensemble des pages. Elle dit toujours ce qu'elle a fait du mot de l'utilisateur.
- Avertissements en notifications flottantes (`AppFramework.notify`).
- Python du lanceur et des outils : **bibliothèque standard** seulement.
- Avant chaque commit :
  1. `python tools/format_sources.py <fichiers touchés>`, puis contrôle par `tools/verify_format.html`
     (arbres syntaxiques identiques) ;
  2. aucune empreinte `?v=` dans le dépôt : les références restent à `?v=0` (le lanceur pose l'empreinte réelle en
     servant, `tools/version_stamps.py` ; la livraison les pose dans l'archive) — `python tools/bump_versions.py --neutral`
     seulement si une empreinte réelle s'est glissée ;
  3. pages modifiées rechargées, sans erreur JavaScript ;
  4. entrée au CHANGELOG, en anglais, rubrique « Unreleased » ;
  5. aucune marque de conflit : `git grep -l -E "^(<<<<<<<|>>>>>>>) "` vide.
- Commits : préfixes gitmoji, message en français ; develop reçoit des avances rapides seulement (rebase, puis push).
- **Documentation : un commit par lot, jamais un commit par document** (traductions, manuels, tutoriels, aide) ;
  on squashe le plus possible avant de pousser. **La doc d'une fonctionnalité va dans le commit de la
  fonctionnalité** (manuels, CHANGELOG et `apps/aide/docs_bundle.js` régénéré dans le même commit) : jamais
  « un commit fonctionnel + un commit de doc », jamais un commit « paquet régénéré » à part.
- **Rôles des sessions et synchronisation** : `.claude/agents/README.md` (tableau des sessions, espaces, ports, qui
  pousse quoi) et un fichier par rôle (`ergonomie`, `features-sog`, `bugs-sog`, `securisation`, `landing`,
  `analyse-defa`). Une session prend le rôle de son nom ; la session ergonomie répartit, valide et intègre.
- Chaque session travaille dans son espace et sur sa branche. La refonte v2 vit sur `feature/v2-niveaux`, les comptes
  signés sur `feature/audit-securite` : rien de ces chantiers sur develop sans l'accord de l'utilisateur.
