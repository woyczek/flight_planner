/* =====================================================================================================
   Framework — colonnes redimensionnables d'une grille CSS
   -----------------------------------------------------------------------------------------------------
   ColumnResize.attach(grille, options) pose une poignée verticale entre chaque paire de colonnes d'une
   grille (display:grid). Glisser une poignée répartit la largeur entre les deux colonnes voisines ;
   double-clic : largeurs par défaut. Les largeurs sont gardées en fractions (fr) : la grille reste
   fluide quand la fenêtre change de taille. Réglage mémorisé dans le navigateur (localStorage, clé key).

   options = {
     key       : clé de mémorisation (obligatoire),
     defaults  : fractions par défaut, une par colonne (ex. [1, .62, .17]),
     min       : largeur minimale d'une colonne (px, défaut 140),
     media     : requête média où la grille a ses colonnes (ailleurs : poignées masquées, style retiré),
     until     : fonction → élément dont le bas limite la hauteur des poignées (défaut : toute la grille),
     title     : texte d'aide des poignées
   }
   Retour : { reset(), refresh() }. La grille reçoit position:relative si elle est statique.
   ===================================================================================================== */
(() => {
  "use strict";
  const CSS = `.col-split{position:absolute;top:0;width:12px;margin-left:-6px;cursor:col-resize;z-index:6;touch-action:none}
.col-split::after{content:"";position:absolute;left:5px;top:0;bottom:0;width:2px;border-radius:2px;background:currentColor;opacity:0;transition:opacity .15s}
.col-split:hover::after,.col-split.dragging::after{opacity:.35}
.col-resizing,.col-resizing *{cursor:col-resize!important;user-select:none!important}`;

  /** Fractions mémorisées sous key (tableau de n nombres > 0) ; null si absentes ou illisibles. */
  const load = (key, n) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(v) && v.length === n && v.every(x => x > 0) ? v : null;
    } catch {
      return null;
    }
  };
  /** Mémorise les fractions (sans effet si le stockage est indisponible). */
  const save = (key, v) => {
    try {
      v ? localStorage.setItem(key, JSON.stringify(v)) : localStorage.removeItem(key);
    } catch {}
  };

  function attach(grid, {
    key,
    defaults,
    min = 140,
    media = "all",
    until = null,
    title = ""
  }) {
    if (!grid || !key || !defaults?.length) return null;
    if (!document.getElementById("colResizeCss")) {
      const s = document.createElement("style");
      s.id = "colResizeCss";
      s.textContent = CSS;
      document.head.append(s);
    }
    if (getComputedStyle(grid).position === "static") grid.style.position = "relative";
    const n = defaults.length,
      mq = matchMedia(media);
    let fr = load(key, n) || defaults.slice();
    const splits = Array.from({
      length: n - 1
    }, (_, i) => {
      const d = document.createElement("div");
      d.className = "col-split";
      d.title = title;
      d.dataset.i = i;
      grid.append(d);
      return d;
    });

    /** Applique les fractions à la grille (seulement si la requête média est vraie). */
    const apply = () => {
      grid.style.gridTemplateColumns = mq.matches ? fr.map(x => `minmax(0,${x.toFixed(4)}fr)`).join(" ") : "";
      place();
    };
    /** Largeurs (px) des colonnes rendues, écart entre colonnes et marge gauche de la grille. */
    const geometry = () => {
      const cs = getComputedStyle(grid);
      return {
        cols: cs.gridTemplateColumns.split(" ").map(parseFloat),
        gap: parseFloat(cs.columnGap) || 0,
        pad: parseFloat(cs.paddingLeft) || 0
      };
    };
    /** Place les poignées au milieu des écarts entre colonnes, hauteur jusqu'au bas de until(). */
    function place() {
      const on = mq.matches,
        g = geometry();
      if (g.cols.length !== n) {
        splits.forEach(s => s.hidden = true);
        return;
      }
      const top = grid.getBoundingClientRect().top,
        lim = until?.(),
        h = lim ? lim.getBoundingClientRect().bottom - top : grid.clientHeight;
      let x = g.pad;
      splits.forEach((s, i) => {
        x += g.cols[i];
        s.hidden = !on;
        s.style.left = `${x + g.gap / 2}px`;
        s.style.height = `${Math.max(40, h)}px`;
        x += g.gap;
      });
    }
    // glisser : les deux colonnes voisines se partagent leur largeur totale
    splits.forEach(s => {
      let start = null;
      s.addEventListener("pointerdown", e => {
        const g = geometry(),
          i = +s.dataset.i;
        start = {
          x: e.clientX,
          a: g.cols[i],
          b: g.cols[i + 1],
          cols: g.cols,
          i
        };
        s.setPointerCapture(e.pointerId);
        s.classList.add("dragging");
        document.documentElement.classList.add("col-resizing");
        e.preventDefault();
      });
      s.addEventListener("pointermove", e => {
        if (!start) return;
        const {
          a,
          b,
          cols,
          i
        } = start, total = a + b, na = Math.min(total - min, Math.max(min, a + e.clientX - start.x)), px = cols.slice();
        px[i] = na;
        px[i + 1] = total - na;
        const sum = px.reduce((u, v) => u + v, 0);
        fr = px.map(v => v / sum * n);
        apply();
      });
      const end = () => {
        if (!start) return;
        start = null;
        s.classList.remove("dragging");
        document.documentElement.classList.remove("col-resizing");
        save(key, fr);
        dispatchEvent(new Event("resize"));
      };
      s.addEventListener("pointerup", end);
      s.addEventListener("pointercancel", end);
      s.addEventListener("dblclick", () => api.reset());
    });
    const api = {
      /** Largeurs par défaut (et oubli du réglage mémorisé). */
      reset() {
        fr = defaults.slice();
        save(key, null);
        apply();
        dispatchEvent(new Event("resize"));
      },
      /** Replace les poignées (après un changement de contenu). */
      refresh: place
    };
    mq.addEventListener?.("change", apply);
    new ResizeObserver(() => place()).observe(grid);
    addEventListener("resize", place);
    apply();
    return api;
  }
  window.ColumnResize = {
    attach
  };
})();
