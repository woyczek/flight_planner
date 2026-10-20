(() => {
  'use strict';
  // Composant « DataFiles » : données de la suite hors du dépôt de l'application (version 3).
  // Les données de la compagnie et recalculées (flotte, référence, indicatifs, registres, missions, MORA, axes ENR 5.7…)
  // vivent dans le dossier data/ à la racine de l'application : clone du dépôt de données (privé), ignoré par git.
  // Sans data/ (installation publique), les pages lisent les petits jeux d'exemple d'examples/.
  //
  // Usage dans une page, à la place d'un <script> de données (ordre conservé, chargement synchrone) :
  //   <script src="../../shared/data_files.js?v=…" data-file="references/aircraft_fleet.js"></script>
  // Le premier appel charge data/data_tree.js (marqueur du dépôt de données : window.DATA_TREE) ; son absence
  // (erreur 404 attendue, une seule fois) fait basculer sur examples/.
  // Mode GitHub (appli sans lanceur, shared/github_data.js : réglage githubData:v1) : les mêmes fichiers sont lus dans
  // le dépôt des données en synchrone (GitHubData.readSync) et insérés en <script> en ligne, dans le même ordre.
  // « AircraftDB/… » (base des types, jamais publiée) : à la racine de la suite (lanceur), sinon dans le dépôt.
  // API : DataFiles.root (racine de l'application), DataFiles.base() (« data/ » ou « examples/ »),
  // DataFiles.url(chemin) (adresse d'un fichier de données), DataFiles.available() (vrai si data/ est présent).
  const me = document.currentScript;
  const root = new URL('../', me?.src || location.href).href;
  if (!window.DataFiles) {
    let missing = false,
      gh = false;
    try {
      gh = !!JSON.parse(localStorage.getItem('githubData:v1') || 'null')?.token;
    } catch {
      gh = false;
    }
    const base = () => (window.DATA_TREE && !missing ? 'data/' : 'examples/');
    const clean = path => String(path).replace(/^\/+/, '');
    window.DataFiles = {
      root,
      base,
      available: () => !!window.DATA_TREE && !missing,
      url: path => new URL((/^AircraftDB\//.test(clean(path)) ? '' : base()) + clean(path), root).href,
      /** Adresse dans data/ quel que soit l'état (écriture, liens vers le dépôt de données). */
      dataUrl: path => new URL('data/' + clean(path), root).href,
      missing() {
        missing = true;
      },
      /** Fichier du dépôt GitHub inséré en <script> en ligne (exécuté tout de suite) ; faux s'il est absent. */
      inline(path) {
        const text = window.GitHubData?.readSync?.(clean(path));
        if (text == null) return false;
        const s = document.createElement('script');
        s.textContent = text;
        document.currentScript.after(s);
        return true;
      },
      /** Marqueur du dépôt de données (data/data_tree.js), lu avant tout fichier de données. */
      tree() {
        if (gh) {
          if (!this.inline('data_tree.js')) this.missing();
        } else document.write(`<script src="${new URL('data/data_tree.js', root).href}" onerror="DataFiles.missing()"><\/script>`);
      },
      /** Charge les fichiers demandés, dans l'ordre (appelé pendant l'analyse de la page). */
      load(list) {
        for (const f of list) {
          if (gh) this.inline(f);
          else document.write(`<script src="${window.DataFiles.url(f)}"><\/script>`);
        }
      }
    };
    if (document.readyState === 'loading') {
      if (gh && !window.GitHubData) document.write(`<script src="${new URL('github_data.js?v=0', me?.src || location.href).href}"><\/script>`);
      document.write('<script>DataFiles.tree()<\/script>');
    }
  }
  const files = String(me?.dataset.file || '').split(',').map(s => s.trim()).filter(Boolean);
  if (files.length && document.readyState === 'loading') document.write(`<script>DataFiles.load(${JSON.stringify(files)})<\/script>`);
})();
