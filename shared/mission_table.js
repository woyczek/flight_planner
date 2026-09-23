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
  // }) → { setRows(rows), getRows() }

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return; styleInjected = true;
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
@media print{.st-table th{position:static}.st-actions{display:none}}`;
    document.head.appendChild(style);
  }

  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Même règle de tri que le tableau des atterrissages : nombres comparés numériquement,
  // texte avec localeCompare numérique insensible à la casse.
  const sortable = v => {
    const raw = String(v ?? '').trim(), normalized = raw.replace(/−/g, '-').replace(/\s/g, '').replace(',', '.');
    const m = normalized.match(/^[-+]?\d+(?:\.\d+)?(?:%|\b)/);
    if (m) { const n = parseFloat(m[0]); if (Number.isFinite(n)) return { num: true, val: n }; }
    return { num: false, val: raw.toLocaleLowerCase() };
  };
  // Clé technique unique par ligne : le n° de mission est un champ libre et peut
  // être dupliqué dans le registre, il ne peut donc pas servir d'identifiant.
  const rowKeys = new WeakMap(); let rowSeq = 0;
  const keyOf = row => { if (!rowKeys.has(row)) rowKeys.set(row, 'r' + (++rowSeq)); return rowKeys.get(row); };

  function render(container, opts) {
    injectStyle();
    opts = opts || {};
    let rows = (opts.rows || []).slice();
    const columns = opts.columns || [];
    let sortKey = opts.defaultSortKey ?? columns[0]?.key ?? null;
    let sortDir = opts.defaultDir || 1;
    const hasActions = typeof opts.onDelete === 'function';

    const cellValue = (col, row) => col.sortValue ? col.sortValue(row) : row[col.key];
    function sorted() {
      const col = columns.find(c => c.key === sortKey);
      if (!col) return rows;
      return rows.slice().sort((a, b) => {
        const av = sortable(cellValue(col, a)), bv = sortable(cellValue(col, b));
        if (col.type === 'number' || (av.num && bv.num)) {
          const x = av.num ? av.val : -Infinity, y = bv.num ? bv.val : -Infinity;
          return (x === y ? 0 : x > y ? 1 : -1) * sortDir;
        }
        return String(av.val).localeCompare(String(bv.val), undefined, { numeric: true, sensitivity: 'base' }) * sortDir;
      });
    }
    const cell = (col, row) => {
      const value = row[col.key];
      if (col.html) return col.html(value, row);
      return esc(col.format ? col.format(value, row) : value);
    };

    function paint() {
      const view = sorted();
      const head = `<tr>${columns.map(c => {
        const active = sortKey === c.key;
        const cls = ['st-sortable', c.type === 'number' ? 'st-num' : '', active ? (sortDir === 1 ? 'st-asc' : 'st-desc') : ''].filter(Boolean).join(' ');
        const arrow = active ? (sortDir === 1 ? '▲' : '▼') : '↕';
        return `<th data-key="${esc(c.key)}" class="${cls}" aria-sort="${active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}">${esc(c.label)}<span class="st-arrow">${arrow}</span></th>`;
      }).join('')}${hasActions ? '<th class="st-actions"></th>' : ''}</tr>`;
      const span = columns.length + (hasActions ? 1 : 0);
      const body = view.length ? view.map(row => `<tr data-id="${keyOf(row)}"${opts.onRowClick ? ` class="st-clickable" title="${esc(opts.rowTitle || 'Cliquer pour modifier')}"` : ''}>${columns.map(c =>
        `<td${c.type === 'number' ? ' class="st-num"' : ''}>${cell(c, row)}</td>`).join('')}${hasActions ? `<td class="st-actions"><button type="button" class="st-delete">${esc(opts.deleteLabel || 'Supprimer')}</button></td>` : ''}</tr>`).join('')
        : `<tr><td colspan="${span}" class="st-empty">${esc(opts.emptyText || 'Aucune donnée pour la période sélectionnée.')}</td></tr>`;
      container.innerHTML = `<div class="st-wrap"><table class="st-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }

    // Délégation d'événements : un seul jeu d'écouteurs, conservé d'un rendu à l'autre.
    const find = id => rows.find(r => keyOf(r) === id);
    container.onclick = event => {
      const th = event.target.closest('th[data-key]');
      if (th) {
        const key = th.dataset.key;
        if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
        paint(); return;
      }
      const tr = event.target.closest('tbody tr[data-id]'); if (!tr) return;
      const row = find(tr.dataset.id); if (!row) return;
      if (event.target.closest('.st-delete')) {
        const message = opts.deleteMessage ? opts.deleteMessage(row) : 'Supprimer cette ligne ?';
        if (!window.confirm(message)) return;
        if (opts.onDelete(row) === false) return;
        rows = rows.filter(r => r !== row);
        if (typeof opts.onChange === 'function') opts.onChange(rows.slice());
        paint(); return;
      }
      // Les liens (ex. trace IVAO/VATSIM) et contrôles restent utilisables normalement.
      if (event.target.closest('a,button,input,select,textarea')) return;
      if (typeof opts.onRowClick === 'function') opts.onRowClick(row);
    };

    paint();
    return {
      setRows(newRows) { rows = (newRows || []).slice(); paint(); },
      getRows() { return rows.slice(); }
    };
  }

  window.SortedTable = { render };
  // Nom historique conservé pour les pages existantes.
  window.MissionTable = window.SortedTable;
})();
