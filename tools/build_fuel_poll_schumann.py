"""Paramètres du modèle de Poll et Schumann pour shared/fuel_poll_schumann.js (consommation de croisière) : lit les deux
fichiers de pycontrails (ps-aircraft-params-*.csv : 69 avions de ligne à réaction ; ps-synonym-list-*.csv : code OACI →
type couvert) et réécrit le bloc « PARAMÈTRES » du script (champs utiles à la croisière seulement).
Source : https://github.com/contrailcirrus/pycontrails (pycontrails/models/ps_model/static/), Apache License 2.0,
© 2021-present Contrails.org and the Breakthrough Energy Foundation.

Usage (racine du dépôt) : python tools/build_fuel_poll_schumann.py [params.csv synonymes.csv]
(sans fichiers : téléchargés depuis GitHub, version figée ci-dessous)
"""
import csv, io, json, os, re, subprocess, sys, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'shared', 'fuel_poll_schumann.js')
BASE = 'https://raw.githubusercontent.com/contrailcirrus/pycontrails/{ref}/pycontrails/models/ps_model/static/'
REF = 'main'
PARAMS = 'ps-aircraft-params-20250328.csv'
SYNONYMS = 'ps-synonym-list-20250328.csv'
# colonne du CSV → champ du script (nombres)
FIELDS = {'MTOM_kg': 'mtow', 'MLM_kg': 'mlw', 'MZFM_kg': 'mzfw', 'OEM_i_kg': 'oew', 'Sref_m2': 's', 'delta_2': 'delta2',
          'cos_sweep': 'cosSweep', 'AR': 'ar', 'psi_0': 'psi0', 'Xo': 'xRef', 'wing_constant': 'wingK', 'j_1': 'j1',
          'j_2': 'j2', 'mf_max_T_O_SLS_kg_s': 'ffMax', 'mf_idle_SLS_kg_s': 'ffIdle', 'M_des': 'mDes', 'CT_des': 'ctDes',
          'eta_1': 'eta1', 'eta_2': 'eta2', 'FL_max': 'flMax', 'MMO': 'mmo'}


def read(arg, name):
    """Texte d'un fichier donné, sinon téléchargé depuis le dépôt de pycontrails."""
    if arg:
        return io.open(arg, encoding='utf-8-sig').read()
    with urllib.request.urlopen(BASE.format(ref=REF) + name, timeout=60) as r:
        return r.read().decode('utf-8-sig')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    args = sys.argv[1:] + [None, None]
    ps = {}
    for row in csv.DictReader(io.StringIO(read(args[0], PARAMS))):
        rec = {'name': f"{row['Manufacturer']} {row['Type']}".strip(), 'winglets': row['winglets'].strip().lower() == 'yes'}
        for col, key in FIELDS.items():
            v = float(row[col])
            rec[key] = int(v) if v.is_integer() else round(v, 10)
        ps[row['ICAO'].strip().upper()] = rec
    syn = {}
    for row in csv.DictReader(io.StringIO(read(args[1], SYNONYMS))):
        a, b = row['ICAO Aircraft Code'].strip().upper(), row['PS ATYP'].strip().upper()
        if a != b and b in ps:
            syn[a] = b
    block = ('  // <PARAMÈTRES> — GÉNÉRÉ par tools/build_fuel_poll_schumann.py : ne pas éditer à la main\n'
             f'  const PS = {json.dumps(ps, ensure_ascii=False, separators=(",", ":"))};\n'
             f'  const SYN = {json.dumps(syn, separators=(",", ":"))};\n'
             '  // </PARAMÈTRES>')
    js = io.open(OUT, encoding='utf-8').read()
    new = re.sub(r'  // <PARAMÈTRES>.*?// </PARAMÈTRES>', lambda _: block, js, flags=re.S)
    if new != js:
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(new)
        # mise en forme commune du code (tools/format_sources.py) : le bloc écrit compact est ensuite développé comme
        # le reste ; sans elle, chaque génération et chaque mise en forme se défont l'une l'autre
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'format_sources.py'), OUT], capture_output=True)
    changed = io.open(OUT, encoding='utf-8').read() != js
    print(f'{len(ps)} types, {len(syn)} synonymes -> shared/fuel_poll_schumann.js' + ('' if changed else ' (inchangé)'))


if __name__ == '__main__':
    main()
