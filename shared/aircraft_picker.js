/* AircraftPicker — choix d'un appareil ou d'un type, commun à la suite : une liste déroulante avec un champ de
 * recherche en tête (filtre à la frappe sur le nom, le type, le désignateur, l'immatriculation, l'indicatif, la
 * variante, les alias du catalogue), groupes titrés, clavier (↑ ↓ Entrée Échap), position toujours dans la fenêtre,
 * fermeture au clic ailleurs, « saisie libre » quand rien ne correspond (si la page l'accepte).
 *
 * AircraftPicker.attach(hôte, options) → { open, close, refresh, isOpen }
 *   hôte : un bouton (kind « button » : il montre l'appareil courant et ouvre la liste, recherche en tête) ou un champ
 *          de saisie (kind « field » : le champ reste la saisie, la liste s'ouvre dessous et suit la frappe).
 *   options :
 *     sources : fonction (ou liste de fonctions) de la page ; reçoit le texte cherché, rend (ou promet) un groupe
 *               { group, items } ou une liste de groupes. Élément : { key, label, sub, type, reg, keys, note, warn,
 *               disabled, current, title, icon } — type : désignateur (silhouette, alias) ; keys : textes cherchés en
 *               plus ; note : mention à droite (motif d'une entrée désactivée : « déjà pris ») ; current : appareil en
 *               cours (mis en avant) ; les autres champs restent à la page (onPick les reçoit).
 *     onPick(item, texte) : choix d'une entrée (item.free : saisie libre, item.label = texte saisi).
 *     current() : appareil montré par le bouton ({ label, type, sub, title }, null : placeholder).
 *     placeholder (bouton sans appareil), findPlaceholder (champ de recherche), free (saisie libre acceptée), empty() (texte d'une liste vide), footer() (HTML sous la liste),
 *     onOpen(), onEnter(texte) (kind field : Entrée sans entrée choisie), onEscape() (kind field : Échap liste fermée,
 *     vrai si l'Échap a servi), openOnFocus / openOnClick (kind field), limit (entrées montrées, 200 par défaut),
 *     minWidth (px, 320 par défaut), filter (false : sources déjà cherchées et notées, gardées telles quelles),
 *     activeFirst (false : aucune entrée active d'office, Entrée laisse la main à onEnter), hideEmpty (liste vide :
 *     fermée plutôt qu'un message).
 *   La liste n'est dans la page que tant qu'elle est ouverte (un champ recréé par un rendu ne laisse rien derrière lui) ;
 *   écouteurs du document communs à tous les sélecteurs.
 * AircraftPicker.match(clés, texte, code) : note d'un texte contre des clés (moteur de recherche commun, repris par
 *   equipment_editor.js : 100 code exact … 48 tous les mots dans les noms ; 0 : rien).
 * AircraftPicker.byCategory(items, typeOf) : éléments rangés par catégorie de la suite (AircraftCatalog.classify :
 *   hélicoptères, turbopropulseurs, jets, pistons, autres), libellés traduits.
 */
(() => {
  'use strict';
  if (window.AircraftPicker) return;
  const K = () => window.RepositoryKit;
  /** Texte [fr, en, de, es] dans la langue de la page. */
  const t = row => K()?.t ? K().t(row) : row[0];
  /** Échappement HTML (socle commun, sinon local). */
  const esc = s => K()?.esc ? K().esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  /** Clé comparable : sans accents, majuscules, lettres et chiffres seuls (« F-ZBMD » → « FZBMD »). */
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Mots d'un texte, en clés comparables. */
  const wordsOf = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(
    Boolean);

  /** Note d'un texte cherché contre des clés : 100 code exact, 95 clé exacte (nom, alias, immatriculation), 85 un mot
   *  ou deux mots accolés exacts (« SE 210 Caravelle »), 72 début du code, 68 début d'une clé, 55 clé qui contient le
   *  texte, 48 tous les mots dans les clés (« Canadair 415 ») ; 0 sinon. keys : Set de clés déjà normalisées ou liste. */
  function match(keys, text, code = '') {
    const Kx = norm(text),
      W = wordsOf(text),
      tries = new Set([...W, ...W.slice(1).map((w, i) => W[i] + w)]),
      set = keys instanceof Set ? keys : new Set([...(keys || [])].map(norm).filter(Boolean)),
      list = [...set],
      c = norm(code);
    if (!Kx) return 0;
    return set.has(Kx) ? (c === Kx ? 100 : 95) : [...tries].some(w => set.has(w)) ? 85 : Kx.length >= 2 && c && c.startsWith(Kx) ? 72 :
      Kx.length >= 3 && list.some(k => k.startsWith(Kx)) ? 68 : Kx.length >= 3 && list.some(k => k.includes(Kx)) ? 55 : W.some(w => w
        .length >= 3) && W.every(w => w.length < 2 || list.some(k => k.includes(w))) ? 48 : 0;
  }

  const CATEGORIES = ['helico', 'turboprop', 'jet', 'piston', 'other'];
  /** Éléments rangés par catégorie (AircraftCatalog.classify, ordre commun, « autres » en dernier) : [{ group, items }].
   *  typeOf(item) : désignateur (item.type par défaut). */
  function byCategory(items, typeOf = it => it.type) {
    const C = window.AircraftCatalog,
      out = new Map(CATEGORIES.map(c => [c, []]));
    for (const it of items) {
      const c = C?.classify?.(typeOf(it) || '')?.category;
      out.get(CATEGORIES.includes(c) ? c : 'other').push(it);
    }
    return [...out].filter(([, list]) => list.length).map(([c, list]) => ({
      group: C?.categoryLabel?.(c) || c,
      items: list
    }));
  }

  /** Clés cherchées d'un élément : libellé, sous-titre, type, immatriculation, clés de la page, et pour le type : nom du
   *  modèle et alias du catalogue (CL415 → CL2T, « Canadair CL-415 »). */
  const keysOf = it => {
    const C = window.AircraftCatalog,
      ty = String(it.type || ''),
      rec = ty ? C?.record?.(ty) : null,
      keys = [it.label, it.sub, ty, it.reg, rec?.model, ...(ty ? C?.related?.(ty) || [] : []), ...(it.keys || [])];
    return new Set(keys.flatMap(k => [k, ...wordsOf(k)]).map(norm).filter(Boolean));
  };

  // Feuille de style commune (couleurs du design : jetons --repo-*, --sk-*), posée une fois.
  const css = () => {
    if (document.getElementById('apCss')) return;
    const s = document.createElement('style');
    s.id = 'apCss';
    s.textContent = `.ap-pop{position:fixed;z-index:10050;display:flex;flex-direction:column;box-sizing:border-box;padding:6px;border:1px solid color-mix(in srgb,currentColor 22%,transparent);border-radius:calc(10px*var(--repo-round,1));background:var(--repo-card,var(--card,#fff));color:var(--sk-ink,var(--repo-ink,var(--ink,#1d2633)));box-shadow:0 12px 32px rgba(0,0,0,.35);font:13px/1.35 system-ui,sans-serif}
.ap-pop[hidden]{display:none}
.ap-find{box-sizing:border-box;width:100%;margin:0 0 6px;padding:7px 9px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:calc(7px*var(--repo-round,1));background:transparent;color:inherit;font:inherit}
.ap-list{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;margin:0;padding:0;list-style:none}
.ap-group{margin:6px 6px 2px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;opacity:.7}
.ap-item{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:calc(6px*var(--repo-round,1));cursor:pointer}
.ap-item.ap-act{background:color-mix(in srgb,var(--repo-accent,var(--accent,#2a6df4)) 18%,transparent)}
.ap-item.ap-cur .ap-tx b::after{content:' ●';color:var(--repo-accent,var(--accent,#2a6df4))}
.ap-item[aria-disabled="true"]{opacity:.45;cursor:not-allowed}
.ap-ic{flex:none;display:inline-grid;place-items:center;width:34px;height:22px}.ap-ic svg{max-width:34px;max-height:22px}
.ap-tx{flex:1;min-width:0;display:grid}.ap-tx b,.ap-tx small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ap-tx small{opacity:.75}
.ap-note{flex:none;font-size:11px;opacity:.8;white-space:nowrap}.ap-note.ap-warn{color:#b45309;opacity:1}
.ap-free .ap-tx b{font-weight:600;font-style:italic}
.ap-empty{padding:8px 6px;opacity:.75}
.ap-foot:empty{display:none}.ap-foot{margin-top:4px;padding-top:4px;border-top:1px solid color-mix(in srgb,currentColor 18%,transparent)}.ap-foot a{display:block;padding:6px;font-weight:600}
.ap-btn{display:inline-flex;align-items:center;gap:6px;max-width:100%}.ap-btn .ap-ic{width:30px}.ap-btn-tx{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ap-btn-caret{opacity:.8}`;
    document.head.append(s);
  };

  const TXT = {
    find: ['Rechercher : nom, type, immatriculation, indicatif…', 'Search: name, type, registration, call sign…',
      'Suchen: Name, Typ, Kennzeichen, Rufzeichen…', 'Buscar: nombre, tipo, matrícula, indicativo…'
    ],
    none: ['Aucun appareil ne correspond.', 'No aircraft matches.', 'Kein Luftfahrzeug passt.', 'Ninguna aeronave coincide.'],
    empty: ['Aucun appareil.', 'No aircraft.', 'Kein Luftfahrzeug.', 'Ninguna aeronave.'],
    free: ['Saisie libre : « {t} »', 'Free entry: “{t}”', 'Freie Eingabe: „{t}“', 'Entrada libre: «{t}»'],
    choose: ['Choisir l’appareil', 'Choose the aircraft', 'Luftfahrzeug wählen', 'Elegir la aeronave']
  };
  let seq = 0;
  // Sélecteurs ouverts : clic ailleurs, défilement et redimensionnement servis par des écouteurs communs.
  const live = new Set();
  document.addEventListener('pointerdown', e => [...live].forEach(api => api._outside(e)), true);
  window.addEventListener('resize', () => live.forEach(api => api._place()));
  window.addEventListener('scroll', e => live.forEach(api => api._scroll(e)), true);

  /** Monte le sélecteur sur un bouton ou un champ (voir l'en-tête du fichier). */
  function attach(host, opts = {}) {
    if (!host) return null;
    if (host._aircraftPicker) return host._aircraftPicker;
    css();
    const field = opts.kind === 'field' || host.matches('input'),
      id = `ap${++seq}`,
      pop = document.createElement('div'),
      list = document.createElement('ul'),
      foot = document.createElement('div');
    let find = field ? host : null,
      items = [], // éléments affichés (choisissables ou non), dans l'ordre
      act = -1,
      run = 0,
      typed = false, // champ : liste filtrée par la saisie seulement après une frappe (ouverte au clic : tout)
      openState = false;
    pop.className = 'ap-pop';
    pop.hidden = true;
    list.className = 'ap-list';
    list.id = `${id}-list`;
    list.setAttribute('role', 'listbox');
    foot.className = 'ap-foot';
    if (!field) {
      find = document.createElement('input');
      find.type = 'search';
      find.className = 'ap-find';
      find.autocomplete = 'off';
      find.spellcheck = false;
      pop.append(find);
      host.setAttribute('aria-haspopup', 'listbox');
    }
    find.setAttribute('role', 'combobox');
    find.setAttribute('aria-controls', list.id);
    find.setAttribute('aria-autocomplete', 'list');
    find.setAttribute('aria-expanded', 'false');
    pop.append(list, foot);

    /** Groupes des sources de la page pour un texte (fonctions synchrones ou promesses). */
    const read = async q => {
      const fns = [].concat(opts.sources || []),
        res = await Promise.all(fns.map(fn => Promise.resolve().then(() => fn(q)).catch(() => null)));
      return res.flatMap(r => !r ? [] : Array.isArray(r) ? r : [r]).filter(g => g && (g.items || []).length);
    };
    /** Filtre et note : groupes gardés dans leur ordre, éléments notés (meilleure note en tête, ordre de la page à
     *  égalité) ; texte d'un caractère : début d'une clé. */
    const filter = (groups, q) => {
      const Kx = norm(q);
      if (!Kx) return groups;
      return groups.map(g => ({
        ...g,
        items: g.items.map((it, i) => {
          const keys = keysOf(it),
            s = match(keys, q, it.type || it.reg || '') || (Kx.length <= 2 && [...keys].some(k => k.startsWith(Kx)) ? 40 : 0);
          return [it, s, i];
        }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([it]) => it)
      })).filter(g => g.items.length);
    };
    /** Au plus `limit` entrées montrées (groupes coupés dans l'ordre). */
    const cut = groups => {
      let room = opts.limit || 200;
      return groups.map(g => {
        const items = g.items.slice(0, Math.max(0, room));
        room -= items.length;
        return {
          ...g,
          items
        };
      }).filter(g => g.items.length);
    };
    /** Rangée d'un élément. */
    const row = (it, i) => {
      const icon = it.icon ?? (window.AircraftDBIcons?.icon?.({
        type: it.type || '',
        icao: it.type || '',
        name: it.label || ''
      }) || '<span>✈</span>');
      return `<li role="option" id="${id}-${i}" class="ap-item${it.current ? ' ap-cur' : ''}${it.free ? ' ap-free' : ''}" data-i="${i}" aria-selected="false"${it.disabled ? ' aria-disabled="true"' : ''}${it.title || it.note ? ` title="${esc(it.title || it.note)}"` : ''}><span class="ap-ic">${icon}</span><span class="ap-tx"><b>${esc(it.label || it.key || '')}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.note ? `<span class="ap-note${it.warn ? ' ap-warn' : ''}">${esc(it.note)}</span>` : ''}</li>`;
    };
    /** Redessine la liste pour le texte cherché ; garde l'entrée active si elle reste. */
    const draw = async () => {
      const mine = ++run,
        q = field && !typed ? '' : find.value.trim(),
        value = norm(find.value),
        groups = cut(opts.filter === false ? await read(q) : filter(await read(q), q));
      // champ ouvert sans frappe : sa valeur est l'entrée en cours
      if (field && !typed && value) groups.forEach(g => g.items.forEach(it => it.current ||= norm(it.key) === value));
      if (mine !== run || !openState) return;
      items = [];
      let html = '';
      for (const g of groups) {
        if (g.group) html += `<li role="presentation" class="ap-group">${esc(g.group)}</li>`;
        for (const it of g.items) {
          html += row(it, items.length);
          items.push(it);
        }
      }
      const exact = items.some(it => [it.label, it.type, it.reg, it.key].some(v => v && norm(v) === norm(q)));
      if (opts.free && q && !exact) {
        const free = {
          free: true,
          key: '',
          label: q,
          sub: t(TXT.free).replace('{t}', q),
          icon: '<span>✎</span>'
        };
        html += row(free, items.length);
        items.push(free);
      }
      if (!html && opts.hideEmpty) return close();
      list.innerHTML = html || `<li role="presentation" class="ap-empty">${esc(q ? t(TXT.none) : opts.empty?.() || t(TXT.empty))}</li>`;
      foot.innerHTML = opts.footer?.() || '';
      const cur = items.findIndex(it => it.current && !it.disabled);
      mark(q && opts.activeFirst !== false ? items.findIndex(it => !it.disabled) : cur >= 0 ? cur : -1, false);
      place();
    };
    /** Entrée active (index), visible dans la liste. */
    const mark = (i, scroll = true) => {
      act = i;
      list.querySelectorAll('.ap-item').forEach(li => {
        const on = +li.dataset.i === i;
        li.classList.toggle('ap-act', on);
        li.setAttribute('aria-selected', String(on));
        if (on && scroll) li.scrollIntoView({
          block: 'nearest'
        });
      });
      if (i >= 0) find.setAttribute('aria-activedescendant', `${id}-${i}`);
      else find.removeAttribute('aria-activedescendant');
    };
    /** Déplace l'entrée active (dir ±1), en sautant les entrées désactivées. */
    const step = dir => {
      if (!items.length) return;
      let i = act;
      for (let n = 0; n < items.length; n++) {
        i = (i + dir + items.length) % items.length;
        if (!items[i].disabled) return mark(i);
      }
    };
    /** Place la liste dans la fenêtre : sous l'hôte, retournée vers le haut si elle n'y tient pas, décalée à gauche
     *  si elle déborde ; hauteur limitée à la place disponible (la liste défile). */
    const place = () => {
      if (!openState) return;
      const r = host.getBoundingClientRect(),
        m = 8,
        w = Math.min(Math.max(r.width, opts.minWidth || 320), innerWidth - 2 * m);
      pop.style.width = `${w}px`;
      pop.style.maxHeight = 'none';
      const h = Math.min(pop.scrollHeight, 460),
        below = innerHeight - r.bottom - 4 - m,
        above = r.top - 4 - m,
        up = h > below && above > below,
        room = Math.max(140, up ? above : below);
      pop.style.maxHeight = `${Math.min(room, 460)}px`;
      pop.style.left = `${Math.max(m, Math.min(r.left, innerWidth - m - w))}px`;
      pop.style.top = `${up ? Math.max(m, r.top - 4 - Math.min(h, room)) : r.bottom + 4}px`;
    };
    /** Ouvre la liste (bouton : champ de recherche vidé et focalisé). */
    const open = () => {
      if (openState) return draw();
      openState = true;
      live.add(api);
      // dans une fenêtre modale : liste posée dans la fenêtre (sinon inerte sous la modale)
      (host.closest('dialog') || document.body).append(pop);
      pop.hidden = false;
      find.setAttribute('aria-expanded', 'true');
      host.setAttribute('aria-expanded', 'true');
      opts.onOpen?.();
      if (!field) {
        find.value = '';
        find.placeholder = opts.findPlaceholder || t(TXT.find);
        find.focus();
      }
      draw();
    };
    /** Ferme la liste (focus rendu au bouton si demandé). */
    const close = (focusHost = false) => {
      if (!openState) return;
      openState = false;
      live.delete(api);
      run++;
      pop.hidden = true;
      pop.remove();
      find.setAttribute('aria-expanded', 'false');
      host.setAttribute('aria-expanded', 'false');
      if (focusHost && !field) host.focus();
    };
    /** Choisit l'entrée d'index i (désactivée : rien). */
    const pick = i => {
      const it = items[i];
      if (!it || it.disabled) return;
      const q = find.value.trim();
      close(true);
      opts.onPick?.(it, q);
    };
    /** Bouton : appareil courant (silhouette, nom, sous-titre en infobulle). */
    const paint = () => {
      if (field || !opts.current) return;
      const c = opts.current(),
        icon = c ? c.icon ?? (window.AircraftDBIcons?.icon?.({
          type: c.type || '',
          icao: c.type || '',
          name: c.label || ''
        }) || '<span>✈</span>') : '<span>✈</span>',
        html = `<span class="ap-btn"><span class="ap-ic">${icon}</span><span class="ap-btn-tx">${esc(c?.label || opts.placeholder || t(TXT.choose))}</span><span class="ap-btn-caret">▾</span></span>`;
      if (host.innerHTML !== html) host.innerHTML = html;
      host.title = c?.title || [c?.type, c?.label].filter(Boolean).join(' · ') || t(TXT.choose);
    };

    // ---- événements
    if (!field) host.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openState ? close() : open();
    });
    find.addEventListener('input', () => {
      typed = true;
      open();
    });
    if (field) find.addEventListener('focus', () => {
      if (!opts.openOnFocus) return;
      typed = false;
      open();
    });
    if (field && opts.openOnClick) host.addEventListener('click', () => {
      if (openState) return;
      typed = false;
      open();
    });
    find.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!openState) {
          typed = false;
          return open();
        }
        step(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter') {
        if (openState && act >= 0) {
          e.preventDefault();
          pick(act);
        } else if (field) {
          if (openState) close();
          if (opts.onEnter) {
            e.preventDefault();
            opts.onEnter(find.value);
          }
        } else e.preventDefault();
      } else if (e.key === 'Escape') {
        if (openState) {
          e.preventDefault();
          e.stopPropagation();
          close(true);
        } else if (field && opts.onEscape?.()) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else if (e.key === 'Tab' && openState) close();
    });
    if (field) find.addEventListener('blur', () => setTimeout(() => {
      if (!pop.contains(document.activeElement)) close();
    }, 150));
    // souris : choix au pointeur pressé (le champ garde le focus), survol = entrée active
    list.addEventListener('pointerdown', e => {
      const li = e.target.closest('.ap-item');
      if (!li) return;
      e.preventDefault();
      pick(+li.dataset.i);
    });
    list.addEventListener('pointermove', e => {
      const li = e.target.closest('.ap-item');
      if (li && +li.dataset.i !== act && !items[+li.dataset.i]?.disabled) mark(+li.dataset.i, false);
    });
    if (!field) window.addEventListener('repository-language-change', () => {
      paint();
      if (openState) draw();
    });
    paint();
    const api = {
      /** Clic hors de la liste et de l'hôte : fermée (hôte retiré de la page : fermée aussi). */
      _outside: e => {
        if (!host.isConnected || (!pop.contains(e.target) && !host.contains(e.target))) close();
      },
      _place: () => place(),
      /** Défilement de la page (pas de la liste) : liste replacée ; hôte retiré : fermée. */
      _scroll: e => {
        if (!host.isConnected) close();
        else if (!pop.contains(e.target)) place();
      },
      open,
      close,
      /** Relit les sources (liste ouverte) et l'appareil courant (bouton). */
      refresh() {
        paint();
        if (openState) draw();
      },
      isOpen: () => openState
    };
    host._aircraftPicker = api;
    return api;
  }

  window.AircraftPicker = {
    attach,
    match,
    byCategory,
    norm,
    wordsOf
  };
})();
