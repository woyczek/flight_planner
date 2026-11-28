// Meta du module hello (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'hello',
  apps: ['pilot'],
  level: 1,
  files: ['meta.js'], // fichiers que ce module importe, relatifs à module.js (gardés hors ligne dès l'installation) : sa meta seulement
  reads: ['pilot/', 'cache/hello/'],
  writes: [{
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/hello/',
    policy: 'cache'
  }]
};
