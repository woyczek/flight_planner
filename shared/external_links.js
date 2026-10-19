(() => {
  'use strict';
  // Liens vers les services externes de préparation du vol (menu « Ouvrir dans ▾ » : Carburant, Cartes de vol ; le CR
  // pourra le reprendre) : ExternalLinks.menu(host, flight) pose le bouton et son menu dans host ; flight est un objet
  // ou une fonction (éventuellement asynchrone) qui le rend au moment de l'ouverture : { dep, arr, route, type, reg,
  // callsign, altn, fl } ; route : case 15 (« LFBO N0450F350 DCT TOU UN460 NTS LFRN ») ou liste « ID lat lon » séparée
  // par des virgules (route d'un OFP SimBrief dans le Carburant).
  // Rien n'est envoyé qui ne soit déjà dans le vol (pas d'identifiant personnel, pas de clé) ; nouvel onglet, sans
  // référent (rel noreferrer). Formats vérifiés le 19 octobre 2026 (docs/technique/V2_FABLE.md § External links) :
  //   SimBrief      https://dispatch.simbrief.com/options/custom?orig=&dest=&type=&route=&reg=&airline=&fltnum=&callsign=&altn=&fl=
  //                 (www.simbrief.com/system/dispatch.php?… y redirige en gardant les paramètres ; noms des paramètres de
  //                 la doc de l'API SimBrief ; orig, dest et type exigés ; préremplit « Custom options » une fois connecté)
  //   SkyVector     https://skyvector.com/?fpl=<ADEP> <points> <ADES> (panneau Flight Plan rempli, route tracée)
  //   Navigraph     https://charts.navigraph.com/airport/<OACI> (adresse gardée, page « Sign in » : à confirmer connecté)
  //   ChartFox      https://chartfox.org/<OACI> (renvoie vers la connexion VATSIM : à confirmer connecté)
  if (window.ExternalLinks) return;
  const K = window.RepositoryKit;
  /** Ligne fr / en / de / es dans la langue de la page ({x} remplacés). */
  const tr = (row, vars = {}) => K?.tf ? K.tf(row, vars) : String(row[0]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const ICAO = /^[A-Z]{4}$/;
  const up = v => String(v || '').trim().toUpperCase();

  /** Mots de la route : case 15 (séparée par des espaces) ou liste à virgules / lignes (premier mot de chaque entrée). */
  const words = route => {
    const s = up(route);
    return (/[,;\n]/.test(s) ? s.split(/[,;\n]+/).map(e => e.trim().split(/\s+/)[0]) : s.split(/\s+/)).filter(Boolean);
  };
  /** Points de la route : sans groupes vitesse / niveau (N0450F350), sans changements de niveau après un point
   *  (« NTS/N0440F370 » → NTS), sans terrains de départ et d'arrivée en tête et en fin. */
  function points(route, dep, arr) {
    const t = words(route).map(x => x.split('/')[0]).filter(x => x && !/^[NKM]\d{3,4}([FASM]\d{3,4}|VFR)$/.test(x) &&
      !/^(FL\d{2,3}|VFR|IFR)$/.test(x));
    if (t[0] === dep) t.shift();
    if (t[t.length - 1] === arr) t.pop();
    while (t[0] === 'DCT') t.shift(); // direct en tête ou en fin : sans objet
    while (t[t.length - 1] === 'DCT') t.pop();
    return t;
  }
  /** Vol normalisé : terrains en OACI (sinon pris en tête et en fin de route), points, type, immatriculation… */
  function norm(f = {}) {
    const raw = words(f.route).map(x => x.split('/')[0]);
    const dep = ICAO.test(up(f.dep)) ? up(f.dep) : ICAO.test(raw[0] || '') ? raw[0] : '',
      arr = ICAO.test(up(f.arr)) ? up(f.arr) : ICAO.test(raw[raw.length - 1] || '') && raw.length > 1 ? raw[raw.length - 1] : '';
    const fl = Number(String(f.fl ?? '').replace(/^FL/i, ''));
    return {
      dep,
      arr,
      pts: points(f.route, dep, arr),
      type: up(f.type).replace(/[^A-Z0-9]/g, '').slice(0, 4),
      reg: up(f.reg).replace(/[^A-Z0-9]/g, ''),
      callsign: up(f.callsign).replace(/\s+/g, ''),
      altn: ICAO.test(up(f.altn)) ? up(f.altn) : '',
      fl: fl > 0 && fl < 1000 ? `FL${String(Math.round(fl)).padStart(3, '0')}` : ''
    };
  }
  const MISS = {
    dep: ['pas de terrain de départ dans le vol', 'no departure aerodrome in the flight', 'kein Startflugplatz im Flug',
      'no hay aeródromo de salida en el vuelo'
    ],
    arr: ['pas de terrain d’arrivée dans le vol', 'no arrival aerodrome in the flight', 'kein Zielflugplatz im Flug',
      'no hay aeródromo de llegada en el vuelo'
    ],
    type: ['pas de type d’appareil (choisir l’avion)', 'no aircraft type (choose the aircraft)',
      'kein Luftfahrzeugtyp (Flugzeug wählen)', 'no hay tipo de aeronave (elegir el avión)'
    ],
    login: ['connexion requise ; page de l’aérodrome si le site la garde',
      'sign-in required; aerodrome page if the site keeps it', 'Anmeldung erforderlich; Flugplatzseite, wenn die Website sie behält',
      'inicio de sesión necesario; página del aeródromo si el sitio la conserva'
    ],
    simbrief: ['connexion SimBrief requise ; options du vol préremplies', 'SimBrief sign-in required; flight options prefilled',
      'SimBrief-Anmeldung erforderlich; Flugoptionen vorausgefüllt',
      'inicio de sesión en SimBrief necesario; opciones del vuelo prerrellenadas'
    ]
  };
  /** Entrées du menu pour un vol : { label, href ('' si grisée), why (motif ou précision, infobulle) }. */
  function links(flight) {
    const f = norm(flight),
      out = [];
    // SimBrief : orig, dest et type exigés ; indicatif « AFR1234 » → compagnie et numéro de vol
    const sb = new URLSearchParams();
    const cs = /^([A-Z]{3})(\d{1,4}[A-Z]{0,2})$/.exec(f.callsign);
    for (const [k, v] of [
        ['orig', f.dep],
        ['dest', f.arr],
        ['type', f.type],
        ['route', f.pts.join(' ')],
        ['reg', f.reg],
        ['airline', cs?.[1] || ''],
        ['fltnum', cs?.[2] || ''],
        ['callsign', f.callsign],
        ['altn', f.altn],
        ['fl', f.fl]
      ])
      if (v) sb.set(k, v);
    const sbMiss = !f.dep ? 'dep' : !f.arr ? 'arr' : !f.type ? 'type' : '';
    out.push({
      label: tr(['SimBrief — préparer ce vol', 'SimBrief — plan this flight', 'SimBrief — diesen Flug planen',
        'SimBrief — preparar este vuelo'
      ]),
      href: sbMiss ? '' : `https://dispatch.simbrief.com/options/custom?${sb}`,
      why: tr(MISS[sbMiss || 'simbrief'])
    });
    // SkyVector : départ, points, arrivée
    out.push({
      label: tr(['SkyVector — la route', 'SkyVector — the route', 'SkyVector — die Route', 'SkyVector — la ruta']),
      href: f.dep && f.arr ? `https://skyvector.com/?fpl=${encodeURIComponent([f.dep, ...f.pts.filter(p => p !== 'DCT'), f.arr].join(' '))}` : '',
      why: f.dep && f.arr ? '' : tr(MISS[f.dep ? 'arr' : 'dep'])
    });
    // cartes des terrains : Navigraph Charts et ChartFox, départ puis arrivée
    for (const [name, base] of [
        ['Navigraph Charts', 'https://charts.navigraph.com/airport/'],
        ['ChartFox', 'https://chartfox.org/']
      ])
      for (const [code, row, miss] of [
          [f.dep, ['départ', 'departure', 'Start', 'salida'], 'dep'],
          [f.arr, ['arrivée', 'arrival', 'Ziel', 'llegada'], 'arr']
        ]) out.push({
        label: `${name} — ${tr(row)}${code ? ` ${code}` : ''}`,
        href: code ? `${base}${code}` : '',
        why: tr(MISS[code ? 'login' : miss])
      });
    return out;
  }

  let css = false;
  /** Styles du menu (une fois par page) : bouton secondaire de la page, liste flottante placée dans la fenêtre. */
  function style() {
    if (css) return;
    css = true;
    const s = document.createElement('style');
    s.textContent = '.xl{position:relative;display:inline-block}' +
      '.xl-pop{position:fixed;z-index:1000;min-width:220px;max-width:min(340px,calc(100vw - 16px));overflow-y:auto;padding:6px;' +
      'background:var(--card,#fff);color:var(--ink,#111);border:1px solid var(--line,#ccd);box-shadow:0 8px 24px rgba(0,0,0,.18)}' +
      '.xl-pop a,.xl-pop span{display:block;padding:7px 10px;font-size:13px;text-decoration:none;color:inherit;white-space:nowrap;' +
      'overflow:hidden;text-overflow:ellipsis}' +
      '.xl-pop a:hover,.xl-pop a:focus{background:var(--soft,#eef2f8);outline:none}' +
      '.xl-pop span{opacity:.5;cursor:not-allowed}';
    document.head.append(s);
  }
  /** Pose le bouton « Ouvrir dans ▾ » et son menu dans host ; flight : vol (objet) ou fonction qui le rend à
   *  l'ouverture. Menu court : placé dans la fenêtre, refermé par Échap, un clic ailleurs ou un choix. Rend
   *  { button, close }. */
  function menu(host, flight) {
    style();
    const wrap = Object.assign(document.createElement('span'), {
        className: 'xl'
      }),
      button = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'secondary xl-btn'
      }),
      pop = Object.assign(document.createElement('div'), {
        className: 'xl-pop',
        hidden: true
      });
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', 'false');
    button.dataset.noI18n = '';
    pop.setAttribute('role', 'menu');
    /** Libellé du bouton dans la langue de la page. */
    const label = () => button.textContent = tr(['Ouvrir dans ▾', 'Open in ▾', 'Öffnen in ▾', 'Abrir en ▾']);
    label();
    /** Place la liste sous le bouton (au-dessus s'il manque de place), dans la fenêtre. */
    const place = () => {
      const at = button.getBoundingClientRect(),
        m = 8,
        w = pop.offsetWidth || 260,
        below = innerHeight - at.bottom - 6 - m,
        above = at.top - 6 - m,
        h = pop.scrollHeight,
        upward = h > below && above > below;
      pop.style.maxHeight = `${Math.max(120, upward ? above : below)}px`;
      pop.style.left = `${Math.max(m, Math.min(at.left, innerWidth - m - w))}px`;
      pop.style.top = `${upward ? Math.max(m, at.top - 6 - Math.min(h, above)) : at.bottom + 6}px`;
    };
    /** Referme le menu. */
    const close = () => {
      if (pop.hidden) return;
      pop.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
    /** Échap : menu refermé, retour au bouton. */
    const onKey = e => {
      if (e.key !== 'Escape') return;
      close();
      button.focus();
    };
    /** Clic hors du menu et du bouton : menu refermé. */
    const onDown = e => {
      if (!wrap.contains(e.target)) close();
    };
    /** Ouvre le menu, entrées refaites depuis le vol courant (lu à l'ouverture). */
    const open = async () => {
      let f = {};
      try {
        f = (typeof flight === 'function' ? await flight() : flight) || {};
      } catch {
        /* vol illisible : entrées grisées avec leur motif */
      }
      pop.replaceChildren(...links(f).map(l => {
        const el = document.createElement(l.href ? 'a' : 'span');
        el.textContent = l.label;
        el.title = l.why || '';
        el.setAttribute('role', 'menuitem');
        if (l.href) Object.assign(el, {
          href: l.href,
          target: '_blank',
          rel: 'noopener noreferrer'
        });
        else el.setAttribute('aria-disabled', 'true');
        return el;
      }));
      pop.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      place();
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onDown, true);
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
      pop.querySelector('a')?.focus();
    };
    button.onclick = () => pop.hidden ? open() : close();
    pop.addEventListener('click', e => {
      if (e.target.closest('a')) setTimeout(close);
    });
    window.addEventListener('repository-language-change', () => {
      label();
      close();
    });
    wrap.append(button, pop);
    host.append(wrap);
    return {
      button,
      close
    };
  }

  window.ExternalLinks = {
    menu,
    links,
    points,
    /** Vol normalisé ({ dep, arr, pts, type, reg, callsign, altn, fl }), pour comparer le trajet à une autre source. */
    normalize: norm
  };
})();
