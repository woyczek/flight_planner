#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a broad synthetic landing-performance test CSV.

The aircraft catalog combines:
- the current SimBrief public aircraft-type catalog (194 ICAO/profile designators),
- the 48 types already used by this project,
- 31 additional common X-Plane/GA/military types.

Result: 248 unique aircraft types, i.e. +200 vs the previous 48-aircraft test set.
The landing figures are synthetic and intended only to exercise the dashboard.
"""
import csv
import datetime as dt
import random
from pathlib import Path

# 194 current SimBrief aircraft profile designators, captured from the public Aircraft Types page.
SIMBRIEF_TYPES = """
BCS1 BCS3 A30B A306 A30F A3ST A310 A318 A319 A320 A20N A321 A21N A332 A333 A338 A339 A342 A343 A345 A346 A35K A359 A388
AT43 AT45 AT46 AT72 AT73 AT75 AT76 AEST A225 RJ1H RJ70 RJ85 B190 B703 B712 B721 B722 R722 BBJ1 BBJ2 BBJ3 B38M B732 B733 B734 B735 B736 B737 B738 B739
B742 B744 B74F B748 B48F B752 B75F B753 B762 B763 B76F B764 B772 B77L B77W B77F B78X B788 B789 B461 B462 B463 JS41 BE58 B58T DHC2 BE24 BE36 BT36 B36T
C17 C404 C510 C919 CRJX CRJ2 CRJ5 CRJ7 CRJ9 C172 R182 C182 C208 C310 C337 C414 F406 CL30 CL35 CL60 SR22 SR2T C56X C525 C25A C25B C25C C550 C750
DC10 DC85 DC86 MD82 MD83 DH8A DH8B DH8C DH8D DHC7 DA42 DA62 DC3 DC6 BE60 E135 E140 E145 E170 E175 E190 E195 EA50 EVAL FA50 FA8X F100 F70 F50 GLF4 GLF6
BE6G H25B HDJT BE20 B350 BE9L KODI CONI CONS L101 LJ25 LJ35 LJ45 E13L E19L C700 MD11 MD1F MD88 MD90 MU2 SW4 YS11 P18E P180 E50P E55P PC12 PC24 PA31 PA24
P46T M600 PA44 PA34 C680 SF34 SH33 SH36 STAR TBM8 TBM9 T134 T154 P06T P212 C160 B60T DHC6 SF50
""".split()

# Original project test types that are not all represented in SimBrief.
PROJECT_TYPES = """
C152 C172 C182 C206 C208 BN2P BE58 B350 AT72 AT42 DH8D DH8C DH8A DHC6 F50 L410 D228 C212 CN35 C295 A4M DC3 XC47C P51 EPIC C750 S210 MD88 A320 B738 A333 B744 A388 CRJ9 E190 F16 EC35 EC45 AS50 AS65 S76 CH47 SA342 AT76 F27 SF34 SH33 SH36
""".split()

# 31 additional common X-Plane / GA / military types absent from the previous 48-type set.
XPLANE_EXTRA_TYPES = """
C150 C177 C185 C210 PA38 PA28 P28A PA32 PA46 PA18 DA20 DA40 DR40 M20P RV10 R22 R44 R66 B06 A109 A139 UH1 UH60 MI8 MI24 AN2 AN26 AN124 IL76 C130 C30J
""".split()

AIRCRAFT = sorted(set(SIMBRIEF_TYPES) | set(PROJECT_TYPES) | set(XPLANE_EXTRA_TYPES))
assert len(AIRCRAFT) == 248, len(AIRCRAFT)

HELICOPTERS = set("EC35 EC45 AS50 AS65 S76 CH47 SA342 R22 R44 R66 B06 A109 A139 UH1 UH60 MI8 MI24".split())
FIGHTERS = set("F16 P51".split())
VINTAGE = set("DC3 DC6 XC47C CONI CONS B703 DC85 DC86 S210 T134 T154 AN2".split())
HEAVY = set("A225 A388 A342 A343 A345 A346 A35K A359 A332 A333 A338 A339 A30B A306 A30F A3ST A310 B742 B744 B74F B748 B48F B762 B763 B76F B764 B772 B77L B77W B77F B78X B788 B789 DC10 L101 MD11 MD1F A4M AN124 IL76 C17 C130 C30J".split())
REGIONAL_JETS = set("RJ1H RJ70 RJ85 B461 B462 B463 CRJX CRJ2 CRJ5 CRJ7 CRJ9 E135 E140 E145 E170 E175 E190 E195 F100 F70 B712".split())
BUSINESS_JETS = set("BBJ1 BBJ2 BBJ3 C510 CL30 CL35 CL60 C56X C525 C25A C25B C25C C550 C750 EA50 FA50 FA8X GLF4 GLF6 H25B HDJT LJ25 LJ35 LJ45 E13L E19L C700 E50P E55P PC24 C680 SF50".split())
TURBOPROPS = set("AT42 AT43 AT45 AT46 AT72 AT73 AT75 AT76 B190 DH8A DH8B DH8C DH8D DHC7 DHC6 DHC2 C208 F406 BE20 B350 BE9L KODI F50 MU2 SW4 YS11 P18E P180 PC12 P46T M600 SF34 SH33 SH36 STAR TBM8 TBM9 P212 C160 B60T L410 D228 C212 CN35 C295 A4M C130 C30J".split())
PISTON_GA = set("AEST BE58 B58T BE24 BE36 BT36 B36T C404 C172 R182 C182 C206 C150 C152 C177 C185 C210 C310 C337 C414 DA42 DA62 DA20 DA40 BE60 BE6G PA31 PA24 PA44 PA34 PA28 P28A PA32 PA46 PA18 P06T DR40 M20P RV10 BN2P DC3 DC6 P51 AN2 AN26 XC47C".split())

HEADERS = [
    'Timestamp','Aircraft','Class','Score','Rating','TouchdownFPM','PeakG','FloatSeconds','NoseRateDegSec','Flare',
    'PitchDeg','BankDeg','GroundspeedKts','Source','FilledFromLogFields','EstimatedFields','EstimateConfidence',
    'MatchedLogTimestamp','MatchDeltaSeconds','LogLandingRateFPM','LogLandingG','LogNoseRateDegSec','LogFloatSeconds',
    'LogFlare','LogTouchdownQ','LogTouchdownQradAbs','LogSourceRating','ScoreEstimateLOO_MAE','PeakGEstimateLOO_MAE'
]


def profile(code):
    """Return class, mean touchdown fpm, mean peak G, mean float, typical GS."""
    if code in HELICOPTERS:
        return ('Helicopter', -110, 0.92, 0.35, 45)
    if code in FIGHTERS:
        return ('Fighter', -300, 1.25, 0.8, 145)
    if code in HEAVY:
        return ('Heavy', -250, 1.14, 1.0, 145)
    if code in BUSINESS_JETS:
        return ('Business', -185, 1.04, 1.8, 120)
    if code in REGIONAL_JETS:
        return ('Regional', -215, 1.08, 1.4, 125)
    if code in TURBOPROPS:
        return ('Turboprop', -235, 1.13, 1.8, 100)
    if code in PISTON_GA:
        return ('GA', -210, 1.03, 2.8, 70)
    if code in VINTAGE:
        return ('Vintage', -275, 1.16, 1.8, 95)
    # Most remaining SimBrief types are transport jets / airliners.
    return ('Airliner', -220, 1.09, 1.2, 135)


def rating_from_score(score):
    if score >= 95: return 'PERFECT'
    if score >= 85: return 'GREAT'
    if score >= 70: return 'GOOD'
    if score >= 55: return 'OK'
    if score >= 40: return 'HARD'
    return 'VERY HARD'


def generate_rows(n_per_type=12, seed=8643):
    rnd = random.Random(seed)
    rows = []
    base = dt.datetime(2024, 1, 1, 8, 0, 0)
    seq = 0
    for code in AIRCRAFT:
        cls, mean_fpm, mean_g, mean_float, mean_gs = profile(code)
        for _ in range(n_per_type):
            stamp = base + dt.timedelta(hours=5 * seq + rnd.randint(0, 150))
            seq += 1
            sigma_fpm = max(28.0, abs(mean_fpm) * 0.19)
            fpm = round(rnd.gauss(mean_fpm, sigma_fpm), 1)
            g = round(max(0.62, rnd.gauss(mean_g, 0.11 if cls != 'Fighter' else 0.18)), 3)
            flt = round(max(0.0, rnd.gauss(mean_float, max(0.12, mean_float * 0.35))), 2)
            nose = round(rnd.gauss(0 if cls == 'Helicopter' else -4.0, 5.2), 2)
            pitch = round(rnd.gauss(3.5 if cls not in ('Helicopter','Fighter') else 1.5, 1.7), 1)
            bank = round(abs(rnd.gauss(1.3, 1.1)), 1)
            gs = round(max(20.0, rnd.gauss(mean_gs, max(5.0, mean_gs * 0.08))), 1)
            score = int(max(1, min(100, round(100 - min(abs(fpm) / 8.8, 66) - max(g - 1.0, 0) * 20 - flt * 1.35))))
            flare = rnd.choice(['Good flare','Average flare','Very good flare'])
            quality = max(0.01, min(1.0, 1 - min(abs(fpm) / 700.0, 1.0) * 0.7))
            rows.append([
                stamp.strftime('%Y-%m-%d %H:%M:%S'), code, cls, score, rating_from_score(score), fpm, g, flt, nose,
                flare, pitch, bank, gs, 'SYNTHETIC_TEST', '', '', 'high', '', '', fpm, g, nose, flt,
                flare, round(-quality, 2), round(abs(rnd.gauss(0.02, 0.01)), 2), rating_from_score(score), 6.5, 0.65
            ])
    return rows


def write_catalog(path):
    sim = set(SIMBRIEF_TYPES)
    project = set(PROJECT_TYPES)
    extra = set(XPLANE_EXTRA_TYPES)
    with Path(path).open('w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['Aircraft','Class','CatalogSource','SourceURL'])
        for code in AIRCRAFT:
            sources = []
            if code in sim: sources.append('SimBrief')
            if code in project: sources.append('Project')
            if code in extra: sources.append('X-Plane/common')
            url = 'https://www.simbrief.com/home/?page=aircraft&sort=name' if code in sim else ''
            w.writerow([code, profile(code)[0], '+'.join(sources), url])


def main():
    out = Path('LandingPerformance_TestDataset_ManyAircraft.csv')
    rows = generate_rows(12)
    with out.open('w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(HEADERS)
        w.writerows(rows)
    write_catalog('LandingPerformance_TestAircraftCatalog.csv')
    print(out)
    print(f'{len(rows)} rows, {len(AIRCRAFT)} aircraft types (+{len(AIRCRAFT)-48} vs previous test set)')


if __name__ == '__main__':
    main()
