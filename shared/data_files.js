(() => {
  'use strict';
  // Composant « DataFiles » : données de la suite hors du dépôt de l'application (version 3).
  // Les données DEFA et recalculées (flotte, référence DEFA, indicatifs, registres, missions, MORA, axes ENR 5.7…)
  // vivent dans le dossier data/ à la racine de l'application : clone du dépôt de données (privé), ignoré par git.
  // Sans data/ (installation publique), les pages lisent les petits jeux d'exemple d'examples/.
  //
  // Usage dans une page, à la place d'un <script> de données (ordre conservé, chargement synchrone) :
  //   <script src="../../shared/data_files.js?v=…" data-file="references/aircraft_fleet.js"></script>
  // Le premier appel charge data/data_tree.js (marqueur du dépôt de données : window.DATA_TREE) ; son absence
  // (erreur 404 attendue, une seule fois) fait basculer sur examples/.
  // API : DataFiles.root (racine de l'application), DataFiles.base() (« data/ » ou « examples/ »),
  // DataFiles.url(chemin) (adresse d'un fichier de données), DataFiles.available() (vrai si data/ est présent).
  const me = document.currentScript;
  const root = new URL('../', me?.src || location.href).href;
  if (!window.DataFiles) {
    let missing = false;
    const base = () => (window.DATA_TREE && !missing ? 'data/' : 'examples/');
    window.DataFiles = {
      root,
      base,
      available: () => !!window.DATA_TREE && !missing,
      url: path => new URL(base() + String(path).replace(/^\/+/, ''), root).href,
      /** Adresse dans data/ quel que soit l'état (écriture, liens vers le dépôt de données). */
      dataUrl: path => new URL('data/' + String(path).replace(/^\/+/, ''), root).href,
      missing() { missing = true; },
      /** Écrit les balises <script> des fichiers demandés (appelé pendant l'analyse de la page). */
      load(list) {
        for (const f of list) document.write(`<script src="${window.DataFiles.url(f)}"><\/script>`);
      }
    };
    // marqueur du dépôt de données, lu avant tout fichier de données
    if (document.readyState === 'loading') document.write(`<script src="${new URL('data/data_tree.js', root).href}" onerror="DataFiles.missing()"><\/script>`);
  }
  const files = String(me?.dataset.file || '').split(',').map(s => s.trim()).filter(Boolean);
  if (files.length && document.readyState === 'loading') document.write(`<script>DataFiles.load(${JSON.stringify(files)})<\/script>`);
})();
