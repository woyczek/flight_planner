"""Extraction, provenance, interprétations persistantes et statut par AD."""
import hashlib
import json
import math
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

PARSER_VERSION = "2.0"
POINT_HEADER = re.compile(r"points?\s+de\s+(?:compte[ -]?rendu|report)|reporting\s+points?", re.I)
COORD = re.compile(
    r"(?P<d1>\d{2})[°\s]+(?P<m1>\d{2})[°'’′\s]+"
    r"(?P<s1>\d{2}(?:[.,]\d+)?)[\"“”″'’′\s]*N\s*[-–]?\s*"
    r"(?P<d2>\d{3})[°\s]+(?P<m2>\d{2})[°'’′\s]+"
    r"(?P<s2>\d{2}(?:[.,]\d+)?)[\"“”″'’′\s]*(?P<h>[EW])")
RELEVANT = re.compile(r"compte[ -]?rendu|reporting|itin[ée]raire|VFR|consignes|arriv[ée]e|d[ée]part|suivre|follow", re.I)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def stable_id(prefix, value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return prefix + ":" + hashlib.sha256(raw).hexdigest()[:16]

def current_airac(day=None):
    day = day or date.today()
    epoch = date(2020, 1, 2)
    effective = epoch + timedelta(days=((day - epoch).days // 28) * 28)
    jan1 = date(effective.year, 1, 1)
    first = epoch + timedelta(days=math.ceil((jan1 - epoch).days / 28) * 28)
    cycle = (effective - first).days // 28 + 1
    return {"id": f"{effective.year % 100:02d}{cycle:02d}", "effectiveFrom": effective.isoformat(),
            "effectiveUntil": (effective + timedelta(days=27)).isoformat()}

def normalise(text):
    # Certains PDF exposent les noms de glyphes /MT65 au lieu de leur caractère.
    return re.sub(r"/MT(\d{1,3})(?!\d)", lambda m: chr(int(m[1])) if 32 <= int(m[1]) <= 255 else m[0], text)

def coordinates(m):
    d1, n1, s1, d2, n2, s2 = [float(m[k].replace(",", ".")) for k in ("d1", "m1", "s1", "d2", "m2", "s2")]
    if not (d1 <= 90 and d2 <= 180 and n1 < 60 and n2 < 60 and s1 < 60 and s2 < 60):
        return None
    return [round((d2 + n2/60 + s2/3600) * (-1 if m["h"] == "W" else 1), 8), round(d1 + n1/60 + s1/3600, 8)]

def point_code(text, match):
    start = text.rfind("\n", 0, match.start()) + 1
    end = text.find("\n", match.end())
    if end < 0:
        end = len(text)
    before, after = text[start:match.start()].strip(), text[match.end():end].strip()
    prefix = re.match(r"^([A-Z][A-Z0-9]{0,3})(?:\s|$)", before)
    if prefix:
        return prefix[1], text[start:end], "code_before_coordinates"
    # Les colonnes RDL/DIST et altitude précèdent parfois le code dans le texte extrait.
    cleaned = re.sub(r"MIN|MAX", " ", after).replace("←", "").replace("(*)", "").strip(" *")
    suffix = re.search(r"(?:^|[\s\d)])([A-Z][A-Z0-9]{0,3})$", cleaned)
    if suffix:
        return suffix[1], text[start:end], "code_after_coordinates"
    return None, text[start:end], None

def extract_document(icao, pages, source):
    points, conflicts, instructions, unresolved = {}, [], [], []
    for page in pages:
        text, number = normalise(page["text"]), page["pdfPage"]
        if RELEVANT.search(text) or re.search(r"\bTXT\s*\d", text):
            instructions.append({"id": f"{icao}:page:{number}", "pdfPage": number, "text": text,
                                 "kind": "source_instructions", "origin": "published",
                                 "textExtraction": "automatic", "structuredInterpretation": False})
        header = POINT_HEADER.search(text)
        if not header:
            continue
        for m in COORD.finditer(text, header.end()):
            pos = coordinates(m)
            code, raw, method = point_code(text, m)
            if pos is None:
                continue
            if code is None:
                unresolved.append({"pdfPage": number, "text": raw, "coordinates": pos})
                continue
            p = {"id": f"{icao}:{code}", "code": code, "coordinates": pos,
                 "role": "reporting_point", "origin": "published", "extractionMethod": method,
                 "status": "candidate", "pdfPage": number, "sourceText": raw}
            if code in points and points[code]["coordinates"] != pos:
                conflicts.append({"code": code, "first": points[code], "other": p})
            else:
                points[code] = p
    routes = []
    if points:
        token = "(?:" + "|".join(map(re.escape, sorted([icao, *points], key=len, reverse=True))) + ")"
        seq = re.compile(r"(?<![A-Z0-9])" + token + r"(?:\s*(?:-{1,}>?|==|→)\s*" + token + r"){1,}(?=$|[^A-Z0-9]|[A-Z]{1,3}\d)")
        for page in pages:
            text = normalise(page["text"]).replace(icao, "\n" + icao)
            # Les altitudes intercalées sont retirées uniquement pour repérer les séquences.
            search = re.sub(r"\(\s*\d{2,5}\s*(?:MAX|MIN)?\s*\)", " ", text)
            for m in seq.finditer(search):
                codes = re.split(r"\s*(?:-{1,}>?|==|→)\s*", m[0])
                signature = {"codes": codes, "page": page["pdfPage"], "text": m[0]}
                route = {"id": stable_id(icao + ":auto", signature), "pointCodes": codes,
                         "pointRefs": [f"{icao}:{c}" if c != icao else icao for c in codes],
                         "kind": "explicit_text_sequence", "origin": "automatic", "status": "candidate",
                         "direction": "unknown", "runways": None, "conditions": None,
                         "publishedGeometry": None, "isFragmentPossible": True,
                         "pdfPage": page["pdfPage"], "sourceText": m[0], "context": normalise(page["text"]),
                         "instructionRefs": [f"{icao}:page:{page['pdfPage']}"],
                         "geometryPointRefs": None, "geometry": None,
                         "reviewRequired": ["séquence", "sens", "conditions", "géométrie"]}
                if not any(r["id"] == route["id"] for r in routes):
                    routes.append(route)
    return {"icao": icao, "source": source, "status": "calculé", "interpretationScope": "none",
            "points": list(points.values()), "pointConflicts": conflicts,
            "unresolvedCoordinateRows": unresolved, "routes": routes,
            "instructions": instructions, "evidencePages": [{"pdfPage": p["pdfPage"], "text": normalise(p["text"])} for p in pages],
            "relations": [], "coverage": "candidates_found" if routes else "no_sequence_extracted",
            "requiresChartReview": True}

def apply_interpretation(ad, patch):
    ad["interpretation"] = {k: v for k, v in patch.items() if k not in ("points", "routes", "pointUpdates")}
    ad["lastInterpretation"] = {"at": patch.get("analysedAt"), "airac": patch.get("analysedDuringAirac"),
                               "sourceSha256": patch.get("sourceSha256"), "scope": patch.get("scope")}
    if patch.get("sourceSha256") != ad["source"]["sha256"]:
        ad["status"] = "obsolète"
        ad["interpretation"]["applied"] = False
        ad["interpretation"]["reason"] = "Source PDF différente de celle analysée ; points et relations manuels non appliqués."
        return
    ad["automaticRouteCandidates"] = ad["routes"]
    bycode = {p["code"]: p for p in ad["points"]}
    for p in patch.get("points", []):
        code = p["code"]
        if code in bycode and p.get("origin") == "manual":
            raise ValueError(f"Collision point manuel/publié : {ad['icao']}:{code}")
        p = {**p, "id": f"{ad['icao']}:{code}"}
        bycode[code] = p
    for code, values in patch.get("pointUpdates", {}).items():
        if code not in bycode:
            raise ValueError(f"Point mis à jour absent : {ad['icao']}:{code}")
        bycode[code].update(values)
    ad["points"] = list(bycode.values())
    if "routes" in patch:
        ad["routes"] = []
        for item in patch["routes"]:
            r = {**item, "origin": "manual_interpretation", "status": "interpreted", "isFragmentPossible": False}
            r["id"] = f"{ad['icao']}:{r['key']}"
            r["pointRefs"] = [f"{ad['icao']}:{c}" for c in r["pointCodes"]]
            path = r.get("geometryPointCodes")
            if path:
                if any(c not in bycode for c in path):
                    raise ValueError(f"Géométrie avec point inconnu : {r['id']}")
                r["geometryPointRefs"] = [bycode[c]["id"] for c in path]
                r["geometry"] = {"type": "LineString", "coordinates": [bycode[c]["coordinates"] for c in path],
                                 "origin": "manual_interpretation", "accuracyM": None,
                                 "isOfficialGeometry": False}
            else:
                r["geometry"] = None
                r["geometryPointRefs"] = None
            r["instructionRefs"] = [f"{ad['icao']}:page:{n}" for n in r.get("sourcePages", [])]
            ad["routes"].append(r)
    ad["status"] = "sans relations" if patch.get("noRelationsConfirmed") else "interprété"
    ad["interpretationScope"] = patch.get("scope", "partial")
    ad["interpretation"]["applied"] = True
    ad["requiresChartReview"] = patch.get("scope") != "complete"

def finish_graph(ad):
    known = {p["id"]: p for p in ad["points"]}
    for r in ad["routes"]:
        refs = r["pointRefs"]
        if any(ref not in known and ref != ad["icao"] for ref in refs):
            raise ValueError(f"Référence inconnue dans {r['id']}")
        if len(refs) < 2:
            raise ValueError(f"Séquence trop courte {r['id']}")
        r["missingCoordinates"] = [ref for ref in refs if ref not in known]
        r["schematicCoordinates"] = None if r["missingCoordinates"] else [known[ref]["coordinates"] for ref in refs]
        r.setdefault("geometry", None)
        for i, (start, end) in enumerate(zip(refs, refs[1:])):
            ad["relations"].append({"id": stable_id(ad["icao"] + ":relation", [r["id"], i]),
                                    "from": start, "to": end, "routeRef": r["id"],
                                    "relationType": "report_sequence",
                                    "direction": r.get("direction", "unknown"), "origin": r["origin"],
                                    "conditions": r.get("conditions"), "instructionRefs": r.get("instructionRefs", [])})
        if r.get("geometryPointRefs"):
            path = r["geometryPointRefs"]
            for i, (start, end) in enumerate(zip(path, path[1:])):
                ad["relations"].append({"id": stable_id(ad["icao"] + ":geometry-leg", [r["id"], i]),
                                        "from": start, "to": end, "routeRef": r["id"],
                                        "relationType": "geometry_leg", "origin": "manual_interpretation",
                                        "direction": r.get("direction", "unknown"),
                                        "conditions": r.get("conditions"), "instructionRefs": r.get("instructionRefs", [])})
    ad["relationsStatus"] = "available" if ad["relations"] else ("confirmed_none" if ad["status"] == "sans relations" else "not_extracted")

def compile_corpus(source_dir, cache_dir=None, interpretations_dir=None, calculation_airac=None, source_airac=None):
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit('pypdf manque : python -m pip install -r requirements-vfr.txt (dépendance facultative de tools/report-vfr ; voir README.md).')
    source_dir = Path(source_dir)
    patches = {}
    if interpretations_dir:
        for file in sorted(Path(interpretations_dir).glob("*.json")):
            patch = json.loads(file.read_text(encoding="utf-8"))
            if patch["icao"] in patches:
                raise ValueError("Interprétation en double : " + patch["icao"])
            patches[patch["icao"]] = patch
    ads, errors = [], []
    generated = datetime.now(timezone.utc).isoformat()
    cycle = calculation_airac or current_airac()["id"]
    files = sorted(p for p in source_dir.glob("AD-2.*.pdf") if re.fullmatch(r"AD-2\.[A-Z]{4}", p.stem))
    if not files:
        raise ValueError("Aucun PDF AD-2.OACI.pdf trouvé")
    for file in files:
        icao = file.stem.removeprefix("AD-2.")
        try:
            fp = digest(file)
            pages = None
            cache = Path(cache_dir) / f"{icao}.json" if cache_dir else None
            if cache and cache.exists():
                saved = json.loads(cache.read_text(encoding="utf-8"))
                if isinstance(saved, dict) and saved.get("sha256") == fp:
                    pages = saved["pages"]
            if pages is None:
                pdf = PdfReader(file)
                pages = [{"pdfPage": i, "text": p.extract_text() or ""} for i, p in enumerate(pdf.pages, 1)]
                if cache:
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    cache.write_text(json.dumps({"sha256": fp, "pages": pages}, ensure_ascii=False), encoding="utf-8")
            ad = extract_document(icao, pages, {"file": str(file.resolve()), "sha256": fp,
                                             "publisher": "SIA", "airac": source_airac})
            ad["fingerprint"] = fp
            ad["lastCalculation"] = {"at": generated, "airac": cycle, "parserVersion": PARSER_VERSION,
                                     "sourceAirac": source_airac, "sourceSha256": fp}
            if icao in patches:
                apply_interpretation(ad, patches[icao])
            finish_graph(ad)
            ads.append(ad)
        except Exception as error:
            errors.append({"icao": icao, "file": str(file), "error": f"{type(error).__name__}: {error}"})
    return {"schemaVersion": "2.0", "generatedAt": generated, "calculationAirac": cycle,
            "sourceAirac": source_airac, "parserVersion": PARSER_VERSION,
            "datasetStatus": "automatic_extraction_with_traceable_manual_interpretations",
            "coordinateReferenceSystem": "EPSG:4326", "coordinateOrder": "longitude,latitude",
            "scope": "PDF présents dans le dossier fourni ; exhaustivité nationale non présumée",
            "statusDefinitions": {"calculé": "Extraction automatique effectuée ; analyse non achevée.",
                                  "interprété": "Interprétation appliquée à la même empreinte ; voir sa portée.",
                                  "obsolète": "Source changée depuis l'interprétation ; couche manuelle désactivée.",
                                  "sans relations": "Absence de relations confirmée explicitement après lecture."},
            "limitations": ["Les géométries manuelles sont des interprétations cartographiques, pas des géométries officielles.",
                            "AIRAC du calcul et AIRAC des sources sont deux informations distinctes.",
                            "Aucune relation reconnue ne signifie pas aucune relation publiée."],
            "summary": {"aerodromes": len(ads), "points": sum(len(a["points"]) for a in ads),
                        "manualPoints": sum(p["origin"] == "manual" for a in ads for p in a["points"]),
                        "routes": sum(len(a["routes"]) for a in ads),
                        "relations": sum(len(a["relations"]) for a in ads),
                        "manualGeometries": sum(bool(r.get("geometry")) for a in ads for r in a["routes"]),
                        "byStatus": {s: sum(a["status"] == s for a in ads) for s in ("calculé", "interprété", "obsolète", "sans relations")},
                        "errors": len(errors)}, "aerodromes": ads, "errors": errors}

def geojson(dataset):
    features = []
    for ad in dataset["aerodromes"]:
        for p in ad["points"]:
            features.append({"type": "Feature", "id": p["id"],
                             "geometry": {"type": "Point", "coordinates": p["coordinates"]},
                             "properties": {"icao": ad["icao"], "code": p["code"], "origin": p["origin"],
                                            "role": p["role"], "adStatus": ad["status"], "lastCalculationAirac": ad["lastCalculation"]["airac"],
                                            "sourceSha256": ad["fingerprint"], "pdfPage": p.get("pdfPage"),
                                            "reason": p.get("reason"), "accuracyM": p.get("accuracyM"),
                                            "isOfficialReportingPoint": p.get("isOfficialReportingPoint", p["role"] == "reporting_point")}})
        for r in ad["routes"]:
            geom = r.get("geometry")
            if geom:
                features.append({"type": "Feature", "id": r["id"], "geometry": {"type": "LineString", "coordinates": geom["coordinates"]},
                                 "properties": {"icao": ad["icao"], "routeRef": r["id"], "origin": geom["origin"],
                                                "isOfficialGeometry": False, "geometryPartial": r.get("geometryPartial", False),
                                                "direction": r["direction"], "conditions": r.get("conditions"),
                                                "instructionRefs": r.get("instructionRefs"), "adStatus": ad["status"]}})
    return {"type": "FeatureCollection", "features": features}
