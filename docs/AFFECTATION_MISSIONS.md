# Affectation des missions aux pilotes — conception (à valider)

État : **publiée en 4.6.0** (1ᵉʳ octobre 2026). Lots 1 à 4
faits (§ 8), astreinte : bloc `alert` dans le prompt et affichage côté pilote ; décisions par défaut ci-dessous (§ 9). Objet : le Centre (CPCO) affecte une mission existante à un ou
plusieurs pilotes, sur un horaire, avec un appareil nominatif chacun ; chaque pilote voit, hors du Centre, les missions à
venir qui lui sont affectées, signalées par un pli cacheté dans l'en-tête.

## 1. Vocabulaire

| Terme | Sens |
| --- | --- |
| **Affectation** | Une mission × un participant : pilote (trigramme), appareil (immatriculation), indicatif, terrain de départ, heure de décollage demandée. |
| **Participant** | Un pilote d'une mission. Une mission peut en avoir plusieurs (patrouille VAILLANT 31 / 32) : un appareil chacun. |
| **Créneau** | Plage horaire où un pilote est disponible et où un appareil est libre. Aujourd'hui : tranches « MMS » de l'ODV (matin, après-midi, soir) ; à raffiner à l'heure. |
| **Convoyage** | Vol de mise en place d'un appareil pris hors du terrain de départ de la mission ; il avance le décollage du participant. |
| **Astreinte** | Mission sans heure de décollage fixe : « soyez prêt à HH:MM sur LFXX et attendez les ordres ; décollage prévisible en XX minutes ». |
| **Pli cacheté** | Icône de l'en-tête signalant une affectation nouvelle (non lue). |

## 2. Parcours

**Côté Centre** (registre des missions, détail d'une mission → « Affecter… ») :
1. choisir la date et l'heure H (pour un exercice : `exercise.h_hour` ; les décollages des participants en découlent,
   `exercise.participants[].takeoff` = « H-20 »…) ;
2. pour chaque participant (autant que d'équipes de la mission, ajout possible pour une patrouille) : pilote parmi ceux
   **disponibles sur le créneau** (ODV, raffiné à l'heure), appareil parmi ceux **du type demandé, libres sur le créneau,
   basés sur le terrain de départ** ; sinon appareils d'un autre terrain avec **temps de convoyage** calculé (distance /
   vitesse de croisière du type + marge de mise en œuvre) et décollage avancé d'autant ;
3. contrôles : pilote ou appareil déjà pris (autre affectation, bloc + remise en œuvre), qualification du pilote sur le
   type (`defa_reference.pilots[].types`), appareil non opérationnel (`aircraft_fleet.operational`) ;
4. enregistrer : l'affectation est rangée avec la mission (§ 4) ; statut « proposée », puis « confirmée » par le pilote
   (à décider, § 9).

**Côté pilote** (page hors Centre, « Mes missions ») :
1. l'utilisateur est identifié par son trigramme (réglage local, § 3 ; essai : RBR) ;
2. pli cacheté dans l'en-tête quand une affectation nouvelle l'attend (compteur, clic → « Mes missions ») ;
3. liste des missions à venir (date, heure, mission, appareil, terrain) puis, pour une mission, **vue en lecture seule** :
   récit et objectifs, appareil attribué (immatriculation, indicatif), terrain et heure de décollage demandée (ou
   consigne d'astreinte), route (points tournants sur la carte), éléments graphiques fournis (cartes `cartes/` du
   dossier de la mission, carte d'opération), coéquipiers (patrouille) ;
4. boutons « Ouvrir dans Cartes » (planificateur de cartes, route fournie) et « Carburant » (planificateur de
   performances : route, distance, niveau, appareil — même transfert que le studio, `plannerHandoff:v1`) ;
   « Créer le CR » une fois la mission volée.

## 3. Identité de l'utilisateur

Réglage local **« Mon trigramme »** (Paramètres, `defaUser:v1` dans ce navigateur, non partagé) : trigramme choisi dans
la référence DEFA (`data/references/defa_reference.js`, `pilots[].trigram`). Sert à « Mes missions », au pli cacheté et,
plus tard, à préremplir l'équipage des CR. Pas de mot de passe : la suite reste locale ; ce n'est pas un contrôle d'accès.

## 4. Données

Une affectation est rangée **avec sa mission** : `data/missions/<lettre>_<FAMILLE>/<ID>/affectations.yaml` (plus un index
`data/missions/affectations.yaml` reconstruit par le registre, pour la page du pilote et les contrôles de conflits) :

```yaml
mission: A-001A
updated_at: 2026-10-01T09:12:00Z
by: CPCO                      # trigramme ou poste qui a affecté
h_hour: 2026-10-04T13:00Z     # exercice : heure H réelle (les décollages des participants en découlent)
participants:
  - pilot: RBR
    callsign: MERCURE31
    aircraft: { registration: F-UHRE, type: RFAL, base: LFBM }
    departure: LFBM
    takeoff: 2026-10-04T12:40Z      # heure demandée (UTC)
    ferry: null                     # ou { from: LFSI, minutes: 45, takeoff: … }
    status: proposée                # proposée · confirmée · déclinée · volée · annulée
    read_at: null                   # lu par le pilote (pli cacheté éteint)
  - pilot: AGT
    callsign: MERCURE32
    aircraft: { registration: F-UHRF, type: RFAL, base: LFBM }
    departure: LFBM
    takeoff: 2026-10-04T12:41Z
alert: null                         # astreinte : § 6
```

**Partage** : le Centre et les pilotes ne sont pas sur le même poste. Le dossier `data/` est déjà un dépôt git
(`missions-defa`, Framagit) : l'affectation y voyage comme les missions (commit côté Centre, mise à jour côté pilote,
`tools/update_suite.py`). Données nominatives (trigrammes, horaires) : à valider (§ 9), le dépôt devant rester privé.

## 5. Créneaux, disponibilités et appareils

- **Pilotes** : disponibilités de l'ODV (`OdvCore.extract` : codes par jour × matin / après-midi / soir) ; raffinement à
  l'**heure** dans une grille jours × heures (cases cliquables et glissables, comme la grille horaire jointe à la demande ;
  15 min est trop fin : **1 h** par défaut, 30 min en option), « disponible » / « indisponible » ; une tranche MMS
  « disponible » préremplit ses heures, le pilote (ou le Centre) les ajuste. Stockage : avec l'ODV de la semaine
  (`data/odv/<semaine>/disponibilites.yaml`, nominatif : même règle de partage que § 4).
- **Appareils** : flotte (`aircraft_fleet.js` : type, immatriculation, base, opérationnel), disponibilités de la feuille
  FLOTTE de l'ODV (vert / orange / rouge), occupation par les autres affectations (décollage → atterrissage estimé
  `timing.estimated_block_min` + remise en œuvre, réglable, 30 min par défaut).
- **Convoyage** : appareil pris hors du terrain de départ → distance orthodromique base → départ, vitesse de croisière du
  type (`AircraftDB`), + 20 min de mise en œuvre ; le décollage du convoyage est affiché et contrôlé (pilote et appareil
  disponibles dès ce moment) ; le convoyage peut être confié au même pilote ou laissé « à organiser ».
- **Patrouille** : un appareil nominatif par participant ; indicatifs suivis (MERCURE31 → MERCURE32) ; même type si
  la mission l'impose (`TYPES_EQUIPES` imposés), sinon type compatible.

## 6. Missions d'astreinte

Le générateur connaît des sous-types d'alerte (QRA d'AAR, AIR_POLICING de COMMAND) et les exercices à chronologie
(heure H, pistes « chiffons », messages radio) mais **aucune mission ne décrit une attente au sol** : à ajouter au prompt
(`docs/PROMPT_GENERATEUR_MISSIONS.md`), bloc facultatif :

```yaml
alert:
  ready_at: "H-30"            # prêt à partir de (relatif à H ou heure réelle)
  aerodrome: LFBM
  notice_min: 15              # décollage prévisible XX minutes après l'ordre
  window_end: "H+120"         # fin d'astreinte
  trigger: "message radio du CDC (mission d'organisation Z, événement EV-1)"
  phases:                     # plusieurs phases / pistes possibles selon l'ordre reçu
    - { id: P1, if: "piste nord", route: [PT1, PT2], task: "interception" }
    - { id: P2, if: "piste sud",  route: [PT3], task: "identification" }
```

Affichage pilote : « Soyez prêt à 12:30 sur LFBM et attendez les ordres ; décollage prévisible en 15 minutes. Fin
d'astreinte 15:00. » ; l'ordre de décollage et la phase retenue viennent de la mission d'organisation (événement), comme
les pistes révélées aujourd'hui. Créneau occupé : de `ready_at` à `window_end` + bloc estimé.

## 7. Pli cacheté

Indicateur de l'en-tête (à côté du bouton de sauvegarde), visible seulement quand une affectation non lue existe pour
l'utilisateur : enveloppe à cachet de cire dans les designs à matières (image à fournir : `shared/deco/<design>/sealed.webp`,
détourée ; Cabinet : cire rouge, Durci : pli kaki et tampon, Aqua : enveloppe de verre), icône d'enveloppe et pastille
ailleurs. Clic → « Mes missions » ; ouvrir la mission marque l'affectation lue (`read_at`).

## 8. Découpage proposé

1. **Identité** (« Mon trigramme ») + **page « Mes missions »** en lecture seule sur des affectations écrites à la main
   (fichier d'exemple) + pli cacheté. Valide l'affichage et les transferts Cartes / Carburant.
2. **Affectation côté Centre** : dialogue « Affecter… » (participants, pilotes et appareils filtrés par créneau MMS,
   conflits), écriture de `affectations.yaml`, index.
3. **Grille horaire** des disponibilités (raffinement des tranches MMS à l'heure).
4. **Pool d'appareils et convoyage** (autres terrains, temps de convoyage, décollage avancé).
5. **Astreinte** : bloc `alert` dans le prompt et le schéma, affichage pilote, occupation du créneau.

## 9. Questions ouvertes

1. **Partage des affectations et des disponibilités** : par le dépôt git `data/` (privé ?), ou export / import de
   fichiers, ou autre canal ? (données nominatives : trigrammes, horaires)
2. **Confirmation** : le pilote accepte / décline-t-il une affectation, ou l'affectation vaut-elle ordre ?
3. **Heures** : saisie et affichage en UTC (Z) ou en heure locale du terrain ?
4. **Granularité** : 1 h par défaut, 30 min en option — d'accord ?
5. **Page pilote** : dans le menu ☰ de tous (« Mes missions ») ou seulement si un trigramme est réglé ?
6. **Pli cacheté** : une image par design à matières (à fournir), ou une seule partagée ?

## 10. Réalisation (branche feature/affectations)

- **Socle** `shared/assignments.js` (toutes les pages, chargé par `repository_nav.js`) : trigramme du profil pilote
  (☰ › Profil pilote, champ « Trigramme DEFA »), index `data/missions/affectations.json` lu par fetch, lu / non lu local
  (`assignmentsRead:v1`), **pli cacheté** dans l'en-tête (enveloppe à cachet de cire, compteur ; habillage des designs à
  matières), grille de disponibilités, écriture d'une affectation (Centre).
- **Page pilote** `apps/pilot/mes_missions.html` (menu ☰ « Mes missions ») : missions à venir, mission en lecture seule
  (appareil, indicatif, terrain, heure de décollage ou consigne d'astreinte, convoyage, coéquipiers, résumé, route et
  plan, cartes fournies), **Ouvrir dans les Cartes de vol** (mission partagée de l'espace « planner »), **Carburant**
  (route OACI, distance, niveau, route vraie : `plannerHandoff:v1`), **Créer le CR** (immatriculation attribuée) ;
  **Mes disponibilités** : semaine type, cases d'une heure peintes avec les **codes de l'ODV** (palette : O, SC, C, T,
  S, N, AT, AM, G, DC, IR, IN, V, Q — légende « Code couleur » du classeur ; couleurs = familles de l'ODV accordées au
  design) ; clic ou glisser pose le code choisi, un second clic sur une case de ce code l'efface ; enregistrées dans le
  navigateur et, au bouton, dans `data/disponibilites/<TRI>.json`. Le dialogue du Centre affiche le code à l'heure du
  décollage et avertit s'il ne couvre pas la famille de la mission (ex. T « Transport » sur une mission COMBAT).
- **Centre** : bouton **« Affecter… »** du détail d'une mission (registre ; pas pour les missions d'organisation Z),
  `shared/assign_dialog.js` : heure de décollage ou heure H (exercice : décalage du participant), astreinte (prêt à,
  préavis, fin), participants (+ équipier, indicatif suivi), pilote (référence DEFA : qualification sur le type,
  disponibilité à l'heure), appareil du type demandé (flotte ; basé au terrain de départ ou **convoyage** : distance
  depuis la base SIA, le registre ou la base mondiale des aérodromes, vitesse de croisière + 20 min, décollage du
  convoyage = décollage − durée − 30 min), conflits (pilote ou appareil déjà pris, doublons), enregistrement
  (`affectations.yaml` de la mission + index).
- **Planning ODV** (`apps/cpco/odv_assign.js`) : **deux lignes par pilote** dans la grille — code du classeur, puis
  déclaration du pilote ramenée au créneau (code dominant des heures déclarées, même rendu que le classeur) ; **encadré
  rouge** : disponible (déclaration, sinon classeur) et non affecté ; n° de mission : affecté ; **clic sur la déclaration**
  → missions du registre pour ce pilote et ce créneau → « Affecter » (dialogue prérempli : pilote, heure de début du
  créneau) ; **créneau commun** (« Missions du registre… ») : « Affecter » propose les pilotes libres du créneau (autant
  que d'équipes de la mission, les autres cités).
- **Appareils du pilote** (« Mes appareils ») : types de la flotte possédés / maîtrisés, rangés avec ses disponibilités ;
  le dialogue s'en sert (maîtrisé : ok ; possédé ou vols connus : avertissement ; non déclaré : erreur).
- **Convoyage** confiable à un autre pilote (« par … » dans le dialogue) : ligne « convoyage » dans l'index, visible dans
  ses « Mes missions » (amener l'appareil de sa base au terrain de départ).
- **Factorisation** : géographie, terrains, convoyage, qualification, créneaux, conflits et écriture dans
  `shared/assignments.js`, utilisés par le dialogue, l'ODV et la page pilote ; l'écriture ne dépend plus du registre.
- **Décisions par défaut** (§ 9, à confirmer) : partage par le dépôt `data/` ; pas d'acceptation (l'affectation vaut
  ordre, le pilote en accuse lecture) ; heures UTC ; cases d'une heure ; « Mes missions » dans le menu de tous ; une
  enveloppe dessinée (SVG) habillée par design.
- **Tester** : régler son trigramme (☰ › Profil pilote, ex. RBR) ; dans le registre, détail d'une mission →
  « Affecter… » (dossier des missions autorisé) ; recharger une page : pli cacheté ; « Mes missions ».
- **Postes** (1ᵉʳ octobre 2026) : une mission demande un pilote par équipage aérien — `aircraft[]`, ou `teams[]` du
  schéma hélico (indicatif, type ; type générique « Hélicoptère » : un hélicoptère de la flotte, du service de l'équipe
  d'abord — Gendarmerie → Gendarmerie nationale) ; équipes au sol écartées (`MissionAssignments.postsOf`, `planesFor`,
  `fits`). Le dialogue présente un poste par carte (type, appareils et qualification propres).
- **Matrice d'un créneau (ODV)** : missions × postes, pilote libre et appareil par poste, préremplis par la proposition ;
  transaction : choix en attente visibles (« RBR → I-01A · appareil · indicatif »), « Enregistrer » écrit les missions
  cochées, « Annuler les modifications » revient à la proposition ; fermeture quand tous les pilotes libres sont affectés,
  ou sur demande (confirmation si modifications en attente). « ✎ détail » : dialogue complet, dont le résultat revient
  dans la matrice (« Reporter dans le créneau »), rien n'est écrit avant « Enregistrer ».
- **Semaines** (1ᵉʳ octobre 2026) : disponibilités par semaine (`weeks`, clé : lundi ISO UTC, douze semaines passées
  gardées) ; l'ancienne grille « semaine type » (`grid`) vaut tant qu'aucune semaine n'est saisie. « Mes missions » :
  barre de semaine (‹, date, ›, ⟲ semaine en cours) commune à la liste et à la grille ; « ⧉ S-1 » recopie la semaine
  précédente ; tracé en rectangle (jours × heures). Le Centre et l'ODV lisent la grille de la semaine concernée.
