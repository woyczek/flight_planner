#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aircraft DB refresher for LandingPerformance.

Priority of evidence:
  1) manual overrides
  2) ICAO Doc 8643 (strong source): exact designator, model/name, DESCRIPTION, WTC
  3) EUROCONTROL Aircraft Performance Database: wing position + alternative names + cross-check
  4) validated Wikidata/Wikipedia fallback, only for missing non-ICAO metadata

The ICAO PDFs are cached locally and refreshed only when stale.
Part 2 is used as designator -> model/description/WTC.
Part 3 is used as model/name -> designator and to detect ambiguous aliases.

Important:
- separators/spaces/hyphens are ignored in identity keys (AS350 == AS 350 == AS-350)
- ambiguous names are never guessed (e.g. ALOUETTE can resolve to multiple ICAO types)
- no arbitrary L1P/WTC L defaults are generated
- progress is saved atomically after each aircraft and on Ctrl+C
"""

import argparse
import csv
import datetime as dt
import hashlib
from html import unescape
from html.parser import HTMLParser
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
EUROCONTROL_DETAILS = "https://learningzone.eurocontrol.int/ilp/customs/ATCPFDB/details.aspx?ICAO={}"

# ICAO's public report URLs. Unversioned URLs are tried first; Ed40 is a fallback
# because it is known to be publicly accessible. The store edition may be newer.
ICAO_PART2_URLS = [
    # Known-public ICAO Ed40 report (preferred stable fallback)
    "https://cfapps.icao.int/doc8643/reports/Doc8643-Ed40/Part2-By%20Type%20Designator%28Decode%29.pdf",
    "https://cfapps.icao.int/doc8643/reports/Doc8643-Ed40/Part2-By%20Type%20Designator(Decode).pdf",
    # Current/unversioned report
    "https://cfapps.icao.int/doc8643/reports/Part2-By%20Type%20Designator%28Decode%29.pdf",
    "https://cfapps.icao.int/doc8643/reports/Part2-By%20Type%20Designator(Decode).pdf",
]
# Liste officielle OACI des indicatifs de types (Doc 8643), service JSON public de l'outil de recherche
# (POST sans corps) : désignateur, modèle, constructeur, description (L2J…), catégorie de turbulence.
# Source principale depuis que les rapports PDF ci-dessous ne sont plus publiés (404) ; les PDF restent
# en repli s'ils sont déjà en cache.
ICAO_JSON_URL = "https://doc8643.icao.int/external/aircrafttypes"
ICAO_PART3_URLS = [
    "https://cfapps.icao.int/doc8643/reports/Doc8643-Ed40/Part3-By%20Model%20Number_Name.pdf",
    "https://cfapps.icao.int/doc8643/reports/Part3-By%20Model%20Number_Name.pdf",
]

DEFAULT_COMMON = [
    "C152","C172","C182","C206","C208","BN2P","BE58","B350","AT42","AT72","AT76",
    "DH8A","DH8B","DH8C","DH8D","DHC6","DHC7","F27","F50","L410","D228","C212",
    "CN35","C295","SF34","SH33","SH36","A4M","DC3","C750","S210","MD88","EC35",
    "EC45","AS50","AS65","S76","CH47","SA342"
]

# Explicit aliases are retained for common simulator/commercial names. They are
# normalized, so AS-350 / AS 350 / AS350 all become AS350 before lookup.
ALIASES_DEFAULT = {
    "AS350":"AS50", "AS350B":"AS50", "AS350B2":"AS50", "AS350B3":"AS50", "H125":"AS50",
    "EC135":"EC35", "H135":"EC35",
    "EC145":"EC45", "H145":"EC45", "BK117C2":"EC45", "BK117D2":"EC45", "BK117D3":"EC45",
    "SA365":"AS65", "AS365":"AS65", "AS565":"AS65",
    "Q400":"DH8D", "DHC8400":"DH8D", "DASH8Q400":"DH8D", "DASH8400":"DH8D",
    "ATR42":"AT42", "ATR72":"AT72", "ATR72600":"AT76",
    "A400":"A4M", "A400M":"A4M",
    "DO228":"D228", "DORNIER228":"D228",
    "CARAVELLE":"S210", "SE210":"S210",
    "CH47D":"CH47", "CH47F":"CH47",
    "DC3C":"DC3", "C47":"DC3", "C47A":"DC3", "C47B":"DC3",
}

MANUAL_SOURCE_MARKERS = ("manual", "override")
ICAO_SOURCE_MARKERS = ("icao doc 8643",)
WEAK_SOURCE_MARKERS = ("wikipedia", "wikidata", "heuristic", "unknown")


def normalize_key(value):
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def normalize_alias_map(mapping):
    out = {}
    for key, value in (mapping or {}).items():
        nk, nv = normalize_key(key), normalize_key(value)
        if nk and nv:
            out[nk] = nv
    return out


def resolve_alias(key, aliases):
    current = normalize_key(key)
    seen = set()
    while current in aliases and current not in seen:
        seen.add(current)
        current = normalize_key(aliases[current])
    return current


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in ("script", "style"):
            self.hidden += 1
        elif not self.hidden and tag.lower() in ("br", "p", "div", "h1", "h2", "h3", "h4", "li", "tr", "td", "th"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag.lower() in ("script", "style") and self.hidden:
            self.hidden -= 1
        elif not self.hidden and tag.lower() in ("p", "div", "h1", "h2", "h3", "h4", "li", "tr", "td", "th"):
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)

    def text(self):
        raw = unescape("".join(self.parts)).replace("\xa0", " ")
        return [re.sub(r"\s+", " ", line).strip() for line in raw.splitlines() if re.sub(r"\s+", " ", line).strip()]


class HttpClient:
    def __init__(self, cache_path="aircraft_http_cache.json", min_delay=1.25, retries=6):
        self.cache_path = Path(cache_path) if cache_path else None
        self.min_delay = max(0.0, float(min_delay))
        self.retries = max(0, int(retries))
        self.last_request = 0.0
        self.cache = {}
        if self.cache_path and self.cache_path.exists():
            try:
                self.cache = json.loads(self.cache_path.read_text(encoding="utf-8"))
            except Exception:
                self.cache = {}

    @staticmethod
    def _key(kind, url, params=None):
        params = params or {}
        qs = urllib.parse.urlencode(sorted((str(k), str(v)) for k, v in params.items()))
        return hashlib.sha256((kind + "|" + url + "?" + qs).encode("utf-8")).hexdigest()

    def save_cache(self):
        if not self.cache_path:
            return
        tmp = self.cache_path.with_suffix(self.cache_path.suffix + ".tmp")
        tmp.write_text(json.dumps(self.cache, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        replace_retry(tmp, self.cache_path)

    def _request(self, url, params=None, accept="*/*"):
        params = params or {}
        qs = urllib.parse.urlencode(params)
        full_url = url + (("?" + qs) if qs else "")
        headers = {
            # cfapps.icao.int can return 404/403 to minimal non-browser clients.
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
            "Referer": "https://www.icao.int/operational-safety/doc-8643-aircraft-type-designators/search",
            "Connection": "keep-alive",
        }
        for attempt in range(self.retries + 1):
            elapsed = time.monotonic() - self.last_request
            if elapsed < self.min_delay:
                time.sleep(self.min_delay - elapsed)
            req = urllib.request.Request(full_url, headers=headers)
            try:
                self.last_request = time.monotonic()
                with urllib.request.urlopen(req, timeout=45) as resp:
                    return resp.read()
            except urllib.error.HTTPError as exc:
                if exc.code != 429 or attempt >= self.retries:
                    raise
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                try:
                    wait = float(retry_after) if retry_after else 0.0
                except (TypeError, ValueError):
                    wait = 0.0
                wait = min(120.0, max(wait if wait > 0 else 2.0 ** (attempt + 1), self.min_delay))
                print(f"\n      HTTP 429: pause {wait:.1f}s avant nouvelle tentative ({attempt + 1}/{self.retries})...", file=sys.stderr, flush=True)
                time.sleep(wait)
            except (urllib.error.URLError, TimeoutError):
                if attempt >= self.retries:
                    raise
                wait = min(30.0, 1.5 * (2.0 ** attempt))
                print(f"\n      Réseau: pause {wait:.1f}s avant nouvelle tentative ({attempt + 1}/{self.retries})...", file=sys.stderr, flush=True)
                time.sleep(wait)
        raise RuntimeError("HTTP retry loop exhausted")

    def get_text(self, url, params=None):
        key = self._key("text", url, params)
        if key in self.cache:
            return self.cache[key]
        text = self._request(url, params, "text/html,application/xhtml+xml").decode("utf-8", "replace")
        self.cache[key] = text
        self.save_cache()
        return text

    def get_json(self, url, params=None):
        key = self._key("json", url, params)
        if key in self.cache:
            return self.cache[key]
        obj = json.loads(self._request(url, params, "application/json").decode("utf-8"))
        self.cache[key] = obj
        self.save_cache()
        return obj

    def download_file(self, urls, destination):
        destination = Path(destination)
        last_error = None
        for url in urls:
            try:
                data = self._request(url, accept="application/pdf,*/*")
                if not data.startswith(b"%PDF"):
                    raise ValueError("réponse non PDF")
                tmp = destination.with_suffix(destination.suffix + ".tmp")
                tmp.write_bytes(data)
                tmp.replace(destination)
                return url
            except Exception as exc:
                last_error = exc
        raise RuntimeError(f"impossible de télécharger {destination.name}: {last_error}")


HTTP = None


def replace_retry(tmp, target, tries=10):
    """Remplacement atomique ; sous Windows, un client de synchronisation (Synology Drive, OneDrive…) peut verrouiller
    brièvement le fichier cible : on réessaie quelques fois avant d'abandonner."""
    for i in range(tries):
        try:
            tmp.replace(target); return
        except PermissionError:
            if i == tries - 1: raise
            time.sleep(0.5 * (i + 1))


def load_js_db(path):
    txt = Path(path).read_text(encoding="utf-8-sig")
    m = re.search(r"window\.AIRCRAFT_DB\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S)
    if not m:
        raise ValueError(f"Format AIRCRAFT_DB invalide: {path}")
    return json.loads(m.group(1))


def save_js_db(path, obj):
    path = Path(path)
    payload = "// Base des types d'appareils OACI (Doc 8643, recoupée EUROCONTROL / Wikidata), GÉNÉRÉE par\n// AircraftDB/update_aircraft_db.py : ne pas éditer à la main (corrections : champ __meta.manual_fixes).\n" + "window.AIRCRAFT_DB = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(payload, encoding="utf-8")
    replace_retry(tmp, path)


def load_overrides(path):
    if not path or not Path(path).exists():
        return {"__aliases": {}, "__records": {}}
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def designators_from_csv(csv_paths):
    found = set()
    for path in csv_paths:
        with open(path, "r", encoding="utf-8-sig", errors="ignore", newline="") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                key = normalize_key(row.get("Aircraft") or row.get("aircraft") or row.get("Designator"))
                if key:
                    found.add(key)
    return found


# ---------------- ICAO DOC 8643 ----------------

def file_is_fresh(path, max_age_days):
    path = Path(path)
    if not path.exists():
        return False
    age = time.time() - path.stat().st_mtime
    return age <= max_age_days * 86400


def extract_pdf_text(path):
    """Use pypdf first; then pdfplumber; then external pdftotext."""
    path = str(path)
    try:
        from pypdf import PdfReader
        reader = PdfReader(path)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except ImportError:
        pass
    except Exception:
        pass

    try:
        import pdfplumber
        chunks = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                chunks.append(page.extract_text() or "")
        return "\n".join(chunks)
    except ImportError:
        pass
    except Exception:
        pass

    exe = shutil.which("pdftotext")
    if exe:
        proc = subprocess.run([exe, "-layout", path, "-"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return proc.stdout.decode("utf-8", "replace")

    raise RuntimeError("Lecture PDF impossible. Installe pypdf: python -m pip install pypdf")


def parse_icao_part2(text):
    """Build exact ICAO designator index from Part 2.

    Expected fields: DESIGNATOR | MANUFACTURER, MODEL | DESCRIPTION | WTC.
    We deliberately require an ICAO description code and WTC, which makes the
    parser conservative rather than guessing from arbitrary PDF text.
    """
    by_designator = {}
    # Normalize line breaks but keep each PDF-extracted line independent first.
    lines = [re.sub(r"\s+", " ", x).strip() for x in text.splitlines()]
    pattern = re.compile(
        r"(?<![A-Z0-9])([A-Z0-9]{2,4})(?![A-Z0-9])\s+(.+?)\s+([LASHGT][0-9][JPTE])\s+(L/M|L|M|H|J)(?=\s|$)"
    )
    for line in lines:
        if not line or "DESIGNATOR" in line.upper() or "INDICATIF" in line.upper():
            continue
        for m in pattern.finditer(line):
            code, model, desc, wtc = m.groups()
            code = normalize_key(code)
            model = re.sub(r"\s+", " ", model).strip(" ,;-")
            if not (2 <= len(code) <= 4 and model and len(model) <= 180):
                continue
            rec = by_designator.setdefault(code, {
                "tdesig": code, "models": [], "model": "", "description": desc, "wtc": wtc,
                "source": "ICAO Doc 8643",
            })
            if model not in rec["models"]:
                rec["models"].append(model)
            if not rec["model"]:
                rec["model"] = model
            # Exact description/WTC must be consistent; first value wins if PDF duplication differs.
            rec.setdefault("description", desc)
            rec.setdefault("wtc", wtc)

    return by_designator


def parse_icao_part3(text):
    """Extract model/name -> designator candidates from Part 3.

    Part 3 has two columns, so the parser scans every line for repeated
    'model text + designator + WTC' groups. Ambiguity is preserved.
    """
    entries = []
    pattern = re.compile(r"(.+?)\s+([A-Z0-9]{2,4})\s+(L/M|L|M|H|J)(?=\s|$)")
    for raw in text.splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line or "MODEL" in line.upper() and "DESIGNATOR" in line.upper():
            continue
        cursor = 0
        while cursor < len(line):
            m = pattern.search(line, cursor)
            if not m:
                break
            model_text, code, wtc = m.groups()
            model_text = model_text.strip(" ,;-")
            code = normalize_key(code)
            # Ignore headers/page numbers and implausibly short model names.
            if len(model_text) >= 3 and len(model_text) <= 180 and 2 <= len(code) <= 4:
                entries.append({"name": model_text, "tdesig": code, "wtc": wtc})
            cursor = m.end()
    return entries


def build_icao_alias_index(by_designator, part3_entries):
    index = {}

    def add(name, code):
        nk = normalize_key(name)
        code = normalize_key(code)
        if len(nk) < 3 or not code:
            return
        index.setdefault(nk, set()).add(code)

    # Part 2 models are useful aliases too.
    for code, rec in by_designator.items():
        add(code, code)
        for model in rec.get("models", []):
            add(model, code)
            # Common useful sub-forms: everything before/after comma.
            if "," in model:
                left, right = model.split(",", 1)
                add(left, code)
                add(right, code)

    for e in part3_entries:
        add(e["name"], e["tdesig"])
        # Remove manufacturer after final comma as a model-name alias.
        if "," in e["name"]:
            left = e["name"].rsplit(",", 1)[0]
            add(left, e["tdesig"])

    return {k: sorted(v) for k, v in index.items()}


def fetch_icao_json(path, max_age_days=30, force_refresh=False, use_network=True):
    """Liste OACI (JSON) en cache dans path, rafraîchie au-delà de max_age_days. Retourne la liste ou None."""
    if use_network and (force_refresh or not file_is_fresh(path, max_age_days)):
        try:
            print("ICAO Doc 8643 : liste officielle (JSON)...", flush=True)
            req = urllib.request.Request(ICAO_JSON_URL, data=b"", method="POST",
                                         headers={"User-Agent": "Mozilla/5.0 (X-Plane Web Suite aircraft DB)", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if isinstance(data, list) and len(data) > 1000:
                tmp = path.with_suffix(".json.tmp"); tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8"); replace_retry(tmp, path)
            else:
                print(f"ICAO Doc 8643 : réponse JSON inattendue ({type(data).__name__})", file=sys.stderr)
        except Exception as exc:
            print(f"ICAO Doc 8643 : liste JSON indisponible ({exc})", file=sys.stderr)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def index_from_icao_json(items):
    """Index OACI (même forme que celui des PDF) à partir de la liste JSON : by_designator (désignateur →
    modèle « CONSTRUCTEUR Modèle », description, WTC) et entrées nom de modèle → désignateur (alias)."""
    by_designator, part3 = {}, []
    # Nom représentatif d'un désignateur, choisi parmi ses entrées OACI (voir representative).
    from collections import Counter
    groups = {}
    for it in items:
        groups.setdefault(normalize_key(it.get("Designator")), []).append(it)
    def representative(entries):
        # Nom dont les mots sont partagés par le plus d'entrées (« Gazelle », « Mirage », « MQ-9 ») : écarte les
        # désignations étrangères isolées (« Vajra », « H-45 Partizan ») ; puis constructeur le plus fréquent, nom court.
        words = lambda e: set(re.findall(r"[A-Z0-9][A-Z0-9-]*", str(e.get("ModelFullName") or "").upper()))
        freq = Counter(w for e in entries for w in words(e))
        makers = Counter(str(e.get("ManufacturerCode") or "").strip() for e in entries)
        shared = lambda e: sum(freq[w] for w in words(e)) / max(1, len(words(e)))
        # proximité avec le désignateur lui-même (MIR2 → « Mirage 2000 », PC21 → « PC-21 », E121 → « EMB-121 ») :
        # lettres du code présentes dans le nom, bonus si ses chiffres y figurent d'un seul tenant
        code = normalize_key(entries[0].get("Designator")); digits = "".join(ch for ch in code if ch.isdigit())
        def near(e):
            n = normalize_key(e.get("ModelFullName"))
            return sum(1 for ch in code if ch in n) + (3 if digits and digits in n else 0)
        best = max(entries, key=lambda e: (near(e), round(shared(e), 3), makers[str(e.get("ManufacturerCode") or "").strip()], -len(str(e.get("ModelFullName") or ""))))
        model, maker = str(best.get("ModelFullName") or "").strip(), str(best.get("ManufacturerCode") or "").strip()
        return model if not maker or maker.lower() in model.lower() else f"{maker} {model}"
    names = {code: representative(v) for code, v in groups.items() if code}
    for it in items:
        code = normalize_key(it.get("Designator"))
        model, maker = str(it.get("ModelFullName") or "").strip(), str(it.get("ManufacturerCode") or "").strip()
        desc, wtc = str(it.get("Description") or "").strip().upper(), str(it.get("WTC") or "").strip().upper()
        if not code or not model:
            continue
        full = model if not maker or maker.lower() in model.lower() else f"{maker} {model}"
        part3.append({"name": f"{model}, {maker}" if maker else model, "tdesig": code, "wtc": wtc})
        if it.get("ShowInPart3Only") or not re.fullmatch(r"[LASHGT][0-9C][JPTER]", desc):
            continue
        rec = by_designator.setdefault(code, {"tdesig": code, "models": [], "model": names.get(code, full), "description": desc, "wtc": wtc, "source": "ICAO Doc 8643"})
        if full not in rec["models"]:
            rec["models"].append(full)
    return by_designator, part3


def load_or_build_icao_index(cache_dir, max_age_days=30, force_refresh=False, use_network=True):
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    # Source principale : liste officielle JSON ; les rapports PDF ne servent plus qu'en repli.
    items = fetch_icao_json(cache_dir / "icao_doc8643_types.json", max_age_days, force_refresh, use_network)
    if items:
        part2, part3 = index_from_icao_json(items)
        if len(part2) >= 500:
            return {
                "__meta": {"generated": dt.datetime.now().isoformat(timespec="seconds"), "source": "ICAO Doc 8643 (liste JSON)",
                           "part2_entries": len(part2), "part3_entries": len(part3)},
                "by_designator": part2,
                "alias_candidates": build_icao_alias_index(part2, part3),
                "part3_entries": part3,
            }
    p2 = cache_dir / "icao_doc8643_part2.pdf"
    p3 = cache_dir / "icao_doc8643_part3.pdf"
    idx = cache_dir / "icao_doc8643_index.json"

    index_fresh = file_is_fresh(idx, max_age_days)
    if index_fresh and not force_refresh:
        try:
            return json.loads(idx.read_text(encoding="utf-8"))
        except Exception:
            pass

    if use_network:
        for label, path, urls in (("Part 2", p2, ICAO_PART2_URLS), ("Part 3", p3, ICAO_PART3_URLS)):
            if force_refresh or not file_is_fresh(path, max_age_days):
                try:
                    print(f"ICAO Doc 8643: téléchargement {label}...", flush=True)
                    HTTP.download_file(urls, path)
                except Exception as exc:
                    if path.exists():
                        print(f"ICAO Doc 8643: {label} non rafraîchie, cache local conservé ({exc})", file=sys.stderr)
                    else:
                        # Do not discard the other ICAO report: Part 3 alone is still a strong
                        # source for model/name -> designator, while EUROCONTROL can supply
                        # DESCRIPTION/WTC/wing for the resolved designator.
                        print(f"ICAO Doc 8643: {label} indisponible ({exc})", file=sys.stderr)

    if not p2.exists() and not p3.exists():
        raise RuntimeError("ICAO Doc 8643 absent du cache et téléchargement indisponible")

    part2 = {}
    part3 = []
    if p2.exists():
        try:
            part2 = parse_icao_part2(extract_pdf_text(p2))
            if len(part2) < 500:
                print(f"ICAO Doc 8643: Part 2 ignorée (parse insuffisant: {len(part2)} entrées)", file=sys.stderr)
                part2 = {}
        except Exception as exc:
            print(f"ICAO Doc 8643: Part 2 ignorée ({exc})", file=sys.stderr)
            part2 = {}
    if p3.exists():
        try:
            part3 = parse_icao_part3(extract_pdf_text(p3))
            if len(part3) < 500:
                print(f"ICAO Doc 8643: Part 3 ignorée (parse insuffisant: {len(part3)} entrées)", file=sys.stderr)
                part3 = []
        except Exception as exc:
            print(f"ICAO Doc 8643: Part 3 ignorée ({exc})", file=sys.stderr)
            part3 = []

    if not part2 and not part3:
        raise RuntimeError("ICAO Doc 8643 téléchargé mais aucun rapport n'a pu être parsé de façon fiable")

    data = {
        "__meta": {
            "generated": dt.datetime.now().isoformat(timespec="seconds"),
            "part2_file": str(p2), "part3_file": str(p3),
            "part2_entries": len(part2), "part3_entries": len(part3),
            "source": "ICAO Doc 8643",
        },
        "by_designator": part2,
        "alias_candidates": build_icao_alias_index(part2, part3),
        "part3_entries": part3,
    }
    tmp = idx.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(idx)
    return data


def icao_resolve_input(raw_key, aliases, icao_index):
    """Resolve raw simulator/user name to canonical designator using strong ICAO data.

    Returns (status, canonical, candidates): status exact|alias|ambiguous|none.
    """
    nk = normalize_key(raw_key)
    explicit = resolve_alias(nk, aliases)
    by_designator = icao_index.get("by_designator", {})
    alias_candidates = icao_index.get("alias_candidates", {})

    # Explicit alias to an ICAO designator.
    if explicit in by_designator:
        return ("alias" if explicit != nk else "exact", explicit, [explicit])
    # Raw exact designator before fuzzy name matching.
    if nk in by_designator:
        return ("exact", nk, [nk])

    cands = set(alias_candidates.get(nk, []))
    # Conservative substring model-name lookup for human labels not indexed exactly.
    # Minimum 5 chars prevents very short labels from exploding into false matches.
    if not cands and len(nk) >= 5:
        for e in icao_index.get("part3_entries", []):
            model_norm = normalize_key(e.get("name", ""))
            if nk == model_norm or nk in model_norm:
                cands.add(normalize_key(e.get("tdesig", "")))
    cands.discard("")
    if len(cands) == 1:
        canonical = next(iter(cands))
        return "alias", canonical, [canonical]
    if len(cands) > 1:
        return "ambiguous", "", sorted(cands)
    return "none", explicit, []


def icao_record(code, icao_index):
    rec = icao_index.get("by_designator", {}).get(normalize_key(code))
    if not rec:
        return None
    return {
        "tdesig": normalize_key(code),
        "model": rec.get("model", ""),
        "description": rec.get("description", ""),
        "wtc": rec.get("wtc", ""),
        "source": "ICAO Doc 8643",
    }


# ---------------- EUROCONTROL ----------------

def next_after(lines, label, validator=None, max_scan=5):
    target = label.lower()
    for i, line in enumerate(lines):
        if line.lower() == target:
            for candidate in lines[i + 1:i + 1 + max_scan]:
                if validator is None or validator(candidate):
                    return candidate
    return ""


def junk_model(name):
    """Libellés de navigation de la page APD lus à tort comme nom de modèle."""
    low = str(name or "").lower()
    return not low or "skip to" in low or "performance database" in low or low in {"performance", "show all photos"}


# ---------------- EUROCONTROL APD : tableau de performances ----------------
# Bloc « Show performance table » de la fiche : sections (décollage, montée par tranches, croisière, descente,
# approche, atterrissage) puis couples libellé / valeur / unité. Aucun débit carburant ni table RPM dans l'APD.
APD_SECTIONS = [("take-off", "takeoff"), ("initial climb", "climbInitial"), ("climb (to fl 150)", "climb150"),
                ("climb (to fl 240)", "climb240"), ("mach climb", "machClimb"), ("cruise", "cruise"),
                ("initial descent", "descentInitial"), ("descent (to fl 100)", "descent"), ("approach", "approach"),
                ("landing", "landing")]
APD_FIELDS = {"v2 (ias)": "v2Kt", "distance": "distanceM", "mtow": "mtowKg", "ias": "iasKt", "roc": "rocFpm",
              "mach": "mach", "tas": "tasKt", "ceiling": "ceilingFL", "range": "rangeNm", "rod": "rodFpm",
              "mcs": "mcsKt", "vat (ias)": "vatKt"}


def parse_apd_performance(html):
    parser = TextExtractor(); parser.feed(html); lines = parser.text()
    try:
        start = lines.index("Show performance table")
    except ValueError:
        return None
    end = next((i for i in range(start, len(lines)) if lines[i] == "Type of Aircraft"), min(len(lines), start + 200))
    out, sec = {}, None
    for k in range(start + 1, end):
        low = lines[k].lower().strip()
        key = next((v for label, v in APD_SECTIONS if low.startswith(label)), None)
        if key:
            sec = out.setdefault(key, {}); continue
        field = APD_FIELDS.get(low)
        if sec is None or not field:
            continue
        for tok in lines[k + 1:k + 3]:  # « Ceiling », « FL », « 390 » : l'unité peut précéder la valeur
            t = tok.replace(",", "").strip()
            if re.fullmatch(r"\d+(?:\.\d+)?", t):
                v = float(t); sec[field] = int(v) if v.is_integer() else v; break
    out = {k: v for k, v in out.items() if v}
    return out or None


def apd_pass(db, out_path, only=None):
    """Passe APD : tableau de performances de chaque type (fichier séparé aircraft_perf.js) et réparation des noms
    de modèle mal lus lors des passes précédentes. Pages en cache HTTP ; pause entre requêtes."""
    perf = load_perf_db(out_path)
    codes = sorted(k for k in db if not str(k).startswith("__") and (not only or k in only))
    fixed = found = 0
    for n, code in enumerate(codes, 1):
        try:
            html = HTTP.get_text(EUROCONTROL_DETAILS.format(urllib.parse.quote(code)))
        except Exception as exc:
            print(f"[{n:03d}/{len(codes):03d}] {code}: erreur {exc}"); continue
        data = parse_apd_performance(html)
        rec = db[code]
        if junk_model(rec.get("model")):
            info = parse_eurocontrol_details(html, code)
            if info and info.get("model") and not junk_model(info["model"]):
                rec["model"] = info["model"]; fixed += 1
        if data:
            data["url"] = EUROCONTROL_DETAILS.format(code); data["fetched"] = dt.date.today().isoformat()
            perf[code] = data; found += 1
        print(f"[{n:03d}/{len(codes):03d}] {code}: {'APD ' + ', '.join(data) if data else 'pas de données APD'} | {rec.get('model', '')}", flush=True)
        if n % 10 == 0:
            save_perf_db(out_path, perf); HTTP.save_cache()
    perf["__meta"] = {"source": "EUROCONTROL Aircraft Performance Database", "generated": dt.date.today().isoformat(), "entries": found}
    save_perf_db(out_path, perf); HTTP.save_cache()
    print(f"APD : {found} fiche(s) de performances, {fixed} nom(s) de modèle réparé(s).")
    return fixed


def load_perf_db(path):
    if not Path(path).exists():
        return {}
    txt = Path(path).read_text(encoding="utf-8-sig")
    m = re.search(r"window\.AIRCRAFT_PERF\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S)
    return json.loads(m.group(1)) if m else {}


def save_perf_db(path, obj):
    path = Path(path)
    payload = ("// Performances par type (EUROCONTROL Aircraft Performance Database), GÉNÉRÉ par\n"
               "// AircraftDB/update_aircraft_db.py --apd : ne pas éditer à la main. Unités : kt, ft/min, FL, NM, m, kg.\n"
               "window.AIRCRAFT_PERF = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n")
    tmp = path.with_suffix(path.suffix + ".tmp"); tmp.write_text(payload, encoding="utf-8"); replace_retry(tmp, path)


def parse_eurocontrol_details(html, requested_code):
    parser = TextExtractor(); parser.feed(html); lines = parser.text()
    code = normalize_key(requested_code)
    exact_line_positions = [i for i, x in enumerate(lines) if normalize_key(x) == code]
    if not exact_line_positions:
        return None

    desc = next_after(lines, "Type", lambda x: bool(re.fullmatch(r"[LASHGT][0-9][JPTE]", x.upper())))
    wtc = next_after(lines, "WTC", lambda x: x.upper() in {"L", "M", "H", "J", "L/M", "-"})
    wing_raw = next_after(lines, "Wing position", lambda x: "wing" in x.lower() or x.lower() in {"high", "low", "mid", "parasol"})
    wr = wing_raw.lower()
    wing = "high" if ("high" in wr or "parasol" in wr) else "low" if "low" in wr else "mid" if "mid" in wr else "unknown"

    model = ""
    # Fiche : « A320 », « A320 », « by », « AIRBUS » -> « AIRBUS A320 ». Le premier « A320 » de la page est le titre
    # (suivi de « Aircraft Performance Database » ou « Skip to aircraft details ») : ne pas le prendre pour le modèle.
    for i in exact_line_positions:
        if i + 3 < len(lines) and lines[i + 2].lower() == "by":
            name, maker = lines[i + 1].strip(), lines[i + 3].strip()
            if name and not junk_model(name):
                model = name if not maker or maker.lower() in name.lower() else f"{maker} {name}"
            break
    pos = exact_line_positions[0]
    for candidate in ([] if model else lines[pos + 1:pos + 8]):
        low = candidate.lower()
        if low in {"performance", "take-off", "type of aircraft", "technical", "recognition"}:
            break
        if normalize_key(candidate) != code and len(candidate) > 2 and not junk_model(candidate):
            model = candidate; break

    alt_names = []
    try:
        ai = next(i for i, x in enumerate(lines) if x.lower() == "alternative names")
        for candidate in lines[ai + 1:ai + 25]:
            low = candidate.lower()
            if low.startswith("all data presented") or "javascript" in low or low == "open help page":
                break
            if candidate not in alt_names:
                alt_names.append(candidate)
    except StopIteration:
        pass

    if not desc and not wtc and not model and wing == "unknown":
        return None
    return {"tdesig": code, "model": model, "description": desc.upper() if desc else "", "wtc": wtc.upper() if wtc else "", "wing_position": wing, "alternative_names": alt_names, "source": "EUROCONTROL"}


def eurocontrol_lookup(code):
    try:
        return parse_eurocontrol_details(HTTP.get_text(EUROCONTROL_DETAILS.format(urllib.parse.quote(code))), code)
    except urllib.error.HTTPError as exc:
        if exc.code in (404, 410):
            return None
        raise


# ---------------- WIKIDATA/WIKIPEDIA FALLBACK ----------------
AVIATION_TERMS = (
    "aircraft", "airplane", "aeroplane", "airliner", "helicopter", "rotorcraft", "turboprop",
    "turbofan", "turbojet", "piston-engined", "fighter", "bomber", "transport aircraft",
    "business jet", "general aviation", "seaplane", "floatplane", "flying boat", "glider",
    "aviation", "manufacturer", "first flight", "crew", "wingspan"
)
REJECT_TERMS = ("road", "route", "motorway", "timezone", "utc+", "asteroid", "album", "song", "station", "railway", "video game")


def wikidata_candidates(term):
    return HTTP.get_json(WIKIDATA_API, {"action":"wbsearchentities", "format":"json", "language":"en", "type":"item", "search":term, "limit":10}).get("search", [])


def wikidata_entity(qid):
    data = HTTP.get_json(WIKIDATA_API, {"action":"wbgetentities", "format":"json", "ids":qid, "props":"sitelinks|labels|descriptions", "languages":"en"})
    return data.get("entities", {}).get(qid, {})


def wikipedia_page(title):
    data = HTTP.get_json(WIKIPEDIA_API, {"action":"query", "format":"json", "redirects":1, "prop":"categories|revisions", "cllimit":"max", "rvslots":"main", "rvprop":"content", "titles":title})
    pages = data.get("query", {}).get("pages", {})
    if not pages: return None
    page = next(iter(pages.values()))
    if page.get("missing") is not None: return None
    cats = [c.get("title", "") for c in page.get("categories", [])]
    content = ""
    revs = page.get("revisions", [])
    if revs:
        slots = revs[0].get("slots", {})
        content = slots.get("main", {}).get("*", "") or revs[0].get("*", "") or ""
    return {"title":page.get("title", title), "categories":cats, "content":content}


def semantic_aircraft_score(code, hit, entity, page):
    label = str(hit.get("label") or ""); desc = str(hit.get("description") or "")
    title = str((page or {}).get("title") or ""); cats = " ".join((page or {}).get("categories") or [])
    content = str((page or {}).get("content") or "")
    blob = " ".join([label, desc, title, cats, content[:20000]]).lower()
    compact = normalize_key(" ".join([label, desc, title, cats, content[:8000]]))
    if any(term in blob for term in REJECT_TERMS) and not any(term in blob for term in AVIATION_TERMS[:12]): return -100
    score = 5 if any(term in blob for term in AVIATION_TERMS) else 0
    if "{{infobox aircraft" in content.lower() or "{{aircraft specs" in content.lower(): score += 6
    if normalize_key(code) and normalize_key(code) in compact: score += 3
    if any(x in desc.lower() for x in ("aircraft", "airliner", "helicopter", "airplane", "aeroplane", "fighter", "bomber")): score += 4
    if any(x.lower().startswith("category:") and "aircraft" in x.lower() for x in (page or {}).get("categories", [])): score += 2
    return score


def choose_valid_wikipedia_page(code, existing_model=""):
    terms = ([existing_model] if existing_model else []) + [f"{code} aircraft", f"ICAO {code} aircraft", code]
    seen = set(); best = None; best_score = -999
    for term in terms:
        try: hits = wikidata_candidates(term)
        except Exception: continue
        for hit in hits:
            qid = hit.get("id")
            if not qid or qid in seen: continue
            seen.add(qid)
            try:
                entity = wikidata_entity(qid)
                sitelink = entity.get("sitelinks", {}).get("enwiki", {}).get("title")
                if not sitelink: continue
                page = wikipedia_page(sitelink)
                if not page: continue
                score = semantic_aircraft_score(code, hit, entity, page)
                if score > best_score: best_score, best = score, (page, hit, score)
            except Exception: continue
        if best_score >= 10: break
    return best if best and best_score >= 8 else None


def classify_wing_from_wikipedia(page):
    blob = " ".join([page.get("title", ""), " ".join(page.get("categories", [])), page.get("content", "")]).lower()
    if any(x in blob for x in ("helicopter", "rotorcraft", "autogyro", "gyroplane")): return "rotor"
    if any(x in blob for x in ("seaplane", "floatplane", "amphibious aircraft", "flying boat")): return "water"
    if "high-wing" in blob or "high wing" in blob or "parasol wing" in blob: return "high"
    if "low-wing" in blob or "low wing" in blob: return "low"
    if "mid-wing" in blob or "mid wing" in blob: return "mid"
    if "biplane" in blob: return "biplane"
    return "unknown"


def sane_wing(rec):
    """Position d'aile cohérente avec la classe OACI (1re lettre de la description) : hélicoptère (H) → « rotor » ;
    avion, amphibie, hydravion (L, A, S) jamais « rotor » (faux positif de Wikipedia : article citant un
    hélicoptère) → « unknown », à redéterminer. Modifie rec ; retourne vrai si la valeur a changé."""
    cls, wing = str(rec.get("description") or "")[:1].upper(), rec.get("wing_position")
    if cls == "H" and wing != "rotor":
        rec["wing_position"] = "rotor"; return True
    if cls in ("L", "A", "S") and wing == "rotor":
        rec["wing_position"] = "unknown"; return True
    return False


# ---------------- MERGE / UPDATE ----------------
def merge_nonempty(base, incoming, fields=None, overwrite=False):
    fields = fields or ("tdesig", "model", "description", "wtc", "wing_position", "source")
    for field in fields:
        value = incoming.get(field)
        if value not in (None, "", "unknown") and (overwrite or not base.get(field) or base.get(field) == "unknown"):
            base[field] = value
    return base


def source_is_manual(source):
    s = str(source or "").lower()
    return any(x in s for x in MANUAL_SOURCE_MARKERS)


def source_has_icao(source):
    return "icao doc 8643" in str(source or "").lower()


def source_is_weak(source):
    s = str(source or "").lower()
    return not s or any(x in s for x in WEAK_SOURCE_MARKERS)


def record_complete(rec):
    return bool(rec and rec.get("tdesig") and rec.get("description") and rec.get("wtc") and rec.get("wing_position"))


def add_safe_aliases(aliases, canonical, alternative_names):
    for name in alternative_names or []:
        nk = normalize_key(name)
        if not nk or nk == canonical or len(nk) < 3 or len(nk) > 40: continue
        existing = aliases.get(nk)
        if existing in (None, canonical): aliases[nk] = canonical


def update_one(db, aliases, raw_designator, icao_index, use_network=True, force=False):
    # Resolve with explicit aliases + ICAO Part 3 model/name index.
    status, canonical, candidates = icao_resolve_input(raw_designator, aliases, icao_index)
    if status == "ambiguous":
        return "", {}, "ambiguous", "matches: " + ", ".join(candidates)

    existing = dict(db.get(canonical, {})) if canonical else {}

    # Manual overrides remain authoritative. ICAO-complete entries can be skipped.
    if record_complete(existing) and source_is_manual(existing.get("source")):
        return canonical, existing, "skip", ""   # corrections manuelles : toujours prioritaires
    # force (--only) : retraitement explicite, même d'une entrée OACI complète
    if not force and record_complete(existing) and source_has_icao(existing.get("source")) and existing.get("wing_position") != "unknown":
        return canonical, existing, "skip", ""   # aile inconnue : on retente EUROCONTROL / Wikipedia

    # Strong source: exact ICAO Doc 8643 record.
    strong = icao_record(canonical, icao_index) if canonical else None
    rec = dict(existing)
    if strong:
        # ICAO always replaces weak/wrong model, description and WTC; it does not supply wing position.
        rec["tdesig"] = canonical
        rec["model"] = strong.get("model") or rec.get("model", "")
        rec["description"] = strong.get("description") or rec.get("description", "")
        rec["wtc"] = strong.get("wtc") or rec.get("wtc", "")
        rec["source"] = "ICAO Doc 8643"

    if not use_network:
        if strong:
            db[canonical] = rec
            return canonical, rec, "updated" if record_complete(rec) else "partial", "wing position missing"
        return canonical, existing, "unresolved", "network disabled"

    # EUROCONTROL is cross-check / source for wing position + alternative names.
    euro = None
    if canonical:
        try: euro = eurocontrol_lookup(canonical)
        except Exception: euro = None

    if euro:
        # If ICAO is present, preserve ICAO description/WTC/model. Only enrich wing + aliases.
        if strong:
            if euro.get("wing_position") not in (None, "", "unknown"):
                rec["wing_position"] = euro["wing_position"]
            rec["source"] = "ICAO Doc 8643 + EUROCONTROL"
        else:
            overwrite = source_is_weak(rec.get("source"))
            merge_nonempty(rec, euro, overwrite=overwrite)
            rec["tdesig"] = canonical
            rec["source"] = "EUROCONTROL"
        add_safe_aliases(aliases, canonical, euro.get("alternative_names"))

    sane_wing(rec)  # hélicoptère : rotor sans consulter Wikipedia
    # Validated Wikipedia is now only a last-resort wing-position source.
    if canonical and rec.get("wing_position") in (None, "", "unknown"):
        validated = choose_valid_wikipedia_page(canonical, rec.get("model", ""))
        if validated:
            wing = classify_wing_from_wikipedia(validated[0])
            if wing == "rotor" and str(rec.get("description") or "")[:1].upper() in ("L", "A", "S"):
                wing = "unknown"  # avion : un article qui parle d'hélicoptères n'en fait pas un hélicoptère
            if wing != "unknown":
                rec["wing_position"] = wing
                rec["source"] = (rec.get("source") + " + Wikipedia/Wikidata (wing)") if rec.get("source") else "Wikipedia/Wikidata (wing)"

    if canonical and rec:
        db[canonical] = rec
    if record_complete(rec):
        return canonical, rec, "updated", ""
    if rec:
        return canonical, rec, "partial", "missing verified metadata"
    return canonical, existing, "unresolved", "no validated aircraft source"


def apply_overrides(db, aliases, overrides):
    aliases.update(normalize_alias_map(overrides.get("__aliases", {})))
    for key, patch in overrides.get("__records", {}).items():
        canonical = normalize_key(key)
        base = dict(db.get(canonical, {"tdesig": canonical}))
        base.update(patch)
        db[canonical] = base


def main():
    ap = argparse.ArgumentParser(description="Refresh aircraft_db.js using ICAO Doc 8643 as the strong source, then EUROCONTROL and validated Wikidata/Wikipedia.")
    ap.add_argument("csv", nargs="*", help="CSV files; Aircraft column values are added to the refresh set")
    ap.add_argument("--db", default="aircraft_db.js", help="input aircraft_db.js")
    ap.add_argument("--out", default="aircraft_db.js", help="output aircraft_db.js")
    ap.add_argument("--overrides", default="aircraft_overrides.json", help="manual overrides JSON")
    ap.add_argument("--cache", default="aircraft_http_cache.json", help="persistent HTTP cache")
    ap.add_argument("--icao-cache-dir", default="icao_doc8643_cache", help="directory for ICAO PDFs/index")
    ap.add_argument("--icao-max-age", type=int, default=30, help="days before refreshing cached ICAO PDFs/index")
    ap.add_argument("--refresh-icao", action="store_true", help="force ICAO PDF/index refresh")
    ap.add_argument("--delay", type=float, default=1.25, help="minimum pause between live HTTP requests")
    ap.add_argument("--retries", type=int, default=6, help="retries on HTTP 429/network errors")
    ap.add_argument("--add", nargs="*", default=[], help="extra designators/names")
    ap.add_argument("--no-network", action="store_true", help="no web lookup; use cached ICAO docs/index only")
    ap.add_argument("--only", nargs="+", metavar="CODE", help="ne traiter que ces types (au lieu de toute la base)")
    ap.add_argument("--apd", nargs="*", metavar="CODE", help="passe EUROCONTROL APD seule : performances -> aircraft_perf.js et réparation des noms de modèle (tous les types, ou les codes donnés)")
    ap.add_argument("--perf-out", default="aircraft_perf.js", help="sortie de la passe APD")
    args = ap.parse_args()

    global HTTP
    HTTP = HttpClient(args.cache, args.delay, args.retries)

    db = load_js_db(args.db)
    if args.apd is not None:
        if apd_pass(db, args.perf_out, {normalize_key(x) for x in args.apd} or None):
            save_js_db(args.out, db)
        return 0
    overrides = load_overrides(args.overrides)
    aliases = normalize_alias_map(ALIASES_DEFAULT)
    aliases.update(normalize_alias_map(db.get("__aliases", {})))
    aliases.update(normalize_alias_map(overrides.get("__aliases", {})))
    db["__aliases"] = aliases

    try:
        icao_index = load_or_build_icao_index(
            args.icao_cache_dir,
            max_age_days=args.icao_max_age,
            force_refresh=args.refresh_icao,
            use_network=not args.no_network,
        )
        meta = icao_index.get("__meta", {})
        print(f"ICAO Doc 8643 : {meta.get('part2_entries','?')} designators | {meta.get('part3_entries','?')} noms/modèles")
    except Exception as exc:
        print(f"ICAO Doc 8643 indisponible: {exc}", file=sys.stderr)
        icao_index = {"by_designator": {}, "alias_candidates": {}, "part3_entries": []}

    wanted = {normalize_key(x) for x in DEFAULT_COMMON}
    wanted |= {normalize_key(x) for x in args.add}
    wanted |= designators_from_csv(args.csv)
    wanted |= {normalize_key(k) for k in db if not str(k).startswith("__")}
    wanted = sorted(x for x in wanted if x)
    if args.only:
        wanted = sorted({normalize_key(x) for x in args.only})

    print(f"Refresh aircraft_db.js : {len(wanted)} appareils | pause mini {args.delay:.2f}s")
    stats = {"updated":0, "skip":0, "partial":0, "unresolved":0, "ambiguous":0}
    last = {"index":0, "code":None}

    def checkpoint(index, code, partial=True):
        db["__aliases"] = aliases
        db.setdefault("__meta", {})
        db["__meta"].update({
            "schema": 4,
            "generated": dt.date.today().isoformat(),
            "runtimeNetwork": False,
            "partial": partial,
            "last_checkpoint": dt.datetime.now().isoformat(timespec="seconds"),
            "last_aircraft": code,
            "note": "ICAO Doc 8643 strong source; EUROCONTROL cross-check/wing; validated Wikipedia fallback only",
        })
        apply_overrides(db, aliases, overrides)
        save_js_db(args.out, db)
        HTTP.save_cache()
        last.update({"index":index, "code":code})

    try:
        total = len(wanted)
        for index, raw in enumerate(wanted, 1):
            status0, resolved0, cands0 = icao_resolve_input(raw, aliases, icao_index)
            prefix = f"[{index:03d}/{total:03d}] {raw}"
            if status0 == "ambiguous":
                print(f"{prefix}: AMBIGUOUS | {', '.join(cands0)}")
                stats["ambiguous"] += 1
                checkpoint(index, raw, partial=True)
                continue
            if resolved0 and resolved0 != raw:
                prefix += f" -> {resolved0}"

            existing = db.get(resolved0, {}) if resolved0 else {}
            recheck = bool(existing) and sane_wing(existing) and existing.get("wing_position") == "unknown"
            if recheck:  # aile incohérente effacée : l'entrée est retraitée (EUROCONTROL / Wikipedia filtré)
                print(f"{prefix}: position d'aile incohérente effacée ({existing.get('description')})")
            if not recheck and not args.only and record_complete(existing) and (source_is_manual(existing.get("source")) or source_has_icao(existing.get("source"))):
                stats["skip"] += 1
                print(f"{prefix}: SKIP (déjà complet) | {existing.get('model','')} | {existing.get('description','?')} | WTC {existing.get('wtc','?')} | wing={existing.get('wing_position','?')}")
                continue

            print(f"{prefix}: UPDATE...", end="", flush=True)
            canonical, rec, status, reason = update_one(db, aliases, raw, icao_index, use_network=not args.no_network, force=bool(args.only))
            stats[status] = stats.get(status, 0) + 1
            if status in ("updated", "partial"):
                print(f" | {rec.get('description') or '?'} | WTC {rec.get('wtc') or '?'} | wing={rec.get('wing_position') or '?'} | source={rec.get('source') or '?'}", flush=True)
            elif status == "ambiguous":
                print(f" | AMBIGUOUS ({reason})", flush=True)
            else:
                print(f" | UNRESOLVED ({reason})", flush=True)
            checkpoint(index, canonical or raw, partial=True)

        checkpoint(len(wanted), last.get("code") or (wanted[-1] if wanted else None), partial=False)
        db["__meta"]["completed_at"] = dt.datetime.now().isoformat(timespec="seconds")
        save_js_db(args.out, db); HTTP.save_cache()

    except KeyboardInterrupt:
        db.setdefault("__meta", {})
        db["__meta"]["partial"] = True
        db["__meta"]["interrupted_at"] = dt.datetime.now().isoformat(timespec="seconds")
        db["__meta"]["last_aircraft"] = last.get("code")
        try:
            apply_overrides(db, aliases, overrides); save_js_db(args.out, db)
        finally:
            HTTP.save_cache()
        print("\nCtrl+C : BDD et cache sauvegardés.", file=sys.stderr)
        return 130

    count = len([k for k in db if not str(k).startswith("__")])
    print(f"Terminé : {stats['updated']} update(s), {stats['partial']} partiel(s), {stats['unresolved']} non résolu(s), {stats['ambiguous']} ambigu(s), {stats['skip']} skip(s) | {count} entrées")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
