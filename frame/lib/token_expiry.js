// V3 frame — l'expiration des jetons (SOG-0277 : GitLab lu chez le fournisseur ; GitHub déclarée par l'utilisateur, `recordDeclared`).
// La suite ne garde JAMAIS un jeton : l'alerte se fonde sur la DATE d'expiration que GitLab rend (AAAA-MM-JJ, « à minuit UTC » : le jeton
// ne vaut plus à 00:00 UTC de ce jour). Ce module ne connaît que des dates : il dit combien de jours restent et à quel niveau (orange sous
// 30 jours, rouge sous 7, expiré), range dans le stockage de l'appareil (jamais dans le dépôt des données) la dernière date connue de son
// propre jeton et le compte des jetons de pilote qui expirent, et rend les lignes de la puce d'état du cadre. Aucune lecture réseau ici.

/** Les seuils du niveau : orange (soon) en dessous de 30 jours, rouge (urgent) en dessous de 7. */
export const SOON_DAYS = 30;
export const URGENT_DAYS = 7;
/** Une relecture de la date au plus par jour (ms). */
export const DAILY_MS = 864e5;
/** La clé du stockage de l'appareil : { own: { expiresAt, at, toldOn } | null, pilots: { soon, expired, nearest, at } | null }. */
export const KEY = 'sogFrame:tokenExpiry';
const DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Les phrases (fr, en, de, es). {d} : la date AAAA-MM-JJ, {n} : un nombre de jours ou de jetons. */
export const TX = {
  inDays: ['dans {n} jours', 'in {n} days', 'in {n} Tagen', 'en {n} días'],
  inDay: ['dans 1 jour', 'in 1 day', 'in 1 Tag', 'en 1 día'],
  expiredOn: ['a expiré le {d}', 'expired on {d}', 'ist am {d} abgelaufen', 'caducó el {d}'],
  ownSoon: ['Votre jeton expire le {d} ({w}) : demandez-en un nouveau à l’administrateur avant cette date.',
    'Your token expires on {d} ({w}): ask the administrator for a new one before then.',
    'Ihr Token läuft am {d} ab ({w}): Bitten Sie den Administrator vorher um einen neuen.',
    'Su token caduca el {d} ({w}): pida uno nuevo al administrador antes de esa fecha.'
  ],
  ownExpired: ['Votre jeton a expiré le {d} : demandez-en un nouveau à l’administrateur.',
    'Your token expired on {d}: ask the administrator for a new one.',
    'Ihr Token ist am {d} abgelaufen: Bitten Sie den Administrator um einen neuen.',
    'Su token caducó el {d}: pida uno nuevo al administrador.'
  ],
  declared: [' (date déclarée)', ' (declared date)', ' (angegebenes Datum)', ' (fecha declarada)'],
  ownUnknown: [
    'GitHub ne dit pas quand votre jeton expire : indiquez la date dans Accès pour être prévenu avant, ou dites qu’il n’expire pas.',
    'GitHub does not say when your token expires: give the date in Access to be warned beforehand, or say that it does not expire.',
    'GitHub sagt nicht, wann Ihr Token abläuft: Geben Sie das Datum unter Zugang an, um vorher gewarnt zu werden, oder sagen Sie, dass es nicht abläuft.',
    'GitHub no dice cuándo caduca su token: indique la fecha en Acceso para ser avisado antes, o diga que no caduca.'
  ],
  chipSoon1: ['1 jeton de pilote expire bientôt ({d})', '1 pilot token expires soon ({d})', '1 Pilotentoken läuft bald ab ({d})',
    '1 token de piloto caduca pronto ({d})'
  ],
  chipSoonN: ['{n} jetons de pilote expirent bientôt (le plus proche : {d})', '{n} pilot tokens expire soon (nearest: {d})',
    '{n} Pilotentoken laufen bald ab (nächster: {d})', '{n} tokens de piloto caducan pronto (el más próximo: {d})'
  ],
  chipOld1: ['1 jeton de pilote a expiré', '1 pilot token has expired', '1 Pilotentoken ist abgelaufen', '1 token de piloto ha caducado'],
  chipOldN: ['{n} jetons de pilote ont expiré', '{n} pilot tokens have expired', '{n} Pilotentoken sind abgelaufen',
    '{n} tokens de piloto han caducado'
  ]
};

/** La date AAAA-MM-JJ d'une valeur lue (GitLab : « 2026-12-01 », parfois un horodatage), ou '' si elle n'a pas cette forme ou n'existe pas. */
export function dayOf(v) {
  const m = DATE.exec(typeof v === 'string' ? v : '');
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? m[0] : '';
}
/** Ce que dit une date d'expiration à l'instant `now` : { date, days (jours entiers restants, arrondis vers le haut ; 0 ou moins : expiré),
 *  level: 'expired' | 'urgent' | 'soon' | 'ok' } ; null sans date lisible. Le jeton ne vaut plus à 00:00 UTC de sa date. */
export function stateOf(v, now = Date.now()) {
  const date = dayOf(v);
  if (!date) return null;
  const left = Date.parse(`${date}T00:00:00Z`) - now,
    days = Math.ceil(left / DAILY_MS);
  return {
    date,
    days,
    level: left <= 0 ? 'expired' : days <= URGENT_DAYS ? 'urgent' : days <= SOON_DAYS ? 'soon' : 'ok'
  };
}
/** « dans 12 jours » (ligne de la liste, texte de la notification) : la ligne `t(row, vars)` de l'appelant lit ce couple [ligne, variables]. */
export function whenRow(s) {
  return s.days === 1 ? [TX.inDay, {}] : [TX.inDays, {
    n: s.days
  }];
}

/** Le stockage de l'appareil, ou null s'il refuse (navigation privée, données bloquées). */
function store(s) {
  if (s) return s;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const count = n => Number.isInteger(n) && n >= 0 && n <= 9999 ? n : 0;
/** Le contenu gardé, relu avec méfiance (c'est un stockage que d'autres scripts de la même origine peuvent écrire) : des dates et des
 *  nombres bornés, rien d'autre. */
export function readCache(s) {
  let raw = null;
  try {
    raw = JSON.parse(store(s)?.getItem(KEY) || 'null');
  } catch {
    raw = null;
  }
  const o = raw && typeof raw === 'object' ? raw : {},
    own = o.own && typeof o.own === 'object' ? o.own : null,
    pil = o.pilots && typeof o.pilots === 'object' ? o.pilots : null;
  return {
    own: own && ISO.test(String(own.at)) ? {
      expiresAt: dayOf(own.expiresAt),
      at: own.at,
      toldOn: dayOf(own.toldOn),
      declared: own.declared === 'date' || own.declared === 'none' ? own.declared :
        '' // saisie par l'utilisateur (GitHub ne rend pas la date) : une date, ou « n'expire pas »
    } : null,
    pilots: pil && ISO.test(String(pil.at)) ? {
      soon: count(pil.soon),
      expired: count(pil.expired),
      nearest: dayOf(pil.nearest),
      at: pil.at
    } : null
  };
}

function write(patch, s) {
  const st = store(s);
  if (!st) return;
  try {
    st.setItem(KEY, JSON.stringify({
      ...readCache(st),
      ...patch
    }));
  } catch {
    /* un stockage plein ou refusé : rien n'est gardé, l'écran redit la date à la prochaine lecture */
  }
}
/** Faux si la dernière lecture (ISO) date de moins d'un jour : une relecture par jour au plus. */
export const due = (at, now = Date.now()) => !(Date.parse(at || '') > now - DAILY_MS);
/** Garde la date d'expiration de SON jeton (rendue par whoami() ; '' ou null : le jeton n'expire pas ou la date ne se lit pas). */
export function recordOwn(expiresAt, now = Date.now(), s) {
  write({
    own: {
      expiresAt: dayOf(expiresAt),
      at: new Date(now).toISOString(),
      toldOn: readCache(s).own?.toldOn || ''
    }
  }, s);
}
/** GitHub ne rend la date par aucun point d'accès qu'une page puisse lire (avis de Sécurisation, 12 nov.) : l'utilisateur la DÉCLARE. Une date lisible est gardée (dite « déclarée »),
 *  sinon rien ; `none` : l'utilisateur dit que son jeton n'expire pas (plus de ligne qui demande la date). Dans le stockage de l'appareil, jamais le jeton. */
export function recordDeclared(date, none = false, now = Date.now(), s) {
  const d = dayOf(date);
  if (!d && !none) return clearOwn(s);
  write({
    own: {
      expiresAt: d,
      at: new Date(now).toISOString(),
      toldOn: readCache(s).own?.toldOn || '',
      declared: d ? 'date' : 'none'
    }
  }, s);
}
/** Oublie la date de SON jeton (jeton coupé, autre fournisseur, date effacée). */
export function clearOwn(s) {
  write({
    own: null
  }, s);
}
/** Note que la notification du jour a été dite (une fois par jour au plus). */
export function recordTold(now = Date.now(), s) {
  const c = readCache(s).own;
  if (c) write({
    own: {
      ...c,
      toldOn: new Date(now).toISOString().slice(0, 10)
    }
  }, s);
}
/** Les jetons de pilote d'une liste du lanceur ([{ name, active, revoked, expires }]) : { soon (actifs qui expirent dans les 30 jours),
 *  expired (expirés, ni révoqués ni remplacés par un jeton actif du même nom), nearest (la plus proche date des premiers) } ; des
 *  nombres et une date, jamais un nom. Les noms de jeton qui ne sont pas un trigramme (jeton du propriétaire) ne comptent pas. */
export function pilotsOf(list, now = Date.now()) {
  const pilots = (Array.isArray(list) ? list : []).filter(x => x && /^[A-Z0-9]{2,5}$/.test(String(x.name))),
    live = new Set(pilots.filter(x => x.active && !x.revoked).map(x => x.name));
  let soon = 0,
    expired = 0,
    nearest = '';
  for (const x of pilots) {
    if (x.revoked) continue;
    const s = stateOf(x.expires, now);
    if (!s) continue;
    if (x.active && s.level !== 'ok' && s.level !== 'expired') {
      soon++;
      if (!nearest || s.date < nearest) nearest = s.date;
    } else if (!x.active && s.level === 'expired' && !live.has(x.name)) expired++;
  }
  return {
    soon,
    expired,
    nearest
  };
}
/** Garde ce que dit une liste (ou la réponse de gitlab/tokens/count : { soon, expired, nearest }) des jetons de pilote. */
export function recordPilots(v, now = Date.now(), s) {
  write({
    pilots: {
      soon: count(v?.soon),
      expired: count(v?.expired),
      nearest: dayOf(v?.nearest),
      at: new Date(now).toISOString()
    }
  }, s);
}
/** Les lignes de la puce d'état du cadre d'après le contenu gardé : [{ k, level, go, text(t) }] où `t(row, vars)` est le traducteur de
 *  l'appelant ; son jeton d'abord, puis les jetons des pilotes. `pilots` : faux sur un appareil qui n'est pas le poste (rien à dire). */
export function lines(cache, now = Date.now(), pilots = true, github = false) {
  const out = [],
    own = stateOf(cache?.own?.expiresAt, now);
  if (own && own.level !== 'ok') out.push({
    k: 'token-own',
    level: own.level,
    go: 'card:access',
    text: t => own.level === 'expired' ? t(TX.ownExpired, {
      d: own.date
    }) + (cache.own.declared === 'date' ? t(TX.declared) : '') : t(TX.ownSoon, {
      d: own.date,
      w: t(...whenRow(own))
    }) + (cache.own.declared === 'date' ? t(TX.declared) : '')
  });
  // GitHub : pas de date lue, aucune déclarée ni « n'expire pas » : UNE ligne calme (niveau « info », pas d'attention) qui mène à la carte Accès
  if (github && !cache?.own?.declared) out.push({
    k: 'token-own-unknown',
    level: 'info',
    go: 'card:access',
    text: t => t(TX.ownUnknown)
  });
  const p = cache?.pilots;
  if (pilots && p && p.expired > 0) out.push({
    k: 'token-pilots-expired',
    level: 'expired',
    go: 'pilot-tokens',
    text: t => t(p.expired === 1 ? TX.chipOld1 : TX.chipOldN, {
      n: p.expired
    })
  });
  if (pilots && p && p.soon > 0) {
    const s = stateOf(p.nearest, now);
    out.push({
      k: 'token-pilots-soon',
      level: s?.level === 'urgent' ? 'urgent' : 'soon',
      go: 'pilot-tokens',
      text: t => t(p.soon === 1 ? TX.chipSoon1 : TX.chipSoonN, {
        n: p.soon,
        d: p.nearest
      })
    });
  }
  return out;
}
