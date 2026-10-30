"""Les jeux de pages de test d'un terrain français (V3 § 10.29 (e)) : les lignes de texte des pages de codage de l'eAIP du SIA, reconstruites depuis les PDF du cache.

  python tools/make_eaip_fixtures.py LFPO --cache <dossier des PDF> [--ad2 <page AD 2 html>] [--pages 'AD_2_LFPO_DATA_SID*'] [--cycle 2026-10-01] [--out <dossier>]
  python tools/make_eaip_fixtures.py LFPO --cache <dossier des PDF> --check [--ad2 <page AD 2 html>]      compare le jeu au cache (mêmes lignes, mêmes PDF), code de sortie 1 sinon
  python tools/make_eaip_fixtures.py LFPO --cache <dossier des PDF> --fetch                              télécharge d'abord les PDF absents du cache (jamais fait par un test)
  python tools/make_eaip_fixtures.py LFBD --adopt --cycle 2026-10-01                                      manifeste d'un jeu dont les PDF ne sont plus dans un cache (« non régénérable »)

Un jeu = frame/aerodb/test/fixtures/eaip/<OACI>/ : une paire `<PDF>.rows.txt` par page de codage ou de données (`AD_2_<OACI>_DATA_*`, lignes de la PREMIÈRE page, comme le lit
proc_sia.read_aerodrome), l'extrait de la section AD 2.12 de la page de l'aérodrome (`FR-AD-2.<OACI>.AD-2.12.html`, avec --ad2 : le titre et le premier tableau) et `manifest.json`
{ icao, cycle, source: 'SIA eAIP', generated_at, pages: [{ file, pages, rows, sha256 du PDF }] }. Seuls les terrains français : la licence ouverte du SIA permet de republier ses pages
(frame/aerodb/test/fixtures/SOURCES.md) ; les autres dispositions restent sur des pages inventées. Bibliothèque standard, plus proc_pdf / proc_sia (pypdf pour lire un PDF).
"""
import argparse
import fnmatch
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import proc_pdf  # noqa: E402
import proc_sia  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / 'frame' / 'aerodb' / 'test' / 'fixtures' / 'eaip'
NOT_REGENERABLE = 'not regenerable: source PDF not cached'


def wanted(icao, name):
    """Les PDF dont proc_sia.read_aerodrome lit les lignes : les pages de données (DATA_0n) et de codage (…CODE…, sans les FASDB) du terrain."""
    return name.startswith(f'AD_2_{icao}_') and (re.search(r'_DATA_0\d\.pdf$', name) or (proc_sia.CODE_PAGE.match(name) and 'FASDB' not in name))


def section_212(page_html, icao):
    """L'extrait de la section AD 2.12 : de `<div id="<OACI>-AD-2.12">` à la fin de son premier tableau, refermé (le titre et la table des pistes ; le reste de la section n'est pas gardé)."""
    i = page_html.find(f'<div id="{icao}-AD-2.12"')
    j = page_html.find('</table>', i) + len('</table>') if i >= 0 else -1
    if i < 0 or j < len('</table>'):
        raise ValueError(f'section AD 2.12 de {icao} introuvable dans la page')
    return page_html[i:j] + '</div>\n'


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_page(pdf):
    """(nombre de pages du PDF, lignes de sa première page), lus sous délai (proc_pdf)."""
    n, pages = proc_pdf.pdf_some_pages(pdf, [0])
    return n, (pages[0] if pages else [])


def rows_text(rows):
    return '\n'.join(rows) + '\n'


def cached(icao, cache, pattern=None):
    """Les PDF du cache à mettre dans le jeu, par nom."""
    names = sorted(p.name for p in Path(cache).glob('*.pdf') if wanted(icao, p.name))
    return [n for n in names if not pattern or fnmatch.fnmatch(n, pattern) or fnmatch.fnmatch(n[:-4], pattern)]


def build(icao, cache, out, cycle, ad2=None, pattern=None, say=print):
    """Écrit le jeu : les lignes de chaque PDF, l'extrait AD 2.12 et le manifeste. Rend le manifeste."""
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    names = cached(icao, cache, pattern)
    if not names:
        raise SystemExit(f'aucun PDF AD_2_{icao}_DATA_* dans {cache}')
    pages = []
    for n in names:
        pdf = Path(cache) / n
        count, rows = read_page(pdf)
        (out / (n[:-4] + '.rows.txt')).write_text(rows_text(rows), encoding='utf-8')
        pages.append({'file': n, 'pages': count, 'rows': len(rows), 'sha256': sha256(pdf)})
        say(f'  {n}: {len(rows)} ligne(s) (document de {count} page(s))')
    manifest = {'icao': icao, 'cycle': cycle, 'source': 'SIA eAIP', 'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'pages': pages}
    if ad2:
        html = Path(ad2).read_text(encoding='utf-8')
        (out / f'FR-AD-2.{icao}.AD-2.12.html').write_text(section_212(html, icao), encoding='utf-8')
        manifest['ad2_12'] = {'file': f'FR-AD-2.{icao}.AD-2.12.html', 'sha256': hashlib.sha256(html.encode('utf-8')).hexdigest()}
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return manifest


def adopt(icao, out, cycle):
    """Manifeste d'un jeu qui existe sans que ses PDF soient dans un cache : les fichiers de lignes tels qu'ils sont, marqués non régénérables."""
    out = Path(out)
    pages = [{'file': f.name[:-len('.rows.txt')] + '.pdf', 'rows': len(f.read_text(encoding='utf-8').splitlines())} for f in sorted(out.glob('*.rows.txt'))]
    if not pages:
        raise SystemExit(f'aucun fichier .rows.txt dans {out}')
    manifest = {'icao': icao, 'cycle': cycle, 'source': 'SIA eAIP', 'regenerable': False, 'note': NOT_REGENERABLE, 'pages': pages}
    ad = out / f'FR-AD-2.{icao}.AD-2.12.html'
    if ad.exists():
        manifest['ad2_12'] = {'file': ad.name}
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return manifest


def check(icao, cache, out, ad2=None, pattern=None):
    """Compare le jeu au cache : [différences] (vide = le jeu est celui que le cache redonnerait). Un jeu non régénérable n'a rien à comparer : None."""
    out = Path(out)
    try:
        manifest = json.loads((out / 'manifest.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return [f'{out / "manifest.json"}: manifeste absent ou illisible']
    if manifest.get('regenerable') is False:
        return None
    diffs = []
    entries = [e for e in manifest.get('pages', []) if not pattern or fnmatch.fnmatch(e['file'], pattern) or fnmatch.fnmatch(e['file'][:-4], pattern)]
    for e in entries:
        pdf, fixture = Path(cache) / e['file'], out / (e['file'][:-4] + '.rows.txt')
        if not pdf.is_file():
            diffs.append(f'{e["file"]}: PDF absent du cache')
            continue
        if sha256(pdf) != e.get('sha256'):
            diffs.append(f'{e["file"]}: le PDF du cache n\'est plus celui du manifeste (sha256)')
        _, rows = read_page(pdf)
        if not fixture.is_file() or fixture.read_text(encoding='utf-8') != rows_text(rows):
            diffs.append(f'{e["file"]}: les lignes du jeu ne sont pas celles du PDF')
    known = {e['file'] for e in manifest.get('pages', [])}
    diffs += [f'{n}: dans le cache, absent du manifeste' for n in cached(icao, cache, pattern) if n not in known]
    if ad2:
        ex, f = manifest.get('ad2_12'), out / f'FR-AD-2.{icao}.AD-2.12.html'
        try:
            same = f.read_text(encoding='utf-8') == section_212(Path(ad2).read_text(encoding='utf-8'), icao)
        except (OSError, ValueError) as e:
            diffs.append(f'AD 2.12: {e}')
        else:
            if not ex or not same:
                diffs.append('AD 2.12: l\'extrait du jeu n\'est pas celui de la page')
    return diffs


def fetch_missing(icao, cache, cycle, say=print):
    """Télécharge dans le cache les PDF de données et de codage du terrain qui n'y sont pas (la page AD 2 de l'eAIP du SIA dit lesquels ; noms sûrs seulement). Jamais appelé par un test."""
    eaip = proc_sia.eaip_url(cycle)
    page = proc_sia.fetch(f'{eaip}/html/eAIP/FR-AD-2.{icao}-fr-FR.html').decode('utf-8', 'replace')
    Path(cache).mkdir(parents=True, exist_ok=True)
    for n in (x for x in proc_sia.pdf_names(icao, page) if wanted(icao, x)):
        target = proc_pdf.safe_path(cache, n)
        if not target.exists():
            say(f'  téléchargement de {n}')
            target.write_bytes(proc_sia.fetch(f'{eaip}/html/eAIP/Cartes/{icao}/{n}'))
    return page


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('icao', help='code OACI d\'un terrain français (LFBD, LFBO, LFPO, LFPG…)')
    ap.add_argument('--cache', default=None, help='dossier des PDF déjà téléchargés (ex. data/local/eaip/2026-10-01)')
    ap.add_argument('--ad2', default=None, help='page AD 2 de l\'aérodrome (FR-AD-2.<OACI>-fr-FR.html) : en tire l\'extrait de la section AD 2.12')
    ap.add_argument('--pages', default=None, help='motif de noms (ex. \'AD_2_LFPO_DATA_SID*\') : ne traite que ces pages')
    ap.add_argument('--cycle', default=None, help='cycle AIRAC AAAA-MM-JJ (par défaut le nom du dossier du cache)')
    ap.add_argument('--out', default=None, help='dossier du jeu (par défaut frame/aerodb/test/fixtures/eaip/<OACI>)')
    ap.add_argument('--check', action='store_true', help='vérifie le jeu contre le cache, n\'écrit rien ; code de sortie 1 s\'il diffère')
    ap.add_argument('--fetch', action='store_true', help='télécharge d\'abord les PDF absents du cache (réseau : jamais dans un test)')
    ap.add_argument('--adopt', action='store_true', help='sans cache : écrit le manifeste « non régénérable » d\'un jeu existant')
    a = ap.parse_args(argv)
    icao = a.icao.upper()
    if not (proc_sia.ICAO_RE.fullmatch(icao) and icao.startswith('LF')):
        raise SystemExit(f'code OACI refusé : {a.icao!r} (un terrain français, quatre caractères, comme LFBD : la licence ouverte du SIA ne couvre que lui)')
    out = Path(a.out) if a.out else FIXTURES / icao
    cycle = a.cycle or (Path(a.cache).name if a.cache and re.fullmatch(r'\d{4}-\d{2}-\d{2}', Path(a.cache).name) else None)
    if not cycle or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', cycle):
        raise SystemExit('--cycle AAAA-MM-JJ requis (ou un dossier de cache nommé ainsi)')
    if a.adopt:
        m = adopt(icao, out, cycle)
        print(f'{icao}: manifeste de {len(m["pages"])} page(s), {NOT_REGENERABLE}', file=sys.stderr)
        return 0
    if not a.cache:
        raise SystemExit('--cache requis (le dossier des PDF)')
    if a.fetch and not a.check:
        fetch_missing(icao, a.cache, cycle, lambda *t: print(*t, file=sys.stderr))
    if a.check:
        diffs = check(icao, a.cache, out, a.ad2, a.pages)
        if diffs is None:
            print(f'{icao}: {NOT_REGENERABLE}, rien à comparer', file=sys.stderr)
            return 0
        for d in diffs:
            print('DIFFÉRENCE:', d, file=sys.stderr)
        print(f'{icao}: ' + (f'{len(diffs)} différence(s)' if diffs else 'le jeu est celui du cache'), file=sys.stderr)
        return 1 if diffs else 0
    m = build(icao, a.cache, out, cycle, a.ad2, a.pages, lambda *t: print(*t, file=sys.stderr))
    print(f'{icao}: {len(m["pages"])} page(s) écrite(s) dans {out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
