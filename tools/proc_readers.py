"""REGISTER of the procedure readers: the ONE place that says, for each reader of the suite, which page layout it reads,
for which State, from which source, under which licence the SOURCE is read, and which directories of invented test pages belong to it
(SOG-0667, lot F3).

The rule behind it (the user's decision of 26 Nov 2026, made a rule for ALL the sources, France included): the test files of the repository are
pages INVENTED on the same STRUCTURE as the real ones (the order of the columns, the headings that the reader recognises, the shape of the cells,
the layout traps), never an extract of a source. A real extract stays on the workstation of the user, where the replay of the real corpus runs.
The licence column therefore says under which licence the SOURCE is read on the workstation; it opens no real file in the repository.

What reads this file:
  · `tools/regen/coverage.py` (verb `base/coverage`): `status()` gives « readable / none / unchecked » (`procReader`, SOG-0615) and
    `no_reader_zones()` replaces the list `PROC_NO_READER` that was written by hand;
  · `tools/regen/base_cycle.py` (verb `base/cycle`): `dropped_unread_sources()` replaces `NO_READER_ZONES`, the second list written by hand;
  · the cases K632 and K633: every layout of `proc_layouts.LAYOUTS` has exactly one entry, every directory of
    `tests/v3/fixtures/procedure_readers/` is registered, every file in it has its reference line in the `sources.json` of its directory.

An entry is a dict: `id`; `reader` (the module that reads, or None: no reader for the State); `layouts` (names of
`proc_layouts.LAYOUTS` it reads); `zones` (zone codes of the base) and `prefixes` (ICAO prefixes) of the States; `source`
(`name`, and `url` / `id` when known); `licence` (`name`, `redistribution`: True when written and allowing it, False when written and refusing
it, None when nothing is written; `written_in`: the file of the repository that quotes it); `fixtures`: the names of the directories of INVENTED
pages under `tests/v3/fixtures/procedure_readers/`; `dropped_source` (for an entry with no reader: the id of the source whose files are dropped
by hand and never read). Standard library only; no network.

The rule of fabrication of an invented page, and the line that every file carries (« Page inventée, sur le modèle de {AIP de tel État, telle
rubrique, telle mise en page}. Aucune valeur n'est réelle. », in the `sources.json` of its directory), are in
`tests/v3/fixtures/procedure_readers/README.md`.

To add a reader or a layout: add its entry here (K632 fails until it is there); to add test pages: invent them (same structure), name the
directory in `fixtures` and give each file its reference line.
"""
import json
import os
import re

SOURCES_MD = 'frame/aerodb/test/fixtures/SOURCES.md'
EAD_MD = 'frame/aerodb/EAD_BASIC.md'
STATE_COPYRIGHT = {'name': "copyright of the State's AIP (nothing written that allows redistribution)", 'redistribution': None, 'written_in': EAD_MD}
EAD = {'name': "AIP of the State, a copy read through EAD Basic (EUROCONTROL)", 'id': 'ead-basic'}


def _ead(id, layouts, zones, prefixes, state, fixtures=()):
    return {'id': id, 'reader': 'proc_layouts', 'layouts': layouts, 'zones': zones, 'prefixes': prefixes, 'state': state,
            'source': EAD, 'licence': STATE_COPYRIGHT, 'fixtures': fixtures}


READERS = (
    {'id': 'sia-eaip', 'reader': 'proc_sia', 'layouts': ('sia-code',), 'zones': ('fr',), 'prefixes': ('LF', 'FM', 'NT', 'NW', 'TF'), 'state': 'France',
     'source': {'name': 'eAIP of the SIA (Service de l\'Information Aéronautique)', 'url': 'https://www.sia.aviation-civile.gouv.fr', 'id': 'sia-eaip'},
     'licence': {'name': 'Licence ouverte', 'redistribution': True, 'written_in': SOURCES_MD},
     'fixtures': ('fr', 'fr_invented'),
     'page': 'AD 2 pages DATA, coding tables (CODE) and IAC ILS / LOC (`proc_fr_iac`)'},
    {'id': 'faa-cifp', 'reader': 'proc_cifp', 'layouts': (), 'zones': ('us',), 'prefixes': ('K',), 'state': 'United States',
     'source': {'name': 'FAA CIFP (Coded Instrument Flight Procedures)', 'id': 'faa-cifp'},
     'licence': {'name': 'public domain', 'redistribution': True, 'written_in': SOURCES_MD},
     'fixtures': (), 'page': 'ARINC 424 file'},
    _ead('ead-uk', ('uk-coding', 'uk-app'), ('gb',), ('EG',), 'United Kingdom', ('uk',)),
    _ead('ead-at', ('at-coding',), ('at',), ('LO',), 'Austria'),
    _ead('ead-be', ('be-coding',), ('be',), ('EB',), 'Belgium'),
    _ead('ead-ge', ('ge-coding',), ('ge',), ('UG',), 'Georgia'),
    _ead('ead-am', ('am-coding',), ('am',), ('UD',), 'Armenia'),
    _ead('ead-ie', ('ei-coding',), ('ie',), ('EI',), 'Ireland', ('ie',)),
    _ead('ead-it', ('it-app',), ('it',), ('LI',), 'Italy', ('it',)),
    _ead('ead-es', ('es-prose',), ('es',), ('LE', 'GC', 'GE'), 'Spain', ('es',)),
    _ead('ead-de', ('de-route',), ('de',), ('ED',), 'Germany'),
    _ead('ead-icao-tab', ('icao-tab',), (), (), 'several States (an ICAO table printed without coordinates: the layout is not tied to one State)'),
    {'id': 'lfv-local', 'reader': 'proc_se', 'layouts': ('se-coding',), 'zones': (), 'prefixes': ('ES',), 'state': 'Sweden (the coding tables of a local archive of the LFV package: read on the workstation, not wired in the launcher: `none-lfv` below stays)',
     'source': {'name': 'LFV AIP package, a local archive read on the workstation (proc_local_corpus)', 'id': 'lfv-local'}, 'licence': {'name': None, 'redistribution': None, 'written_in': None},
     'fixtures': ('se',)},
    # the States with NO reader of procedures (SOG-0615): the screen says so (« La suite n'a pas de lecteur de procédures pour cet État »)
    {'id': 'none-naviair', 'reader': None, 'layouts': (), 'zones': ('dk', 'fo', 'gl'), 'prefixes': ('EK', 'BG'), 'state': 'Denmark, Faroe Islands, Greenland',
     'source': {'name': 'Naviair files dropped by hand', 'id': 'naviair'}, 'licence': {'name': None, 'redistribution': None, 'written_in': None},
     'fixtures': (), 'dropped_source': 'naviair'},
    {'id': 'none-navcan', 'reader': None, 'layouts': (), 'zones': ('ca',), 'prefixes': ('CY', 'CZ'), 'state': 'Canada',
     'source': {'name': 'AIP of NAV CANADA, files dropped by hand', 'id': 'navcan_aip'}, 'licence': {'name': None, 'redistribution': None, 'written_in': None},
     'fixtures': (), 'dropped_source': 'navcan_aip'},
    {'id': 'none-lfv', 'reader': None, 'layouts': (), 'zones': ('se',), 'prefixes': ('ES',), 'state': 'Sweden',
     'source': {'name': 'LFV: the ENR is read, the procedures are not', 'id': 'lfv'}, 'licence': {'name': None, 'redistribution': None, 'written_in': None},
     'fixtures': ()},
)


def no_reader_zones(readers=None):
    """The zone codes of the States for which the suite has NO reader of procedures, in the order of the register."""
    return tuple(z for e in (READERS if readers is None else readers) if e.get('reader') is None for z in e.get('zones', ()))


def dropped_unread_sources(readers=None):
    """{ id of a source whose files are dropped by hand and never read: its zone codes } (what `base/cycle` calls `NO_READER_ZONES`)."""
    return {e['dropped_source']: tuple(e['zones']) for e in (READERS if readers is None else readers) if e.get('dropped_source')}


def status(zone, held, readers=None):
    """`procReader` of a zone (SOG-0615, closed values): `readable` when it holds procedures (a reader read them, whatever the
    register says), `none` when the register says that the suite has no reader for it, `unchecked` otherwise: never guessed."""
    return 'readable' if held > 0 else 'none' if zone in no_reader_zones(readers) else 'unchecked'


def register_problems(readers=None):
    """The problems of the register itself, as `code:id` strings, sorted: an entry with no source or no licence field, and a `fixtures`
    that is not a tuple of directory names (the old `real` / `invented` split is gone: every test page is invented)."""
    out = []
    for e in (READERS if readers is None else readers):
        if not (e.get('source') or {}).get('name') or 'redistribution' not in (e.get('licence') or {}):
            out.append('source-or-licence-missing:' + str(e.get('id')))
        f = e.get('fixtures')
        if not isinstance(f, (tuple, list)) or not all(isinstance(d, str) for d in f):
            out.append('fixtures-not-a-list-of-directories:' + str(e.get('id')))
    return sorted(out)


INVENTED_START = 'Page inventée, sur le modèle de '
INVENTED_END = "Aucune valeur n'est réelle."
LOCAL_NAME = re.compile(r'\.(?:pdf|rows\.txt|json|zip|html)\b|data/local|\\')


def reference_problem(line):
    """None when a reference line is in the form that the rule asks (« Page inventée, sur le modèle de {…}. Aucune valeur n'est réelle. », no
    name of a local file), else the code of the problem."""
    if not isinstance(line, str) or not line.startswith(INVENTED_START) or not line.endswith(INVENTED_END):
        return 'reference-not-invented'
    if LOCAL_NAME.search(line):
        return 'reference-names-a-local-file'
    return None


def fixture_problems(root, readers=None):
    """The problems of a tree of test pages (`tests/v3/fixtures/procedure_readers/`), as `code:path` strings, sorted. Every directory of the tree
    must be registered; every directory that holds files must hold a `sources.json` (a list of { fixture, reference, … }) that gives each file
    its reference line (`reference_problem`) and no other file; a file with no line, a line with no file or a line that does not say « Page
    inventée, sur le modèle de … Aucune valeur n'est réelle. » is a problem. `README.md` and `sources.json` themselves are not pages."""
    known = {d for e in (READERS if readers is None else readers) for d in (e.get('fixtures') or ())}
    root = str(root)
    out = []
    for top in sorted(n for n in os.listdir(root) if os.path.isdir(os.path.join(root, n))):
        if top not in known:
            out.append('unregistered-directory:' + top)
            continue
        for path, dirs, names in os.walk(os.path.join(root, top)):
            dirs.sort()
            rel = os.path.relpath(path, root).replace(os.sep, '/')
            pages = sorted(n for n in names if n not in ('sources.json', 'README.md'))
            if not pages:
                continue
            try:
                with open(os.path.join(path, 'sources.json'), encoding='utf-8') as handle:
                    entries = json.load(handle)
                lines = {e['fixture']: e.get('reference') for e in entries}
            except (OSError, ValueError, KeyError, TypeError):
                out.append('sources-unreadable:' + rel)
                continue
            for n in pages:
                if n not in lines:
                    out.append('no-reference:' + rel + '/' + n)
                    continue
                problem = reference_problem(lines[n])
                if problem:
                    out.append(problem + ':' + rel + '/' + n)
            for n in sorted(set(lines) - set(pages)):
                out.append('reference-without-file:' + rel + '/' + n)
    return sorted(out)
