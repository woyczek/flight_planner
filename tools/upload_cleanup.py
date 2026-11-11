"""Nettoyage des fichiers déposés à la main (data/local/upload/, tools/base_upload.py) — SOG-0239, règle de l'ergonome du 11 novembre 2026 (l'utilisateur : « nettoyer les vieux fichiers »).

Un fichier choisi à la main (« Choisir le fichier… ») reste là pour toujours, jusqu'à 1,5 Go chacun. Il est RETIRÉ, à la fin d'une construction RÉUSSIE de sa zone (tools/regen/base.py, pas un verbe de plus), quand :
  (a) un dépôt plus récent de la même source a été lu par la construction : son cycle est postérieur au sien et ne dépasse pas celui que la construction a lu ;
  (b) son cycle est dépassé et le cycle en vigueur est construit pour sa zone.
JAMAIS : le fichier que la construction a lu (son cycle), un fichier d'un cycle plus récent que celui qu'elle a lu, un jeu incomplet (NASR : FIX reçu, AWY et NAV attendus), un nom qui n'est pas celui d'un dépôt daté de cette zone (le PDF d'UK Mil, l'eAIP suédois,
les classeurs d'EUROCONTROL, les exports d'openAIP : remplacés sous leur nom, jamais empilés), un dossier, un lien, un transfert en cours (.recv-….part). Les sources déposées ne sont pas des données compilées : celles-ci ne sont jamais purgées.

Les zones à dépôts datés : fr (SIA : export_xml_bd_SIA_AAAA-MM-JJ.zip), gb (NATS : EG_<AIP|OBS|UAS>_DS_AAAAMMJJ_XML.zip), us (NASR : JJ_Mon_AAAA_<FIX|AWY|NAV>_CSV.zip ; le cycle lu est l'`issue` de data/sia/geojson/faa_nasr.geojson).
Pour NATS l'AIP date la zone ; l'OBS et l'UAS gardent toujours leur plus récent (on ne sait pas lequel la construction a lu). Bibliothèque standard seulement."""
import datetime
import json
import os
import re

import aero_cycles

UPLOAD = ('local', 'upload')
SIA_ZIP = re.compile(r'^export_xml_bd_SIA_(\d{4})-(\d{2})-(\d{2})\.zip\Z', re.A)
NATS_ZIP = re.compile(r'^EG_(AIP|OBS|UAS)_DS_(\d{4})(\d{2})(\d{2})_XML\.zip\Z', re.A)
NASR_ZIP = re.compile(r'^(\d{2})_([A-Z][a-z]{2})_(\d{4})_(FIX|AWY|NAV)_CSV\.zip\Z', re.A)
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
KINDS = ('FIX', 'AWY', 'NAV')


def _cycle(y, m, d):
    try:
        return aero_cycles.airac_start(datetime.date(int(y), int(m), int(d)))
    except ValueError:
        return None


def _groups(names, zone):
    """{ groupe : [(cycle, [noms du dépôt])] } : les dépôts datés de la zone, regroupés par source (et par genre pour NATS) ; un jeu NASR est UNE entrée (ses trois noms) et seulement s'il est complet ; { groupe : keep_newest }."""
    groups, keep = {}, {}
    for n in names:
        if zone == 'fr' and (m := SIA_ZIP.match(n)) and (c := _cycle(*m.groups())):
            groups.setdefault('sia', {}).setdefault(c, []).append(n)
        elif zone == 'gb' and (m := NATS_ZIP.match(n)) and (c := _cycle(*m.groups()[1:])):
            groups.setdefault(m.group(1), {}).setdefault(c, []).append(n)
            keep[m.group(1)] = m.group(1) != 'AIP'
        elif zone == 'us' and (m := NASR_ZIP.match(n)) and m.group(2) in MONTHS and (c := _cycle(m.group(3), MONTHS.index(m.group(2)) + 1, m.group(1))):
            groups.setdefault('nasr', {}).setdefault(c, []).append(n)
    if 'nasr' in groups:      # un jeu incomplet n'est jamais touché : il n'entre pas dans le compte
        groups['nasr'] = {c: ns for c, ns in groups['nasr'].items() if len(ns) == len(KINDS)}
    return {g: sorted(cs.items()) for g, cs in groups.items() if cs}, keep


def read_cycle(data, zone, built):
    """Le cycle que la construction de la zone a lu : celui qu'elle a écrit (fr, gb) ; pour us, l'`issue` du NASR lu (data/sia/geojson/faa_nasr.geojson), sinon None (rien n'est retiré sans le savoir)."""
    if zone != 'us':
        return built
    try:
        with open(os.path.join(data, 'sia', 'geojson', 'faa_nasr.geojson'), encoding='utf-8') as f:
            issue = json.load(f).get('issue')
    except (OSError, ValueError, AttributeError):
        return None
    return issue if isinstance(issue, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', issue) else None


def clean(data, zone, built, current, say=None):
    """Retire les dépôts de la zone devenus inutiles ; rend [{ name, size }] de ce qui est parti (dit au journal par `say`, une ligne par fichier). built : le cycle de la construction qui vient de réussir ; current : le cycle en vigueur (aero_cycles.airac_start())."""
    folder = os.path.join(data, *UPLOAD)
    try:
        names = os.listdir(folder)
    except OSError:
        return []
    read = read_cycle(data, zone, built)
    if not read:
        return []
    # le cycle lu vient d'un fichier de data/ que d'autres peuvent écrire (l'issue de faa_nasr.geojson : audit, ligne 157) : un cycle POSTÉRIEUR au cycle en vigueur ne vaut pas plus que lui, et il ne dit jamais « le cycle en vigueur est construit » (b)
    future = read > current
    read = min(read, current)
    groups, keep_newest = _groups([n for n in names if os.path.isfile(os.path.join(folder, n)) and not os.path.islink(os.path.join(folder, n))], zone)
    gone = []
    for g, entries in groups.items():
        cycles = [c for c, _ in entries]
        for c, files in entries:
            if c >= read:        # celui que la construction a lu, ou plus récent : jamais
                continue
            later_read = any(c < d <= read for d in cycles)       # (a) un dépôt plus récent a été lu
            past_built = c < current and read >= current and not future          # (b) son cycle est dépassé et le cycle en vigueur est construit (lu, pas supposé)
            if keep_newest.get(g) and c == max(cycles):
                continue
            if not (later_read or past_built):
                continue
            for n in sorted(files):
                path = os.path.join(folder, n)
                try:
                    size = os.path.getsize(path)
                    os.remove(path)
                except OSError:
                    continue
                gone.append({'name': n, 'size': size})
                if say:
                    say(f'{zone}: dépôt retiré de data/local/upload/ : {n} ({size} octets)')
    return gone
