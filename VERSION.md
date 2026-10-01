# Notes de version — X-Plane Web Suite (DEFA Virtual)

Une section par version publiée, la plus récente en tête, écrite à chaque release (avec la section du
[CHANGELOG](CHANGELOG.md), qui détaille tout) : **synthèse** (ce qui change pour l'utilisateur), **actions à
effectuer** (ce que chacun doit faire après la mise à jour), **notes** (limites connues, points d'attention, à venir).
Entre deux versions, le pied de page affiche le commit en cours (`v4.5.0+abc1234`).

## 4.5.0 — 1ᵉʳ octobre 2026

### Synthèse

- **CR FIRE / GAAR et HEMS / MEDEVAC sur le Mission Core** : les pages historiques sont remplacées, à la même adresse
  (favoris et liens inchangés), par les pages du socle commun — mêmes champs, mêmes outils que les autres familles
  (import, partage, reporting). Toutes les familles de CR partagent désormais le même socle.
- **Designs** : les styles sont rangés en couches CSS ; les designs l'emportent sans `!important`. Rendu inchangé
  (contrôlé au banc de non-régression sur toutes les pages, dans chaque design et chaque ton).
- **Outils à fond sombre** (Landing, planificateur, planning ODV, reporting des opérations) : une palette commune ;
  la Landing et le reporting des opérations changent de quelques nuances.
- **Choix d'un dossier impossible** : le message dit quoi faire (Brave : réglage à activer ; page en http hors
  localhost ; Firefox, Safari : Chrome ou Edge), en notification. Console plus propre sans dossier `data/`.
- Générateur : durée de l'opération en tailles (XS à XL) ; planificateur : noms d'appareil lisibles.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5) : nouvelles versions des scripts et des feuilles de style.
2. **Anciens registres FIRE / HEMS** (CSV des pages historiques) : ils ne sont plus lus d'office. Les importer une fois
   depuis la page de la famille : **« Importer l'ancien registre FIRE (CSV) »** / **« … HEMS (CSV) »**.
3. **Sous Brave** : pour choisir les dossiers (Paramètres › Sources et dossiers), ouvrir
   `brave://flags/#file-system-access-api`, passer « File System Access API » à **Enabled**, relancer Brave — ou
   utiliser Chrome / Edge.
4. Toujours servir la suite par un serveur local lancé **à la racine du dossier** (`python -m http.server 8000
   --bind 127.0.0.1`) et l'ouvrir par `http://127.0.0.1:8000/…`, pas en `file://`.

### Notes

- Sans le dépôt de données (`data/`), un seul 404 reste en console (`data/data_tree.js`) : il est voulu et sert à
  basculer sur les exemples.
- Toolkit : phase 3 en cours (187 renforts `:not(#imp)` encore utiles, traités au cas par cas). La page « Mes
  missions » (dossiers Cabinet, Aqua, Durci) est en développement sur une branche à part, hors de cette version.

## 4.4.0 — 30 septembre 2026

### Synthèse

- **Nouvelle famille COMBAT** (lettre A) : combat aérien et entraînement chasse — BFM, ACM, DACT, interception.
  Compte rendu et reporting dédiés (engagements, tirs simulés, issue, knock-it-off) ; le générateur sait produire ces
  missions (zones d'entraînement, Rafale, Mirage 2000).
- **Identifiants de mission liés** : changer l'identifiant d'une mission d'opération propose une migration de toute
  l'opération (missions, organisation, participants, cartes, textes) ; refuser rétablit l'identifiant. Plus
  d'écrasement d'une mission par une autre pendant la saisie.
- **Enregistrement dans le dossier des missions** : chaque échec dit pourquoi (dossier non choisi, autorisation,
  écriture impossible, identifiant hors format) ; le studio cartographique affiche toujours son résultat.
- **Designs à matières** : boutons homogènes, feuille de registre commune (carte posée en papier punaisé), barres de
  progression et notifications dans la matière du design, bouton ☰ centré, textures des fenêtres du Mission Core.

### Actions à effectuer

1. **Recharger chaque page ouverte** (Ctrl+F5) : nouvelles versions des scripts et des feuilles de style.
2. **Dossier de travail déplacé hors de Synology** (poste de développement : `E:\DEFA`) : dans
   **Paramètres › Maintenance › Sources et dossiers**, choisir de nouveau le **dossier des données** (`data/`) — les
   dossiers des missions, des CR et SIA en sont déduits. Garder `data/` sur l'appareil (pas de fichiers « en ligne
   seulement ») : sinon les lectures et enregistrements échouent.
3. **Missions reçues avec un identifiant sans lettre de famille** (ex. `BFM-001A`) : les ouvrir dans le générateur et
   accepter la migration proposée à l'enregistrement ; missions déjà rangées sur disque :
   `python tools/migrate_operation_ids.py BFM-001 A-001 --type COMBAT` (essai : `--dry-run`).
4. **Lot de missions du générateur abîmé avant cette version** (mission vidée, organisation sans ses missions) :
   recharger l'opération depuis le registre (fichiers du dossier), pas depuis le navigateur.

### Notes

- Toolkit : phase 2 terminée ; phase 3 (couches CSS, retrait des `!important`) commencée — le rendu peut encore
  légèrement bouger. Plan : [docs/REFACTORING_TOOLKIT.md](docs/REFACTORING_TOOLKIT.md).
- La punaise des cartes posées sur la feuille de Durci reprend celle de Cabinet (une punaise propre à Durci peut être
  fournie : `shared/deco/field/`).
- Durci en ton sombre : pas de carnet sous les tableaux de registre (bloc d'acier), comme Cabinet et Carnet de vol.
