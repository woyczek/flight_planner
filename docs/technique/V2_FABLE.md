# V2-fable — la suite dit quoi faire, et se tait quand ça ne vous concerne pas

*Branche `v2-fable`, posée sur `feature/v2-niveaux` · proposition du 8 octobre 2026 · [Sommaire technique](README.md)*

La v2 ([V2_NIVEAUX.md](V2_NIVEAUX.md)) range l'interface par niveau d'utilisation : chacun ne voit que les pages de
son usage. Ce qui manque encore, c'est le **parcours** : un pilote qui ouvre la suite doit encore deviner où aller
(l'accueil liste les pages, « Compte rendu » commence par seize familles, « Mes missions » répond « Aucun trigramme
réglé » et renvoie aux réglages), et la suite lui parle de choses qui ne le concernent pas (rappels de maintenance à
chaque page, compteur de synchronisation, avis techniques). Cette proposition ne retire rien et n'invente pas de
nouveau cadre : elle s'appuie sur les socles existants (blocs et notifications d'`app_framework.js`, niveaux de
`repository_nav.js`, affectations de `assignments.js`, registre des CR de `mission_core/ledger.js`) et ajoute
**une page et un module**.

## 1. Constat (relevé le 8 octobre, niveaux 1 et 4, designs Standard et Aqua)

| Page | Ce qui gêne | Règle d'ergonomie touchée |
|---|---|---|
| Accueil | une liste de pages, la même pour tous ; rien ne dit *ce qu'il y a à faire* | hiérarchie visuelle, actions rapides |
| Mes missions | sans trigramme : un texte qui renvoie à Réglages › Mon profil ; la page reste vide | rien à retaper, pas d'impasse |
| Compte rendu | seize familles et un champ de recherche en premier, même quand une mission affectée attend son CR | une page = une tâche |
| Planning, Studio, Cartes de vol | « Base SIA absente… » en notification à **chaque** ouverture, aussi au niveau 1 où l'on ne peut rien y faire | se taire quand ça ne concerne pas |
| Tâches longues (cartes, zones) | une barre de progression, mais rien pour arrêter | statut visible **et** possibilité d'arrêter |
| Champs longs (route, remarques) | hauteur fixe, ascenseur interne dès trois lignes | champs qui s'agrandissent |

## 2. Proposition

### 2.1 Une page d'arrivée : « Aujourd'hui »

`apps/pilot/aujourdhui.html`, première entrée de la barre latérale à tout niveau. Trois blocs, **une action chacun** :

1. **Ma prochaine mission** — heure (UTC), mission, appareil, terrain, indicatif ; « Ouvrir le dossier ».
2. **Comptes rendus à écrire** — missions passées (21 jours) affectées au pilote, sans CR dans le registre ;
   « Écrire le compte rendu » ouvre le dossier et commence le CR dans la bonne famille (`?mission=…&do=cr`) ;
   « Pas de CR » écarte une mission (mémorisé dans ce navigateur). Au plus sept lignes.
3. **Ma semaine** — sept colonnes, mes missions en vignettes, le jour courant marqué ; clic : le dossier.

Sans trigramme, le premier bloc **demande le trigramme sur place** (un champ, un bouton), au lieu de renvoyer aux
réglages. L'accueil `index.html` (généré depuis la barre latérale) la propose en tête de « Mes tâches ».

### 2.2 Un compte rendu guidé

`apps/cr/mission_cr.html` commence par **« Mes missions à rendre »** (même liste que ci-dessus) ; le choix de la
famille, inchangé, passe en second bloc pour les missions hors affectation. Le bouton mène au CR prérempli depuis
l'ordre de mission (mécanisme existant de « Mes missions » : `siaMissionToCr:v1`, `metadata.orderRef`).

### 2.3 Le socle : se taire, s'arrêter, s'agrandir

- `AppFramework.notify(message, kind, { once, minLevel })` : `once` — une fois par session du navigateur pour ce
  texte (rappels de maintenance) ; `minLevel` — sous ce niveau d'utilisation, le message va au journal, pas à l'écran.
  Appliqué aux rappels « Base SIA absente » (Studio, Cartes de vol, Carburant).
- `AppFramework.task(titre, { total, cancel })` : avec `cancel`, la barre porte un bouton **Arrêter** ; `job.cancelled`
  passe à vrai, la fonction est appelée (`AbortController`, drapeau de boucle), la barre dit « Arrêt… » puis « Annulé. ».
- Champs qui s'agrandissent : `textarea` suit son contenu (`field-sizing: content`, plafond 60 % de l'écran),
  `data-fixed-size` pour garder une hauteur fixe.

### 2.4 Mes missions

Sans trigramme : le champ de saisie dans la liste elle-même (module commun), la liste se remplit dès la validation.
`?do=cr` : le dossier s'ouvre et le CR commence sans clic supplémentaire.

## 3. Ce qui ne change pas

Les pages, leurs blocs, les niveaux, les designs, les données. Aucun texte traduit après coup : les nouveaux textes
sont produits dans la langue de la page (`K.t`, `K.tf`), en quatre langues.

## 4. Fichiers

| Fichier | Rôle |
|---|---|
| `shared/pilot_today.js` | prochaine mission, CR à écrire, semaine, saisie du trigramme (`PilotToday.mount`) |
| `apps/pilot/aujourdhui.html` | la page d'arrivée |
| `apps/cr/mission_cr.html` | bloc « Mes missions à rendre » |
| `apps/pilot/mes_missions.html` | trigramme sur place, `?do=cr` |
| `shared/app_framework.js` | `notify` : `once`, `minLevel` ; `task` : `cancel` |
| `shared/repository_nav.css` | champs qui s'agrandissent |
| `shared/icons/repository_icons.js` | icône `today` |
| `config/repository_tree` | entrée « Aujourd'hui », page, libellés |

## 5. Suite possible (non faite)

- Compteur « Synchroniser (n) » de l'en-tête réduit à une pastille aux niveaux 1-2.
- Messages d'erreur des pages relus (pas de code seul) : passage en revue par page.
- Bouton Arrêter branché sur chaque tâche longue des pages (cartes, import SIA) : le socle est prêt, les boucles
  restent à faire vérifier `job.cancelled`.
