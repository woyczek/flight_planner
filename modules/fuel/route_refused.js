// V3 fuel — la ligne d'un calcul ou d'un contrôle de route que le lanceur n'a pas rendu (SOG-0206 : la cause, jamais « n'a pas répondu »
// sans raison, avec « Réessayer » ; SOG-0125 : sans RAD, le lien vers sa ligne de Données). Sorti de routeAskRun de module.js (règle
// « on extrait ce qu'on touche », SOG-0658), sans changer le comportement. Ce fichier ne lit ni n'écrit rien.
//
// API : refusedHtml(n, act, h, said) → le HTML de la ligne ; n : la réponse lue, refusée (route_engine.js normalize : { ok: false, reason,
//   message }) ; act : 'compute' | 'check' (le geste que « Réessayer » refait) ; h = { tt(rangée, valeurs), esc, TX (les textes de
//   module.js : rFail, rRetry) }. TX : les textes de ce fichier, quatre langues. Le message du lanceur, qui nomme un travail, n'est pas
//   montré au pilote quand la raison a sa phrase. waitFree(launcher, refus, libellé, relance) → la phrase du poste occupé (SOG-0658),
//   la demande mise en attente.

export const TX = {
  // SOG-0658 (l'ergonome) : la demande qu'un poste occupé met en attente, son libellé dans « En attente : {libellé} » (le cadre) ; français
  // seul (SOG-0680)
  waitCompute: ['Calcul de la route'],
  waitCheck: ['Contrôle de la route'],
  waitNat: ['Relecture des routes NAT'],
  rNoRad: ['Aucun RAD importé', 'No RAD imported', 'Kein RAD importiert', 'Ningún RAD importado'],
  rNoRadGo: ['Importer dans Données', 'Import in Data', 'In Daten importieren', 'Importar en Datos'],
  // SOG-0206 : la cause quand le travail n'a rien rendu (jamais « n'a pas répondu » sans raison), avec « Réessayer »
  rWhy: {
    // SOG-0688 (le fait d'AeroDB) : les arguments refusés à la porte du lanceur (400) — phrase proposée, français seul (SOG-0680)
    invalid: ['Le calcul de route a refusé la demande : une valeur envoyée sort de ses bornes.'],
    busy: ['Le poste termine une autre opération (lecture du sol, mise à jour des données…) : réessayez dans un instant.',
      'The workstation is finishing another operation (ground reading, data update…): try again in a moment.',
      'Der Rechner beendet gerade einen anderen Vorgang (Bodenlesung, Datenaktualisierung…): gleich noch einmal versuchen.',
      'El puesto está terminando otra operación (lectura del suelo, actualización de datos…): inténtelo de nuevo en un momento.'
    ],
    offline: ['Le lanceur du poste ne répond pas : vérifiez qu’il tourne, puis réessayez.',
      'The workstation launcher does not answer: check that it is running, then try again.',
      'Der Launcher des Rechners antwortet nicht: prüfen, ob er läuft, dann erneut versuchen.',
      'El lanzador del puesto no responde: compruebe que está en marcha y vuelva a intentarlo.'
    ],
    stopped: ['Le calcul a été arrêté avant la fin (lanceur relancé ou travail annulé) : réessayez.',
      'The computation was stopped before the end (launcher restarted or job cancelled): try again.',
      'Die Berechnung wurde vor dem Ende abgebrochen (Launcher neu gestartet oder Job abgebrochen): erneut versuchen.',
      'El cálculo se detuvo antes del final (lanzador reiniciado o trabajo cancelado): inténtelo de nuevo.'
    ],
    failed: ['Le calcul a échoué sans donner de résultat (le journal du lanceur en dit la cause) : réessayez.',
      'The computation failed without a result (the launcher log says why): try again.',
      'Die Berechnung ist ohne Ergebnis fehlgeschlagen (das Launcher-Protokoll nennt die Ursache): erneut versuchen.',
      'El cálculo falló sin resultado (el registro del lanzador dice por qué): inténtelo de nuevo.'
    ]
  }
};

/** La ligne du RAD dans Données (application Maintenance, source eurocontrol_rad du catalogue d'AeroDB) : le lien du « no-rad ». */
export const RAD_DATA_HREF = '?app=maintenance#data?source=eurocontrol_rad';

/** SOG-0658 : un refus parce que le poste est occupé — LA demande de l'écran mise en attente par le cadre (ctx.launcher.busy.later :
 *  « En attente : {libellé} » avec « Annuler », relancée seule quand le poste est libre, encore en attente si elle est refusée de nouveau),
 *  et la phrase du cadre (busy.text : l'opération en cours et son heure, que le refus dit). '' sans le client du cadre (la phrase d'avant). */
export function waitFree(launcher, refusal, label, again) {
  const b = launcher?.busy;
  if (typeof b?.text !== 'function' || typeof b?.later !== 'function') return '';
  b.later(label, again);
  return b.text(refusal);
}

/** La ligne d'un calcul refusé : sans RAD, la phrase et le lien vers sa ligne de Données (l'import se fait là, jamais depuis Carburant) ;
 *  le poste occupé (SOG-0658) : `said`, la phrase du cadre, sans « Réessayer » (la demande partira seule) ; sinon la phrase de la raison
 *  (ou le message du lanceur sans phrase connue, ou « n'a pas répondu »), et « Réessayer » pour une raison passagère. */
export function refusedHtml(n, act, h, said = '') {
  const tt = h.tt,
    esc = h.esc;
  if (n.reason === 'busy' && said) return `<p class="f-warn" data-rrefused="busy" data-rwait>${esc(said)}</p>`;
  return n.reason === 'no-rad' ? `<p class="f-warn" data-rrefused="no-rad">${esc(tt(TX.rNoRad))} · <a href="${RAD_DATA_HREF}" data-radlink>${esc(tt(TX.rNoRadGo))}</a></p>` :
    `<p class="f-warn" data-rrefused="${esc(n.reason)}">${esc(!n.message && TX.rWhy[n.reason] ? tt(TX.rWhy[n.reason]) : n.message || tt(h.TX.rFail))}${!n.message && ['busy', 'offline', 'stopped', 'failed'].includes(n.reason) ? ` <button type="button" data-do="${act === 'compute' ? 'rcompute' : 'rcheck'}" data-rretry>${esc(tt(h.TX.rRetry))}</button>` : ''}</p>`;
}
