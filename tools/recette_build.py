#!/usr/bin/env python3
"""The acceptance list of the suite (SOG-0167): `frame/help/recette.json` from the organisation folder.

    python tools/recette_build.py --org E:/DEFA/organisation

Inputs, all in the organisation folder (the single source, like the roadmap of tools/roadmap_build.py):
  · BACKLOG.md          the fiches (`### SOG-xxxx — title`, **Thème**, **État**): the title, the application and the state;
  · RECETTE_TESTS.json  { tests: { "SOG-xxxx": { since: "YYYY-MM-DD", test: "where to go, what to do, what to see",
                        rewritten?: "YYYY-MM-DDTHH:MM:SSZ" } } }, one functional test per delivered fiche, written by the
                        ergonomist in the pilot's words;
  · RECETTE.json        the user's verdicts, written by the launcher from the screen (sog-recette/1 :
                        { items: { "SOG-xxxx": { verdict: "ok" | "ko", comment, at } } }); optional;
  · roadmap_i18n.json   the translated titles (en, de, es), shared with the roadmap.

Output: { schema: 'sog-recette/1', generated: { tool, at, tests, verdicts }, apps, tests: [{ id, app, title: {fr, en, de, es},
test (French: the user's language of work), since, state: 'todo' | 'known' | 'ok' | 'ko', comment?, at?, delivered?, previous? }] }.
  · 'todo'  the fiche is delivered and waits for the user's verdict;
  · 'known' the fiche is open again or in progress: said on its test (« en cours, ne pas retester »), so that a known defect
            is not reported twice;
  · 'ok' / 'ko' the user's last verdict, kept while the fiche has not been delivered again after it.
`delivered` is the date (UTC) of the newest commit the state of the fiche cites: its last delivery. A verdict older than it is no
longer in force: the test is 'todo' again and the old verdict is kept in `previous` ({ verdict, comment?, at }), so that the
screen can say « delivered again since your refusal » (the user, 10 Nov 2026: « je ne vois pas de màj de la page de recette »).
A test rewritten after a refusal that was about the test itself (the user, 10 Nov 2026: « refusé par manque de cas de test »)
carries `rewritten` (UTC): it counts as a delivery, so the refusal no longer stands and the new test is to be done.
Every text is bounded; the verdict file is read as an untrusted input (written through a screen).

The points to decide (SOG-0241; the user, 11 Nov 2026: « comme pour la recette, un qcm + choix libre des points à trancher »):
  · DECISIONS_A_PRENDRE.json  { questions: { "Q-0001": { since, fiche: "SOG-xxxx", question, context, options: [2 to 4 texts],
                              recommended?: index, closed?: true } } }, kept by the ergonomist;
  · DECISIONS_REPONSES.json   { items: { "Q-0001": { choice: index | null, text, at } } }, written by the launcher from the
                              screen: an untrusted input like the verdicts; optional.
Output `decisions`: [{ id, fiche, app, question, context, options, recommended?, since, state: 'todo' | 'answered', choice?,
text?, at? }]; a closed question (its fiche is dispatched) leaves the list; an answer with neither a valid choice nor a text
does not count."""
import argparse
import datetime
import io
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import roadmap_build as RB  # noqa: E402  (same folder: the fiche fields, the state and the application rules)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'frame', 'help', 'recette.json')
ID = re.compile(r'^SOG-\d{4}$')
HEAD = re.compile(r'^### (SOG-\d{4}) — (.+)$', re.M)
SHA = re.compile(r'(?<![0-9a-zA-Z])[0-9a-f]{7,12}(?![0-9a-zA-Z])')
_COMMITS = None


QID = re.compile(r'^Q-\d{4}$')
STAMP = re.compile(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')


def commits():
    """{ first seven characters of a hash: [(full hash, UTC date 'YYYY-MM-DDTHH:MM:SSZ')] } for the history of HEAD since
    October 2026 (the V3 line); {} without git. One call, kept."""
    global _COMMITS
    if _COMMITS is None:
        _COMMITS = {}
        try:
            out = subprocess.run(['git', '-C', HERE, 'log', '--since=2026-10-01', '--format=%H %cI', 'HEAD'],
                                 capture_output=True, text=True, timeout=60)
            for line in out.stdout.splitlines() if out.returncode == 0 else []:
                h, _, d = line.partition(' ')
                try:
                    utc = datetime.datetime.fromisoformat(d).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
                except ValueError:
                    continue
                _COMMITS.setdefault(h[:7], []).append((h, utc))
        except (OSError, subprocess.SubprocessError):
            _COMMITS = {}
    return _COMMITS


def delivered_at(etat):
    """The UTC date of the newest commit the state of a fiche cites (its last delivery), or '' when none is in the history."""
    dates = [d for s in set(SHA.findall(etat)) for h, d in commits().get(s[:7], ()) if h.startswith(s)]
    return max(dates, default='')


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
            e['comment'] = re.sub(r'[\x00-\x1f]', ' ', v['comment'])[:2000]
        if isinstance(v.get('at'), str) and re.match(r'^\d{4}-\d{2}-\d{2}T', v['at']):
            e['at'] = v['at'][:24]
        out[fid] = e
    return out


def clean(text, n):
    """A text of the organisation or of the screen: no control character, bounded."""
    return re.sub(r'[\x00-\x1f]', ' ', str(text)).strip()[:n]


def decisions(org, fs):
    """The points to decide, with the user's answers (see the header)."""
    answers = read_json(os.path.join(org, 'DECISIONS_REPONSES.json')).get('items') or {}
    out = []
    for qid, q in sorted((read_json(os.path.join(org, 'DECISIONS_A_PRENDRE.json')).get('questions') or {}).items()):
        if not QID.match(str(qid)) or not isinstance(q, dict) or q.get('closed') is True or not isinstance(q.get('question'), str):
            continue
        options = [clean(o, 160) for o in q.get('options') or [] if isinstance(o, str)][:4]
        if len(options) < 2:
            continue
        fid = q.get('fiche') if ID.match(str(q.get('fiche', ''))) and q.get('fiche') in fs else ''
        row = {'id': qid, 'fiche': fid, 'app': RB.app_of(fs[fid]['theme']) if fid else '', 'question': clean(q['question'], 300),
               'context': clean(q.get('context', ''), 500), 'options': options, 'since': str(q.get('since', ''))[:10], 'state': 'todo'}
        r = q.get('recommended')
        if isinstance(r, int) and not isinstance(r, bool) and 0 <= r < len(options):
            row['recommended'] = r
        a = answers.get(qid) if isinstance(answers, dict) else None
        if isinstance(a, dict):
            c = a.get('choice')
            choice = c if isinstance(c, int) and not isinstance(c, bool) and 0 <= c < len(options) else None
            text = clean(a['text'], 2000) if isinstance(a.get('text'), str) else ''
            if choice is not None or text:
                row.update({'state': 'answered', 'choice': choice, 'text': text})
                if isinstance(a.get('at'), str) and re.match(r'^\d{4}-\d{2}-\d{2}T', a['at']):
                    row['at'] = a['at'][:24]
        out.append(row)
    return sorted(out, key=lambda r: (r['state'] != 'todo', r['id']))


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
        d = delivered_at(f['etat']) if state == 'todo' else ''
        rw = t.get('rewritten')
        if state == 'todo' and isinstance(rw, str) and STAMP.match(rw):
            d = max(d, rw)                   # a rewritten test is to be done again, like a new delivery
        if d:
            row['delivered'] = d
        if v and state == 'todo':            # a verdict stands while the fiche is delivered; a fiche open again is « known »
            if d and v.get('at', '') < d:    # delivered again after the verdict: to test again, the old verdict said
                row['previous'] = {k: v[k] for k in ('verdict', 'comment', 'at') if k in v}
            else:
                row['state'] = v['verdict']
                row.update({k: v[k] for k in ('comment', 'at') if k in v})
        tests.append(row)
    return {'schema': 'sog-recette/1',
            'generated': {'tool': 'tools/recette_build.py', 'at': datetime.date.today().isoformat(), 'tests': len(tests),
                          'verdicts': sum(1 for t in tests if t['state'] in ('ok', 'ko'))},
            'apps': [a for a, _, _ in RB.APPS] if hasattr(RB, 'APPS') else ['pilote', 'compagnie', 'maintenance', 'stats'],
            'tests': tests, 'decisions': decisions(org, fs)}


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
    todo = sum(1 for d in doc['decisions'] if d['state'] == 'todo')
    print(f"recette: {g['tests']} tests, {g['verdicts']} verdicts ; {len(doc['decisions'])} points à trancher, {todo} sans réponse")
    print('written', os.path.relpath(a.out))


if __name__ == '__main__':
    main()
