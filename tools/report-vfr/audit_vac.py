"""Inventaire reproductible des VAC locales, sans inférence de routes.

Usage: python audit_vac.py --source ".../Charts/VAC/VAC" --output audit.json
       [--text-dir cache] [--previous ancien-audit.json]
Prérequis: pypdf. Ne modifie jamais les sources.
"""
import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit('pypdf manque : python -m pip install -r requirements-vfr.txt (dépendance facultative de tools/report-vfr ; voir README.md).')

SIGNALS = {
    "reporting_points": r"points?\s+de\s+(?:compte[ -]?rendu|report)|reporting\s+points?",
    "vfr_routes": r"itin[ée]raires?[^\n]{0,35}VFR|VFR[^\n]{0,35}(?:routes?|itin[ée]raires?)",
    "route_instructions": r"suivre\s+(?:l[’']|le\s|la\s)|follow\s+(?:the\s|motorway)|arriv[ée]e\s+par|entr[ée]e\s+par|DEP\s+(?:ou\s+ARR\s+)?par\s+les\s+points",
    "route_sequences": r"(?:[A-Z]{1,3}\s*-{2,}>?\s*)+[A-Z]{1,3}|\b[A-Z]{1,3}(?:-[A-Z]{1,3}){2,}\b",
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--text-dir", type=Path)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()
    if not args.source.is_dir():
        parser.error("Dossier source inexistant")
    if args.text_dir:
        args.text_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(args.source.glob("AD-2.*.pdf"))
    if not files:
        parser.error("Aucune VAC AD-2.*.pdf trouvée")
    documents = []
    for file in files:
        record = {
            "icao": file.stem.removeprefix("AD-2."),
            "documentKind": "aerodrome" if re.fullmatch(r"AD-2\.LF[A-Z]{2}", file.stem) else "other",
            "path": str(file.resolve()),
            "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            "sizeBytes": file.stat().st_size,
            "status": "unreviewed",
            "pages": [],
        }
        try:
            reader = PdfReader(file)
            record["pageCount"] = len(reader.pages)
            texts = []
            for number, page in enumerate(reader.pages, 1):
                text = page.extract_text() or ""
                signals = [key for key, pattern in SIGNALS.items()
                           if re.search(pattern, text, re.I)]
                dates = sorted(set(re.findall(
                    r"\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b", text)))
                record["pages"].append({
                    "pdfPage": number,
                    "extractedCharacters": len(text),
                    "controlCharacterCount": sum(ord(c) < 32 and c not in "\r\n\t" for c in text),
                    "dateCandidates": dates,
                    "signals": signals,
                    "reviewRequired": True,
                })
                texts.append({"pdfPage": number, "text": text})
            if args.text_dir:
                (args.text_dir / (record["icao"] + ".json")).write_text(
                    json.dumps(texts, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as error:
            record["error"] = f"{type(error).__name__}: {error}"
        documents.append(record)
    result = {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceDirectory": str(args.source.resolve()),
        "scope": "PDF présents dans le dossier fourni ; exhaustivité nationale non établie",
        "limitations": [
            "Signaux textuels de repérage uniquement, ni points ni routes validés.",
            "Absence de signal ne signifie pas absence de procédure.",
            "Dates candidates de pages, pas date AIRAC déduite.",
            "Les tracés graphiques ne sont pas extraits.",
            "Empreinte différente = fichier différent, pas nécessairement changement de procédure.",
        ],
        "summary": {
            "documents": len(documents),
            "aerodromes": sum(d["documentKind"] == "aerodrome" for d in documents),
            "pages": sum(len(d["pages"]) for d in documents),
            "errors": sum("error" in d for d in documents),
            "documentsWithSignals": sum(any(p["signals"] for p in d["pages"]) for d in documents),
            "signalPageCounts": {s: sum(s in p["signals"] for d in documents for p in d["pages"])
                                 for s in SIGNALS},
        },
        "documents": documents,
    }
    if args.previous:
        previous = json.loads(args.previous.read_text(encoding="utf-8"))
        old = {d["icao"]: d["sha256"] for d in previous["documents"]}
        new = {d["icao"]: d["sha256"] for d in documents}
        result["changes"] = {
            "added": sorted(new.keys() - old.keys()),
            "removed": sorted(old.keys() - new.keys()),
            "changed": sorted(k for k in old.keys() & new.keys() if old[k] != new[k]),
            "unchangedCount": sum(old[k] == new[k] for k in old.keys() & new.keys()),
        }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))
    if "changes" in result:
        print(json.dumps(result["changes"], ensure_ascii=False))

if __name__ == "__main__":
    main()
