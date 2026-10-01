(() => {
  'use strict';
  // Composant framework partagé « SortedTable » : tableau dynamique triable, au rendu
  // aligné sur le tableau des atterrissages (LandingPerformanceDashboard) — flèche ↕
  // atténuée sur les colonnes triables, ▲ / ▼ colorés (accent) sur la colonne active,
  // en-têtes collants, survol de ligne, nombres alignés à droite.
  // Utilisé par tous les tableaux des reportings HEMS, GAAR et général.
  //
  // SortedTable.render(container, {
  //   rows, columns: [{ key, label, type: 'number'|'text', format(value,row) → texte,
  //                     html(value,row) → HTML de confiance, sortValue(row) }],
  //   defaultSortKey, defaultDir (1 croissant, -1 décroissant),
  //   onRowClick(row)  → ligne cliquable (hors boutons / liens),
  //   onDelete(row)    → bouton « Supprimer » ; return false pour annuler,
  //   deleteMessage(row), onChange(rows), emptyText
  //   storageKey       → clé des largeurs de colonnes mémorisées (défaut : page + id du conteneur)
  // }) → { setRows(rows), getRows() }

  let styleInjected = false;
  const GRIP_TITLE = ({
    en: 'Drag to widen or narrow the column (double-click: automatic width)',
    de: 'Ziehen, um die Spalte zu verbreitern oder zu verschmälern (Doppelklick: automatische Breite)',
    es: 'Arrastrar para ensanchar o estrechar la columna (doble clic: ancho automático)'
  })[document.documentElement.lang?.slice(0, 2)] || 'Glisser pour élargir ou réduire la colonne (double-clic : largeur automatique)';

  /** Ajoute une fois la feuille de style des tableaux de missions. */
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `.st-wrap{overflow:auto}
.st-table{width:100%;border-collapse:collapse;font-size:12px}
.st-table th,.st-table td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--line,#2b313d);white-space:nowrap}
.st-table th{position:sticky;top:0;z-index:1;color:var(--muted,#9aa3b2);font-weight:600;background:var(--panel,var(--card,#fff));background-image:linear-gradient(color-mix(in srgb,currentColor 7%,transparent),color-mix(in srgb,currentColor 7%,transparent))}
.st-table .st-num{text-align:right}
.st-table th.st-sortable{cursor:pointer;user-select:none}
.st-table th.st-sortable:hover{color:var(--text,var(--ink,inherit))}
.st-arrow{display:inline-block;min-width:12px;margin-left:5px;opacity:.55;font-size:10px;vertical-align:1px}
.st-table th.st-asc .st-arrow,.st-table th.st-desc .st-arrow{opacity:1;color:var(--accent,#6fa8ff)}
.st-table tbody tr:hover td{background:color-mix(in srgb,var(--accent,#6fa8ff) 10%,transparent)}
.st-table tr.st-clickable{cursor:pointer}
.st-table td.st-actions{width:1%;text-align:right}
.st-delete{border:0;border-radius:7px;padding:4px 9px;font:inherit;font-size:11px;font-weight:650;cursor:pointer;background:color-mix(in srgb,#dc2626 16%,transparent);color:#dc2626}
.st-delete:hover{background:#dc2626;color:#fff}
.st-empty{padding:14px;text-align:center!important;color:var(--muted,#6b7280)}
.st-grip{position:absolute;top:0;right:-3px;bottom:0;width:7px;cursor:col-resize;z-index:2;touch-action:none}
.st-grip::after{content:"";position:absolute;top:25%;bottom:25%;left:3px;border-left:1px solid currentColor;opacity:.25}
.st-table th:hover .st-grip::after,.st-grip.st-on::after{opacity:.7}
.st-table.st-fixed{table-layout:fixed}.st-table.st-fixed :is(th,td){overflow:hidden;text-overflow:ellipsis}
@media print{.st-table th{position:static}.st-actions{display:none}.st-grip{display:none}}`;
    document.head.appendChild(style);
  }

  /** Échappe un texte pour HTML. */
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  // Même règle de tri que le tableau des atterrissages : nombres comparés numériquement,
  // texte avec localeCompare numérique insensible à la casse.
  const sortable = v => {
    const raw = String(v ?? '').trim(),
      normalized = raw.replace(/−/g, '-').replace(/\s/g, '').replace(',', '.');
    const m = normalized.match(/^[-+]?\d+(?:\.\d+)?(?:%|\b)/);
    if (m) {
      const n = parseFloat(m[0]);
      if (Number.isFinite(n)) return {
        num: true,
        val: n
      };
    }
    return {
      num: false,
      val: raw.toLocaleLowerCase()
    };
  };
  // Clé technique unique par ligne : le n° de mission est un champ libre et peut
  // être dupliqué dans le registre, il ne peut donc pas servir d'identifiant.
  const rowKeys = new WeakMap();
  let rowSeq = 0;
  /** Identifiant stable d'une ligne (pour la délégation d'événements), attribué au premier rendu. */
  const keyOf = row => {
    if (!rowKeys.has(row)) rowKeys.set(row, 'r' + (++rowSeq));
    return rowKeys.get(row);
  };

  /** Tableau triable dans container (options détaillées en tête de fichier : rows, columns, defaultSortKey / defaultDir, onRowClick, onDelete, deleteMessage, onChange, emptyText) ; tri au clic sur un en-tête, ligne cliquable hors liens et contrôles, suppression confirmée. Retourne { setRows, getRows }. */
  function render(container, opts) {
    injectStyle();
    opts = opts || {};
    let rows = (opts.rows || []).slice();
    const columns = opts.columns || [];
    let sortKey = opts.defaultSortKey ?? columns[0]?.key ?? null;
    let sortDir = opts.defaultDir || 1;
    const hasActions = typeof opts.onDelete === 'function';

    /** Valeur de tri d'une cellule (sortValue de la colonne, sinon valeur brute). */
    const cellValue = (col, row) => col.sortValue ? col.sortValue(row) : row[col.key];

    /** Lignes triées selon la colonne et le sens courants. */
    function sorted() {
      const col = columns.find(c => c.key === sortKey);
      if (!col) return rows;
      return rows.slice().sort((a, b) => {
        const av = sortable(cellValue(col, a)),
          bv = sortable(cellValue(col, b));
        if (col.type === 'number' || (av.num && bv.num)) {
          const x = av.num ? av.val : -Infinity,
            y = bv.num ? bv.val : -Infinity;
          return (x === y ? 0 : x > y ? 1 : -1) * sortDir;
        }
        return String(av.val).localeCompare(String(bv.val), undefined, {
          numeric: true,
          sensitivity: 'base'
        }) * sortDir;
      });
    }
    /** HTML d'une cellule : html() de la colonne (contenu de confiance), sinon format() ou valeur, échappés. */
    const cell = (col, row) => {
      const value = row[col.key];
      if (col.html) return col.html(value, row);
      return esc(col.format ? col.format(value, row) : value);
    };

    /** Redessine l'en-tête (flèche de tri) et les lignes. */
    function paint() {
      const view = sorted();
      const head = `<tr>${columns.map(c => {
        const active = sortKey === c.key;
        const cls = ['st-sortable', c.type === 'number' ? 'st-num' : '', active ? (sortDir === 1 ? 'st-asc' : 'st-desc') : ''].filter(Boolean).join(' ');
        const arrow = active ? (sortDir === 1 ? '▲' : '▼') : '↕';
        return `<th data-key="${esc(c.key)}" class="${cls}" aria-sort="${active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}">${esc(c.label)}<span class="st-arrow">${arrow}</span><span class="st-grip" title="${esc(GRIP_TITLE)}"></span></th>`;
      }).join('')}${hasActions ? '<th class="st-actions"></th>' : ''}</tr>`;
      const span = columns.length + (hasActions ? 1 : 0);
      const body = view.length ? view.map(row => `<tr data-id="${keyOf(row)}"${opts.onRowClick ? ` class="st-clickable" title="${esc(opts.rowTitle || 'Cliquer pour modifier')}"` : ''}>${columns.map(c =>
        `<td${c.type === 'number' ? ' class="st-num"' : ''}>${cell(c, row)}</td>`).join('')}${hasActions ? `<td class="st-actions"><button type="button" class="st-delete">${esc(opts.deleteLabel || 'Supprimer')}</button></td>` : ''}</tr>`).join('') :
        `<tr><td colspan="${span}" class="st-empty">${esc(opts.emptyText || 'Aucune donnée pour la période sélectionnée.')}</td></tr>`;
      container.innerHTML = `<div class="st-wrap"><table class="st-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
      applyWidths();
    }

    // Largeur des colonnes : poignée à droite de chaque en-tête (glisser ; double-clic : largeur automatique).
    // Mémorisée par tableau (opts.storageKey, sinon page + id du conteneur) ; dès qu'une colonne a une largeur
    // choisie, le tableau passe en disposition fixe (les autres colonnes gardent leur largeur naturelle).
    const storageKey = opts.storageKey ?? (container.id ? `sortedTableWidths:${location.pathname}#${container.id}` : null);
    let widths = {};
    try {
      widths = (storageKey && JSON.parse(localStorage.getItem(storageKey) || '{}')) || {};
    } catch {
      widths = {};
    }
    const saveWidths = () => {
      try {
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(widths));
      } catch {
        /* stockage indisponible */ }
    };
    /** Fixe les largeurs : mesure naturelle (disposition automatique), puis largeurs choisies par-dessus. */
    function applyWidths(live) {
      const table = container.querySelector('table');
      if (!table) return;
      const ths = [...table.querySelectorAll('thead th')];
      if (!live) {
        table.classList.remove('st-fixed');
        table.style.width = '';
        ths.forEach(th => {
          th.style.width = '';
        });
      }
      if (!Object.keys(widths).length) return;
      const natural = live ? null : ths.map(th => th.getBoundingClientRect().width);
      let total = 0;
      ths.forEach((th, i) => {
        const w = widths[th.dataset.key] ?? (live ? parseFloat(th.style.width) : natural[i]);
        th.style.width = `${Math.round(w)}px`;
        total += w;
      });
      table.style.width = `${Math.round(total)}px`;
      table.classList.add('st-fixed');
    }
    let resizedAt = 0;
    container.onpointerdown = event => {
      const grip = event.target.closest('.st-grip');
      if (!grip) return;
      event.preventDefault();
      event.stopPropagation();
      const th = grip.closest('th'),
        key = th.dataset.key,
        x0 = event.clientX,
        w0 = th.getBoundingClientRect().width;
      if (!Object.keys(widths).length) {
        widths[key] = w0;
        applyWidths();
      }
      grip.classList.add('st-on');
      try {
        grip.setPointerCapture(event.pointerId);
      } catch {
        /* pointeur déjà relâché */ }
      const move = e => {
        widths[key] = Math.max(32, w0 + e.clientX - x0);
        applyWidths(true);
      };
      const up = () => {
        grip.classList.remove('st-on');
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', up);
        grip.removeEventListener('pointercancel', up);
        resizedAt = Date.now();
        saveWidths();
      };
      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', up);
      grip.addEventListener('pointercancel', up);
    };
    container.ondblclick = event => {
      const grip = event.target.closest('.st-grip');
      if (!grip) return;
      delete widths[grip.closest('th').dataset.key];
      saveWidths();
      applyWidths();
    };

    // Délégation d'événements : un seul jeu d'écouteurs, conservé d'un rendu à l'autre.
    const find = id => rows.find(r => keyOf(r) === id);
    container.onclick = event => {
      const th = event.target.closest('th[data-key]');
      if (th && (event.target.closest('.st-grip') || Date.now() - resizedAt < 300)) return; // fin d'un redimensionnement : pas de tri
      if (th) {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1;
        else {
          sortKey = key;
          sortDir = 1;
        }
        paint();
        return;
      }
      const tr = event.target.closest('tbody tr[data-id]');
      if (!tr) return;
      const row = find(tr.dataset.id);
      if (!row) return;
      if (event.target.closest('.st-delete')) {
        const message = opts.deleteMessage ? opts.deleteMessage(row) : 'Supprimer cette ligne ?';
        if (!window.confirm(message)) return;
        if (opts.onDelete(row) === false) return;
        rows = rows.filter(r => r !== row);
        if (typeof opts.onChange === 'function') opts.onChange(rows.slice());
        paint();
        return;
      }
      // Les liens (ex. trace IVAO/VATSIM) et contrôles restent utilisables normalement.
      if (event.target.closest('a,button,input,select,textarea')) return;
      if (typeof opts.onRowClick === 'function') opts.onRowClick(row);
    };

    paint();
    return {
      /** Remplace les lignes et redessine. */
      setRows(newRows) {
        rows = (newRows || []).slice();
        paint();
      },
      /** Copie des lignes affichées. */
      getRows() {
        return rows.slice();
      }
    };
  }

  window.SortedTable = {
    render
  };
  // Nom historique conservé pour les pages existantes.
  window.MissionTable = window.SortedTable;
})();
