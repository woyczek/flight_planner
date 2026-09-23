(() => {
  'use strict';
  // Mission Report Core — rendu déclaratif du formulaire (blocs, champs, collections
  // dynamiques, capacités) et liaison bidirectionnelle avec le modèle de mission.
  // Les libellés sont écrits en français (langue source) et leurs lignes [fr,en,de,es]
  // sont collectées pour le système de traduction commun (RepositoryContentI18n).
  const V = window.MissionVocab, M = window.MissionModel;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function create(form, { family, getMission, onChange }) {
    const rows = new Map(); // fr → [fr,en,de,es]
    const txt = label => { if (!label) return ''; if (Array.isArray(label)) { rows.set(label[0], label); return label[0]; } return String(label); };
    const conditional = []; // { el, when }
    const blocks = [];
    let ctx = null;

    // ---- options des listes
    const optionsFor = field => {
      if (field.options) return field.options;
      if (field.familySeries) return family.series || [];
      if (field.crewRoles) return family.crewRoles ? V.crewRoles.filter(o => family.crewRoles.includes(o.value)) : V.crewRoles;
      if (field.eventTypes) return V.eventTypes.concat(family.events || []);
      return [];
    };
    const selectHtml = (field, path, value) => {
      const opts = optionsFor(field), known = opts.some(o => o.value === value);
      return `<select data-path="${esc(path)}">${field.blank || field.familySeries ? '<option value="">—</option>' : ''}${opts.map(o =>
        `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(txt(o.label))}</option>`).join('')}${value && !known ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : ''}</select>`;
    };
    const controlHtml = (field, path) => {
      const value = M.get(getMission(), path);
      const ph = field.placeholder ? ` placeholder="${esc(txt(field.placeholder))}"` : '';
      switch (field.type) {
        case 'select': return selectHtml(field, path, value ?? '');
        case 'textarea': return `<textarea data-path="${esc(path)}"${ph}>${esc(value)}</textarea>`;
        case 'number': return `<input type="number" step="any" data-path="${esc(path)}" value="${esc(value ?? '')}"${ph}>`;
        case 'date': case 'time': return `<input type="${field.type}" data-path="${esc(path)}" value="${esc(value)}">`;
        case 'checkgroup': return capabilitiesHtml(field, path, value || []);
        default: return `<input data-path="${esc(path)}" value="${esc(value)}"${ph}${field.familySubtypes ? ' list="mc-subtypes"' : ''}>`;
      }
    };
    const capabilitiesHtml = (field, path, selected) => {
      const allowed = family.capabilities ? new Set(family.capabilities) : null;
      return `<div class="mc-capabilities" data-path="${esc(path)}" data-kind="checkgroup">${field.groups.map(group => {
        const items = group.items.filter(item => !allowed || allowed.has(item.value));
        if (!items.length) return '';
        return `<fieldset class="mc-capgroup" data-group="${esc(group.id)}"><legend>${esc(txt(group.title))}</legend>${items.map(item =>
          `<label class="mc-chip"><input type="checkbox" value="${esc(item.value)}"${selected.includes(item.value) ? ' checked' : ''}><span>${esc(txt(item.label))}</span></label>`).join('')}</fieldset>`;
      }).join('')}</div>`;
    };
    const fieldHtml = (field, path) => `<div class="mc-field${field.full ? ' full' : ''}" data-field="${esc(path)}">${field.label ? `<label>${esc(txt(field.label))}</label>` : ''}${controlHtml(field, path)}</div>`;

    // ---- collections dynamiques (appareils, équipage, événements, étapes…)
    function renderCollection(block, host) {
      const spec = block.collection, list = M.get(getMission(), spec.path) || [];
      while (list.length < (spec.min || 0)) list.push(spec.empty());
      M.set(getMission(), spec.path, list);
      host.innerHTML = list.map((_, i) => `<div class="mc-item" data-index="${i}"><div class="mc-item-head"><b>${esc(txt(spec.item))} ${i + 1}</b>${list.length > (spec.min || 0) ? `<button type="button" class="mc-remove" data-remove="${i}" title="${esc(txt(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">×</button>` : ''}</div><div class="mc-grid${spec.compact ? ' compact' : ''}">${spec.fields.map(field => fieldHtml(field, `${spec.path}.${i}.${field.path}`)).join('')}</div></div>`).join('')
        + `<button type="button" class="secondary mc-add">${esc(txt(spec.add))}</button>`;
      host.querySelector('.mc-add').onclick = () => { list.push(spec.empty()); renderCollection(block, host); onChange(spec.path); };
      host.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
        list.splice(Number(button.dataset.remove), 1); renderCollection(block, host); onChange(spec.path);
      });
      registerConditions(block, host);
    }

    function registerConditions(block, root) {
      const fields = block.collection ? block.collection.fields : block.fields;
      fields.filter(field => field.when).forEach(field => root.querySelectorAll(`[data-field$=".${field.path}"],[data-field="${field.path}"]`).forEach(el => conditional.push({ el, when: field.when })));
      if (!block.collection) fields.filter(field => field.type === 'checkgroup').forEach(field => field.groups.forEach(group => {
        const el = root.querySelector(`[data-group="${group.id}"]`); if (el && group.when) conditional.push({ el, when: group.when });
      }));
    }

    function render(blockList) {
      conditional.length = 0; blocks.length = 0;
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
      let list = form.querySelector('#mc-subtypes');
      if (!list) { list = document.createElement('datalist'); list.id = 'mc-subtypes'; form.append(list); }
      refresh();
    }

    // ---- contexte d'affichage (§23) : famille, série, capacités, catégories d'appareil
    function context() {
      const mission = getMission();
      return {
        family: family.id, series: mission.series || '', mission, flags: family.flags || {},
        capabilities: new Set(mission.capabilities || []),
        categories: new Set((mission.aircraft || []).map(a => a.category).filter(Boolean).concat(family.defaultCategory && !(mission.aircraft || []).some(a => a.category) ? [family.defaultCategory] : []))
      };
    }
    function refresh() {
      ctx = context();
      blocks.forEach(({ block, section }) => { section.hidden = block.when ? !block.when(ctx) : false; });
      conditional.forEach(({ el, when }) => { el.hidden = !when(ctx); });
      const series = (family.series || []).find(s => s.value === ctx.series);
      const list = form.querySelector('#mc-subtypes');
      if (list) list.innerHTML = (series?.subtypes || []).map(s => `<option value="${esc(txt(s))}">`).join('');
      return ctx;
    }

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
      M.set(getMission(), path, coerce(target, target.value));
      refresh(); onChange(path);
    }
    form.addEventListener('input', handle);
    form.addEventListener('change', handle);

    return { render, refresh, context: () => ctx, i18nRows: () => [...rows.values()], txt };
  }

  window.MissionForm = { create };
})();
