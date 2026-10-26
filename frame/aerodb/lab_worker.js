// V3 aerodb — laboratoire des données (TEMPORAIRE) : le Worker des modes b et c (frame/aerodb/lab_run.js). Pas de DOM ici,
// donc pas de DOMParser : c'est le point de la mesure. shared/zip_store.js (V2) se charge tel quel, pour le mode b, si
// window désigne le Worker. Messages : { cmd: 'run', mode: 'b' | 'c', file } → { type: 'step-start' | 'step' } puis
// { type: 'done', result } ou { type: 'error', message }.
self.window = self;
self.importScripts('../../shared/zip_store.js', 'lab_xml.js', 'lab_zip.js', 'lab_run.js');
self.onmessage = async ev => {
  const m = ev.data || {};
  if (m.cmd !== 'run') return;
  try {
    const r = await (m.mode === 'c' ? self.AeroLabRun.modeC : self.AeroLabRun.modeB)(m.file, {
      emit: e => self.postMessage(e)
    });
    self.postMessage({
      type: 'done',
      result: r
    });
  } catch (e) {
    self.postMessage({
      type: 'error',
      message: String(e && e.message || e)
    });
  }
};
