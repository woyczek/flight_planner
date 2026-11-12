"""Les branches en arc (RF, « radius to fix ») d'une procédure (SOG-0248) : un arc de rayon et de centre connus, du point précédent au point de fin, dans le sens du virage (L / R). Le tracé est DÉVELOPPÉ en points (jamais une corde droite
à la place d'un arc de procédure) et la longueur d'arc imprimée est contrôlée contre celle que donnent le centre, le rayon et les deux points. Géométrie sphérique simple (rayon de la Terre en NM : 3440,065, celui de proc_geometry). Bibliothèque standard seulement."""
import math

R_NM = 3440.065
STEP_DEG = 5.0                      # un point tous les 5° d'arc au plus
RADIUS_TOL_NM = 0.3                 # écart toléré entre le rayon imprimé et la distance du centre à chacun des deux points
ARC_TOL_NM = 0.3                    # écart toléré entre la longueur d'arc imprimée et celle recalculée (la page l'arrondit au dixième)


def _bearing_nm(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return (math.degrees(math.atan2(y, x)) + 360) % 360, 2 * R_NM * math.asin(math.sqrt(h))


def destination(a, bearing, nm):
    """(lat, lon) à `nm` milles de a, dans le cap vrai `bearing` (degrés)."""
    la1, lo1, th, d = math.radians(a[0]), math.radians(a[1]), math.radians(bearing), nm / R_NM
    la2 = math.asin(math.sin(la1) * math.cos(d) + math.cos(la1) * math.sin(d) * math.cos(th))
    lo2 = lo1 + math.atan2(math.sin(th) * math.sin(d) * math.cos(la1), math.cos(d) - math.sin(la1) * math.sin(la2))
    return math.degrees(la2), (math.degrees(lo2) + 540) % 360 - 180


def develop(center, start, end, turn, radius_nm=None, printed_nm=None):
    """L'arc du point `start` au point `end` autour de `center` ((lat, lon) chacun), `turn` 'L' ou 'R'. Rend { points: [(lat, lon) intermédiaires, sans les deux bouts], radius (NM, moyenne des deux
    distances au centre), sweep (degrés), arc_nm (longueur recalculée), gaps: [écarts, en texte] } ; None si le sens n'est pas L / R ou si un des trois points manque. `radius_nm` et `printed_nm` : ce que la page imprime (rayon,
    longueur d'arc) : chaque écart au-delà des tolérances est dit dans `gaps`, le tracé est rendu quand même (la procédure est alors à vérifier)."""
    if turn not in ('L', 'R') or None in (center, start, end) or any(x is None or x[0] is None for x in (center, start, end)):
        return None
    bs, rs = _bearing_nm(center, start)
    be, re_ = _bearing_nm(center, end)
    sweep = ((be - bs) % 360) if turn == 'R' else ((bs - be) % 360)
    radius = (rs + re_) / 2
    arc = radius * math.radians(sweep)
    gaps = []
    if radius_nm is not None and (abs(rs - radius_nm) > RADIUS_TOL_NM or abs(re_ - radius_nm) > RADIUS_TOL_NM):
        gaps.append(f'rayon calculé {rs:.2f} / {re_:.2f} NM pour {radius_nm} imprimés')
    if printed_nm is not None and abs(arc - printed_nm) > ARC_TOL_NM:
        gaps.append(f'longueur d\'arc calculée {arc:.2f} NM pour {printed_nm} imprimés')
    n = max(1, math.ceil(sweep / STEP_DEG))
    sign = 1 if turn == 'R' else -1
    pts = [destination(center, (bs + sign * sweep * k / n) % 360, radius) for k in range(1, n)]
    return {'points': pts, 'radius': round(radius, 3), 'sweep': round(sweep, 2), 'arc_nm': round(arc, 3), 'gaps': gaps}
