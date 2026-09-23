(() => {
  'use strict';
  // Composant framework partagé "MissionTable" : rendu d'un tableau de missions
  // avec tri par colonne (clic sur l'en-tête), édition en ligne et suppression.
  // Utilisé par les reportings HEMS et GAAR pour partager design + fonctionnalités.
  // Les modifications restent locales à la page (pas de backend) : le composant
  // notifie onChange(rows) pour laisser la page hôte ré-agréger les statistiques
  // et, si elle le propose, exporter un CSV mis à jour.

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return; styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `.mt-table{border-collapse:collapse;width:100%;font-size:12px}
.mt-table th,.mt-table td{border-bottom:1px solid var(--line,#d1d5db);padding:7px;text-align:left;white-space:nowrap}
.mt-table th{cursor:pointer;user-select:none;color:var(--muted,#6b7280);background:var(--soft,#f3eaea)}
.mt-table th:hover{color:inherit}
.mt-table tbody tr:hover{background:color-mix(in srgb, var(--accent,#773131) 6%, transparent)}
.mt-table input{width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid var(--line,#d1d5db);border-radius:5px;font:inherit}
.mt-actions{display:flex;gap:6px;white-space:nowrap}
.mt-actions button{border:0;border-radius:7px;padding:5px 9px;font-size:11px;font-weight:650;cursor:pointer}
.mt-edit,.mt-save{background:var(--accent,#773131);color:#fff}
.mt-cancel,.mt-delete{background:#e5e7eb;color:#111}
.mt-delete{background:#fde2e2;color:#7f1d1d}
.mt-editing td{background:color-mix(in srgb, var(--accent,#773131) 8%, transparent)}
.mt-empty{padding:14px;text-align:center;color:var(--muted,#6b7280)}`;
    document.head.appendChild(style);
  }

  const esc = v => String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const num = v => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
  // Clé technique unique par ligne : le n° de mission est un champ libre et peut
  // être dupliqué dans le registre, il ne peut donc pas servir d'identifiant.
  const rowKeys = new WeakMap(); let rowSeq = 0;
  const keyOf = row => { if (!rowKeys.has(row)) rowKeys.set(row, 'r' + (++rowSeq)); return rowKeys.get(row); };

  function render(container, opts) {
    injectStyle();
    opts = opts || {};
    let rows = (opts.rows || []).slice();
    const columns = opts.columns || [];
    const idKey = opts.idKey || 'missionId';
    let sortKey = opts.defaultSortKey || null;
    let sortDir = -1; // le plus récent / le plus grand en premier par défaut
    let editingId = null;

    function sorted() {
      if (!sortKey) return rows;
      const col = columns.find(c => c.key === sortKey);
      const copy = rows.slice();
      copy.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (col && col.type === 'number') {
          av = num(av); bv = num(bv);
          if (Number.isNaN(av)) av = -Infinity; if (Number.isNaN(bv)) bv = -Infinity;
        } else { av = String(av ?? ''); bv = String(bv ?? ''); }
        if (av === bv) return 0;
        return (av > bv ? 1 : -1) * sortDir;
      });
      return copy;
    }

    function paint() {
      const view = sorted();
      const head = `<tr>${columns.map(c => {
        const active = sortKey === c.key;
        const arrow = active ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
        return `<th data-key="${esc(c.key)}">${esc(c.label)}${arrow}</th>`;
      }).join('')}<th>Actions</th></tr>`;

      const body = view.length ? view.map(row => {
        const id = keyOf(row);
        if (editingId != null && id === editingId) {
          return `<tr data-id="${esc(id)}" class="mt-editing">${columns.map(c =>
            `<td><input data-field="${esc(c.key)}" value="${esc(row[c.key])}"></td>`
          ).join('')}<td class="mt-actions"><button type="button" class="mt-save">Enregistrer</button><button type="button" class="mt-cancel">Annuler</button></td></tr>`;
        }
        return `<tr data-id="${esc(id)}">${columns.map(c =>
          `<td>${esc(c.format ? c.format(row[c.key], row) : row[c.key])}</td>`
        ).join('')}<td class="mt-actions"><button type="button" class="mt-edit">Modifier</button><button type="button" class="mt-delete">Supprimer</button></td></tr>`;
      }).join('') : `<tr><td colspan="${columns.length + 1}" class="mt-empty">Aucune mission pour la période sélectionnée.</td></tr>`;

      container.innerHTML = `<table class="mt-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;

      container.querySelectorAll('th[data-key]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
          paint();
        });
      });
      container.querySelectorAll('.mt-edit').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        // Si la page hôte fournit onEdit (ouverture du générateur de CR pré-rempli),
        // on lui délègue la modification ; sinon édition en ligne.
        if (typeof opts.onEdit === 'function') { const target = rows.find(r => keyOf(r) === id); if (target) opts.onEdit(target); return; }
        editingId = id; paint();
      }));
      container.querySelectorAll('.mt-cancel').forEach(btn => btn.addEventListener('click', () => {
        editingId = null; paint();
      }));
      container.querySelectorAll('.mt-delete').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        const target = rows.find(r => keyOf(r) === id);
        const label = target ? target[idKey] : id;
        if (!window.confirm(`Supprimer la mission ${label} ?\nLa suppression s'applique à la copie locale du registre (navigateur) ; pensez à exporter le registre modifié.`)) return;
        rows = rows.filter(r => keyOf(r) !== id);
        if (typeof opts.onChange === 'function') opts.onChange(rows.slice());
        paint();
      }));
      container.querySelectorAll('.mt-save').forEach(btn => btn.addEventListener('click', () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const target = rows.find(r => keyOf(r) === id);
        if (target) tr.querySelectorAll('input[data-field]').forEach(input => { target[input.dataset.field] = input.value; });
        editingId = null;
        if (typeof opts.onChange === 'function') opts.onChange(rows.slice());
        paint();
      }));
    }

    paint();
    return {
      setRows(newRows) { rows = (newRows || []).slice(); editingId = null; paint(); },
      getRows() { return rows.slice(); }
    };
  }

  window.MissionTable = { render };
})();
