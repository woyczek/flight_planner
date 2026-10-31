// V3 data — la façade du modèle pur de l'écran « Données » (modules/data/SPEC.md § 6 et § 11, INTEGRATION.md § 2) : elle ne réexporte que les fichiers model_screen.js, model_sets.js,
// model_results.js, model_chain.js, model_map.js et model_publish.js, sans rien définir ; les fichiers d'écran l'importent en `M` et les cas en /modules/data/model.js. Ni page, ni contexte, ni stockage, ni réseau
// dans ces fichiers : le cycle AIRAC vient du paramètre `airac`, le temps du paramètre `now`. model_kit.js (les assistants que se partagent ces fichiers) n'est volontairement pas réexporté.
export * from './model_screen.js';
export * from './model_sets.js';
export * from './model_results.js';
export * from './model_chain.js';
export * from './model_map.js';
export * from './model_publish.js';
