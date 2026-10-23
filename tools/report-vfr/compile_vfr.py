"""Compiler points, relations, consignes et interprétations persistantes des VAC."""
import argparse
import json
from pathlib import Path
from vfr_core import compile_corpus, extract_document, geojson

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path)
    parser.add_argument("--interpretations", type=Path, default=Path(__file__).parent / "interpretations")
    parser.add_argument("--calculation-airac", help="AIRAC du calcul ; déterminé depuis la date si omis")
    parser.add_argument("--source-airac", help="AIRAC des sources, seulement s'il est établi")
    parser.add_argument("--geojson", type=Path)
    args = parser.parse_args()
    result = compile_corpus(args.source, args.cache, args.interpretations, args.calculation_airac, args.source_airac)
    if result["errors"]:
        for e in result["errors"]:
            print(json.dumps(e, ensure_ascii=False))
        raise SystemExit("Compilation incomplète : sortie principale conservée, publication refusée.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = args.output.with_suffix(args.output.suffix + ".tmp")
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(args.output)
    if args.geojson:
        args.geojson.parent.mkdir(parents=True, exist_ok=True)
        args.geojson.write_text(json.dumps(geojson(result), ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))

if __name__ == "__main__":
    main()
