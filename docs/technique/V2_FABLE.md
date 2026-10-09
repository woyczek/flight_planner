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

## 5. Fait ensuite (8 octobre, soir)

- **Pastille de synchronisation** : le bouton « Synchroniser » de l'en-tête porte une pastille aux niveaux 1-2 (le nombre
  reste dans l'infobulle, le compteur « (n) » aux niveaux 3-4) — fait, voir CHANGELOG « v2-fable, lot 2 ».
- **Messages d'erreur relus** : `AppFramework.explain` dit ce qui a échoué et quoi faire, en quatre langues, appliqué
  aux pages concernées — fait, voir CHANGELOG « v2-fable, lot 2 ».
- **Bouton « Arrêter »** branché sur les tâches longues (cartes du Studio et des Cartes de vol, MORA, import MILAIP,
  lecture du dossier des missions ; l'état partiel est annoncé) — fait, voir CHANGELOG « v2-fable, lot 2 ».

## 6. Performance

Mesures du 8 octobre dans le Chrome de l'utilisateur (onglet visible, design Aqua) : détail et chiffres dans le
[rapport](perf/RAPPORT_2026-10-08.md).

**Ce que les mesures ont montré.** Les pages ordinaires sont saines (scripts chargés en 150 à 370 ms, aucune tâche
longue, traduction après coup de 6 à 28 ms, observateurs < 1 ms). Deux pages dérogent : le **Planning** (206 requêtes
dont 48 en 404, 1 902 `JSON.parse`) et les **Cartes de vol** (15 073 éléments du DOM dont 13 552 `<option>`, page figée
≈ 1,5 s au chargement par trois tâches longues de 600, 655 et 264 ms). Dans un onglet en arrière-plan Chrome suspend
l'affichage : les mesures de temps ne valent qu'onglet visible.

| Lot | Correction | Effet mesuré |
|---|---|---|
| (1) Planning | semaines demandées filtrées par l'index des disponibilités ; réglages lus par analyse mémorisée (`jsonCached`) | 206 → 19 requêtes (404 : 48 → 4) ; 1 902 → 157 `JSON.parse` |
| (2) Cartes de vol, Studio | listes de complétion (zones, aérodromes, balises) construites au focus du champ | 15 073 → 1 555 éléments ; tâches longues 600 + 655 + 264 → 268 + 294 ms |
| (3) Base SIA | villes (≈ 70 000) rangées sous leur propre clé (`SiaBase.cities()`), lues à l'inactivité ; axes AAR à l'inactivité | `SiaBase.get()` 212 → 116 ms, `applyBase` 140 → 84-94 ms ; tâches longues au chargement 200 + 211 ms |

**Restes.** `shared/browser_store.js` `snapshot()` analyse toutes les clés du `localStorage` à chaque page (41
`JSON.parse`, 409 Ko) : signalé à la session BUGS SOG (socle), non touché. Non faits : `renderZonePick` (≈ 100 ms,
`selectedAirspaces` sur 7 000 espaces à chaque rendu), géométrie des espaces en tableaux compacts, DOM du Planning
(7 700 éléments).

## 7. Carburant : consignes de montée, base de performances (10 octobre)

**Ce que l'utilisateur veut savoir** (ses mots : « comment régler mon throttle, mon pas d'hélice et/ou le rpm, et si je dois
surveiller le badin, l'altimètre ou le vario durant la montée », « le sweet point entre le pilotage éco et le pilotage
rapide »). À chaque altitude, trois grandeurs sont liées : vitesse indiquée, vario, régime (gaz, RPM ou N1). Deux fixent
la troisième — c'est ce que fait déjà le modèle (`FlightPerfModel.manualLaw` / `manualPoint`, régime retrouvé par la
cartographie moteur `rpmForFF`). La page le montrait mal : deux curseurs verticaux faits main autour des courbes, la
loi « plein gaz » qui déplace la ligne de base du calcul, l'altimètre et le chronomètre retirés, aucune vue d'ensemble
des profils de performances chargés.

**Vue simple (niveaux 1 à 3).** Un bloc « Consignes de montée » dans la colonne de gauche, sous le devis : un choix
d'objectif par segments (Éco · Vy · Rapide · Profil · Réglée) et, pour l'objectif choisi, un tableau par tranche
d'altitude (sol, 2 000, 5 000, 10 000 ft… jusqu'au niveau du plan) : gaz (« plein » ou %), RPM ou N1 quand la
cartographie le permet, badin à tenir, vario attendu, temps cumulé ; au-dessus, une phrase de consigne produite à la
source (« Plein gaz, hélice plein petit pas, tenir 120 kt au badin ; le vario décroît de 900 à 500 ft/min »), qui dit
quoi régler et quoi surveiller (l'instrument qui porte la consigne est nommé, l'autre est « attendu »). Les instruments
du bandeau (badin, vario) restent.

**Vue détaillée (niveau 4, ou « Vue détaillée »).** Trois curseurs — badin, vario, régime — avec une case « fixé »
devant chacun : deux au plus sont fixés, le troisième est calculé et grisé (composant du framework : champ `.field` avec
`input[type=range]`, libellé au-dessus, valeur et état sous le curseur — « plein gaz » s'affiche sous le curseur de vario,
plus dans la ligne de base du calcul, qui ne bouge plus). Les courbes existantes, avec une bascule « par altitude ↔ par
régime » du graphe de montée ; altimètre et chronomètre reviennent dans le bandeau au niveau 4 (ils redisent le
niveau survolé et le temps de montée : ludiques et parlants, dixit l'utilisateur).

**Base de performances.** Un bloc « Profils de performances » (niveau 3 et plus) : une ligne par type de la flotte et
des missions — profil chargé (source : `.lnmperf`, SimBrief, JSON, saisie, estimation par classe), cartographie moteur
(oui, n lignes / non), consommation de croisière, plafond, données manquantes nommées ; actions : Importer (`.lnmperf`,
JSON, CSV, texte d'une fiche PDF collé), Dossier, Relire. Les profils du dossier sont relus quand le dossier change
ailleurs (`file-access-change`, clé `__perf`). La cartographie moteur gagne une colonne « Altitude » facultative (les
consommations publiées varient avec l'altitude ; le modèle interpole entre les lignes d'une même altitude).

**Détails.** Le choix d'appareil en tête de page devient une liste (icône, nom, type, source du profil, état) au lieu
d'une rangée de boutons ; « Copier JSON » a un repli `execCommand("copy")` hors contexte sécurisé et se grise quand il
n'y a rien à copier.
