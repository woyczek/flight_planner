// Marqueur du dossier de données de la XPlane Web Suite (data/ à la racine de l'application). Sa présence fait lire
// data/ plutôt que les exemples (shared/data_files.js). Ne pas renommer.
// Jeu d'essai installé par tools/jeu_essai.py (contenu : tools/jeu_essai/README.md) ; jeu_essai: true permet de le
// réinstaller (--force) sans jamais écraser d'autres données.
window.DATA_TREE = {
  version: 1,
  repository: '',
  jeu_essai: true,
  layout: {
    config: 'catégories de disponibilité, mode de la suite',
    references: 'flotte du jeu, référence (4 pilotes fictifs), indicatifs, corrections OACI (aircraft_overrides.json)',
    utilisateurs: 'fiches des pilotes ALF, BRV, CHL, DLT',
    disponibilites: 'déclarations par pilote et par semaine (écrites à l’installation)',
    missions: '12 missions (BOXING GLOVES, EYE OF SOLOGNE, S-001, N-001, T-001), affectations',
    local: 'hors git : sauvegarde des données du navigateur'
  }
};
