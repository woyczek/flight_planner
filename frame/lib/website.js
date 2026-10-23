// V3 frame/lib (propriétaire : website) — passage au site de la compagnie (« Enregistrer le vol sur le site »), recopié
// de la V2 (shared/mission_core/core.js : defaFields, defaUrl, « Copier les champs », favori « → Vol ») le 23/10/2026 ;
// appelé par report (un module n'importe jamais un autre module : code partagé ici). Le site n'est jamais appelé par la
// suite : son formulaire « Ajouter un vol » est ouvert avec les champs du vol dans le fragment (#defa=…, jamais envoyé
// au serveur), puis le favori « → Vol », lancé par le pilote sur le site, remplit le formulaire sans jamais le valider.

/** Minutes d'une heure « HH:MM » (V2 MissionModel.minutes) ; null si invalide. */
const minutes = text => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(text || ''));
  return m && +m[1] < 24 && +m[2] < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};
/** Durée entre deux heures « HH:MM », passage de minuit compris (V2 MissionModel.between) ; null si une heure manque. */
const between = (a, b) => {
  a = minutes(a);
  b = minutes(b);
  return a == null || b == null ? null : b >= a ? b - a : b - a + 1440;
};
/** Durées bloc et vol d'une mission (part de V2 computeStatistics utile ici : bloc = cales, sinon moteurs ; vol plafonné
 *  par rien d'autre) ; durées déclarées sans heures reprises. */
const durations = m => {
  const t = m.timeline || {},
    num = v => v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  return {
    blockMinutes: between(t.offBlock, t.onBlock) ?? between(t.engineStart, t.shutdown) ?? num(t.declared?.blockMinutes),
    flightMinutes: between(t.takeoff, t.landing) ?? num(t.declared?.flightMinutes)
  };
};

/** Champs du formulaire « Ajouter un vol » tirés du CR (premier appareil) : immatriculation sans tiret, type, indicatif
 *  (série, forme plan de vol, numéro), date de fin du vol (date du CR + heure de fin bloc, sinon atterrissage ;
 *  lendemain si elle précède le départ), durée bloc (sinon vol) HH:MM, mission (famille, type, opération), départ et
 *  arrivée OACI. Même règle que defaFields de la V2. */
export function flightFields(mission) {
  const a = (mission.aircraft || [])[0] || {},
    tl = mission.timeline || {},
    nav = mission.navigation || {},
    st = durations(mission),
    mins = st.blockMinutes ?? st.flightMinutes,
    hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`,
    end = minutes(tl.onBlock || tl.landing || tl.shutdown),
    start = minutes(tl.offBlock || tl.takeoff || tl.engineStart),
    date = String(mission.metadata?.date || '');
  let when = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date) && end != null) {
    const d = new Date(`${date}T00:00:00Z`);
    if (start != null && end < start) d.setUTCDate(d.getUTCDate() + 1); // fin après minuit
    when = `${d.toISOString().slice(0, 10)}T${hhmm(end)}`;
  }
  const up = v => String(v || '').trim().toUpperCase();
  return {
    reg: up(a.registration).replace(/[^A-Z0-9]/g, ''),
    type: up(a.type),
    callsign: up(a.callsignPrefix),
    fpl: up(a.callsignFpl),
    number: up(a.callsignNumber),
    date: when,
    hdv: mins != null ? hhmm(mins) : '',
    mission: [mission.family, mission.subtype, mission.metadata?.operationName].filter(Boolean).map(up).join(' '),
    depart: up(nav.dep || a.baseDeparture),
    arrive: up(a.landingAd || nav.arr || a.baseReturn)
  };
}

/** Adresse de la page « Enregistrer mon vol » du site (ctx.airline : site + pages.recordFlight, chemin relatif au site
 *  ou adresse complète) ; vide si le réglage de la compagnie manque. */
export function recordPage(airline) {
  const page = airline?.pages?.recordFlight || '',
    site = String(airline?.site || '').replace(/\/+$/, '');
  if (/^https?:\/\//.test(page)) return page;
  return site && page ? `${site}${page.startsWith('/') ? '' : '/'}${page}` : '';
}

/** Adresse du formulaire avec les champs du vol dans le fragment (#defa=, base64url du JSON) ; vide sans adresse. */
export function recordUrl(airline, fields) {
  const base = recordPage(airline);
  if (!base) return '';
  const bytes = new TextEncoder().encode(JSON.stringify(fields));
  return `${base}#defa=${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

/** Ligne de « Copier les champs » (repli quand le favori n'est pas utilisable, sur un téléphone par exemple). */
export const copyLine = f => [`reg ${f.reg}`, f.type, [f.callsign, f.number].filter(Boolean).join(' '), f.date ? f.date.replace('T', ' ') : '',
  f.hdv, [f.depart, f.arrive].filter(Boolean).join(' → '), f.mission
].filter(Boolean).join(' · ');

// Favori « → Vol », à glisser dans la barre des favoris : sur les pages du site ouvertes par « Enregistrer le vol sur
// le site », lit les champs du vol (fragment #defa=, gardé ensuite dans le stockage de session du site pour survivre à
// la connexion) ; liste des appareils → page de l'appareil de l'immatriculation ; page de l'appareil → « Ajouter un
// vol » ; formulaire → champs remplis par leur nom (champs en lecture seule du site : comparés, écarts signalés),
// indicatif choisi dans la liste. Ne valide JAMAIS le formulaire. Recopié tel quel de la V2 (pas de commentaire de
// ligne, ni de « % », ni de « # » dans la fonction : elle devient une adresse javascript:). alert() : favori exécuté
// sur un autre site, sans le cadre — seule boîte native admise.
function defaFlightFill() {
  var KEY = 'sogDefaFlight',
    NL = String.fromCharCode(10),
    raw = (location.hash.match(/defa=([A-Za-z0-9_-]+)/) || [])[1] || '',
    data = null;
  try {
    if (raw) {
      var b = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
      data = JSON.parse(new TextDecoder().decode(Uint8Array.from(b, function(c) {
        return c.charCodeAt(0);
      })));
      sessionStorage.setItem(KEY, JSON.stringify(data));
    } else data = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch (e) {
    data = null;
  }
  if (!data) {
    alert(
      'Aucun vol à remplir : ouvrez le site depuis le compte rendu (« Enregistrer le vol sur le site »). / No flight to fill: open the website from the report.'
    );
    return;
  }
  var up = function(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  };
  var number = document.querySelector('form [name="callsign2"]'),
    form = number && number.form;
  if (!form) {
    var links = [].slice.call(document.querySelectorAll('a[href]'));
    var add = links.filter(function(a) {
      return /add_flight/.test(a.href);
    })[0];
    if (add) {
      location.href = add.href;
      return;
    }
    var own = links.filter(function(a) {
      return /[?&]id=/.test(a.href) && a.textContent.split('/').map(up).indexOf(up(data.reg)) >= 0;
    })[0];
    if (own) {
      location.href = own.href;
      return;
    }
    alert('Appareil ' + data.reg + ' introuvable sur cette page. / Aircraft ' + data.reg + ' not found on this page.');
    return;
  }
  var missing = [],
    diff = [];
  var field = function(n) {
    return form.querySelector('[name="' + n + '"]');
  };
  var mark = function(el, ok) {
    if (el) el.style.outline = ok ? '3px solid rgb(46,157,79)' : '3px solid rgb(221,51,51)';
  };
  var put = function(n, v, label) {
    var el = field(n);
    if (!el) return;
    if (el.readOnly) {
      if (v && up(el.value) !== up(v)) {
        diff.push(label + ' : ' + el.value + ' (site) / ' + v + ' (CR)');
        mark(el, false);
      }
      return;
    }
    if (!v) {
      missing.push(label);
      mark(el, false);
      return;
    }
    el.value = v;
    el.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    el.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    mark(el, true);
  };
  put('reg', data.reg, 'Immat.');
  put('nom_appareil', data.type, 'Appareil');
  var sel = field('callsign1');
  if (sel) {
    var want = [up(data.callsign), up(data.fpl).replace(/[0-9].*$/, '')].filter(Boolean);
    var opt = [].slice.call(sel.options).filter(function(o) {
      return o.value && (want.indexOf(up(o.textContent)) >= 0 || want.indexOf(up(o.value)) >= 0);
    })[0];
    if (opt) {
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', {
        bubbles: true
      }));
      mark(sel, true);
    } else {
      missing.push('Callsign ' + (data.callsign || ''));
      mark(sel, false);
    }
  }
  put('callsign2', data.number, 'Numéro de vol');
  put('date', data.date, 'Date');
  put('hdv', data.hdv, 'Durée');
  put('mission', data.mission, 'Mission');
  put('depart', data.depart, 'Départ');
  put('arrive', data.arrive, 'Arrivée');
  sessionStorage.removeItem(KEY);
  alert('Vol rempli : relisez, puis « Valider ». / Flight filled: check, then “Valider”.' + (missing.length ? NL +
    'À compléter / to complete : ' + missing.join(', ') : '') + (diff.length ? NL + 'Écarts / differences : ' + diff.join(' ; ') :
    ''));
}
export const BOOKMARKLET = 'javascript:(' + defaFlightFill.toString().replace(/\s*\n\s*/g, ' ') + ')()';
