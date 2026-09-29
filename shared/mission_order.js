(() => {
  'use strict';
  // Composant « MissionOrder » : commande d'une mission à générer avec ChatGPT — bloc commun au registre des missions
  // (shared/mission_registry.js, bloc « Commander une mission ») et au générateur de brief (apps/cpco/mission_editor.html,
  // « Créer une mission avec ChatGPT ») : mêmes paramètres, même prompt, mêmes réglages mémorisés.
  //
  //   · paramètres : type, sous-type (§ 2 du prompt), théâtre(s), série (vide = la suivante), identifiant calculé
  //     (SiaMission.nextNumbering), équipes DEFA en vol et aéronef de chaque équipe (A, B, C… ; vide = automatique ;
  //     complétion par les types courants et la flotte DEFA), rendez-vous, équipes au sol, ravitaillement en vol ;
  //   · prompt : window.MISSION_PROMPT (apps/cpco/mission_prompt.js, construit depuis docs/PROMPT_GENERATEUR_MISSIONS.md
  //     par tools/build_mission_prompt.py), paramètres réglés en tête, copié puis ChatGPT ouvert dans un nouvel onglet ;
  //   · la commande est inscrite au registre (statut « commandée », missionRegistry:v1) puis rapprochée de la mission
  //     générée à la relecture du dossier (même série) ;
  //   · réglages du formulaire : localStorage missionRegistryOrder:v1 (partagés entre les deux pages).
  //
  // API : MissionOrder.mount(host, { hint, onOrdered }) · sendPrompt(request, out) · families() · numbering(type)
  const ORDER_KEY = 'missionRegistryOrder:v1', REG_KEY = 'missionRegistry:v1';
  const TEAM_PRESETS = ['A400M', 'C-130J', 'CASA CN235', 'A330 MRTT', 'E-3F', 'Rafale', 'Falcon 50M', 'Atlantique 2', 'Dash 8 (Milan)', 'CL-415', 'H225 Caracal', 'NH90', 'EC145 (Dragon)', 'H160', 'AS365 Dauphin', 'Beech 200 / TBM', 'drone', 'équipe au sol'];
  // mêmes noms que les théâtres reconnus par le registre (theatreOf) ; texte libre pour le prompt
  const THEATRE_LIST = ['aléatoire', 'métropole', 'Corse', 'Antilles', 'Guyane', 'Réunion', 'Mayotte', 'Nouvelle-Calédonie', 'Polynésie', 'Saint-Pierre-et-Miquelon', 'Wallis-et-Futuna', 'étranger'];
  // théâtre étranger : pays saisi (« étranger (Japon) ») ; vide = au choix du générateur
  const theatreText = (v, country) => v === 'étranger' ? `étranger (${String(country || '').trim() || 'pays au choix'})` : v;

  const LANGS = ['fr', 'en', 'de', 'es'];
  /** Texte dans la langue de la page (tableau fr, en, de, es ; repli anglais puis français), variables {x} remplacées. */
  const t = (row, vars = {}) => {
    const i = Math.max(0, LANGS.indexOf(window.RepositoryNav?.getLanguage?.() || 'fr'));
    return String(row[i] ?? row[1] ?? row[0]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const readJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };

  /** Familles et sous-types : § 2 du prompt de génération (source unique : docs/PROMPT_GENERATEUR_MISSIONS.md). */
  function families() {
    const text = String(window.MISSION_PROMPT || ''), out = [];
    const sec = /2\. FAMILLES ET SOUS-TYPES[\s\S]*?\n─+\n([\s\S]*?)\n─+\n3\./.exec(text)?.[1] || '';
    let cur = null;
    for (const line of sec.split('\n')) {
      const m = /^([A-Z]{2,})\s+\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s+(.*)$/.exec(line);
      if (m) { cur = { id: m[1], label: m[2].trim(), rest: m[3].trim() }; out.push(cur); continue; }
      if (cur && /^\s{20,}\S/.test(line)) cur.rest += ' ' + line.trim();
      else if (!line.trim()) cur = null;
    }
    return out.map(f => ({ id: f.id, label: f.label, subtypes: /libre/i.test(f.rest) && !/·/.test(f.rest) ? [] : f.rest.split('·').map(s => s.trim()).filter(Boolean) }));
  }

  // ---- réglages du formulaire (partagés registre / générateur)
  const load = () => {
    const o = { type: 'aléatoire', subtype: 'libre', theatre: 'aléatoire', theatre2: '', serie: '', teams: 2, teamSlots: null, rdv: 'libre', ground: 'libre', aar: 'libre', ...readJson(ORDER_KEY, {}) };
    if (!/^\d+$/.test(String(o.serie || ''))) o.serie = '';   // série : numéro dans la famille (vide = la suivante)
    return o;
  };
  const save = o => writeJson(ORDER_KEY, o);
  let lastMsg = null;   // message de la dernière commande (gardé si l'hôte redessine le bloc)

  /** Numérotation par famille (lettre + 3 chiffres, série dans la famille) : SiaMission.nextNumbering. */
  const numbering = type => window.SiaMission?.nextNumbering?.(type) || { letter: '', first: '001', id: '', serie: 1 };
  /** Aéronef choisi pour chaque équipe en vol (A, B, C…) ; '' = automatique. Anciens réglages (cases + « Autres ») repris une fois. */
  function teamSlots(o) {
    const n = Math.max(1, Math.min(5, +o.teams || 1));
    if (!Array.isArray(o.teamSlots)) o.teamSlots = [...(o.teamTypes || []), ...String(o.teamTypesFree || '').split('+').map(x => x.trim()).filter(Boolean)];
    while (o.teamSlots.length < n) o.teamSlots.push('');
    return o.teamSlots.slice(0, n);
  }
  /** Propositions : types courants, puis chaque appareil de la flotte DEFA (« variante — indicatif »). */
  function teamChoices() {
    // désignateur OACI en tête (le générateur l'emploie tel quel dans aircraft.type), puis la variante et l'indicatif
    const fleet = (window.DEFA_FLEET || []).filter(r => r.type).map(r => `${r.type}${r.variant && r.variant !== r.type ? ' ' + r.variant : ''} — ${r.callsign || r.registration || r.code || r.type}`);
    return [...new Set([...TEAM_PRESETS, ...fleet.sort((a, b) => a.localeCompare(b))])];
  }
  /** Valeur TYPES_EQUIPES du prompt : « A : H160 — RESCUE41 + B : automatique + … » ; '' si tout est automatique. */
  /** Aéronef imposé : désignateur OACI en tête (« EC145 (Dragon) » → « EC45 EC145 (Dragon) ») pour que le générateur le reprenne. */
  const imposed = v => { const code = window.MissionEstimate?.designator?.(v) || ''; return code && !String(v).toUpperCase().startsWith(code) ? `${code} ${v}` : v; };
  const teamTypesValue = o => { const s = teamSlots(o); return s.some(Boolean) ? s.map((v, i) => `${String.fromCharCode(65 + i)} : ${v ? `${imposed(v)} (IMPOSÉ)` : 'automatique'}`).join(' + ') : ''; };

  /** Demande complète (paramètres du prompt) à partir des réglages. */
  const requestOf = o => ({
    type: o.type, subtype: o.subtype,
    theatre: [o.theatre, o.theatre2].filter((v, i, a) => v && a.indexOf(v) === i).map(v => theatreText(v, o.country)).join(' + '),
    serie: +o.serie || numbering(o.type).serie, id: numbering(o.type).id,
    teams: Math.max(1, Math.min(5, +o.teams || 1)), teamTypes: teamTypesValue(o) || 'libre',
    rdv: o.rdv, ground: o.ground, aar: o.aar
  });

  /** Inscrit la commande au registre (statut « commandée ») : via le registre s'il est chargé, sinon dans missionRegistry:v1. */
  function record(request, o) {
    const now = new Date().toISOString();
    const entry = { id: request.id || '', series: request.serie, type: request.type === 'aléatoire' ? '' : request.type, family: '', subtype: request.subtype === 'libre' ? '' : request.subtype, title: '', teams: [], teamCount: 0, teamTypes: request.teamTypes === 'libre' ? [] : teamSlots(o).map(v => v || 'automatique'), aircraftTypes: [], callsigns: [], rdv: request.rdv === 'avec' ? 1 : 0, aar: request.aar === 'oui', theatre: o.theatre === 'aléatoire' ? '' : o.theatre, origin: '', destination: '', maps: 0, folder: '', files: [], source: 'commande', status: 'ordered', statusAt: now, addedAt: now, request, notes: '' };
    if (window.MissionRegistry?.addOrder) return window.MissionRegistry.addOrder(entry);
    const reg = readJson(REG_KEY, null) || { schema: 'mission-registry', version: 1, updatedAt: '', missions: [] };
    reg.missions.push(entry);
    reg.updatedAt = now;
    writeJson(REG_KEY, reg);
  }

  /** Prompt de génération réglé (paramètres en tête du bloc de docs/PROMPT_GENERATEUR_MISSIONS.md) copié, puis ChatGPT ouvert.
   *  out : élément du message (copie faite, ou texte à copier à la main si le navigateur refuse). Retourne le prompt. */
  async function sendPrompt(r, out) {
    const base = window.MISSION_PROMPT;
    if (!base) { if (out) out.textContent = t(['Prompt absent (mission_prompt.js non chargé).', 'Prompt missing (mission_prompt.js not loaded).']); return ''; }
    const set = (txt, key, val) => txt.replace(new RegExp(`^(\\s*${key}\\s*=\\s*)\\S+`, 'm'), (_, a) => a + String(val).replace(/\$/g, '$$$$'));
    let p = base;
    p = set(p, 'TYPE', r.type);
    const n = numbering(r.type), table = n.id ? `${r.type} ${r.id || n.id} série ${r.serie || n.serie}` : (window.SiaMission?.numberingTable?.() || 'auto');
    p = p.replace(/^(\s*PROCHAINS_NUMEROS\s*=\s*)auto\b/m, (_, a) => a + table.replace(/\$/g, '$$$$'));
    p = set(p, 'NOMBRE_MISSIONS', 1); p = set(p, 'THÉÂTRE', r.theatre || 'aléatoire'); p = set(p, 'ÉQUIPES_DEFA', r.teams);
    p = set(p, 'SOUS_TYPE', r.subtype || 'libre'); p = set(p, 'RENDEZ_VOUS', r.rdv || 'libre'); p = set(p, 'TYPES_EQUIPES', r.teamTypes || 'libre'); p = set(p, 'ÉQUIPES_SOL', r.ground ?? 'libre'); p = set(p, 'RAVITAILLEMENT', r.aar || 'libre');
    let copied = false;
    try { await navigator.clipboard.writeText(p); copied = true; } catch { /* refus du navigateur */ }
    window.open(p.length < 7000 ? `https://chatgpt.com/?q=${encodeURIComponent(p)}` : 'https://chatgpt.com/', '_blank', 'noopener');
    if (out) {
      if (copied) out.textContent = t(['Prompt copié ({n} caractères) : dans ChatGPT, coller (Ctrl+V) puis envoyer.', 'Prompt copied ({n} characters): paste it in ChatGPT (Ctrl+V) and send.', 'Prompt kopiert ({n} Zeichen): in ChatGPT einfügen (Strg+V) und senden.', 'Prompt copiado ({n} caracteres): pegarlo en ChatGPT (Ctrl+V) y enviar.'], { n: p.length.toLocaleString() });
      else {
        out.textContent = t(['Copie refusée par le navigateur : copier le texte ci-dessous puis le coller dans ChatGPT.', 'Copy refused by the browser: copy the text below and paste it in ChatGPT.']);
        const ta = document.createElement('textarea'); ta.value = p; ta.rows = 3; ta.readOnly = true; ta.className = 'mo-copy';
        out.append(ta); ta.select();
      }
    }
    window.__lastRegistryPrompt = p;   // contrôle (tests)
    return p;
  }

  // ---- styles du bloc (indépendants de la page hôte)
  if (!document.getElementById('missionOrderCss')) {
    const css = document.createElement('style');
    css.id = 'missionOrderCss';
    css.textContent = `.mo-form .mo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px 10px;margin:4px 0 8px}
.mo-form .mo-grid label{display:grid;gap:2px;font-size:11.5px;font-weight:600;opacity:.85}
.mo-form .mo-grid :is(select,input),.mo-form .mo-team input{padding:4px 6px;border:1px solid #c8d6dd;border-radius:6px;font:inherit;font-size:12.5px;min-width:0;width:100%;box-sizing:border-box}
.mo-form .mo-teams{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 12px;margin:4px 0 8px}
.mo-form .mo-team{display:flex;gap:8px;align-items:center}.mo-form .mo-team span{flex:none;font-weight:700;min-width:5.5em}
.mo-form .mo-small{font-size:12px;opacity:.8}.mo-form .mo-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mo-form .mo-copy{width:100%;margin-top:6px;font:11px ui-monospace,monospace;max-height:7em}.mo-form p{margin:4px 0}`;
    document.head.append(css);
  }

  /** Monte le formulaire de commande dans host. hint : consigne après la commande (texte) ; onOrdered(request) : rappel. */
  function mount(host, { hint = '', onOrdered = null } = {}) {
    if (!host) return;
    const o = load(), fam = families();
    const draw = () => {
      const f = fam.find(x => x.id === o.type), nx = numbering(o.type);
      const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
      const idText = nx.id ? `${nx.id} (${t(['série', 'series', 'Serie', 'serie'])} ${o.serie || nx.serie})` : t(['selon la famille tirée', 'per the drawn family', 'je nach gezogener Familie', 'según la familia sorteada']);
      host.classList.add('mo-form');
      host.innerHTML = `<div class="mo-grid">
        <label>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}<select data-o="type">${opt('aléatoire', t(['aléatoire', 'random', 'zufällig', 'aleatorio']), o.type)}${fam.map(x => opt(x.id, `${x.id} — ${x.label}`, o.type)).join('')}</select></label>
        <label>${esc(t(['Sous-type', 'Subtype', 'Untertyp', 'Subtipo']))}<select data-o="subtype" ${f ? '' : 'disabled'}>${opt('libre', t(['libre', 'free', 'frei', 'libre']), o.subtype)}${(f?.subtypes || []).map(x => opt(x, x, o.subtype)).join('')}</select></label>
        <label>${esc(t(['Théâtre', 'Theatre', 'Schauplatz', 'Teatro']))}<select data-o="theatre">${THEATRE_LIST.map(x => opt(x, x, o.theatre)).join('')}</select></label>
        <label title="${esc(t(['Facultatif : second théâtre relié par la mission (acheminement, relève, évacuation…)', 'Optional: second theatre linked by the mission (transit, relief, evacuation…)']))}">${esc(t(['Second théâtre', 'Second theatre', 'Zweiter Schauplatz', 'Segundo teatro']))}<select data-o="theatre2">${opt('', '—', o.theatre2)}${THEATRE_LIST.slice(1).map(x => opt(x, x, o.theatre2)).join('')}</select></label>
        ${[o.theatre, o.theatre2].includes('étranger') ? `<label title="${esc(t(['Pays du théâtre étranger (ex. Japon, Indonésie, Djibouti) ; vide = au choix du générateur', 'Country of the foreign theatre (e.g. Japan, Indonesia, Djibouti); empty = generator’s choice']))}">${esc(t(['Pays', 'Country', 'Land', 'País']))}<input data-o="country" value="${esc(o.country || '')}" placeholder="${esc(t(['au choix', 'any', 'beliebig', 'cualquiera']))}"></label>` : ''}
        <label>${esc(t(['Série', 'Series', 'Serie', 'Serie']))}<input type="number" min="1" data-o="serie" placeholder="auto" value="${esc(o.serie || '')}" title="${esc(t(['Série dans la famille ; vide = la suivante d’après le registre des missions', 'Series within the family; empty = the next one from the mission registry']))}"></label>
        <label>${esc(t(['Identifiant', 'Identifier', 'Kennung', 'Identificador']))}<input readonly value="${esc(idText)}" title="${esc(t(['Lettre de la famille + numéro suivant de la famille (registre) ; type aléatoire : selon la famille choisie par le générateur', 'Family letter + next family number (registry); random type: per the family picked by the generator']))}"></label>
        <label title="${esc(t(['Aéronefs DEFA en vol ; les équipes au sol (VSAV, CROSS, commandement…) se règlent à part', 'DEFA aircraft in flight; ground teams (ambulance, CROSS, command…) are set separately']))}">${esc(t(['Équipes DEFA en vol', 'DEFA flying teams', 'DEFA-Besatzungen im Flug', 'Equipos DEFA en vuelo']))}<input type="number" min="1" max="5" data-o="teams" value="${esc(o.teams)}"></label>
        <label>${esc(t(['Rendez-vous', 'Rendezvous', 'Treffpunkt', 'Encuentro']))}<select data-o="rdv">${opt('libre', t(['libre', 'free', 'frei', 'libre']), o.rdv)}${opt('avec', t(['avec', 'with', 'mit', 'con']), o.rdv)}${opt('sans', t(['sans', 'without', 'ohne', 'sin']), o.rdv)}</select></label>
        <label>${esc(t(['Équipes au sol', 'Ground teams', 'Bodenteams', 'Equipos en tierra']))}<select data-o="ground">${opt('libre', t(['libre', 'free', 'frei', 'libre']), o.ground)}${[0, 1, 2, 3].map(n => opt(n, n, o.ground)).join('')}</select></label>
        <label>${esc(t(['Ravitaillement en vol', 'Air refuelling', 'Luftbetankung', 'Reabastecimiento en vuelo']))}<select data-o="aar">${opt('libre', t(['libre', 'free', 'frei', 'libre']), o.aar)}${opt('oui', t(['oui', 'yes', 'ja', 'sí']), o.aar)}${opt('non', t(['non', 'no', 'nein', 'no']), o.aar)}</select></label>
      </div>
      <p><b>${esc(t(['Aéronef de chaque équipe en vol', 'Aircraft of each flying team', 'Luftfahrzeug jeder Besatzung', 'Aeronave de cada equipo']))}</b></p>
      <p class="mo-small">${esc(t(['Laisser vide = automatique (le générateur choisit un appareil adapté à la mission). Saisir ou choisir dans la liste : types courants et appareils de la flotte DEFA avec leur indicatif ; un même type peut servir à plusieurs équipes (indicatifs différents).', 'Empty = automatic (the generator picks a suitable aircraft). Type or pick from the list: common types and DEFA fleet aircraft with their callsign; the same type may serve several teams (different callsigns).']))}</p>
      <div class="mo-teams">${teamSlots(o).map((v, i) => `<label class="mo-team"><span>${esc(t(['Équipe', 'Team', 'Team', 'Equipo']))} ${String.fromCharCode(65 + i)}</span><input data-slot="${i}" list="moTeamList" value="${esc(v)}" placeholder="${esc(t(['automatique', 'automatic', 'automatisch', 'automático']))}"></label>`).join('')}</div>
      <datalist id="moTeamList">${teamChoices().map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <p class="mo-row"><button type="button" class="primary" data-mo="send" data-icon="send">${esc(t(['Commander : copier le prompt et ouvrir ChatGPT', 'Order: copy prompt and open ChatGPT', 'Bestellen: Prompt kopieren und ChatGPT öffnen', 'Encargar: copiar el prompt y abrir ChatGPT']))}</button></p>
      <div class="mo-small" data-mo="msg"></div>
      <p class="mo-small">${esc(hint || t(['La mission apparaît dans le registre avec le statut « commandée » ; enregistrer ensuite mission<ID>.yaml et summary<ID>.md dans le dossier Missions puis « Relire le dossier » (registre) : la commande est rapprochée de la mission générée (même série).', 'The mission appears in the registry as “ordered”; then save mission<ID>.yaml and summary<ID>.md into the Missions folder and “Re-read folder” (registry): the order is matched with the generated mission (same series).']))}</p>`;
      if (lastMsg) host.querySelector('[data-mo="msg"]').append(...lastMsg.map(n => n.cloneNode(true)));
      host.querySelectorAll('[data-o]').forEach(el => el.addEventListener('change', () => {
        o[el.dataset.o] = el.value;
        if (el.dataset.o === 'type') o.subtype = 'libre';
        save(o);
        if (['type', 'teams', 'serie', 'theatre', 'theatre2'].includes(el.dataset.o)) draw();
      }));
      host.querySelectorAll('[data-slot]').forEach(el => el.addEventListener('change', () => { teamSlots(o); o.teamSlots[+el.dataset.slot] = el.value.trim(); save(o); }));
      host.querySelector('[data-mo="send"]').onclick = async () => {
        const request = requestOf(o), out = host.querySelector('[data-mo="msg"]');
        record(request, o);
        await sendPrompt(request, out);
        lastMsg = [...out.childNodes].map(n => n.cloneNode(true));
        onOrdered?.(request);
      };
      window.AppFramework?.refresh?.();
    };
    draw();
  }

  window.MissionOrder = { mount, sendPrompt, families, numbering, requestOf: o => requestOf(o || load()) };
})();
