(() => {
  'use strict';
  // « Aujourd'hui » du pilote (v2-fable, docs/technique/V2_FABLE.md) : ce que la suite sait déjà, rassemblé en trois
  // réponses — ma prochaine mission, les comptes rendus à écrire, ma semaine — et le trigramme saisi sur place quand il
  // manque. Sources : affectations (shared/assignments.js, chargé par repository_nav.js) ; registre des CR
  // (shared/mission_core/ledger.js, facultatif : sans lui, toute mission passée est « à rendre »). Textes produits dans la
  // langue de la page (RepositoryKit.t), rien de traduit après coup ; une écriture dans la page seulement si elle change.
  //
  // API (window.PilotToday) :
  //   next()                      → prochaine affectation du pilote (ou null) ;
  //   pending()                   → affectations passées (21 jours) sans CR, la plus récente d'abord, 7 au plus ;
  //   week(ms?)                   → { monday, days: [{ at, list }] } : la semaine (UTC) du jour donné ;
  //   upcoming(n)                 → les n affectations à venir après la prochaine, dans les sept jours ;
  //   mount(hôte, kind, { onSave, more, actions }) → rend et tient à jour un bloc : 'next' | 'pending' | 'week' |
  //                                 'trigram' ; 'next' : more (nombre de missions suivantes listées dessous, 0 par
  //                                 défaut), actions (dossier, Cartes de vol, Carburant, CR ; sinon le dossier seul) ;
  //   folderUrl(a, act), reportUrl(a) → adresses du dossier de la mission, avec un geste lancé à l'ouverture
  //                                 (?do=maps | fuel | cr), et du CR commencé depuis le dossier (?do=cr).
  // Les liens vers un dossier portent data-key (clé de l'affectation) et data-do : Mes missions les ouvre sur place.
  if (window.PilotToday) return;
  const K = window.RepositoryKit,
    t = K.t,
    tf = K.tf,
    esc = K.esc;
  const PROFILE = 'missionReportingConfig:v1', // profil pilote (shared/pilot_profile.js) : trigramme
    SKIP = 'pilotCrSkipped:v1', // clés des affectations dont le pilote a dit « pas de CR »
    PAST_MS = 21 * 864e5, // missions passées regardées pour les CR à écrire
    GRACE_MS = 6 * 36e5, // une mission reste « à venir » quelques heures après son décollage (comme Mes missions)
    MAX_ROWS = 7; // au plus sept lignes par bloc (règle v2)
  /** Socle des affectations (window.MissionAssignments). */
  const A = () => window.MissionAssignments;
  /** Racine de la suite (bandeau commun, sinon dossier parent de ce script). */
  const root = () => window.RepositoryNav?.root || new URL('../', document.currentScript?.src || location.href).href;
  /** Langue de la page (bandeau commun, sinon attribut lang). */
  const lang = () => window.RepositoryNav?.getLanguage?.() || document.documentElement.lang || 'fr';
  /** Attend le socle des affectations (chargé par repository_nav.js) ; faux s'il n'arrive pas. */
  const ready = async () => {
    for (let n = 0; !window.MissionAssignments && n < 120; n++) await new Promise(r => setTimeout(r, 50));
    return !!window.MissionAssignments;
  };
  /** Toutes les affectations du pilote (passées comprises), triées par heure ; [] sans trigramme. */
  const all = async () => {
    if (!(await ready()) || !A().trigram()) return [];
    return A().mine((await A().index()).assignments, {
      all: true
    });
  };
  /** Heure de l'affectation (décollage ou heure d'astreinte), en ms ; 0 sans date. */
  const when = a => A().when(a);
  /** Vrai si le CR du registre est issu de cette affectation (metadata.orderRef posé par Mes missions :
   *  mission/pilote/décollage[/convoyage]). */
  const reportedBy = (a, m) => {
    const ref = String(m.metadata?.orderRef || ''),
      head = `${a.mission}/${a.pilot}`;
    return ref === head || ref.startsWith(`${head}/`);
  };
  let ledgerLoad = null; // lecture du registre, une fois par page
  /** Missions du registre des CR (toutes familles) ; null si le registre n'est pas chargé sur cette page. */
  const ledger = async () => {
    const L = window.MissionLedger;
    if (!L) return null;
    ledgerLoad ||= L.load().catch(() => null);
    await ledgerLoad;
    return L.store?.missions || [];
  };
  /** Clés des affectations écartées (« Pas de CR »). */
  const skipped = () => K.store.json(SKIP, []) || [];
  /** Prochaine affectation du pilote (à venir, ou décollée depuis moins de six heures) ; null sans rien. */
  async function next() {
    const now = Date.now() - GRACE_MS;
    return (await all()).find(a => !when(a) || when(a) >= now) || null;
  }
  /** Affectations à venir après la prochaine (n au plus), dans les sept jours qui viennent. */
  async function upcoming(n = MAX_ROWS) {
    const first = await next();
    if (!first) return [];
    const now = Date.now() - GRACE_MS,
      end = Date.now() + 7 * 864e5;
    return (await all()).filter(a => a !== first && A().key(a) !== A().key(first) && when(a) >= now && when(a) < end).slice(0, n);
  }
  /** Affectations passées (21 jours) sans CR dans le registre ni « Pas de CR », la plus récente d'abord, 7 au plus. */
  async function pending() {
    const now = Date.now(),
      list = (await all()).filter(a => when(a) && when(a) < now && when(a) >= now - PAST_MS),
      done = await ledger(),
      out = skipped();
    return list.filter(a => !out.includes(A().key(a)) && !(done && done.some(m => reportedBy(a, m)))).sort((x, y) => when(y) - when(x))
      .slice(0,
        MAX_ROWS);
  }
  /** Lundi 00:00 UTC de la semaine du jour donné (ms). */
  const monday = ms => {
    const d = new Date(ms);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5;
  };
  /** Semaine (UTC) du jour donné : lundi et sept jours { at, list } avec les affectations du pilote de chaque jour. */
  async function week(ms = Date.now()) {
    const m0 = monday(ms),
      list = await all();
    return {
      monday: m0,
      days: Array.from({
        length: 7
      }, (_, i) => {
        const at = m0 + i * 864e5;
        return {
          at,
          list: list.filter(a => when(a) >= at && when(a) < at + 864e5)
        };
      })
    };
  }
  /** Adresse du dossier de la mission dans Mes missions (?mission=…), avec act lancé à l'ouverture (?do=…). */
  const folderUrl = (a, act = '') => `${new URL('apps/pilot/mes_missions.html', root()).href}?mission=${encodeURIComponent(a.mission)}${act ? `&do=${act}` : ''}`;
  /** Adresse du dossier avec le CR commencé dès l'ouverture (?do=cr, Mes missions). */
  const reportUrl = a => folderUrl(a, 'cr');
  /** Lien vers le dossier (classe, geste act, texte) : data-key et data-do pour l'ouverture sur place (Mes missions). */
  const folderLink = (a, act, cls, text, title = '') => `<a class="${cls}" href="${esc(folderUrl(a, act))}" data-key="${esc(A().key(a))}" data-do="${esc(act)}"${title ? ` title="${esc(title)}"` : ''}>${text}</a>`;
  /** Jour court dans la langue de la page, en UTC (« jeu. 8 oct. »). */
  const day = ms => new Intl.DateTimeFormat(lang(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  }).format(ms);
  /** Heure UTC « 18:00Z ». */
  const hhmm = ms => `${new Date(ms).toISOString().slice(11, 16)}Z`;
  /** Ligne d'identité d'une affectation : type et immatriculation, terrain, indicatif. */
  const details = a => [
    [a.aircraft?.type, a.aircraft?.registration].filter(Boolean).join(' '), a.departure, a.callsign
  ].filter(Boolean).join(' · ');
  /** Heure de l'affectation en clair : décollage, ou astreinte (prêt à telle heure). */
  const timeText = a => a.alert ? tf(['astreinte, prêt à {h}', 'on call, ready at {h}', 'Bereitschaft, bereit um {h}',
    'alerta, listo a las {h}'
  ], {
    h: hhmm(Date.parse(a.alert.ready_at_utc))
  }) : when(a) ? `${day(when(a))}, ${hhmm(when(a))}` : t(['heure à préciser', 'time to be set', 'Zeit offen', 'hora por definir']);

  /** Feuille de style du module, posée une fois (couleurs du thème et du design : jetons --sk-*, --repo-*). */
  const css = () => {
    if (document.getElementById('ptCss')) return;
    const s = document.createElement('style');
    s.id = 'ptCss';
    s.textContent = `.pt-card{display:grid;gap:6px;padding:14px 16px;border:1px solid var(--sk-card-bd,var(--line,#8884));border-radius:calc(12px*var(--repo-round,1));background:var(--repo-veil,var(--sk-card,var(--card,transparent)))}
.pt-when{font-variant-numeric:tabular-nums;opacity:.85}.pt-title{font-size:17px;font-weight:650}.pt-new{font-size:12px;margin-left:6px;color:var(--accent,#2a6df4)}
.pt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.pt-rows{display:grid;gap:8px}
.pt-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--sk-card-bd,var(--line,#8884));border-radius:calc(10px*var(--repo-round,1));background:var(--repo-veil,var(--sk-card,var(--card,transparent)))}
.pt-row>span{flex:1;min-width:200px}.pt-row small{display:block;opacity:.8}
.pt-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}@media (max-width:900px){.pt-week{grid-template-columns:repeat(4,minmax(0,1fr))}}
.pt-day{display:grid;align-content:start;gap:4px;min-height:84px;padding:8px;border:1px solid var(--sk-card-bd,var(--line,#8884));border-radius:calc(10px*var(--repo-round,1));background:var(--repo-veil,var(--sk-card,var(--card,transparent)))}
.pt-day.pt-today{outline:2px solid var(--accent,#2a6df4);outline-offset:-2px}.pt-day b{font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.02em;opacity:.8}
.pt-day a{display:block;font-size:12px;line-height:1.3;text-decoration:none;color:inherit;padding:4px 6px;border-radius:calc(6px*var(--repo-round,1));background:color-mix(in srgb,var(--accent,#2a6df4) 14%,transparent)}
.pt-day a:hover{background:color-mix(in srgb,var(--accent,#2a6df4) 26%,transparent)}
.pt-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:calc(10px*var(--repo-round,1));border:1px solid var(--sk-card-bd,transparent);font:inherit;font-weight:650;cursor:pointer;text-decoration:none;background:var(--sk-btn,#e5e7eb);color:var(--sk-btn-ink,var(--ink,inherit))}
.pt-btn.pt-primary{background:var(--accent,#2a6df4);color:#fff;border-color:transparent}.pt-btn.pt-ghost{background:transparent;font-weight:500}
.pt-tri{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:8px}.pt-tri label{display:grid;gap:4px;font-size:13px}
.pt-tri input{width:6em;text-transform:uppercase;font:inherit;padding:8px 10px;border:1px solid var(--line,#8884);border-radius:calc(8px*var(--repo-round,1));background:var(--repo-veil,var(--sk-card,var(--card,#fff)));color:inherit}
.pt-empty{opacity:.85;margin:0}
.pt-more{display:grid;gap:2px;margin-top:6px}.pt-more a{display:flex;gap:10px;flex-wrap:wrap;padding:5px 8px;text-decoration:none;color:inherit;border-radius:calc(6px*var(--repo-round,1))}
.pt-more a:hover{background:color-mix(in srgb,var(--accent,#2a6df4) 14%,transparent)}.pt-more a b{font-weight:600}.pt-more a span{opacity:.8}
.pt-more>small{opacity:.75;text-transform:uppercase;letter-spacing:.03em;font-size:11px}`;
    document.head.append(s);
  };

  /** Formulaire de saisie du trigramme (un champ, un bouton), avec sa phrase d'explication ; vide si le trigramme est
   *  fixé par la connexion (mode production, usurpation : shared/users.js). */
  const triForm = () => window.SuiteUsers?.trigramLocked?.() ? `<p class="pt-empty">${esc(t(['Aucun trigramme : connectez-vous pour voir vos missions.',
    'No trigram: sign in to see your missions.', 'Kein Kürzel: anmelden, um Ihre Missionen zu sehen.',
    'Sin trigrama: inicie sesión para ver sus misiones.'
  ]))}</p>` : `<p class="pt-empty">${esc(t(['Votre trigramme sert à retrouver les missions que le Centre vous affecte.',
    'Your trigram is used to find the missions the Centre assigns to you.',
    'Ihr Kürzel dient dazu, die Ihnen vom Zentrum zugewiesenen Missionen zu finden.',
    'Su trigrama sirve para encontrar las misiones que el Centro le asigna.'
  ]))}</p><form class="pt-tri" data-tri><label>${esc(t(['Trigramme', 'Trigram', 'Kürzel', 'Trigrama']))}<input name="tri" maxlength="4" pattern="[A-Za-z]{2,4}" autocomplete="off" required placeholder="ABC"></label><button type="submit" class="pt-btn pt-primary">${esc(t(['Enregistrer', 'Save', 'Speichern', 'Guardar']))}</button></form>`;

  /** HTML du bloc « Ma prochaine mission » : la carte de la mission (dossier ; avec actions, aussi Cartes de vol,
   *  Carburant et CR), puis jusqu'à more missions suivantes des sept jours, une ligne chacune ; une ligne sans rien. */
  const nextHtml = async ({
    more = 0,
    actions = false
  } = {}) => {
    if (!A().trigram()) return triForm();
    const a = await next();
    if (!a) return `<p class="pt-empty">${esc(t(['Aucune mission à venir.', 'No upcoming mission.', 'Keine anstehende Mission.',
      'Ninguna misión próxima.'
    ]))}</p>`;
    // Cartes de vol et Carburant : seulement si la page est proposée au pilote (niveau d'utilisation, modules), comme
    // les boutons du dossier ; pas pour un convoyage
    const shown = path => a.role !== 'convoyage' && (window.RepositoryNav?.levels?.visible?.(path) ?? true);
    const open = folderLink(a, '', 'pt-btn pt-primary', esc(t(['Ouvrir le dossier', 'Open the folder', 'Mappe öffnen',
        'Abrir la carpeta'
      ]))),
      acts = actions ? [open,
        !shown('apps/planner/map_planner.html') ? '' : folderLink(a, 'maps', 'pt-btn', esc(t(['Cartes de vol', 'Flight maps',
          'Flugkarten',
          'Mapas de vuelo'
        ]))),
        !shown('apps/planner/flight_performance_planner.html') ? '' : folderLink(a, 'fuel', 'pt-btn', esc(t(['Carburant', 'Fuel',
          'Kraftstoff', 'Combustible'
        ]))),
        folderLink(a, 'cr', 'pt-btn pt-ghost', esc(t(['Créer le CR', 'Create the report', 'Bericht anlegen', 'Crear el informe'])))
      ].join('') : open;
    const rest = more > 0 ? await upcoming(more) : [];
    const list = rest.length ? `<div class="pt-more"><small>${esc(t(['Ensuite, dans les sept jours', 'Then, within seven days',
      'Danach, in den nächsten sieben Tagen', 'Después, en los siete días'
    ]))}</small>${rest.map(b => folderLink(b, '', '', `<b>${esc(timeText(b))}</b> ${esc(b.mission)} — ${esc(b.title || '')}${details(b) ? ` <span>${esc(details(b))}</span>` : ''}`, b.title || '')).join('')}</div>` : '';
    return `<div class="pt-card"><div class="pt-when">${esc(timeText(a))}</div><div class="pt-title">${esc(a.mission)} — ${esc(a.title || '')}${A().isRead(a) ? '' : `<span class="pt-new">● ${esc(t(['nouvelle', 'new', 'neu', 'nueva']))}</span>`}</div><div class="small">${esc(details(a))}${a.role === 'convoyage' ? ` · ${esc(t(['convoyage', 'ferry', 'Überführung', 'traslado']))}` : ''}</div><div class="pt-actions">${acts}</div></div>${list}`;
  };
  /** HTML du bloc « Comptes rendus à écrire » ; sans trigramme : le formulaire, ou une phrase si un autre bloc de la page
   *  le demande déjà ({ trigram: false }). */
  const pendingHtml = async ({
    trigram = true
  } = {}) => {
    if (!A().trigram()) return trigram ? triForm() : `<p class="pt-empty">${esc(t(['Trigramme à saisir ci-dessus.', 'Trigram to enter above.', 'Kürzel oben eingeben.', 'Trigrama por introducir arriba.']))}</p>`;
    const list = await pending();
    if (!list.length) return `<p class="pt-empty">${esc(t(['Aucun compte rendu en attente.', 'No report pending.', 'Kein Bericht offen.',
      'Ningún informe pendiente.'
    ]))}</p>`;
    return `<div class="pt-rows">${list.map(a => `<div class="pt-row"><span><b>${esc(a.mission)}</b> — ${esc(a.title || '')}<small>${esc(timeText(a))}${details(a) ? ` · ${esc(details(a))}` : ''}</small></span>${folderLink(a, 'cr', 'pt-btn pt-primary', esc(t(['Écrire le compte rendu', 'Write the report', 'Bericht schreiben', 'Escribir el informe'])))}<button type="button" class="pt-btn pt-ghost" data-skip="${esc(A().key(a))}" title="${esc(t(['Cette mission n’aura pas de compte rendu (mémorisé dans ce navigateur)', 'This mission will have no report (remembered in this browser)', 'Diese Mission bekommt keinen Bericht (in diesem Browser gemerkt)', 'Esta misión no tendrá informe (recordado en este navegador)']))}">${esc(t(['Pas de CR', 'No report', 'Kein Bericht', 'Sin informe']))}</button></div>`).join('')}</div>`;
  };
  /** HTML du bloc « Ma semaine » : sept jours, le jour courant marqué, une vignette par mission. */
  const weekHtml = async () => {
    const w = await week(),
      today = monday(Date.now()) + Math.floor((Date.now() - monday(Date.now())) / 864e5) * 864e5;
    const tri = A().trigram();
    return `<div class="pt-week">${w.days.map(d => `<div class="pt-day${d.at === today ? ' pt-today' : ''}"><b>${esc(day(d.at))}</b>${d.list.map(a => `<a href="${esc(folderUrl(a))}" title="${esc(a.title || '')}">${esc(a.alert ? t(['astreinte', 'on call', 'Bereitschaft', 'alerta']) : hhmm(when(a)))} ${esc(a.mission)}</a>`).join('')}</div>`).join('')}</div>${tri ? '' : `<p class="pt-empty">${esc(t(['Sans trigramme, la semaine reste vide.', 'Without a trigram, the week stays empty.', 'Ohne Kürzel bleibt die Woche leer.', 'Sin trigrama, la semana queda vacía.']))}</p>`}`;
  };

  /** Enregistre le trigramme saisi dans le profil pilote (missionReportingConfig:v1), prévient la page (événement
   *  pilot-profile-change, pli cacheté de l'en-tête) et le menu ☰ ; faux si le stockage est refusé. */
  function saveTrigram(value) {
    const tri = String(value || '').trim().toUpperCase();
    if (!/^[A-Z]{2,4}$/.test(tri)) return false;
    const p = K.store.json(PROFILE, {}) || {};
    if (p.trigram !== tri) {
      p.trigram = tri;
      if (!K.store.setJson(PROFILE, p)) return false;
    }
    const menu = document.querySelector('#repoPilotProfile [data-profile="trigram"]');
    if (menu && menu.value !== tri) menu.value = tri;
    window.dispatchEvent(new CustomEvent('pilot-profile-change', {
      detail: {
        trigram: tri
      }
    }));
    A()?.envelope?.();
    window.AppFramework?.notify?.(tf(['Trigramme enregistré : {t}.', 'Trigram saved: {t}.', 'Kürzel gespeichert: {t}.',
      'Trigrama guardado: {t}.'
    ], {
      t: tri
    }), 'ok');
    return true;
  }

  /** Rend un bloc dans l'hôte et le tient à jour (langue, profil, connexion, autre onglet) ; { onSave } : appelé après
   *  l'enregistrement du trigramme (la page relit ce qui dépend de lui) ; { trigram: false } : le bloc ne demande pas le
   *  trigramme lui-même (un autre bloc de la page s'en charge). Retour : fonction de rafraîchissement. */
  function mount(host, kind, {
    onSave,
    trigram = true,
    more = 0,
    actions = false
  } = {}) {
    css();
    let seq = 0;
    /** Dessine (ou redessine) le bloc ; un rendu plus récent rend celui-ci caduc. */
    const draw = async () => {
      const n = ++seq;
      if (!(await ready())) return;
      const html = kind === 'next' ? await nextHtml({
          more,
          actions
        }) : kind === 'pending' ? await pendingHtml({
          trigram
        }) : kind === 'week' ?
        await weekHtml() : A().trigram() ?
        '' : triForm();
      if (n !== seq) return;
      if (host.innerHTML !== html) host.innerHTML = html;
    };
    host.addEventListener('submit', e => {
      const f = e.target.closest('form[data-tri]');
      if (!f) return;
      e.preventDefault();
      if (!saveTrigram(f.elements.tri.value)) {
        window.AppFramework?.notify?.(t(['Trigramme attendu : deux à quatre lettres.', 'Expected trigram: two to four letters.',
          'Erwartetes Kürzel: zwei bis vier Buchstaben.', 'Trigrama esperado: de dos a cuatro letras.'
        ]), 'warn');
        return;
      }
      draw();
      onSave?.();
    });
    host.addEventListener('click', e => {
      const b = e.target.closest('button[data-skip]');
      if (!b) return;
      const out = skipped();
      if (!out.includes(b.dataset.skip)) K.store.setJson(SKIP, out.concat(b.dataset.skip));
      draw();
    });
    for (const ev of ['repository-language-change', 'pilot-profile-change', 'suite-session-change', 'suite-mode-change',
        'suite-level-change'
      ]) window
      .addEventListener(ev, () =>
        setTimeout(draw));
    window.addEventListener('storage', e => {
      if (!e.key || [PROFILE, SKIP, 'assignmentsRead:v1'].includes(e.key)) draw();
    });
    draw();
    return draw;
  }

  window.PilotToday = {
    next,
    upcoming,
    pending,
    week,
    mount,
    folderUrl,
    reportUrl,
    saveTrigram
  };
})();
