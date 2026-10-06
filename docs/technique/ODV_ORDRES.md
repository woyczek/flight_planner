# Ordres de vols (Centre) — modèle de données et branchement

Page du Centre `apps/cpco/odv_orders.html` (☰ › Centre — Ordres de vols) : l'éditeur hebdomadaire des ordres de vols
(plaquettes de vol posées sur une frise horaire, zones, ravitaillements, contrôle, divers, butées, DLO, check-list de
préparation). Elle **produit** l'ordre de vol ; le Planning ODV (`apps/cpco/odv_planning.html`, `docs/ODV_PLANNING.md`)
l'**analyse** (créneaux communs, missions probables). Origine : l'outil autonome « Ordres de vols V0 » (HTML monofichier,
`localStorage`), repris dans le modèle de la suite ; son format de fichier n'est pas importé (format provisoire).

Statut : **proposition (lot L2)**, à valider avant l'écriture de la page (lot L3).

## 1. Principes

- **S'adapter au modèle existant**, ne le faire évoluer que là où il ne convient pas.
- Tout passe par le pool `data/` (`MissionAssignments.readData` / `writeData`) : synchronisé par git aujourd'hui, par le
  webservice demain, même format (`docs/technique/INDEX_DONNEES.md` § 9). Pas d'autre export (ni HTML, ni PNG, ni PDF).
- **Disponibilités : celles de la suite** (`data/disponibilites/<TRI>/<AAAA>-W<nn>.json`, `shared/dispos.js`). L'ODV ne
  garde aucune copie des dispos ; une dispo modifiée depuis l'ODV est écrite dans la déclaration du pilote
  (`SuiteDispos.saveWeek`, signée `by` du planificateur).
- **Membres : ceux de la suite** (`SuiteUsers.list()`, index des dispos, référence). L'ODV n'ajoute que des réglages
  d'affichage (groupe Staff / Autres, couleur, ordre).
- **Heures UTC (z)**, au quart d'heure pour les dispos (règle existante), à 5 min pour les éléments de l'ordre.
- Affectation **à heures libres**, affichage **en trois tranches** : les limites matin / après-midi / soir du Planning ODV
  (`odvPlanning:v1`, 08-12z, 12-18z, 18-23z par défaut) sont tracées sur la frise.
- Pas de positions en pixels dans les données : les éléments d'une section s'empilent automatiquement (couloirs).
- Droits : édition = Centre déverrouillé (`cpcoAccess:v1`) et, en mode production, `admin_centre` (le « Drille » de la
  semaine) ; sinon lecture seule. Un membre modifie ses dispos dans Mes missions, comme aujourd'hui. L'authentification
  propre à l'outil V0 est abandonnée.

## 2. Catégories de dispo

Les 12 types de l'outil V0 correspondent aux catégories de `data/config/disponibilites.json` :

| V0 (`urTypes`) | Libellé V0 | Catégorie de la suite | Type |
|---|---|---|---|
| exo | Disponible tout | `tout` (O) | dispo |
| nuke | Sécurité civile | `secu` (SC) | dispo |
| po | Chasse FAF | `defense_perso` (C) | dispo |
| pld | Transport | `defense_perso` (T) | dispo |
| opssol | FNY | `defense_perso` (N) | dispo |
| opsvol | Exercice IVAO SO | `exercice_vol` (S) | dispo |
| stage | Contrôle IVAO SO | `exercice_ctrl` (AM) | atc |
| tache | Contrôle IVAO civil | `ctrl_hors` (AT) | atc → **non affectable** |
| dv | Indisponible | `indispo` (IN) | indispo |
| recup | Récup | `recup` (Q) | indispo |
| volivaohorss | Vol IVAO hors SO | `vol_hors` (G) | occupe → **non affectable** |
| dispouniquem | Dispo uniquement sol | **nouvelle** `sol` (groupe occupe) | occupe → **non affectable** |

Évolution proposée : catégorie `sol` (« Disponible au sol seulement », type `occupe`) ajoutée au `DEFAULT` de
`shared/dispos.js` et à `data/config/disponibilites.json` (dépôt data : accord requis).

**Affectabilité** (règle de conflit) :
- vol : le membre doit être couvert par une plage de type `dispo` sur toute la durée ; `occupe`, `atc`, `indispo`,
  non déclaré → conflit (« sol = indispo ») ;
- contrôle : type `atc` ou `dispo` ;
- divers (cours au sol, réunion) : tout sauf `indispo`.

## 3. Fichiers

### 3.1 `data/odv/config.json` — réglages de l'ordre de vol (partagés)

```json
{
  "schema": 1, "va": "SOG", "updated_at": "…", "by": "TRI",
  "terrain": "LFOA",
  "jours": { "1": { "debut": "04:00", "fin": "22:00" }, "…": {} },
  "nbJours": 7,
  "personnel": { "ABC": { "groupe": "staff", "couleur": "#EF4444", "ordre": 0 } },
  "modeles": {
    "vols":   [{ "id": "…", "libelle": "BLUE", "duree": 105, "couleur": "#1a5898", "fond": "#1a5898", "parIndicatif": false }],
    "divers": [{ "id": "…", "libelle": "COURS AU SOL", "duree": 60, "couleur": "#8a6010", "fond": null, "section": "divers" }],
    "aar":    [{ "id": "…", "tanker": "", "axe": "SIMONE", "debut": "09:00", "fin": "11:00", "offload": 4, "couleur": "#787808" }],
    "zones":  [{ "id": "…", "nom": "T43", "duree": 60, "couleur": "#2a7030", "sia": null }]
  },
  "indicatifs": { "MASTIFF": { "fond": "#a49ea0", "contour": "#cd030d" } },
  "ll": [{ "nom": "RTBA Lorraine", "debut": "11:30", "fin": "15:00", "jours": [1], "couleur": "#4ADE80", "sia": null }],
  "recurrences": [{ "id": "…", "element": { "type": "zone", "…": "…" }, "rythme": "hebdo", "jour": 2, "debut": "2026-10-12", "fin": null }],
  "checklist": [{ "id": "…", "texte": "Réserver les zones (lundi-mercredi)", "url": "https://…", "semainesAvant": 1, "jour": 6 }]
}
```

- `section` des divers : `divers` ou `controle`.
- `zones[].sia`, `ll[].sia` : identifiant de la base aéronautique, relié par `OdvAirspace` (lot L4) ; `ll` saisi à la
  main = repli quand la base n'a pas l'activité de la zone.
- `indicatifs` : couleurs de plaquette par préfixe d'indicatif (la table `MISSION_CALLSIGNS` reste inchangée ; le préfixe
  le plus long contenu dans l'indicatif saisi l'emporte). Variante : champs facultatifs `fond` / `contour` dans
  `data/references/callsigns.js`.
- `recurrences` : `rythme` `quotidien` | `hebdo` | `bimensuel` (semaines paires), `debut` **obligatoire** (une récurrence
  ne remplit plus les semaines passées), appliquée à la première ouverture d'une semaine.
- Supprimés de V0 (inutilisés) : `extSqDefault`, `cavTpls`, `showSim`, `simAnchorGap`, `tzDefault`, `prepText`,
  `dutyText`, `recur_refuels`, `auth`, `dayStart` / `dayEnd` (remplacés par `jours`).

### 3.2 `data/odv/<AAAA>-W<nn>.json` — l'ordre de vol d'une semaine

```json
{
  "schema": 1, "va": "SOG", "semaine": "2026-W42", "updated_at": "…", "by": "TRI",
  "prep": "TRI", "permanence": "TRI", "remarques": "texte",
  "elements": [
    { "id": "…", "type": "vol", "date": "2026-10-13", "debut": "09:30", "duree": 105,
      "libelle": "BLUE", "indicatif": "MASTIFF45", "couleur": "#1a5898", "fond": null,
      "avions": [{ "pilote": "ABC", "nav": null, "annule": false }],
      "taches": [{ "nom": "Leader", "pilote": "ABC" }],
      "zones": ["<id d'un élément zone>"],
      "ravitaillements": [{ "aar": "<id d'un élément aar>", "heure": "10:15", "offload": 5 }],
      "infos": "", "etat": "prevu", "cr": null, "motif": "", "mission": null, "recurrence": null }
  ],
  "butees": [{ "pilote": "ABC", "items": [{ "id": "…", "texte": "BFM", "echeance": "2026-10-20", "etat": "a_faire" }] }],
  "dlo":    [{ "pilote": "ABC", "items": [{ "id": "…", "texte": "CAS", "etat": "auto" }] }],
  "checklist": { "<id de tâche>": true }
}
```

Types d'élément (`type`) et champs propres :

| type | section | champs |
|---|---|---|
| `vol` | vols | voir l'exemple ; jusqu'à 8 avions (pilote + navigateur), 5 zones liées |
| `zone` | zones | `nom`, `couleur`, `reservee`, `sia` |
| `aar` | zones | `tanker`, `axe`, `offload`, `couleur`, `reservee` |
| `divers` | divers / controle | `section`, `libelle`, `equipage: [TRI]`, `notes`, `etat`, `motif` |
| `marqueur` | toutes | `texte`, `fin` (absent : trait) |
| `nlt` | toutes | `texte` (No Later Than) |
| `recup` | toutes | `pilotes: [TRI]` — indisponibles de `debut` à minuit |
| `pta` | libre | — (sens à confirmer) |
| `note` | libre | `texte` (texte simple : plus de HTML, risque d'injection de V0 supprimé) |

- `etat` : `prevu` | `fait` | `non_fait` | `annule` ; `cr` : `ME` | `BACHE` | `MNE` | null. Valeurs **brutes** : la
  correspondance vers les CR de la suite (ledger, outcomes) est faite par le lot L5. Un CR pose l'état s'il était
  `prevu` (ME → fait, BACHE → annule, MNE → non_fait).
- `mission` : identifiant du registre des missions (lot L5).
- Un élément ne passe pas minuit (`debut` + `duree` ≤ 24:00), comme V0.
- Priorité P1-P5 de V0 : retirée (jamais branchée).

## 4. Calculs (repris de V0, corrigés)

- **Conflits** : membre non affectable (§ 2), récup en cours, chevauchement avec un autre vol ou divers non annulé du même
  jour, même membre deux fois sur un élément.
- **Badge P** : aucun membre d'équipage disponible dans l'heure et demie avant le vol.
- **Dispos ensemble** : plages où au moins deux membres sont disponibles (type `dispo`).
- **Jour et nuit aéronautiques** : `sunTimes` (`shared/mission_core/assist.js`) et coordonnées du terrain (base des
  aérodromes de la suite) ; « maintenant » en UTC (V0 : heure locale).
- **Check-list** : échéance = lundi de la semaine − 7 × `semainesAvant` jours + (`jour` − 1) ; en retard si dépassée.
- **Butées** : couleur d'urgence par jours ouvrés restants (≤ 3 rouge, ≤ 10 jaune).
- **DLO auto** : faite si un vol `fait` de la semaine a le texte dans son libellé et le membre dans son équipage.
- **Statistiques** : vols prévus, durée, faits, annulés, AAR, ME / Bâchés / MNE ; par membre : disponibilité (sur les
  heures de service `jours`) et charge (minutes de vol / minutes dispo).
- **Modifications de dispo** (onglet de la vue semaine) : déclarations dont `updated_at` est postérieur à la dernière
  prise en compte (marque de lecture locale, `readMarks`) — remplace le journal `avLog` de V0.

## 5. Lots

| Lot | Contenu | Qui |
|---|---|---|
| L2 | ce modèle ; `shared/odv_orders_store.js` (lecture, écriture, récurrences, conflits — testable) | Ordres de vols |
| L3 | page `apps/cpco/odv_orders.html` : vue jour (frise, glisser-déposer), vue semaine, panneaux, check-list, stats, briefing ; rubrique Paramètres › Centre › Ordres de vols (modèles, LL, check-list, personnel, heures) | Ordres de vols |
| L4 | `shared/odv_airspace.js` (`OdvAirspace` : zones et LL de la base, axes AAR, espaces à éviter) | Features SOG |
| L5 | `etat` / `cr` → ledger ; plaquette ↔ registre et affectations | Features SOG |
| L6 | manuels (4 langues), CHANGELOG ; puis stabilisation | ensemble |

## 6. Questions ouvertes

1. Catégorie `sol` : ajout à la configuration partagée ?
2. Couleurs des indicatifs : dans `data/odv/config.json` (proposé) ou dans `callsigns.js` ?
3. Empilement automatique des éléments (au lieu des positions libres de V0) : d'accord ?
4. Récup : élément de l'ordre (proposé) ou plage `recup` écrite dans les dispos du membre ?
5. PTA, DLO : sens métier (recherche en cours).
