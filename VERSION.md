# Notes de version — X-Plane Web Suite (DEFA Virtual)

Une section par version publiée, la plus récente en tête, écrite à chaque release (avec la section du
[CHANGELOG](CHANGELOG.md), qui détaille tout) : **synthèse** (ce qui change pour l'utilisateur), **actions à
effectuer** (ce que chacun doit faire après la mise à jour), **notes** (limites connues, points d'attention, à venir).
Entre deux versions, le pied de page affiche le commit en cours (`v4.4.0+abc1234`).

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
