(() => {
  'use strict';
  // Mission Report Core — rendu déclaratif du formulaire (blocs, champs, collections
  // dynamiques, capacités) et liaison bidirectionnelle avec le modèle de mission.
  // Les libellés sont écrits en français (langue source) et leurs lignes [fr,en,de,es]
  // sont collectées pour le système de traduction commun (RepositoryContentI18n).
  // Options de champ : upper (majuscules), list (id de datalist), alias (attribut name
  // pour les modules partagés : suivi réseau, profil pilote), rerender (re-rendu de la
  // collection), byCategory (groupes d'équipements selon la catégorie de l'appareil).
  const M = window.MissionModel, V = window.MissionVocab;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function create(form, { family, getMission, onChange, onCommit }) {
    const rows = new Map(); // fr → [fr,en,de,es]
    const txt = label => { if (!label) return ''; if (Array.isArray(label)) { rows.set(label[0], label); return label[0]; } return String(label); };
    const conditional = [];
    const blocks = [];
    const fieldsByPath = new Map(); // chemin absolu → définition (pour upper / rerender)
    let ctx = null;

    const optionsFor = field => {
      if (field.options) return field.options;
      if (field.familySeries) return family.series || [];
      if (field.crewRoles) return family.crewRoles ? V.crewRoles.filter(o => family.crewRoles.includes(o.value)) : V.crewRoles;
      if (field.eventTypes) return V.eventTypes.concat(family.events || []);
      return [];
    };
    const attrs = (field, path, withAlias) => `data-path="${esc(path)}"${withAlias && field.alias ? ` name="${esc(field.alias)}"` : ''}${field.list ? ` list="${esc(field.list)}"` : ''}${field.upper ? ' data-upper="1" autocapitalize="characters"' : ''}`;
    const selectHtml = (field, path, value, withAlias) => {
      const opts = optionsFor(field), known = opts.some(o => o.value === value);
      return `<select ${attrs(field, path, withAlias)}>${field.blank || field.familySeries ? '<option value="">—</option>' : ''}${opts.map(o =>
        `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(txt(o.label))}</option>`).join('')}${value && !known ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : ''}</select>`;
    };
    const capabilitiesHtml = (field, path, selected, item) => {
      const allowed = family.capabilities ? new Set(family.capabilities) : null;
      const category = item?.category || '';
      return `<div class="mc-capabilities${item ? ' compact' : ''}" data-path="${esc(path)}" data-kind="checkgroup">${field.groups.map(group => {
        // Équipements d'un appareil : seuls les groupes compatibles avec sa catégorie.
        if (field.byCategory && category && ((group.id === 'rotary' && category !== 'rotary') || (group.id === 'fixed' && category === 'rotary'))) return '';
        const items = group.items.filter(it => !allowed || allowed.has(it.value));
        if (!items.length) return '';
        return `<fieldset class="mc-capgroup" data-group="${esc(group.id)}"><legend>${esc(txt(group.title))}</legend>${items.map(it =>
          `<label class="mc-chip"><input type="checkbox" value="${esc(it.value)}"${selected.includes(it.value) ? ' checked' : ''}><span>${esc(txt(it.label))}</span></label>`).join('')}</fieldset>`;
      }).join('')}</div>`;
    };
    const controlHtml = (field, path, withAlias, item) => {
      const value = M.get(getMission(), path);
      const ph = field.placeholder ? ` placeholder="${esc(txt(field.placeholder))}"` : '';
      switch (field.type) {
        case 'select': return selectHtml(field, path, value ?? '', withAlias);
        case 'textarea': return `<textarea ${attrs(field, path, withAlias)}${ph}>${esc(value)}</textarea>`;
        case 'number': return `<input type="number" step="any" ${attrs(field, path, withAlias)} value="${esc(value ?? '')}"${ph}>`;
        case 'date': case 'time': return `<input type="${field.type}" ${attrs(field, path, withAlias)} value="${esc(value)}">`;
        case 'checkgroup': return capabilitiesHtml(field, path, value || [], item);
        default: return `<input ${attrs(field, path, withAlias)} value="${esc(value)}"${ph}${field.familySubtypes ? ' list="mc-subtypes"' : ''}>`;
      }
    };
    const fieldHtml = (field, path, withAlias = true, item = null) => {
      fieldsByPath.set(path, field);
      return `<div class="mc-field${field.full ? ' full' : ''}" data-field="${esc(path)}">${field.label ? `<label>${esc(txt(field.label))}</label>` : ''}${controlHtml(field, path, withAlias, item)}<span class="mc-hint small" hidden></span></div>`;
    };

    // ---- collections dynamiques (appareils, équipage, événements, étapes…)
    const collections = new Map(); // chemin → { block, host }
    function renderCollection(block, host) {
      const spec = block.collection, list = M.get(getMission(), spec.path) || [];
      while (list.length < (spec.min || 0)) list.push(spec.empty());
      M.set(getMission(), spec.path, list);
      collections.set(spec.path, { block, host });
      // L'alias (name) ne porte que sur le premier élément (appareil principal…).
      host.innerHTML = list.map((item, i) => `<div class="mc-item" data-index="${i}"><div class="mc-item-head"><b>${esc(txt(spec.item))} ${i + 1}</b>${list.length > (spec.min || 0) ? `<button type="button" class="mc-remove" data-remove="${i}" title="${esc(txt(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">×</button>` : ''}</div><div class="mc-grid${spec.compact ? ' compact' : ''}">${spec.fields.map(field => fieldHtml(field, `${spec.path}.${i}.${field.path}`, i === 0, item)).join('')}</div></div>`).join('')
        + `<button type="button" class="secondary mc-add">${esc(txt(spec.add))}</button>`;
      host.querySelector('.mc-add').onclick = () => { list.push(spec.empty()); renderCollection(block, host); refresh(); onChange(spec.path); };
      host.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
        list.splice(Number(button.dataset.remove), 1); renderCollection(block, host); refresh(); onChange(spec.path);
      });
      registerConditions(block, host);
    }
    const rerenderCollectionOf = path => {
      const entry = [...collections.entries()].find(([prefix]) => path.startsWith(prefix + '.'));
      if (entry) { renderCollection(entry[1].block, entry[1].host); refresh(); }
    };

    function registerConditions(block, root) {
      const fields = block.collection ? block.collection.fields : block.fields;
      fields.filter(field => field.when).forEach(field => root.querySelectorAll(`[data-field$=".${field.path}"],[data-field="${field.path}"]`).forEach(el => conditional.push({ el, when: field.when })));
      fields.filter(field => field.type === 'checkgroup' && !field.byCategory).forEach(field => field.groups.forEach(group => {
        const el = root.querySelector(`[data-group="${group.id}"]`); if (el && group.when) conditional.push({ el, when: group.when });
      }));
    }

    function render(blockList) {
      conditional.length = 0; blocks.length = 0; collections.clear(); fieldsByPath.clear();
      const controls = form.querySelector('.controls');
      form.querySelectorAll('section.mc-block').forEach(section => section.remove());
      blockList.forEach(block => {
        const section = document.createElement('section');
        section.className = 'mc-block'; section.id = `mc-${block.id}`; section.dataset.blockId = `mc-${block.id}`;
        section.innerHTML = `<h2>${esc(txt(block.title))}</h2>` + (block.collection ? '<div class="mc-collection"></div>' : `<div class="mc-grid">${block.fields.map(field => fieldHtml(field, field.path)).join('')}</div>`);
        form.insertBefore(section, controls || null);
        if (block.collection) renderCollection(block, section.querySelector('.mc-collection'));
        else registerConditions(block, section);
        blocks.push({ block, section });
      });
      ['mc-subtypes', 'mc-known-registrations', 'mc-known-callsigns', 'mc-aircraft-types'].forEach(id => {
        if (!form.querySelector(`#${id}`)) { const list = document.createElement('datalist'); list.id = id; form.append(list); }
      });
      refresh();
    }

    // ---- contexte d'affichage (§23) : famille, série, capacités, catégories d'appareil
    const context = () => M.context(getMission(), family);
    function refresh() {
      ctx = context();
      blocks.forEach(({ block, section }) => { section.hidden = block.when ? !block.when(ctx) : false; });
      conditional.forEach(({ el, when }) => { el.hidden = !when(ctx); });
      const series = (family.series || []).find(s => s.value === ctx.series);
      const list = form.querySelector('#mc-subtypes');
      if (list) list.innerHTML = (series?.subtypes || []).map(s => `<option value="${esc(txt(s))}">`).join('');
      return ctx;
    }
    // Met à jour les valeurs affichées depuis le modèle (après un remplissage automatique).
    function sync(prefix = '') {
      form.querySelectorAll('[data-path]').forEach(el => {
        const path = el.dataset.path; if (prefix && !path.startsWith(prefix)) return;
        if (el.dataset.kind === 'checkgroup') { const values = M.get(getMission(), path) || []; el.querySelectorAll('input').forEach(i => { i.checked = values.includes(i.value); }); return; }
        const value = M.get(getMission(), path);
        if (el.tagName === 'SELECT' && value && ![...el.options].some(o => o.value === value)) { const o = document.createElement('option'); o.value = value; o.textContent = value; el.append(o); }
        if (document.activeElement !== el) el.value = value ?? '';
      });
    }
    const hint = (path, text) => { const el = form.querySelector(`[data-field="${CSS.escape(path)}"] .mc-hint`); if (el) { el.textContent = text || ''; el.hidden = !text; } };

    // ---- saisie → modèle
    const coerce = (el, raw) => el.type === 'number' ? (raw === '' ? null : Number(raw)) : raw;
    function handle(event) {
      const target = event.target;
      const group = target.closest('[data-kind="checkgroup"]');
      if (group) {
        M.set(getMission(), group.dataset.path, [...group.querySelectorAll('input:checked')].map(input => input.value));
        refresh(); onChange(group.dataset.path); return;
      }
      const path = target.dataset?.path; if (!path) return;
      // Majuscules (indicatifs, immatriculations, terrains) en conservant la position du curseur.
      if (target.dataset.upper && target.value !== target.value.toUpperCase()) {
        const start = target.selectionStart, end = target.selectionEnd;
        target.value = target.value.toUpperCase();
        try { target.setSelectionRange(start, end); } catch { /* champ sans sélection */ }
      }
      M.set(getMission(), path, coerce(target, target.value));
      if (event.type === 'change') {
        if (fieldsByPath.get(path)?.rerender) rerenderCollectionOf(path);
        onCommit?.(path, target.value);
      }
      refresh(); onChange(path);
    }
    form.addEventListener('input', handle);
    form.addEventListener('change', handle);

    return { render, refresh, sync, hint, rerenderCollectionOf, context: () => ctx, i18nRows: () => [...rows.values()], txt };
  }

  window.MissionForm = { create };
})();
