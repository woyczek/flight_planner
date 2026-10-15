/* =====================================================================================================
   Framework — colonnes redimensionnables d'un tableau HTML, cellules tronquées avec infobulle
   -----------------------------------------------------------------------------------------------------
   TableResize.attach(table, options) pose une poignée sur le bord droit de chaque en-tête (sauf le
   dernier) : glisser règle la largeur de la colonne (table-layout: fixed, largeurs en px gardées sur les
   <th>, donc conservées quand le corps est redessiné) ; double-clic sur une poignée : largeurs par
   défaut. Réglage mémorisé dans le navigateur (localStorage, clé key).

   Cellules longues : class="tbl-clip" (+ title = texte entier) → une ligne, points de suspension (260 px au
   plus tant que les colonnes ne sont pas réglées, puis la largeur de la colonne), texte entier en infobulle ;
   double-clic sur la cellule : texte entier sur plusieurs lignes (et retour).

   options = {
     key   : clé de mémorisation (obligatoire),
     min   : largeur minimale d'une colonne (px, défaut 48),
     title : texte d'aide des poignées
   }
   Retour : { reset(), refresh() }. Un second attach sur le même tableau ne fait que refresh().
   ===================================================================================================== */
(() => {
  "use strict";
  const CSS = `table.tbl-resizable{table-layout:fixed}
table.tbl-resizable th{position:relative}
.tbl-split{position:absolute;top:0;right:-6px;bottom:0;width:12px;cursor:col-resize;z-index:3;touch-action:none}
.tbl-split::after{content:"";position:absolute;left:5px;top:4px;bottom:4px;width:2px;border-radius:2px;background:currentColor;opacity:0;transition:opacity .15s}
.tbl-split:hover::after,.tbl-split.dragging::after{opacity:.35}
.tbl-resizing,.tbl-resizing *{cursor:col-resize!important;user-select:none!important}
td.tbl-clip{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}
table.tbl-resizable td.tbl-clip{max-width:none}
td.tbl-clip.tbl-open{white-space:normal;overflow-wrap:anywhere}`;
  let styled = false;
  /** Feuille de style du framework, posée une fois. */
  const style = () => {
    if (styled) return;
    styled = true;
    document.head.append(Object.assign(document.createElement("style"), {
      textContent: CSS
    }));
  };
  /** Largeurs mémorisées sous key (tableau de n nombres > 0) ; null si absentes ou illisibles. */
  const load = (key, n) => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(v) && v.length === n && v.every(x => x > 0) ? v : null;
    } catch {
      return null;
    }
  };
  /** Mémorise les largeurs (sans effet si le stockage est indisponible). */
  const save = (key, v) => {
    try {
      v ? localStorage.setItem(key, JSON.stringify(v)) : localStorage.removeItem(key);
    } catch {}
  };
  const attached = new WeakMap(); // table → { refresh, reset }

  /** Poignées et largeurs d'un tableau ; voir l'en-tête du fichier. */
  function attach(table, {
    key,
    min = 48,
    title = ""
  } = {}) {
    if (!table || !key) return null;
    if (attached.has(table)) {
      attached.get(table).refresh();
      return attached.get(table);
    }
    style();
    const ths = () => [...table.querySelectorAll("thead th")];
    /** Largeurs courantes des en-têtes (px). */
    const widths = () => ths().map(th => th.getBoundingClientRect().width);
    /** Applique des largeurs (px) aux en-têtes ; null : largeurs naturelles. */
    const apply = v => {
      table.classList.toggle("tbl-resizable", !!v);
      ths().forEach((th, i) => th.style.width = v ? `${Math.max(min, v[i])}px` : "");
    };
    /** Poignées posées sur les en-têtes (sauf le dernier) ; refaites si les en-têtes ont changé. */
    const handles = () => {
      ths().forEach((th, i, all) => {
        if (i === all.length - 1 || th.querySelector(".tbl-split")) return;
        const h = document.createElement("span");
        h.className = "tbl-split";
        if (title) h.title = title;
        h.addEventListener("pointerdown", e => {
          e.preventDefault();
          const start = e.clientX,
            w0 = widths();
          if (!table.classList.contains("tbl-resizable")) apply(w0); // premier glisser : largeurs figées en px
          h.classList.add("dragging");
          document.body.classList.add("tbl-resizing");
          h.setPointerCapture(e.pointerId);
          const move = ev => {
            const w = w0.slice();
            w[i] = Math.max(min, w0[i] + ev.clientX - start);
            apply(w);
          };
          const up = () => {
            h.removeEventListener("pointermove", move);
            h.removeEventListener("pointerup", up);
            h.removeEventListener("pointercancel", up);
            h.classList.remove("dragging");
            document.body.classList.remove("tbl-resizing");
            save(key, widths());
          };
          h.addEventListener("pointermove", move);
          h.addEventListener("pointerup", up);
          h.addEventListener("pointercancel", up);
        });
        h.addEventListener("dblclick", e => {
          e.preventDefault();
          api.reset();
        });
        th.append(h);
      });
    };
    // cellule tronquée : double-clic → texte entier sur plusieurs lignes (et retour)
    table.addEventListener("dblclick", e => {
      const td = e.target.closest("td.tbl-clip");
      if (td) td.classList.toggle("tbl-open");
    });
    const api = {
      /** Largeurs mémorisées reposées, poignées refaites (après un nouveau rendu des en-têtes). */
      refresh() {
        const v = load(key, ths().length);
        apply(v);
        handles();
      },
      /** Largeurs par défaut (naturelles), mémorisation effacée. */
      reset() {
        save(key, null);
        apply(null);
      }
    };
    attached.set(table, api);
    api.refresh();
    return api;
  }
  window.TableResize = {
    attach
  };
})();
