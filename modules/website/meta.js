// Meta du module website (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'website',
  apps: ['pilot'],
  level: 2,
  reads: ['airline/', 'pilot/'],
  writes: [{
    prefix: 'airline/settings.json',
    merge: 'record'
  }, {
    prefix: 'airline/fleet.json',
    merge: 'record'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }],
  files: ['meta.js', 'model.js', '../../frame/lib/clipboard.js', '../../frame/lib/time.js']
};
