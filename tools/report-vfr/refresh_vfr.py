"""Recompiler avec cache, historique, différences et invalidation des interprétations."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from vfr_core import compile_corpus, geojson

def run(config_file):
    config_file = Path(config_file).resolve()
    base = config_file.parent
    config = json.loads(config_file.read_text(encoding="utf-8"))
    def resolve(value):
        p = Path(value)
        return p if p.is_absolute() else base / p
    source = resolve(config["sourceDirectory"])
    out = resolve(config.get("outputDirectory", "data"))
    cache = resolve(config.get("cacheDirectory", "cache"))
    interpretations = resolve(config.get("interpretationsDirectory", "interpretations"))
    target = out / "vfr-compiled.json"
    previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else None
    new = compile_corpus(source, cache, interpretations, source_airac=config.get("sourceAirac"))
    out.mkdir(parents=True, exist_ok=True)
    if new["errors"]:
        failure = out / "refresh-errors.json"
        failure.write_text(json.dumps(new["errors"], ensure_ascii=False, indent=2), encoding="utf-8")
        raise RuntimeError(f"{len(new['errors'])} erreurs : JSON précédent conservé ; voir {failure}")
    old = {a["icao"]: a for a in previous["aerodromes"]} if previous else {}
    current = {a["icao"]: a for a in new["aerodromes"]}
    delta = {"generatedAt": new["generatedAt"], "calculationAirac": new["calculationAirac"],
             "sourceAirac": new["sourceAirac"],
             "added": sorted(current.keys() - old.keys()),
             "missingFromLocalCorpus": sorted(old.keys() - current.keys()),
             "sourceChanged": sorted(k for k in current.keys() & old.keys() if current[k]["fingerprint"] != old[k].get("fingerprint", old[k]["source"]["sha256"])),
             "obsoleteInterpretations": sorted(k for k, a in current.items() if a["status"] == "obsolète"),
             "summary": new["summary"]}
    if previous and delta["missingFromLocalCorpus"] and not config.get("allowMissingAerodromes", False):
        (out / "refresh-blocked.json").write_text(json.dumps(delta, ensure_ascii=False, indent=2), encoding="utf-8")
        raise RuntimeError("Des AD manquent au nouveau corpus ; publication refusée. Vérifier le téléchargement et refresh-blocked.json.")
    if previous:
        history = out / "history"
        history.mkdir(exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        (history / f"vfr-{stamp}.json").write_text(json.dumps(previous, ensure_ascii=False), encoding="utf-8")
    state = [{"icao": a["icao"], "status": a["status"], "interpretationScope": a["interpretationScope"],
              "fingerprint": a["fingerprint"], "lastCalculation": a["lastCalculation"],
              "lastInterpretation": a.get("lastInterpretation"), "pointCount": len(a["points"]),
              "manualPointCount": sum(p["origin"] == "manual" for p in a["points"]),
              "routeCount": len(a["routes"]), "relationsStatus": a["relationsStatus"],
              "unresolvedCoordinateRows": len(a["unresolvedCoordinateRows"])} for a in new["aerodromes"]]
    for name, content in (("vfr-compiled.json", new), ("vfr-geometry.geojson", geojson(new)),
                          ("etat-ad.json", state), ("refresh-report.json", delta)):
        dest = out / name
        tmp = out / (name + ".tmp")
        tmp.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(dest)
    print(json.dumps(delta, ensure_ascii=False, indent=2))
    return delta

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--config", type=Path, default=Path(__file__).parent / "config.json")
    run(p.parse_args().config)
