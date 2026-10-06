# Disponibilités en arbre, Paramètres et barre latérale : proposition

Proposition du 5 octobre 2026 (branche `feature/dispos-reorg`). Compagnie gérée : **DEFA** (celle des paramètres) ;
une seule compagnie par Centre (un pilote pourra en avoir plusieurs plus tard : chaque fichier de configuration porte
déjà `va: DEFA`).

## 1. Disponibilités : catégories configurables

### 1.1 Aujourd'hui

Un code ODV par heure et par jour (grille 7 × 24, UTC), 14 codes du classeur ODV : O, SC, C, T, S, N (disponible),
AT, AM (contrôle), G, DC (occupé), IR, IN, V, Q (indisponible). Les règles de l'ODV et de l'affectation en dépendent
(`FAMILY_ROLES`, `DOMAIN`, `eligible`, « code restreint dans son domaine »), et le classeur Excel les emploie. Une
seule disponibilité par heure : on ne peut pas être disponible à la fois « secours » et « chasse ».

### 1.2 Retenu : quelques catégories générales, le détail dans les préférences de l'utilisateur

**Thèmes** = les familles de mission, rangées par domaine :

| Domaine | Thèmes |
|---|---|
| Sécurité civile | HEMS (secours héliporté, medevac), SAR, FIRE (feux), LE (police, douane), HADR (aide humanitaire) |
| Défense | COMBAT (chasse), ISR (renseignement, surveillance), COMMAND (commandement), AAR (ravitaillement), AIRLIFT (transport), AIRBORNE (largage), MARITIME (marine), SPECIAL |

**Catégories de disponibilité** (ce que le pilote déclare, peu nombreuses) :

| Groupe (affiché dans l'ODV) | Catégorie | Thèmes ouverts | Code ODV |
|---|---|---|---|
| Disponible | tout | tous | O |
| | sécurité civile | tous ceux du domaine | SC |
| | défense | tous ceux du domaine | — |
| | **sécurité civile personnalisée** | selon les préférences du pilote | — |
| | **défense personnalisée** | selon les préférences du pilote | C, T, N |
| Exercice DEFA | vol en exercice DEFA | exercice | S |
| | contrôle DEFA | contrôleur d'exercice | AM |
| Occupé | vol hors DEFA (IVAO / VATSIM) | aucun | G |
| | DCS | aucun | DC |
| | contrôle hors DEFA (IVAO / VATSIM) | aucun | AT |
| Indisponible | indisponible | aucun | IN |
| | congés | aucun | V |
| | récupération | aucun | Q |
| | activité réelle | aucun | IR |

**Préférences de l'utilisateur** (dans son profil, synchronisées) : pour chaque domaine, une **liste blanche** (seulement
ces thèmes) ou une **liste noire** (tous sauf ces thèmes). « Défense personnalisée » d'un pilote qui n'aime que la
chasse = liste blanche COMBAT, ISR ; d'un pilote qui refuse la chasse = liste noire COMBAT.

**ODV** : les catégories sont **regroupées** (Disponible, Exercice DEFA, Occupé, Indisponible) pour ne pas charger la
grille ; le détail (catégorie, thèmes ouverts) est dans l'infobulle et le panneau du créneau.

**Classeur ODV** : secondaire (import). À l'import, un pilote sans préférences en reçoit par défaut d'après ses codes :
C → défense liste blanche COMBAT, ISR, COMMAND, AAR ; T → AIRLIFT, AIRBORNE, AAR ; N → MARITIME (et SAR en sécurité
civile) ; plusieurs codes → réunion des thèmes.

Les catégories et les thèmes sont configurables (Paramètres › Centre) ; une catégorie qui a servi est **retirée**
(cachée des listes, gardée pour l'historique), jamais effacée.

### 1.3 Format d'une disponibilité

Votre structure, à quelques précisions près :

```json
{
  "schema": 2, "va": "DEFA", "pilote": "RBR", "semaine": "2026-W41", "updated_at": "…", "by": "RBR",
  "dispos": {
    "2026-10-06": [
      { "debut": "19:00", "fin": "22:00", "categorie": "secu_perso" },
      { "debut": "19:00", "fin": "22:00", "categorie": "defense" },
      { "debut": null, "fin": null, "categorie": "conges" }
    ]
  },
  "appareils": { "possedes": [], "maitrises": [] }, "simulateurs": []
}
```

- Heures en **UTC** (comme aujourd'hui), au quart d'heure ; `null` = journée entière.
- `categorie` : identifiant stable d'une catégorie de la configuration ; les thèmes réellement ouverts se calculent à
  la lecture (catégorie + préférences du pilote à ce moment).
- **Plusieurs plages peuvent se chevaucher** (disponible secours ET combat sur la même soirée).
- Un fichier par pilote et par semaine : `data/disponibilites/RBR/2026-W41.json` (peu de conflits git, archivage par
  année naturel). Les fichiers actuels (`RBR.json`, grille de codes) sont convertis par un outil (heures consécutives
  du même code → une plage).

### 1.4 Configuration de l'arbre

`data/config/disponibilites.json` (synchronisé, daté, `va: DEFA`), modifiable dans **Paramètres › Centre ›
Catégories de disponibilité** (usage quotidien) : groupes, catégories (libellés, couleur, thèmes ouverts, code ODV),
thèmes par domaine. Les règles de l'ODV et de l'affectation lisent les thèmes au lieu des tables écrites en dur
(`FAMILY_ROLES`, `DOMAIN`).

### 1.5 Page de saisie générique

Même page pour tous les pilotes (Mes missions › Mes disponibilités, et ouvrable seule) :

- semaine affichée (flèches, date, « semaine en cours ») ;
- **ajout** : Groupe ▼ → Catégorie ▼ (selon le groupe) → jours (cases du lundi au dimanche) → horaires (facultatifs)
  → « Ajouter » ; pour une catégorie personnalisée, rappel des thèmes ouverts et lien vers ses préférences ;
- frise de la semaine : une ligne par jour, les plages en couleur (empilées quand elles se chevauchent), clic sur une
  plage pour la modifier ou la retirer ; « ⧉ semaine précédente » conservé ;
- l'ancienne grille horaire reste en lecture (vue d'ensemble) jusqu'à la bascule.

## 2. Paramètres : quatre pages au lieu d'une

| Page | Pour qui, quand | Contenu |
|---|---|---|
| **Mon profil** | chaque utilisateur, ses propres données | trigramme, identifiants **VATSIM, IVAO**, SimBrief, identifiants du site DEFA (aujourd'hui saisis au premier lancement seulement), mot de passe, **préférences de thèmes** (listes blanches / noires), langue, appareils et simulateurs |
| **Centre** (CPCO, déverrouillé) | quotidien | **utilisateurs et droits**, **catégories de disponibilité**, réglages du routage, envoi des CR (webservice) |
| **Installation** | une fois | premier lancement, dépôt de données, dossiers, compagnie virtuelle (SO Group par défaut), canal de mise à jour |
| **Maintenance** | de temps en temps | mises à jour, versions, dépendances, base SIA (28 jours), caches (dont « reconstruire l'index »), stockage, sauvegarde totale, journal, fichiers de référence (flotte, types OACI, indicatifs, base, renommages, registre des CR) |

Apparence reste une page (et une fenêtre depuis le menu).

### Utilisateurs et droits

- Fichier par utilisateur `data/utilisateurs/<TRI>.json` (synchronisé comme les missions) : trigramme, nom affiché,
  rôle **`admin_centre`** ou **`utilisateur`**, actif, mot de passe (empreinte PBKDF2 salée, jamais en clair),
  préférences de thèmes, compagnie (`va: DEFA`).
- **Mode `develop`** (aujourd'hui, réglé dans la configuration partagée) : la sécurité est **testée, pas imposée** ;
  on change de trigramme librement, la connexion est facultative.
- **Mode `production`** : connexion (trigramme + mot de passe) pour les missions, et pour le Centre si l'on est
  `admin_centre` ; le reste de la suite reste libre ; le trigramme ne change plus à la volée ; mot de passe changé en
  connaissant l'ancien, ou réinitialisé par un admin.
- **Usurpation** : un admin peut agir en tant qu'un autre utilisateur ; un bandeau « Usurpation : utilisateur TOTO »
  s'affiche alors sur toutes les pages, et chaque écriture porte `by: "ADM pour TOTO"`.
- Limite : tant que tout se vérifie dans le navigateur, ces contrôles ne protègent pas vraiment ; la vérification
  passera côté serveur avec le webservice (voir [INDEX_DONNEES.md](INDEX_DONNEES.md) § 9, synchronisation).

## 3. Barre latérale

Ordre proposé, par usage (pilote d'abord, puis Centre) :

1. Mes missions · 2. CR · 3. Cartes de vol · 4. Carburant · 5. Atterrissages · 6. Reporting
— *Centre* — 7. **Missions** (générateur **et** studio cartographique : un bouton, deux pages, le bouton reste actif
sur les deux ; passage de l'une à l'autre par des onglets en tête de page) · 8. Registre · 9. ODV
— *bas* — Apparence · Paramètres · Menu

La liste devient une clé `sidebar` de `config/repository_tree` (aujourd'hui écrite en dur dans `repository_nav.js`), avec
des séparateurs titrés (« Centre »).

## 4. Décisions (5 octobre 2026)

1. Catégories générales peu nombreuses, détail par préférences (listes blanches / noires) ; ODV regroupé.
2. Classeur ODV secondaire ; préférences créées à l'import pour un pilote qui n'en a pas.
3. Utilisateurs et rôles dans un fichier partagé et synchronisé ; mode `develop` / `production` ; usurpation affichée.
4. Barre latérale : pilote d'abord.

## 5. Mise en œuvre (branche `feature/dispos-reorg`)

| Sujet | Où |
|---|---|
| Barre latérale (clé `sidebar`), onglets en tête de page (clé `tabs` : Mes missions ⇄ Mes disponibilités, générateur ⇄ studio, Paramètres) | `config/repository_tree`, `shared/repository_nav.js` |
| Paramètres en quatre pages ; rubrique → page (clé `settings`) ; anciennes adresses renvoyées par `parametrage.html` | `apps/settings/{profil,centre,installation,maintenance}.html`, `shared/settings_panels.js`, `shared/data_admin.js`, `shared/maintenance_page.js` |
| Utilisateurs, mode develop / production, connexion, usurpation | `shared/users.js`, `data/utilisateurs/`, `data/config/suite.json` |
| Fichiers du pool écrits sous verrou (dossier des données, sinon boîte d'envoi du navigateur `suiteDataOutbox:v1`) | `MissionAssignments.readData` / `writeData` / `flushData` (`shared/assignments.js`) |
| Catégories, thèmes ouverts, déclarations par semaine | `shared/dispos.js`, `data/config/disponibilites.json`, `data/disponibilites/<TRI>/<AAAA>-W<nn>.json` |
| Saisie par plages (Mes missions et page seule) ; ancienne grille en lecture | `shared/dispos_editor.js`, `apps/pilot/disponibilites.html` |
| ODV : déclarations regroupées, missions probables et contrôles des vols par thèmes, préférences créées à l'import du classeur | `apps/cpco/odv_core.js`, `odv_assign.js`, `odv_planning.js` |
| Conversion des grilles | `python tools/convert_dispos.py` (aperçu), `--write` |
