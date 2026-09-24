(() => {
  'use strict';
  // Mission Report Core — rendu déclaratif du formulaire (blocs, champs, collections
  // dynamiques, capacités) et liaison bidirectionnelle avec le modèle de mission.
  // Les libellés sont écrits en français (langue source) et leurs lignes [fr,en,de,es]
  // sont collectées pour le système de traduction commun (RepositoryContentI18n).
  // Options de champ : upper (majuscules), list (id de datalist), alias (attribut name
  // pour les modules partagés : suivi réseau, profil pilote), rerender (re-rendu de la
  // collection), byCategory (groupes d'équipements selon la catégorie de l'appareil),
  // collapsed (groupe de cases replié par défaut), appendList (zone de texte « une valeur
  // par ligne » + champ d'ajout avec valeurs connues), only / hideFor (familles concernées),
  // pool (réserve de valeurs connues partagée, ex. « aerodrome »).
  // Familles : hide = [chemins de champs sans index (« aircraft.tacticalNumber ») ou id de blocs].
  // Blocs : defaultHidden (masqué par défaut via le framework, comme « Masquer »).
  // Suggestions : à la prise de focus d'un champ texte / numérique, suggest(path, field,
  // saisie) fournit les valeurs proposées (liste commune #mc-suggest, rafraîchie à la frappe).
  const M = window.MissionModel, V = window.MissionVocab;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // now(path, type) : valeur « maintenant » d'un champ date / heure (heure locale du terrain ou
  // UTC selon le champ), fournie par la page (fuseau du terrain de départ).
  const NOW_TITLE = {
    time: ['Maintenant (heure locale du terrain ; à défaut, heure de Paris)', 'Now (aerodrome local time; otherwise Paris time)', 'Jetzt (Ortszeit des Flugplatzes; sonst Pariser Zeit)', 'Ahora (hora local del aeródromo; si no, hora de París)'],
    utc: ['Maintenant (UTC)', 'Now (UTC)', 'Jetzt (UTC)', 'Ahora (UTC)'],
    date: ['Aujourd’hui', 'Today', 'Heute', 'Hoy']
  };
  const EMPTY_HINT = ['Aucun élément : « + » dans le titre pour en ajouter.', 'No item: “+” in the title to add one.', 'Kein Element: „+“ im Titel zum Hinzufügen.', 'Ningún elemento: «+» en el título para añadir.'];
  function create(form, { family, getMission, onChange, onCommit, onClear, suggest, now }) {
    const rows = new Map(); // fr → [fr,en,de,es]
    const txt = label => { if (!label) return ''; if (Array.isArray(label)) { rows.set(label[0], label); return label[0]; } return String(label); };
    const conditional = [];
    const blocks = [];
    const fieldsByPath = new Map(); // chemin absolu → définition (pour upper / rerender)
    const openDetails = new Set(); // groupes repliables ouverts par le pilote (conservés au re-rendu)
    let ctx = null;
    // Champ propre à certaines familles (only / hideFor du champ, hide de la famille).
    const hidden = new Set(family.hide || []);
    const shown = (field, key) => !(field.only && !field.only.includes(family.id)) && !(field.hideFor || []).includes(family.id) && !hidden.has(key);

    const optionsFor = field => {
      if (field.options) return field.options;
      if (field.familySeries) return family.series || [];
      if (field.crewRoles) return family.crewRoles ? V.crewRoles.filter(o => family.crewRoles.includes(o.value)) : V.crewRoles;
      if (field.eventTypes) return V.eventTypesFor(family.id).concat(family.events || []);
      return [];
    };
    // Texte simple : toujours en majuscules (règle commune MissionModel.isUpperField).
    const attrs = (field, path, withAlias) => `data-path="${esc(path)}"${withAlias && field.alias ? ` name="${esc(field.alias)}"` : ''}${field.list ? ` list="${esc(field.list)}"` : ''}${M.isUpperField(field) ? ' data-upper="1" autocapitalize="characters"' : ''}`;
    const selectHtml = (field, path, value, withAlias) => {
      const opts = optionsFor(field), known = opts.some(o => o.value === value);
      return `<select ${attrs(field, path, withAlias)}>${field.blank || field.familySeries ? '<option value="">—</option>' : ''}${opts.map(o =>
        `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(txt(o.label))}</option>`).join('')}${value && !known ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : ''}</select>`;
    };
    const capabilitiesHtml = (field, path, selected, item) => {
      const list = family.capabilities || V.capabilityProfiles?.[family.id], allowed = list ? new Set(list) : null;
      const category = item?.category || '';
      const html = `<div class="mc-capabilities${item ? ' compact' : ''}" data-path="${esc(path)}" data-kind="checkgroup">${field.groups.map(group => {
        // Équipements d'un appareil : seuls les groupes compatibles avec sa catégorie.
        if (field.byCategory && category && ((group.id === 'rotary' && category !== 'rotary') || (group.id === 'fixed' && category === 'rotary'))) return '';
        const items = group.items.filter(it => group.unfiltered || !allowed || allowed.has(it.value));
        if (!items.length) return '';
        return `<fieldset class="mc-capgroup" data-group="${esc(group.id)}"><legend>${esc(txt(group.title))}</legend>${items.map(it =>
          `<label class="mc-chip"><input type="checkbox" value="${esc(it.value)}"${selected.includes(it.value) ? ' checked' : ''}><span>${esc(txt(it.label))}</span></label>`).join('')}</fieldset>`;
      }).join('')}</div>`;
      // Replié par défaut (renseigné une fois, repris de l'appareil connu ou du plan de vol) :
      // le résumé indique le nombre de cases cochées.
      return field.collapsed ? collapsible(path, field.label, html, selected.length) : html;
    };
    const collapsible = (key, label, html, count) => `<details class="mc-collapse" data-collapse="${esc(key)}"${openDetails.has(key) ? ' open' : ''}><summary><span>${esc(txt(label))}</span> <b class="mc-count">${count ? `(${count})` : ''}</b></summary>${html}</details>`;
    const controlHtml = (field, path, withAlias, item) => {
      const value = M.get(getMission(), path);
      const ph = field.placeholder ? ` placeholder="${esc(txt(field.placeholder))}"` : '';
      switch (field.type) {
        case 'select': return selectHtml(field, path, value ?? '', withAlias);
        case 'textarea': return `<textarea ${attrs(field, path, withAlias)}${ph}>${esc(value)}</textarea>`
          + (field.appendList ? `<input class="mc-append" data-append="${esc(path)}" placeholder="${esc(txt(['+ ajouter (valeurs connues)…', '+ add (known values)…', '+ hinzufügen (bekannte Werte)…', '+ añadir (valores conocidos)…']))}">` : '');
        case 'number': return `<input type="number" step="any" ${attrs(field, path, withAlias)} value="${esc(value ?? '')}"${ph}>`;
        case 'date': case 'time': return `<span class="mc-when"><input type="${field.type}" ${attrs(field, path, withAlias)} value="${esc(value)}">${now ? `<button type="button" class="mc-now" data-now="${esc(path)}" data-kind="${field.type}" title="${esc(txt(NOW_TITLE[/utc/i.test(path) ? 'utc' : field.type]))}">${field.type === 'date' ? '📅' : '⏱'}</button>` : ''}</span>`;
        case 'checkgroup': return capabilitiesHtml(field, path, value || [], item);
        default: return `<input ${attrs(field, path, withAlias)} value="${esc(value)}"${ph}${field.familySubtypes ? ' list="mc-subtypes"' : ''}>`;
      }
    };
    const fieldHtml = (field, path, withAlias = true, item = null, key = path) => {
      if (!shown(field, key)) return '';
      fieldsByPath.set(path, field);
      return `<div class="mc-field${field.full ? ' full' : ''}" data-field="${esc(path)}">${field.label && !field.collapsed ? `<label>${esc(txt(field.label))}</label>` : ''}${controlHtml(field, path, withAlias, item)}<span class="mc-hint small" hidden></span></div>`;
    };

    // ---- collections dynamiques (appareils, équipage, événements, étapes…)
    const collections = new Map(); // chemin → { block, host }
    function renderCollection(block, host) {
      const spec = block.collection, list = M.get(getMission(), spec.path) || [];
      while (list.length < (spec.min || 0)) list.push(spec.empty());
      M.set(getMission(), spec.path, list);
      collections.set(spec.path, { block, host });
      // Tableau compact (événements, étapes, équipage, positions… : tout sauf layout « cards ») :
      // une ligne par élément, champs longs (texte libre, description) sur une 2e ligne.
      if (spec.layout !== 'cards') return renderTable(block, host, spec, list);
      // L'alias (name) ne porte que sur le premier élément (appareil principal…).
      host.innerHTML = list.map((item, i) => `<div class="mc-item" data-index="${i}"><div class="mc-item-head"><b>${esc(txt(spec.item))} ${i + 1}</b>${(() => { const l = spec.link?.(item); return l ? `<a class="mc-item-link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(txt(l.label))}</a>` : ''; })()}${spec.clear ? `<button type="button" class="mc-clear" data-clear="${i}" title="${esc(txt(spec.clear.title))}">${esc(txt(spec.clear.label))}</button>` : ''}${list.length > (spec.min || 0) ? `<button type="button" class="mc-remove" data-remove="${i}" title="${esc(txt(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">×</button>` : ''}</div><div class="mc-grid${spec.compact ? ' compact' : ''}">${spec.fields.map(field => fieldHtml(field, `${spec.path}.${i}.${field.path}`, i === 0, item, `${spec.path}.${field.path}`)).join('')}</div></div>`).join('')
        + (list.length ? '' : `<p class="small mc-empty-hint">${esc(txt(EMPTY_HINT))}</p>`);
      // Élément remis à zéro (ex. appareil mal identifié : la recherche repart de zéro).
      host.querySelectorAll('[data-clear]').forEach(button => button.onclick = () => {
        const index = Number(button.dataset.clear); list[index] = spec.empty(); renderCollection(block, host); refresh(); onClear?.(spec.path, index); onChange(spec.path);
      });
      host.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
        list.splice(Number(button.dataset.remove), 1); renderCollection(block, host); refresh(); onChange(spec.path);
      });
      registerConditions(block, host);
    }
    function renderTable(block, host, spec, list) {
      const visible = spec.fields.filter(field => shown(field, `${spec.path}.${field.path}`));
      const long = field => field.full || field.type === 'textarea' || field.type === 'checkgroup';
      const short = visible.filter(f => !long(f)), wide = visible.filter(long);
      const cell = (field, i, item) => {
        const path = `${spec.path}.${i}.${field.path}`; fieldsByPath.set(path, field);
        return `<div class="mc-field" data-field="${esc(path)}">${controlHtml(field, path, i === 0, item)}<span class="mc-hint small" hidden></span></div>`;
      };
      const canRemove = list.length > (spec.min || 0);
      host.innerHTML = list.length ? `<div class="mc-table-wrap"><table class="mc-table"><thead><tr><th class="mc-idx">#</th>${short.map(f => `<th>${esc(txt(f.label))}</th>`).join('')}<th class="mc-idx"></th></tr></thead><tbody>${list.map((item, i) =>
        `<tr data-index="${i}"><td class="mc-idx">${i + 1}</td>${short.map(f => `<td>${cell(f, i, item)}</td>`).join('')}<td class="mc-idx">${canRemove ? `<button type="button" class="mc-remove" data-remove="${i}" title="${esc(txt(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">×</button>` : ''}</td></tr>`
        + (wide.length ? `<tr class="mc-row2" data-index="${i}"><td></td><td colspan="${short.length}">${wide.map(f => `<label class="mc-row2-field"><span>${esc(txt(f.label))}</span>${cell(f, i, item)}</label>`).join('')}</td><td></td></tr>` : '')).join('')}</tbody></table></div>`
        : `<p class="small mc-empty-hint">${esc(txt(EMPTY_HINT))}</p>`;
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
        if (hidden.has(block.id) || (block.only && !block.only.includes(family.id))) return;
        const section = document.createElement('section');
        section.className = 'mc-block'; section.id = `mc-${block.id}`; section.dataset.blockId = `mc-${block.id}`;
        const grid = block.collection ? '<div class="mc-collection"></div>' : `<div class="mc-grid">${block.fields.map(field => fieldHtml(field, field.path)).join('')}</div>`;
        // Bloc masqué par défaut : mécanisme afficher / masquer / déplacer du framework
        // (shared/app_framework.js), le choix de l'utilisateur restant mémorisé.
        if (block.defaultHidden) section.dataset.defaultHidden = '1';
        // Collection : ajout par un « + » dans le titre du bloc (appareils, équipage, événements…).
        const add = block.collection ? ` <button type="button" class="mc-head-add" data-add-to="${esc(block.collection.path)}" title="${esc(txt(block.collection.add))}" aria-label="${esc(txt(block.collection.add))}">+</button>` : '';
        section.innerHTML = `<h2>${esc(txt(block.title))}${add}</h2>` + grid;
        form.insertBefore(section, controls || null);
        if (block.collection) {
          const host = section.querySelector('.mc-collection');
          renderCollection(block, host);
          section.querySelector('.mc-head-add').onclick = event => {
            event.preventDefault(); event.stopPropagation();
            const list = M.get(getMission(), block.collection.path) || []; list.push(block.collection.empty()); M.set(getMission(), block.collection.path, list);
            renderCollection(block, host); refresh(); onChange(block.collection.path);
            host.querySelector('.mc-item:last-of-type [data-path]')?.focus();
          };
        }
        else registerConditions(block, section);
        blocks.push({ block, section });
      });
      ['mc-subtypes', 'mc-suggest'].forEach(id => {
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
        if (el.dataset.kind === 'checkgroup') {
          const values = M.get(getMission(), path) || []; el.querySelectorAll('input').forEach(i => { i.checked = values.includes(i.value); });
          const details = el.closest('details.mc-collapse'); if (details) details.querySelector('.mc-count').textContent = countOf(details);
          return;
        }
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
        const values = [...group.querySelectorAll('input:checked')].map(input => input.value);
        M.set(getMission(), group.dataset.path, values);
        const count = group.closest('details.mc-collapse')?.querySelector('.mc-count');
        if (count) count.textContent = countOf(count.closest('details'));
        refresh(); onChange(group.dataset.path); return;
      }
      // Champ d'ajout d'une zone « une valeur par ligne » (points tournants…).
      if (target.dataset?.append) {
        if (event.type !== 'change' || !target.value.trim()) return;
        const path = target.dataset.append, area = form.querySelector(`textarea[data-path="${CSS.escape(path)}"]`);
        const lines = String(M.get(getMission(), path) || '').split('\n').map(s => s.trim()).filter(Boolean);
        lines.push(fieldsByPath.get(path)?.upper ? target.value.trim().toUpperCase() : target.value.trim());
        M.set(getMission(), path, lines.join('\n')); if (area) area.value = lines.join('\n');
        target.value = ''; onCommit?.(path, lines.join('\n')); refresh(); onChange(path); return;
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
    // « Maintenant » : date ou heure courante (fuseau du champ), comme une saisie validée.
    form.addEventListener('click', event => {
      const button = event.target.closest('[data-now]'); if (!button || !now) return;
      event.preventDefault();
      const input = form.querySelector(`[data-path="${CSS.escape(button.dataset.now)}"]`), value = now(button.dataset.now, button.dataset.kind);
      if (!input || !value) return;
      input.value = value; handle({ type: 'input', target: input }); handle({ type: 'change', target: input });
    });
    const countOf = details => { const n = details.querySelectorAll('input[type=checkbox]:checked').length; return n ? `(${n})` : ''; };
    form.addEventListener('toggle', event => {
      const key = event.target.dataset?.collapse; if (!key) return;
      if (event.target.open) openDetails.add(key); else openDetails.delete(key);
    }, true);

    // ---- valeurs proposées (datalist commune, remplie à la prise de focus et à la frappe)
    const suggestible = el => (el.tagName === 'INPUT' && ['text', 'number', 'search', ''].includes(el.getAttribute('type') || '') && (el.dataset.path || el.dataset.append));
    let offering = null; // dernier champ servi (une réponse tardive d'un autre champ est ignorée)
    function offer(el) {
      if (!suggest) return;
      const path = el.dataset.path || el.dataset.append, field = fieldsByPath.get(path) || {};
      const list = form.querySelector('#mc-suggest'); if (!list) return;
      const token = offering = {};
      Promise.resolve(suggest(path, field, el.dataset.path ? el.value : '', !!el.dataset.append)).then(values => {
        if (offering !== token) return;
        list.innerHTML = (values || []).slice(0, 80).map(v => `<option value="${esc(v.value)}"${v.label ? ` label="${esc(v.label)}"` : ''}>${v.label ? esc(v.label) : ''}</option>`).join('');
        el.setAttribute('list', 'mc-suggest');
      });
    }
    let offerTimer = null;
    form.addEventListener('focusin', event => { if (suggestible(event.target)) offer(event.target); });
    form.addEventListener('input', event => { if (suggestible(event.target)) { clearTimeout(offerTimer); offerTimer = setTimeout(() => offer(event.target), 120); } });

    return { render, refresh, sync, hint, rerenderCollectionOf, context: () => ctx, i18nRows: () => [...rows.values()], txt };
  }

  window.MissionForm = { create };
})();
