# Feuille de route

Où va la suite, dans quel ordre, et pourquoi. Écrite le 5 octobre 2026 ; à tenir à jour à chaque étape franchie.
Détails techniques : [INDEX_DONNEES.md](INDEX_DONNEES.md) (index et synchronisation), [SYNCHRONISATION.md](SYNCHRONISATION.md)
(architecture actuelle), [DETTE_TECHNIQUE.md](DETTE_TECHNIQUE.md) (ce qui reste à reprendre).

## Où on en est

Depuis la 4.7.0 (2 octobre), sur `develop` :

- **Pages réorganisées** : barre latérale « pilote d'abord », un seul bouton « Missions » pour le générateur et le
  studio, Paramètres en quatre pages (Mon profil, Centre, Installation, Maintenance).
- **Utilisateurs et rôles** : fiches partagées, rôles `admin_centre` / `utilisateur`, mode develop / production,
  connexion, usurpation affichée sur toutes les pages.
- **Disponibilités** : catégories configurables (Centre), préférences de thèmes par pilote, grille heure par heure
  avec les couleurs et les codes ODV ; Planning ODV relié à ces déclarations.
- **Mes missions** : deux colonnes, livre de mission par design, animations d'ouverture, de fermeture et de changement
  de mission (séquence propre au Cabinet).
- **Données plus rapides** : index dans le navigateur (missions, CR, copies signées des fichiers partagés) — l'ODV
  s'ouvre en 1,6 s au lieu de 7,2 s.
- **Synchronisation git** : bouton « Synchroniser » dans l'en-tête, conflits réglés fiche par fiche, rien de perdu.

## Étape 1 — Stabiliser et publier la 4.8 (maintenant)

**But** : une version propre de tout ce qui précède, que chacun peut installer.

- Corrections en cours (session de stabilisation).
- **Première synchronisation du vrai `data/`** : à lancer par toi (82 fichiers jamais commités ; crée la branche
  distante `test`).
- **Release 4.8.0** sur `master` quand tu le décides : notes de version (`VERSION.md` : synthèse, actions à effectuer,
  notes), changelog.

## Étape 2 — Le serveur web minimal (« moteur central »)

**Pourquoi.** Avec git, chaque poste doit avoir git, un accès au dépôt et le lanceur ; un pilote qui ouvre simplement
la suite ne partage rien. Et les droits (qui peut affecter, qui peut modifier une fiche) ne sont vérifiés que par les
pages : rien n'empêche un poste de pousser n'importe quoi. Un petit serveur central règle les deux : un seul endroit
où arrivent les données, et qui vérifie qui a le droit de quoi.

**Ce que c'est, concrètement.**

- **Un programme Python** (`tools/defa_server.py`), sans dépendance à installer (bibliothèque standard), qui tourne sur
  **une seule machine** : un poste du Centre, un NAS Synology ou un petit serveur loué. On le lance avec
  `python tools/defa_server.py --data <dossier> --port <n>`.
- **Mêmes fichiers que `data/`**, rangés pareil : on peut repasser à git (ou en repartir) sans rien convertir.
- **SQLite** pour ce qui doit être interrogé vite et écrit par un seul programme : le journal des changements (qui a
  changé quoi, quand), les comptes, les sessions.
- **HTTPS** : derrière un relais qui gère le certificat (Caddy ou nginx) ; jamais en clair sur Internet.

**Ce qu'il fait.**

| Fonction | Détail |
|---|---|
| Connexion | trigramme + mot de passe (le même chiffrement qu'aujourd'hui, PBKDF2) → jeton de session ; mot de passe changé par l'utilisateur (ancien mot de passe) ou réinitialisé par un admin |
| Lire | `GET /v1/file/<chemin>` avec une signature (`ETag`) : comme aujourd'hui, la page ne relit que ce qui a changé |
| Suivre | `GET /v1/changes?since=<curseur>` : la liste de ce qui a changé depuis la dernière fois — plus besoin de bouton pour recevoir |
| Écrire | `PUT /v1/file/<chemin>` avec la signature lue (`If-Match`) ; si quelqu'un a écrit entre-temps → refus (412), la page fusionne fiche par fiche et réessaie ; suppression = pierre tombale |
| Droits | vérifiés **par le serveur** : `admin_centre` pour ce qui relève du Centre (affectations, catégories, utilisateurs), chaque pilote pour ses disponibilités, son profil et ses CR |
| Administration | page `/admin` (réservée `admin_centre`) : état, journal des changements, comptes (réinitialiser un mot de passe, désactiver), purge des pierres tombales, **sauvegarde ZIP**, **export vers un dépôt git** |

**Côté suite.** Le bouton « Synchroniser » garde sa place ; dans Paramètres › Installation, on choisit le
**transport** : *git sur le dossier* (aujourd'hui) ou *serveur central* (adresse du serveur). Avec le serveur, la page
lui parle directement : plus besoin du lanceur pour partager, ni de git sur chaque poste.

**Découpage.**

1. Serveur de fichiers : lire, écrire avec signature, journal des changements (SQLite), essais automatiques.
2. Comptes et sessions : connexion, jeton, rôles vérifiés, changement et réinitialisation du mot de passe.
3. Transport « serveur » dans la suite (`shared/sync.js`) : réception continue des changements, écriture
   conditionnelle, fusion fiche par fiche en cas de refus.
4. Page `/admin` : état, journal, comptes, sauvegarde ZIP, export git.
5. Mise en service : documentation d'installation (machine, relais HTTPS, sauvegardes), bascule d'un `data/` existant.

**Décisions à prendre avant de commencer.**

- **Où tourne le serveur** : poste du Centre, NAS Synology, serveur loué ?
- **Adresse et certificat** : nom de domaine, relais HTTPS.
- **Qui l'administre** au quotidien (comptes, sauvegardes).
- **Git en parallèle** : garder un export régulier vers le dépôt `defa-data` (historique, filet de sécurité), ou non.

## Étape 3 — Mode production

**But** : la suite en service réel, plus en mode essai.

- Connexion **exigée** pour Mes missions et pour le Centre ; trigramme fixé par le compte (plus de changement à la
  volée).
- Vérification par le serveur central (étape 2) : sans lui, le mode production ne protège que ce que les pages
  vérifient.
- Usurpation d'un utilisateur par un admin tracée dans le journal du serveur.
- Retour des données sur la branche de référence (`main`) et sort du jeu de test (voir la dette technique).

## Étape 4 — Le site de la DEFA (en ligne depuis le 5 octobre 2026)

Le site n'a **pas d'API** : on récupère ses données par **copier-coller** de ses pages (`flotte.defa-virtual.fr`).

| Page du site | Dans la suite | État |
|---|---|---|
| Log des vols | Paramètres › Maintenance › Base DEFA › Journal des vols : « Charger / mettre à jour le journal (page copiée ou enregistrée) », puis référence DEFA (pilotes, appareils) mise à jour depuis le journal | fait |
| Flotte virtuelle | Paramètres › Maintenance › Flotte DEFA : « Coller la page Flotte du site… » (mêmes règles que `AircraftDB/update_fleet.py`, sans script), puis « Enregistrer dans le dépôt » | fait (5 octobre) |
| Maintenance, Statistiques | — | rien à reprendre pour l'instant |
| Enregistrer mon vol (connexion requise) | — | l'envoi des CR au site reste manuel : pas d'API, et pas question d'automatiser un formulaire avec les identifiants d'un pilote |

Si le site ouvre un jour une API : reprendre ce tableau (lecture automatique, puis envoi des CR et des affectations
avec les identifiants saisis au premier lancement, jamais écrits dans un fichier).

## En continu

- **Dette technique** ([DETTE_TECHNIQUE.md](DETTE_TECHNIQUE.md)), avec une échéance ferme : **découpage des CR par
  année avant le 31 décembre 2026** (pris en charge par la session « fond », avec les métadonnées par CR qui
  permettront aussi de les fusionner fiche par fiche).
- Corrections et petites demandes au fil de l'eau (session de stabilisation).
- Traductions : audit (`tools/audit_i18n.html`) à chaque ajout de texte.

## Décisions en attente

| Sujet | Question |
|---|---|
| Première synchronisation du vrai `data/` | quand la lancer (82 fichiers, création de la branche distante) |
| `utilisateurs/_index.json` | l'ajouter au `.gitignore` de `data/` ? |
| Fiches des pilotes sans fiche | création au fil de l'eau (recommandé), ou aussi automatique à la première connexion en mode develop ? |
| Release 4.8.0 | quand la publier sur `master` |
| Serveur central | hébergement, adresse, administrateur, export git (étape 2) |
