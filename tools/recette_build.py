#!/usr/bin/env python3
"""The acceptance list of the suite (SOG-0167): `frame/help/recette.json` from the organisation folder.

    python tools/recette_build.py --org E:/DEFA/organisation

Inputs, all in the organisation folder (the single source, like the roadmap of tools/roadmap_build.py):
  · BACKLOG.md          the fiches (`### SOG-xxxx — title`, **Thème**, **État**): the title, the application and the state;
  · RECETTE_TESTS.json  { tests: { "SOG-xxxx": { since: "YYYY-MM-DD", test: "where to go, what to do, what to see",
                        rewritten?: "YYYY-MM-DDTHH:MM:SSZ" } } }, one functional test per delivered fiche, written by the
                        ergonomist in the pilot's words;
  · RECETTE.json        the user's verdicts, written by the launcher from the screen (sog-recette/1 :
                        { items: { "SOG-xxxx": { verdict: "ok" | "ko" | "reserve", comment, at } } }); optional;
  · roadmap_i18n.json   the translated titles (en, de, es), shared with the roadmap.

Output: { schema: 'sog-recette/1', generated: { tool, at, tests, verdicts }, apps, tests: [{ id, app, title: {fr, en, de, es},
test (French: the user's language of work), since, state: 'todo' | 'known' | 'ok' | 'ko', comment?, at?, delivered?, previous? }], paths? }.
  · 'todo'  the fiche is delivered and waits for the user's verdict;
  · 'known' the fiche is open again or in progress: said on its test (« en cours, ne pas retester »), so that a known defect
            is not reported twice;
  · 'ok' / 'ko' / 'reserve' the user's last verdict (`reserve`: accepted with reservations, no retest, a comment is required — SOG-0329), kept while the fiche has not been delivered again after it.
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
does not count.

The test paths (the user, 21 Nov 2026: « quelques chemins d'usage valident beaucoup de fiches d'un coup »; the ergonomist's Q4):
  · RECETTE_CHEMINS.json  { schema: 1, preamble, order: ['C1', …], paths: [{ id: 'C1', title, where, note?, folded?, show_when_delivered?,
                          ref?, covers?: [SOG-…], steps: [{ gesture, expect, fiches: [SOG-…], optional? }] }], majors_first: [SOG-…],
                          no_test: { 'SOG-…': reason } }, written by the relay alone; optional — an unreadable or empty file gives no `paths`
                          and the list is the one of before. An UNTRUSTED input like the verdicts: only the fields above are copied (never
                          a key read from the file), every text and number is bounded (the same limits as frame/lib/recette_paths.js, which reads
                          the result again), the ids are matched.
Output `paths`: { preamble, order, paths: [ … as above, minus show_when_delivered ], majors_first, no_test: [{ id, title: {fr, en, de, es}, reason }] };
a path with `show_when_delivered` stays out until that fiche is delivered (its fiches are then listed one by one, as before)."""
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
PID = re.compile(r'^C\d{1,3}$')
# the bounds of the test paths: the same as LIMITS of frame/lib/recette_paths.js (the case K513 compares them)
PATH_LIMITS = {'paths': 30, 'steps': 40, 'fiches': 12, 'covers': 80, 'majors': 40, 'no_test': 200, 'id': 20, 'title': 120, 'where': 30,
               'note': 300, 'preamble': 300, 'gesture': 600, 'expect': 600, 'reason': 200}
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
        if not ID.match(str(fid)) or not isinstance(v, dict) or v.get('verdict') not in ('ok', 'ko', 'reserve'):
            continue
        e = {'verdict': v['verdict']}
        if isinstance(v.get('comment'), str):
            e['comment'] = re.sub(r'[\x00-\x1f]', ' ', v['comment'])[:2000]
        if isinstance(v.get('at'), str) and re.match(r'^\d{4}-\d{2}-\d{2}T', v['at']):
            e['at'] = v['at'][:24]
        out[fid] = e
    return out


def histories(org):
    """{ id: [{ verdict, comment?, at? } …] } (SOG-0351): the verdicts a fiche put back to test or a newer verdict replaced, twenty at most, from RECETTE.json — an untrusted input, bounded and filtered."""
    out = {}
    for fid, v in list((read_json(os.path.join(org, 'RECETTE.json')).get('items') or {}).items())[:1000]:
        if not ID.match(str(fid)) or not isinstance(v, dict) or not isinstance(v.get('history'), list):
            continue
        hist = []
        for h in v['history'][-20:]:
            if not isinstance(h, dict) or h.get('verdict') not in ('ok', 'ko', 'reserve'):
                continue
            e = {'verdict': h['verdict']}
            if isinstance(h.get('comment'), str):
                e['comment'] = re.sub(r'[\x00-\x1f]', ' ', h['comment'])[:2000]
            if isinstance(h.get('at'), str) and re.match(r'^\d{4}-\d{2}-\d{2}T', h['at']):
                e['at'] = h['at'][:24]
            hist.append(e)
        if hist:
            out[fid] = hist
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
        options = [clean(o, 600) for o in q.get('options') or [] if isinstance(o, str)][:4]
        if len(options) < 2:
            continue
        fid = q.get('fiche') if ID.match(str(q.get('fiche', ''))) and q.get('fiche') in fs else ''
        row = {'id': qid, 'fiche': fid, 'app': RB.app_of(fs[fid]['theme']) if fid else '', 'question': clean(q['question'], 2000),
               'context': clean(q.get('context', ''), 2000), 'options': options, 'since': str(q.get('since', ''))[:10], 'state': 'todo'}
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


def fiche_ids(value, n):
    """The distinct SOG-nnnn ids of a list read from the paths file, n at most."""
    out = []
    for x in value if isinstance(value, list) else []:
        if isinstance(x, str) and ID.match(x) and x not in out:
            out.append(x)
    return out[:n]


def text_of(value, n):
    """A text of the paths file: no control character, bounded; '' when it is not a text."""
    return clean(value, n) if isinstance(value, str) else ''


def chemins(org, fs):
    """The test paths of RECETTE_CHEMINS.json (see the header), or {} when the file is absent, unreadable or holds nothing to show."""
    raw = read_json(os.path.join(org, 'RECETTE_CHEMINS.json'))
    if not raw or raw.get('schema') != 1:
        return {}
    L = PATH_LIMITS
    paths = []
    for p in (raw.get('paths') if isinstance(raw.get('paths'), list) else [])[:L['paths']]:
        if not isinstance(p, dict) or not isinstance(p.get('id'), str) or not PID.match(p['id']) or any(q['id'] == p['id'] for q in paths):
            continue
        when = p.get('show_when_delivered')
        if isinstance(when, str) and ID.match(when) and not (when in fs and RB.state_of(fs[when]['etat']) == 'done'):
            continue                         # waits for its fiche: not shown yet, its fiches stay in the list one by one
        steps = []
        for s in (p.get('steps') if isinstance(p.get('steps'), list) else [])[:L['steps']]:
            if isinstance(s, dict) and text_of(s.get('gesture'), L['gesture']):
                step = {'gesture': text_of(s['gesture'], L['gesture']), 'expect': text_of(s.get('expect'), L['expect']),
                        'fiches': fiche_ids(s.get('fiches'), L['fiches'])}
                if s.get('optional') is True:
                    step['optional'] = True
                steps.append(step)
        covers = fiche_ids(p.get('covers'), L['covers'])
        if not steps and not covers:
            continue
        row = {'id': p['id'], 'title': text_of(p.get('title'), L['title']) or p['id'], 'where': text_of(p.get('where'), L['where']),
               'steps': steps}
        if text_of(p.get('note'), L['note']):
            row['note'] = text_of(p['note'], L['note'])
        if p.get('folded') is True:
            row['folded'] = True
        if isinstance(p.get('ref'), str) and ID.match(p['ref']):
            row['ref'] = p['ref']
        if covers:
            row['covers'] = covers
        paths.append(row)
    i18n = read_json(os.path.join(org, 'roadmap_i18n.json'))
    no_test = []
    for fid, why in list((raw.get('no_test') if isinstance(raw.get('no_test'), dict) else {}).items())[:L['no_test']]:
        if isinstance(fid, str) and ID.match(fid) and fid in fs and isinstance(why, str):
            tr = i18n.get(fid) if isinstance(i18n.get(fid), dict) else {}
            no_test.append({'id': fid, 'title': {'fr': fs[fid]['title'], **{k: str(tr[k])[:200] for k in ('en', 'de', 'es') if isinstance(tr.get(k), str)}},
                            'reason': clean(why, L['reason'])})
    majors = fiche_ids(raw.get('majors_first'), L['majors'])
    if not paths and not majors and not no_test:
        return {}
    order = [x for x in (raw.get('order') if isinstance(raw.get('order'), list) else []) if isinstance(x, str) and PID.match(x)][:L['paths']]
    return {'preamble': text_of(raw.get('preamble'), L['preamble']), 'order': order, 'paths': paths, 'majors_first': majors,
            'no_test': sorted(no_test, key=lambda r: r['id'])}


def build(org):
    """The acceptance document."""
    fs = fiches(org)
    i18n = read_json(os.path.join(org, 'roadmap_i18n.json'))
    vs = verdicts(org)
    hs = histories(org)
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
        if hs.get(fid):
            row['history'] = hs[fid]
        tests.append(row)
    doc = {'schema': 'sog-recette/1',
           'generated': {'tool': 'tools/recette_build.py', 'at': datetime.date.today().isoformat(), 'tests': len(tests),
                          'verdicts': sum(1 for t in tests if t['state'] in ('ok', 'ko', 'reserve'))},
           'apps': [a for a, _, _ in RB.APPS] if hasattr(RB, 'APPS') else ['pilote', 'compagnie', 'maintenance', 'stats'],
           'tests': tests, 'decisions': decisions(org, fs)}
    paths = chemins(org, fs)
    if paths:
        doc['paths'] = paths
    return doc


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
