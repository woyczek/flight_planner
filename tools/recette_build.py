#!/usr/bin/env python3
"""The acceptance list of the suite (SOG-0167): `frame/help/recette.json` from the organisation folder.

    python tools/recette_build.py --org E:/DEFA/organisation

Inputs, all in the organisation folder (the single source, like the roadmap of tools/roadmap_build.py):
  · BACKLOG.md          the fiches (`### SOG-xxxx — title`, **Thème**, **État**): the title, the application and the state;
  · RECETTE_TESTS.json  { tests: { "SOG-xxxx": { since: "YYYY-MM-DD", test: "where to go, what to do, what to see" } } },
                        one functional test per delivered fiche, written by the ergonomist in the pilot's words;
  · RECETTE.json        the user's verdicts, written by the launcher from the screen (sog-recette/1 :
                        { items: { "SOG-xxxx": { verdict: "ok" | "ko", comment, at } } }); optional;
  · roadmap_i18n.json   the translated titles (en, de, es), shared with the roadmap.

Output: { schema: 'sog-recette/1', generated: { tool, at, tests, verdicts }, apps, tests: [{ id, app, title: {fr, en, de, es},
test (French: the user's language of work), since, state: 'todo' | 'known' | 'ok' | 'ko', comment?, at? }] }.
  · 'todo'  the fiche is delivered and waits for the user's verdict;
  · 'known' the fiche is open again or in progress: said on its test (« en cours, ne pas retester »), so that a known defect
            is not reported twice;
  · 'ok' / 'ko' the user's last verdict, kept while the fiche has not been delivered again after it.
Every text is bounded; the verdict file is read as an untrusted input (written through a screen)."""
import argparse
import datetime
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import roadmap_build as RB  # noqa: E402  (same folder: the fiche fields, the state and the application rules)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'frame', 'help', 'recette.json')
ID = re.compile(r'^SOG-\d{4}$')
HEAD = re.compile(r'^### (SOG-\d{4}) — (.+)$', re.M)


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def read_json(path):
    """A JSON object of the organisation folder, or {} when it is absent or unreadable."""
    if not os.path.isfile(path):
        return {}
    try:
        d = json.loads(read(path))
    except ValueError:
        return {}
    return d if isinstance(d, dict) else {}


def fiches(org):
    """{ id: { title, theme, etat } } from BACKLOG.md: one block per `### SOG-xxxx — title`."""
    text = read(os.path.join(org, 'BACKLOG.md'))
    out = {}
    marks = list(HEAD.finditer(text))
    for i, m in enumerate(marks):
        block = text[m.end():marks[i + 1].start() if i + 1 < len(marks) else len(text)]
        fields = {k: v.strip() for k, v in RB.FIELD.findall(block)}
        out[m.group(1)] = {'title': m.group(2).strip()[:200], 'theme': fields.get('Thème', ''), 'etat': fields.get('État', '')}
    return out


def verdicts(org):
    """{ id: { verdict, comment, at } } from RECETTE.json, bounded and filtered."""
    out = {}
    for fid, v in list((read_json(os.path.join(org, 'RECETTE.json')).get('items') or {}).items())[:1000]:
        if not ID.match(str(fid)) or not isinstance(v, dict) or v.get('verdict') not in ('ok', 'ko'):
            continue
        e = {'verdict': v['verdict']}
        if isinstance(v.get('comment'), str):
            e['comment'] = re.sub(r'[\x00-\x1f]', ' ', v['comment'])[:600]
        if isinstance(v.get('at'), str) and re.match(r'^\d{4}-\d{2}-\d{2}T', v['at']):
            e['at'] = v['at'][:24]
        out[fid] = e
    return out


def build(org):
    """The acceptance document."""
    fs = fiches(org)
    i18n = read_json(os.path.join(org, 'roadmap_i18n.json'))
    vs = verdicts(org)
    tests = []
    for fid, t in sorted((read_json(os.path.join(org, 'RECETTE_TESTS.json')).get('tests') or {}).items()):
        f = fs.get(fid)
        if not ID.match(fid) or not f or not isinstance(t, dict) or not isinstance(t.get('test'), str):
            continue
        tr = i18n.get(fid) if isinstance(i18n.get(fid), dict) else {}
        state = 'todo' if RB.state_of(f['etat']) == 'done' else 'known'
        row = {'id': fid, 'app': RB.app_of(f['theme']),
               'title': {'fr': f['title'], **{k: str(tr[k])[:200] for k in ('en', 'de', 'es') if isinstance(tr.get(k), str)}},
               'test': t['test'][:700], 'since': str(t.get('since', ''))[:10], 'state': state}
        v = vs.get(fid)
        if v and state == 'todo':            # a verdict stands while the fiche is delivered; a fiche open again is « known »
            row['state'] = v['verdict']
            row.update({k: v[k] for k in ('comment', 'at') if k in v})
        tests.append(row)
    return {'schema': 'sog-recette/1',
            'generated': {'tool': 'tools/recette_build.py', 'at': datetime.date.today().isoformat(), 'tests': len(tests),
                          'verdicts': sum(1 for t in tests if t['state'] in ('ok', 'ko'))},
            'apps': [a for a, _, _ in RB.APPS] if hasattr(RB, 'APPS') else ['pilote', 'compagnie', 'maintenance', 'stats'],
            'tests': tests}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--org', required=True, help='the organisation folder (BACKLOG.md, RECETTE_TESTS.json, RECETTE.json)')
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()
    doc = build(a.org)
    with io.open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    g = doc['generated']
    print(f"recette: {g['tests']} tests, {g['verdicts']} verdicts")
    print('written', os.path.relpath(a.out))


if __name__ == '__main__':
    main()
