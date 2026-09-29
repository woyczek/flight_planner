# Planning ODV

Page du Centre `apps/cpco/odv_planning.html` (☰ › Centre — Planning ODV ; accès réservé comme le reste du Centre) : lit le classeur hebdomadaire ODV de l'escadrille
(`ODV_Snn_XXX.xlsx`) et en tire la grille de disponibilité, les créneaux communs, les missions probables et les vols
déjà posés sur la frise horaire. Lecture et règles : `apps/cpco/odv_core.js` (`window.OdvCore`) ; interface :
`apps/cpco/odv_planning.js`.

## Données personnelles

- Le classeur est lu **dans le navigateur** : `ZipStore.read` (`shared/zip_store.js`, décompression par
  `DecompressionStream`) puis `DOMParser`. Aucune requête réseau, aucune bibliothèque externe.
- Rien n'est conservé : le classeur reste en mémoire (bouton « Effacer les données »). Seuls les **réglages** sont
  mémorisés (`localStorage` `odvPlanning:v1`) ; ils ne contiennent aucun trigramme.
- Les commentaires de cellule sont affichés **sans le nom de leur auteur**.
- Nom affiché : le trigramme ; un nom complet n'apparaît que s'il figure localement dans la référence DEFA
  (`data/references/defa_reference.js`, champ `name` facultatif des pilotes).
- Aucun classeur réel ni aucun trigramme réel dans le dépôt : les tests utilisent des trigrammes fictifs (AAA, BBB…).
- Les exports (CSV, JSON, texte) sont des fichiers locaux nominatifs : ne pas les publier.

## Ce que la page lit

| Élément | Où | Repérage |
|---|---|---|
| N° de semaine | feuille ODV, à droite du « S » de la ligne 1 | sinon D1, sinon le nom du fichier (`S39`) |
| Jours et créneaux | ligne des libellés LUNDI…DIMANCHE ; 3 colonnes par jour = matin, après-midi, soir | sinon D4:X |
| Pilotes | **zones de texte** de 3 lettres sur les colonnes A:C | ligne = celle qui contient le centre vertical de la forme |
| Codes | grille des jours × créneaux | texte normalisé (`in`, `In`, `IN` → IN ; espaces retirés) comparé à la légende |
| Légende | bloc « Code couleur » (code, libellé) + couleurs de la mise en forme conditionnelle | défauts intégrés, codes nouveaux ajoutés |
| Événements de groupe | lignes entre les jours et les pilotes (IVAO FR, IVAO SO, DEFA) | couleur de fond des cases, commentaires |
| Officier de permanence, thème | zones de texte (3 lettres en haut ; « Thème semaine… ») | |
| Frise horaire | blocs « VOLS » (un par jour), heures 0…23 dessous | vol = forme `DEP-ARR \| appareil \| objet` ; équipage = trigramme posé à gauche ; indicatif = forme voisine ; couloirs CONTRÔLE et DIVERS ; zones à activer (cellules sous les heures) |
| FLOTTE | trigrammes en zones de texte (colonne A), « Avions disponibles », simulateurs (croix) | rôles d'après les types (mots-clés) et les rubriques du commentaire en fil ; niveau vert / orange / rouge du texte |

Catégories : `dispo` (O, SC, C, T, N, S), `atc` (AT, AM), `occupe` (G, DC), `indispo` (IR, IN, V, Q), `suivi`
(I, A seuls), `inconnu` (case vide), `hors_legende`. Une marque I / A / Q accolée à un code (« OI ») est acceptée.

Tout ce qui manque ou surprend est **signalé** (notification flottante et rapport de lecture), jamais bloquant :
date de la frise décalée par rapport à la semaine ISO, case contenant une espace seule, code hors légende, deux
trigrammes sur une ligne, trigramme en double, codes sans trigramme, FLOTTE absente ou lignes sans trigramme,
trigrammes présents d'un seul côté.

## Règles de planification

- **Rôles d'un pilote dans un créneau** : le code impose le rôle (SC → sécu civile + hélico / avion sécu d'après
  FLOTTE ; C → chasse ; T → transport + ravitailleur / largage ; N → FNY, maritime ; S → exercice + rôles FLOTTE) ;
  O → tous les rôles FLOTTE ; AT / AM → contrôleur.
- **Familles** (rôles requis tenus par des pilotes distincts) : SAR (2 hélicos), FIRE (1 avion sécu), HEMS (1 hélico),
  MARITIME (1 FNY), AAR (chasse + MRTT), ISR (détection + chasse), SPECIAL (2 chasseurs), AIRBORNE (A400M/C130 + 1),
  AIRLIFT (1 transport), **TRAINING** (1 pilote et ≥ 1 contrôleur en ligne, ou 1 pilote déclarant un type École).
- **Score** = participants + 2 par pilote à code restreint employé dans son domaine + 1 par contrôleur (2 au plus)
  pour TRAINING ; à score égal, ordre de préférence réglable. Les trois meilleures familles sont montrées avec
  l'affectation, le calcul et la règle.
- **Vols de la frise** : chaque équipier est comparé à sa grille sur les créneaux que couvre le vol (codé
  indisponible, grille vide, appareil hors du domaine de son code).

## Réglages (réponses par défaut aux questions ouvertes)

| Question | Défaut | Réglage |
|---|---|---|
| Dates | semaine ISO du n° de semaine ; décalage de la frise signalé | ISO / date de la frise |
| Heures des créneaux | matin 08-12z, après-midi 12-18z, soir 18-23z | heures des trois créneaux |
| Case vide | non renseignée (jamais comptée comme disponible) | non renseignée / indisponible |
| Couleurs des trigrammes | affichées et filtrables, non utilisées par les règles | — |
| Ligne de groupe colorée les 7 jours sur un créneau | habillage probable, ignorée | case à cocher |
| I / A / Q | marques de suivi : seules I et A ne comptent pas, Q = récupération ; accolées à un code, le code fait foi | — |
| Codes restreints (SC, C, T, N) | stricts : rôles de leur domaine seulement | case à cocher |
| Types FLOTTE | tous sauf les rouges (non maîtrisés) | tous / sans rouges / verts seuls |
| Bloc recopié de FLOTTE, lignes sans trigramme | ignorés (signalés) | — |
| Famille TRAINING | ajoutée | ordre de préférence |
| Créneaux communs | au moins 2 pilotes ; simulateur commun facultatif | filtres du bloc |

## Exports

CSV du schéma normalisé (une ligne par pilote, jour et créneau ; `;`, UTF-8 avec BOM), JSON complet (réglages,
pilotes et profils FLOTTE, grille, événements, vols contrôlés, créneaux et missions, rapport de lecture), récapitulatif
texte « MATIN / APREM / SOIR » par jour (à copier, par exemple dans Discord, à la place des encadrés DISPO de la frise).

## Limites

- Heures de la frise lues à ±15 min ; équipage et indicatif associés par voisinage (heuristique).
- Un classeur réenregistré par LibreOffice ou Google Sheets peut perdre ses formes : plus de trigrammes (signalé).
- Rôles FLOTTE déduits par mots-clés : indicatifs, le planificateur valide.
- Pas de correction manuelle du rattachement trigramme ↔ ligne (la première forme est gardée, le conflit signalé).

## Sessions ATC et missions du registre

- **Sessions ATC** : un « TRAINING » ou un « EXAMEN » portant une position (« EXAMEN LFMN_TWR », « TRAINING LFBO_APP »),
  lu dans les couloirs DIVERS de la frise ou dans le commentaire d'un contrôleur, rend la zone indisponible pour le
  créneau : **pas de mission dans la CTR du terrain**, et si possible hors des TMA qui le contiennent. Le détail du
  créneau liste ces « Espaces à éviter ».
- **Missions du registre…** (créneaux d'au moins deux pilotes : détail du créneau, tableaux des créneaux et des missions
  probables) : missions du registre du Centre (registre du navigateur) avec rendez-vous ou à plusieurs équipes, de la
  famille choisie, sans plus d'équipes en l'air que de pilotes disponibles. Leur route estimée est confrontée aux
  espaces à éviter (base SIA du navigateur) : CTR traversée → mission grisée en fin de liste, TMA → signalée ; missions
  déjà volées après les autres. « Ouvrir » affiche la mission dans le registre (nouvel onglet). Réservé au Centre :
  bouton inactif tant que le Centre est verrouillé.
