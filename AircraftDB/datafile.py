"""Format commun des fichiers de données JS du dépôt (flotte, indicatifs…), identique à celui
écrit par la page Paramétrage › Bases de données (shared/data_admin.js, fonction render) :

    (() => {
      'use strict';
      // commentaire
      const META = {"updatedAt":"…"};
      let data = { "clé": [ une ligne JSON par élément ], … };
      // modifications locales plus récentes (page Paramétrage) : prioritaires dans ce navigateur
      try { … localStorage[overrideKey] … } catch { … }
      export_js      (ex. window.DEFA_FLEET = data.rows;)
    })();
"""
import datetime as dt
import json


def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def render(comment_lines, data, override_key, export_js, updated_at=None):
    updated_at = updated_at or dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    parts = []
    for key, value in data.items():
        if isinstance(value, list):
            inner = ',\n'.join('    ' + dumps(item) for item in value)
            parts.append(f'  {dumps(key)}: [\n{inner}\n  ]' if value else f'  {dumps(key)}: []')
        else:
            parts.append(f'  {dumps(key)}: {dumps(value)}')
    body = '{\n' + ',\n'.join(parts) + '\n}'
    comments = '\n'.join(f'  // {line}' for line in comment_lines)
    return f"""(() => {{
  'use strict';
{comments}
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {dumps({'updatedAt': updated_at})};
  let data = {body};
  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try {{ const o = JSON.parse(localStorage.getItem('{override_key}') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; }} catch {{ /* stockage indisponible */ }}
  {export_js}
}})();
"""
