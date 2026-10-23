// V3 frame/lib (propriétaire : fuel ; carte et compte rendu peuvent s'en servir) — liens « Ouvrir dans » vers les
// services de préparation du vol, partie pure de shared/external_links.js (V2) recopiée telle quelle le 23/10/2026 ;
// la traduction est passée en paramètre (tr : ligne [fr, en, de, es], valeurs → texte), le menu est dessiné par le
// module. Commentaire d'origine :
// Liens vers les services externes de préparation du vol (menu « Ouvrir dans ▾ » : Carburant, Cartes de vol ; le CR
// pourra le reprendre) : ExternalLinks.menu(host, flight) pose le bouton et son menu dans host ; flight est un objet
// ou une fonction (éventuellement asynchrone) qui le rend au moment de l'ouverture : { dep, arr, route, type, reg,
// callsign, altn, fl, tas, etd } (tas : vitesse vraie de croisière en kt, quand la route n'a pas de groupe vitesse /
// niveau ; etd : heure de départ « HHMM » UTC) ; route : case 15 (« LFBO N0450F350 DCT TOU UN460 NTS LFRN ») ou liste « ID lat lon » séparée
// par des virgules (route d'un OFP SimBrief dans le Carburant).
// Rien n'est envoyé qui ne soit déjà dans le vol (pas d'identifiant personnel, pas de clé) ; nouvel onglet, sans
// référent (rel noreferrer). Formats vérifiés le 19 octobre 2026 (docs/technique/V2_FABLE.md § External links) :
//   SimBrief      https://dispatch.simbrief.com/options/custom?orig=&dest=&type=&route=&reg=&airline=&fltnum=&callsign=&altn=&fl=
//                 (www.simbrief.com/system/dispatch.php?… y redirige en gardant les paramètres ; noms des paramètres de
//                 la doc de l'API SimBrief ; orig, dest et type exigés ; préremplit « Custom options » une fois connecté)
//   SkyVector     https://skyvector.com/?fpl=<ADEP> <points> <ADES> (panneau Flight Plan rempli, route tracée) ; chaque
//                 nom est résolu seul (pas de voie aérienne, pas de procédure ; un nom inconnu près de la route part vers
//                 un homonyme lointain : « TOC » → Toccoa, États-Unis) : noms de 2 à 5 lettres seulement, sinon les
//                 coordonnées au format OACI (4341N00122E, accepté : point « GPS ») quand la route les donne
//   Navigraph     https://charts.navigraph.com/airport/<OACI> (adresse gardée, page « Sign in » : à confirmer connecté)
//   ChartFox      https://chartfox.org/<OACI> (renvoie vers la connexion VATSIM : à confirmer connecté)

/** Traduction par défaut (français, {x} remplacés), quand le module n'en passe pas. */
const defaultTr = (row, vars = {}) => String(row[0]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const ICAO = /^[A-Z]{4}$/;
const up = v => String(v || '').trim().toUpperCase();

/** Coordonnées au format OACI (degrés et minutes : 4341N00122E), comprises par SkyVector et SimBrief. */
const dm = (v, w, pos, neg) => {
  const a = Math.abs(v);
  let d = Math.floor(a),
    m = Math.round((a - d) * 60);
  if (m === 60) d += 1, m = 0;
  return `${String(d).padStart(w, '0')}${String(m).padStart(2, '0')}${v < 0 ? neg : pos}`;
};
const coord = (lat, lon) => `${dm(lat, 2, 'N', 'S')}${dm(lon, 3, 'E', 'W')}`;
/** Entrées de la route : case 15 (mots séparés par des espaces : { id }) ou liste à virgules / lignes d'une route
 *  d'OFP (« ID lat lon[/N0450F350] » : { id, lat, lon }) ; changement de niveau après un point retiré (NTS/… → NTS). */
function entries(route) {
  const s = up(route);
  if (!/[,;\n]/.test(s)) return s.split(/\s+/).filter(Boolean).map(w => ({
    id: w.split('/')[0]
  }));
  return s.split(/[,;\n]+/).map(e => {
    const [id, lat, lon] = e.trim().split(/\s+/),
      la = parseFloat(lat),
      lo = parseFloat(String(lon || '').split('/')[0]);
    return {
      id: String(id || '').split('/')[0],
      ...(Number.isFinite(la) && Number.isFinite(lo) ? {
        lat: la,
        lon: lo
      } : {})
    };
  }).filter(e => e.id);
}
/** Mot qui n'est pas un point : groupe vitesse / niveau (N0450F350), niveau seul, règles de vol. */
const notPoint = id => /^[NKM]\d{3,4}([FASM]\d{3,4}|VFR)$/.test(id) || /^(FL\d{2,3}|VFR|IFR)$/.test(id);
/** Points pour SimBrief (sky : pour SkyVector) : nom tel quel (voies aériennes et procédures comprises), sans les pseudo-points
 *  (TOC, TOD, WPT : coordonnées s'il y en a), sans terrains de départ et d'arrivée, sans DCT en tête ou en fin. */
function points(route, dep, arr, {
  sky = false
} = {}) {
  const t = [];
  for (const e of entries(route)) {
    if (notPoint(e.id)) continue;
    const pseudo = /^(TOC|TOD|T\/C|T\/D|WPT)$/.test(e.id),
      named = /^[A-Z]{2,5}$/.test(e.id) && !pseudo,
      latlon = /^\d{2,4}[NS]\d{3,5}[EW]$/.test(e.id);
    if (sky) {
      // SkyVector : nom de 2 à 5 lettres ou coordonnées ; ni voie aérienne, ni procédure, ni point inconnu
      if (e.id === 'DCT' || /^[A-Z]{1,2}\d{1,4}$/.test(e.id) || /^[A-Z]{2,5}\d[A-Z]$/.test(e.id)) continue;
      if (named || latlon) t.push(e.id);
      else if (e.lat != null && !/^(TOC|TOD|T\/C|T\/D)$/.test(e.id)) t.push(coord(e.lat, e.lon));
    } else if (e.lat == null) {
      if (!pseudo) t.push(e.id); // case 15 : voies aériennes et procédures gardées
    } else if (named) t.push(e.id); // liste d'OFP : identifiants nommés seulement (SimBrief ne lit pas les coordonnées)
  }
  if (t[0] === dep) t.shift();
  if (t[t.length - 1] === arr) t.pop();
  while (t[0] === 'DCT') t.shift(); // direct en tête ou en fin : sans objet
  while (t[t.length - 1] === 'DCT') t.pop();
  return t;
}
/** Vol normalisé : terrains en OACI (sinon pris en tête et en fin de route), points, type, immatriculation… */
function norm(f = {}) {
  const raw = entries(f.route).map(e => e.id).filter(id => !notPoint(id));
  const dep = ICAO.test(up(f.dep)) ? up(f.dep) : ICAO.test(raw[0] || '') ? raw[0] : '',
    arr = ICAO.test(up(f.arr)) ? up(f.arr) : ICAO.test(raw[raw.length - 1] || '') && raw.length > 1 ? raw[raw.length - 1] : '';
  const fl = Number(String(f.fl ?? '').replace(/^FL/i, ''));
  return {
    dep,
    arr,
    // groupe vitesse / niveau de la route (N0236F270) : vitesse vraie reprise pour SkyVector ; route sans groupe :
    // vitesse vraie de croisière du vol (OFP, fiche de l'appareil), sinon rien
    spd: (/^[NKM](\d{3,4})[FASM]\d{3,4}$/.exec(entries(f.route).map(e => e.id).find(id => /^[NKM]\d{3,4}[FASM]\d{3,4}$/.test(id)) ||
      '') || [])[1] || (+f.tas > 0 && +f.tas < 2000 ? String(Math.round(+f.tas)) : ''),
    etd: /^([01]\d|2[0-3])[0-5]\d$/.test(String(f.etd || '')) ? String(f.etd) : '',
    grpFl: (/^[NKM]\d{3,4}[FASM](\d{3,4})$/.exec(entries(f.route).map(e => e.id).find(id => /^[NKM]\d{3,4}[FASM]\d{3,4}$/.test(id)) ||
      '') || [])[1] || '',
    pts: points(f.route, dep, arr),
    sky: points(f.route, dep, arr, {
      sky: true
    }),
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
function links(flight, tr = defaultTr) {
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
      ['fl', f.fl || (f.grpFl ? `FL${f.grpFl.padStart(3, '0')}` : '')] // niveau du vol, sinon celui du groupe de la route
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
  // SkyVector : groupe vitesse / niveau OACI en tête de fpl (seule forme lue : vitesse et altitude du panneau), départ,
  // points, arrivée ; l'heure de départ n'a pas de paramètre d'adresse : copiée au clic (copy), à coller dans « ETD »
  const svGroup = f.spd && (f.fl || f.grpFl) ? `N${f.spd.padStart(4, '0')}F${(f.fl ? f.fl.slice(2) : f.grpFl).padStart(3, '0')}` : '';
  out.push({
    label: tr(['SkyVector — la route', 'SkyVector — the route', 'SkyVector — die Route', 'SkyVector — la ruta']),
    href: f.dep && f.arr ? `https://skyvector.com/?fpl=${encodeURIComponent([svGroup, f.dep, ...f.sky, f.arr].filter(Boolean).join(' '))}` : '',
    why: !(f.dep && f.arr) ? tr(MISS[f.dep ? 'arr' : 'dep']) : [svGroup ? tr(['vitesse et niveau : {g}', 'speed and level: {g}',
      'Geschwindigkeit und Höhe: {g}', 'velocidad y nivel: {g}'
    ], {
      g: svGroup
    }) : tr(['sans vitesse ni niveau (ni groupe dans la route, ni vitesse de croisière connue)',
      'no speed or level (no group in the route, no known cruise speed)',
      'ohne Geschwindigkeit und Höhe (weder Gruppe in der Route noch bekannte Reisegeschwindigkeit)',
      'sin velocidad ni nivel (ni grupo en la ruta ni velocidad de crucero conocida)'
    ]), f.etd ? tr(['ETD {t}Z copiée au clic : la coller dans le champ ETD de SkyVector',
      'ETD {t}Z copied on click: paste it into SkyVector’s ETD field',
      'ETD {t}Z beim Klick kopiert: in das ETD-Feld von SkyVector einfügen',
      'ETD {t}Z copiada al hacer clic: pegarla en el campo ETD de SkyVector'
    ], {
      t: f.etd
    }) : ''].filter(Boolean).join(' ; '),
    copy: f.dep && f.arr && f.etd ? f.etd : ''
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

export {
  links,
  points,
  entries,
  norm as normalize
};
