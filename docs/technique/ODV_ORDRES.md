# Tableau (Centre) — modèle de données et branchement

Page du Centre `apps/cpco/odv_orders.html` (barre latérale › Planning, ☰ › Centre — Tableau) : l'éditeur hebdomadaire
des ordres de vols (plaquettes de vol posées sur une frise horaire, zones, contrôle, divers, notes). Chaîne : **mission →
ordre de vol → exécution → CR**. La page **produit** l'ordre de vol ; le Planning ODV (`apps/cpco/odv_planning.html`,
`docs/ODV_PLANNING.md`) l'**analyse** (créneaux communs, missions probables). Origine : l'outil autonome « Tableau
V0 » (HTML monofichier, `localStorage`), repris dans le modèle de la suite ; son format de fichier n'est pas importé
(format provisoire).

**Structure de la page (v2)** : six blocs, sans choix de vue (plus de boutons Jour / Semaine / Statistiques) ; niveau
d'utilisation minimal posé par `data-min-level`, titres des blocs posés à la source par `odv_orders.js` (4 langues).

| Bloc (`data-block-id`) | Contenu | Niveau |
|---|---|---|
| Ordre du jour (`jour`) | barre de la semaine (◀ ▶, Cette semaine, jours, Permanence, ↶ Annuler, Briefing), palette et frise | 1 |
| Équipage de la semaine (`equipe`) | ancienne vue Semaine : dispos des membres jour par jour, DLO et butées, modifications de dispo | 2 |
| Zones (`zones`) | activations par réseau (`odv_activations_editor.js`), puis demandes de réservation | 2 |
| Créneaux communs (`slots`) | matrice 7 jours × 3 créneaux de la page ODV ; clic : fenêtre du créneau (missions × postes) | 4 |
| Missions probables (`missions`) | familles compatibles par créneau, règles, lien « Page ODV complète » | 4 |
| Statistiques (`stats`) | ancienne vue Statistiques | 2 |

- Lecture seule (niveau 1, Centre fermé, compte sans droits ; classe `odvo-ro`) : le bloc Ordre du jour seul ; la page
  ne dessine alors ni l'équipage ni les statistiques.
- Créneaux communs et Missions probables sont les blocs natifs de la page ODV, servis **dans la page** par
  `apps/cpco/odv_planning.js` (chargé par `odv_orders.html` ; plus de cadre ni de `?blocks=`). Sans la grille de la page
  ODV (`#odvGrid`), le script ne démarre qu'au niveau Expert ; les éléments propres à la page ODV (classeur, grille,
  export) absents sont ignorés. La semaine est celle du Tableau : `odv_orders.js` appelle
  `OdvPlanning.setMonday('AAAA-MM-JJ')` (lundi de la semaine affichée) à chaque changement de semaine, ce qui recalcule
  créneaux et missions.
- Styles des blocs ODV (créneaux, missions, grille, filtres…) partagés par les deux pages : `apps/cpco/odv_blocks.css`
  (versionné `?v=` par `bump_versions`) ; les règles propres à chaque page restent dans sa feuille.
- La page ODV n'a plus d'onglet : le lien « Page ODV complète : classeur, grille, export… » du bloc Missions probables
  l'ouvre (et ☰ › Centre — Planning ODV).

Statut : **modèle validé en partie (lot L2)** ; questions ouvertes au § 7.

## 1. Principes

- **S'adapter au modèle existant**, ne le faire évoluer que là où il ne convient pas.
- Tout passe par le pool `data/` (`MissionAssignments.readData` / `writeData`) : synchronisé par git aujourd'hui, par le
  webservice demain, même format (`docs/technique/INDEX_DONNEES.md` § 9). Pas d'autre export (ni HTML, ni PNG, ni PDF).
- **Disponibilités : celles de la suite** (`data/disponibilites/<TRI>/<AAAA>-W<nn>.json`, `shared/dispos.js`). L'ODV ne
  garde aucune copie des dispos ; une dispo modifiée depuis l'ODV (dont la **récup**, catégorie `recup`) est écrite dans
  la déclaration du membre (`SuiteDispos.saveWeek`, signée `by` du planificateur).
- **Membres : ceux de la suite** (`SuiteUsers.list()`, index des dispos, référence). L'ODV n'ajoute que des réglages
  d'affichage (groupe Staff / Autres, couleur, ordre).
- **Vols liés à une mission : affectations de la suite** (`data/missions/affectations.json`, `writeAssignment`) — Mes
  missions, les zones à activer (`OdvAirspace.missionZones`) et le registre les voient sans passer par l'ODV.
- **Heures UTC (z)**, au quart d'heure pour les dispos (règle existante), à 5 min pour les éléments de l'ordre.
- Affectation **à heures libres**, affichage **en trois tranches** : les limites matin / après-midi / soir du Planning ODV
  (`odvPlanning:v1`, 08-12z, 12-18z, 18-23z par défaut) sont tracées sur la frise.
- Pas de positions en pixels dans les données : les éléments d'une section s'empilent automatiquement (couloirs) ;
  placement libre sans aimantation : dette technique.
- Droits : édition = Centre déverrouillé (`cpcoAccess:v1`) et, en mode production, `admin_centre` ; sinon lecture
  seule. Un membre modifie ses dispos dans Mes missions, comme aujourd'hui. L'authentification propre à l'outil V0 est
  abandonnée.

## 2. Catégories de dispo et affectabilité

Les 12 types de l'outil V0 correspondent aux catégories de `data/config/disponibilites.json` :

| V0 (`urTypes`) | Libellé V0 | Catégorie de la suite | Affectable à |
|---|---|---|---|
| exo | Disponible tout | `tout` (O) | vol, contrôle, divers |
| nuke | Sécurité civile | `secu` (SC) | vol, contrôle, divers |
| po | Chasse FAF | `defense_perso` (C) | vol, contrôle, divers |
| pld | Transport | `defense_perso` (T) | vol, contrôle, divers |
| opssol | FNY | `defense_perso` (N) | vol, contrôle, divers |
| opsvol | Exercice IVAO SO | `exercice_vol` (S) | vol, contrôle, divers |
| stage | Contrôle IVAO SO | `exercice_ctrl` (AM) | contrôle |
| tache | Contrôle IVAO civil | `ctrl_hors` (AT) | — |
| volivaohorss | Vol IVAO hors SO | `vol_hors` (G) | — |
| dispouniquem | Dispo uniquement sol | `sol` (nouvelle) | divers |
| dv | Indisponible | `indispo` (IN) | — |
| recup | Récup | `recup` (Q) | — |

- Règle (`SuiteDispos.affectable(catégorie)`) : champ `affectable` de la catégorie (`vol`, `controle`, `divers`), sinon
  d'après le type — `dispo` : tout ; `atc` : contrôle ; groupe `occupe` (vol, contrôle hors SOG, DCS) : jamais ;
  `indispo` : jamais. **Un contrôle n'est jamais affectable, sauf en contrôle.**
- Catégorie `sol` (« Disponible au sol seulement », groupe `occupe`, `affectable: ["divers"]`) ajoutée aux catégories
  par défaut (`DEFAULT` de `shared/dispos.js`) ; `data/config/disponibilites.json` est généré pour l'utilisateur à partir
  d'elles (champ `affectable` gardé par l'éditeur de Paramètres › Centre, qui recopie les champs inconnus).
- Un membre est en **conflit** sur un élément s'il n'est pas couvert, sur toute la durée, par une plage d'une catégorie
  affectable à cet élément (non déclaré = conflit).

## 3. Éléments d'un ordre de vol

| Élément | Section | Stockage |
|---|---|---|
| **Vol de mission** (y compris ravitailleur) | vols | affectations (équipage, indicatif, appareil, décollage, durée) + présentation dans le fichier de semaine |
| **Entraînement** (BLUE, RED… sans mission du registre) | vols | fichier de semaine ; zones choisies à la main (facultatif) |
| **Divers** (cours au sol, réunion) | divers | fichier de semaine |
| **Contrôle** | contrôle | fichier de semaine (positions SOG) ; sessions des réseaux : `data/atc/` (SuiteAtc) |
| **Note** | libre | fichier de semaine (texte simple) |
| Récup | — | dispos du membre (catégorie `recup`) |
| Zones | zones | calculées : RTBA actif par réseau, zones de la mission, zones ouvertes au contrôle, zones en conflit (`OdvAirspace`, lot L4) ; activations saisies : `data/atc/activations/<AAAA>-W<nn>.json` (`OdvActivationsEditor`) |

- **Vocabulaire des ordres de vols** (précisé par l'escadron le 6 octobre 2026) : **PTA** (principal training audience)
  = membres qu'un élément entraîne en priorité, entourés sur l'ordre ; **DLO** (desired learning objectives) = ce qu'un
  membre doit travailler, en général ou sur une mission (« RBR : CAS, AAR », « RAKI : GCI dépendant », « RBR : FULL COMMS
  no L16 ») ; **KNON**, **TALIOS** = configurations chargées sur un avion (canon, pod) — les « Conf. Avions » (`cavTpls`)
  de V0 ; **butée** = échéance d'un membre.
- **Équipe** : une plaquette de vol de mission porte une équipe en vol de la mission (`equipe` = indicatif de l'équipe du
  registre) ; BLUE / RED de V0 = deux équipes (camps) d'une mission ; mission choisie dans une liste triée par durée
  estimée (`estimate.block`), ⚠ au-delà de 15 min ou 15 % d'écart avec la durée demandée.
- **AAR** : une mission ravitailleur du registre, souvent impliquée par une autre mission (missions complexes) ; sa
  plaquette est un vol de mission avec `axe` et `offload` ; les vols ravitaillés s'y accrochent (`ravitaillements`).
- Retirés de V0 : plaquettes de zone et LL saisies à la main comme source principale (repli `ll` gardé), marqueurs et
  NLT (feuille de route), PTA, priorité P1-P5, check-list (feuille de route), clés inutilisées (`extSqDefault`,
  `cavTpls`, `showSim`, `simAnchorGap`, `tzDefault`, `prepText`, `dutyText`, `recur_refuels`, `auth`, `dayStart` /
  `dayEnd`).

## 4. Fichiers

### 4.1 `data/config/odv.json` — réglages de l'ordre de vol (partagés)

```json
{
  "schema": 1, "va": "SOG", "updated_at": "…", "by": "TRI",
  "terrain": "LFOA", "reseau": "IVAO", "crDelaiHeures": 48,
  "jours": { "1": { "debut": "04:00", "fin": "22:00" }, "…": {} },
  "nbJours": 7,
  "personnel": { "ABC": { "groupe": "staff", "couleur": "#EF4444", "ordre": 0 } },
  "modeles": {
    "vols":   [{ "id": "…", "libelle": "BLUE", "duree": 105, "couleur": "#1a5898", "fond": "#1a5898", "parIndicatif": false }],
    "divers": [{ "id": "…", "libelle": "COURS AU SOL", "duree": 60, "couleur": "#8a6010", "fond": null }],
    "controle": [{ "id": "…", "libelle": "CONTRÔLE", "duree": 120, "couleur": "#7300ff" }]
  },
  "indicatifs": { "MASTIFF": { "fond": "#a49ea0", "contour": "#cd030d" } },
  "configs": [{ "texte": "KNON", "couleur": "#9a3010" }, { "texte": "TALIOS", "couleur": "#1a5898" }],
  "ll": [{ "nom": "RTBA Lorraine", "debut": "11:30", "fin": "15:00", "jours": [1], "couleur": "#4ADE80", "sia": null }],
  "recurrences": [{ "id": "…", "element": { "type": "divers", "…": "…" }, "rythme": "hebdo", "jour": 2, "debut": "2026-10-12", "fin": null }]
}
```

- `reseau` : réseau par défaut d'un vol (VATSIM | IVAO), pour l'état des activations (`OdvAirspace.check`).
- `crDelaiHeures` : délai après la fin du vol au-delà duquel un vol de mission sans CR passe en MNE (§ 5).
- `indicatifs` : couleurs de plaquette par préfixe d'indicatif (la table `MISSION_CALLSIGNS` reste inchangée ; le préfixe
  le plus long contenu dans l'indicatif saisi l'emporte).
- `ll` : repli des créneaux RTBA / LL par jour de semaine (`OdvAirspace.rtba(date, { ll })`, `sia` prioritaire sur le
  nom).
- `recurrences` : `rythme` `quotidien` | `hebdo` | `bimensuel` (semaines paires), `debut` **obligatoire** (une récurrence
  ne remplit plus les semaines passées), appliquée à la première ouverture d'une semaine.

### 4.2 `data/odv/<AAAA>-W<nn>.json` — l'ordre de vol d'une semaine

Ce qui n'a pas sa place dans le modèle existant : entraînements, divers, contrôle SOG, notes, permanence, et la
présentation des vols de mission.

```json
{
  "schema": 1, "va": "SOG", "semaine": "2026-W42", "updated_at": "…", "by": "TRI",
  "permanence": "TRI",
  "elements": [
    { "id": "…", "type": "vol", "date": "2026-10-13", "debut": "09:30", "duree": 105,
      "mission": "A-001C", "libelle": "BLUE", "indicatif": "MASTIFF45", "reseau": "IVAO", "couleur": "#1a5898", "fond": null,
      "equipe": "MERCURE31",
      "avions": [{ "pilote": "ABC", "nav": null, "annule": false, "config": ["KNON"] }],
      "pta": ["ABC"], "dlo": { "ABC": "GCI dépendant" },
      "taches": [{ "nom": "Leader", "pilote": "ABC" }],
      "zones": [{ "id": "<id base>", "nom": "R 45 A" }],
      "axe": null, "offload": null,
      "ravitaillements": [{ "vol": "<id du vol ravitailleur>", "heure": "10:15", "offload": 5 }],
      "infos": "", "etat": "prevu", "cr": null, "causes": [], "recurrence": null }
  ]
}
```

| `type` | champs propres |
|---|---|
| `vol` | voir l'exemple ; `mission` null = **entraînement** ; jusqu'à 8 avions (pilote + navigateur) |
| `divers` | `libelle`, `equipage: [TRI]`, `notes`, `etat`, `motif`, `pta`, `dlo` |
| `controle` | `libelle`, `position`, `equipage: [TRI]`, `etat`, `pta`, `dlo` |
| `note` | `texte` (texte simple : plus de HTML, risque d'injection de V0 supprimé) |

- Vol de mission : l'équipage, l'indicatif et le décollage font foi **dans les affectations** ; `avions` en est la copie
  de présentation (navigateurs, annulations), réécrite à chaque enregistrement.
- `etat` : `prevu` | `fait` | `non_fait` | `annule` ; `cr` : `ME` | `BACHE` | `MNE` | null ; `causes` : causes d'une MNE
  (plusieurs possibles). Valeurs **brutes** ; correspondance avec le registre des CR : lot L5.
- Un élément ne passe pas minuit (`debut` + `duree` ≤ 24:00), comme V0.
- `permanence` : officier de permanence de la semaine ; son affichage hors de la page est fait par Features SOG.

## 5. Règles

- **Conflits** : membre non affectable (§ 2), chevauchement avec un autre vol, contrôle ou divers non annulé du même jour,
  même membre deux fois sur un élément ; zone requise sans activation « active » du réseau du vol sur toute sa plage, ou
  zone P (`OdvAirspace.check`).
- **CR** : le CR fait foi (`etatFromLedger`, lot L5). Succès → `ME`, `fait`. Pas de CR `crDelaiHeures` après la fin du
  vol → `MNE`, `non_fait`, `causes` à renseigner. `BACHE` (annulé) posé par le planificateur. Entraînement sans
  mission : `cr` posé à la main.
- **Badge P** : aucun membre d'équipage disponible dans l'heure et demie avant le vol.
- **Dispos ensemble** : plages où au moins deux membres sont affectables à un vol.
- **Jour et nuit aéronautiques** : `sunTimes` (`shared/mission_core/assist.js`) et coordonnées du terrain (base des
  aérodromes de la suite) ; « maintenant » en UTC (V0 : heure locale).
- **Statistiques** : vols prévus, durée, faits, annulés, AAR, ME / Bâchés / MNE ; par membre : disponibilité (sur les
  heures de service `jours`) et charge (minutes de vol / minutes dispo).
- **Modifications de dispo** : déclarations dont `updated_at` est postérieur à la dernière prise en compte (marque de
  lecture locale) — remplace le journal `avLog` de V0.

## 6. Lots

| Lot | Contenu | Qui |
|---|---|---|
| L2 | ce modèle ; catégorie `sol` et `SuiteDispos.affectable` ; `shared/odv_orders_store.js` (lecture, écriture, récurrences, conflits) | Ordres de vols |
| L3 | page `apps/cpco/odv_orders.html` : bloc Ordre du jour (frise, glisser-déposer, briefing), blocs Équipage de la semaine et Statistiques (anciennes vues Semaine et Statistiques), Zones ; Créneaux communs et Missions probables par `odv_planning.js` (v2) ; rubrique Paramètres › Centre › Tableau | Ordres de vols |
| L4 | `shared/odv_airspace.js` (`OdvAirspace`), `shared/odv_activations_editor.js` — faits | Features SOG |
| L5 | `etat` / `cr` ↔ registre des CR, délai MNE ; missions ravitailleur liées ; officier de permanence hors de la page | Features SOG |
| L6 | manuels (4 langues), CHANGELOG ; puis stabilisation | ensemble |

## 7. Questions ouvertes

1. Faits depuis : DLO permanentes par membre et butées (`data/odv/dlo.json`), postes, appareils et convoyage comme le
   Planning ODV (plaquette de convoyage générée, « à affecter »), astreinte, qualification sur le type en signal.
2. **NLT** : repère horaire du jour (feuille de route avec les marqueurs).
