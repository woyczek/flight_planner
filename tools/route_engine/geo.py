"""Distances sur la sphère : UNE formule du grand cercle (SOG-0468 (3)).

La formule (haversine, rayon moyen en milles marins) était écrite neuf fois en Python dans la suite : `engine.nm`, `fra.graph`, `fra_recovery`, `nat_refresh`, `route_matrix`, `ukmil_aip` (ici),
`launch`, `proc_arc` et `proc_geometry` (aux autres sessions). Six copies n'avaient pas la garde `min(1, …)` : pour deux points presque antipodaux, `h` peut dépasser 1 d'un arrondi et
`math.asin(math.sqrt(h))` lève `ValueError` (« math domain error ») ; la garde est ici, une fois. Fonctions pures, sans état ; l'ordre des opérations est celui de l'ancien `engine.nm` (mêmes résultats au bit près).
"""
import math

R_NM = 3440.065      # rayon moyen de la Terre en milles marins (la valeur de toutes les copies)


def nm_ll(lat1, lon1, lat2, lon2):
    """Distance (NM) entre deux points en degrés (lat, lon)."""
    x, y = math.radians(lat1), math.radians(lat2)
    d = math.sin((y - x) / 2) ** 2 + math.cos(x) * math.cos(y) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return R_NM * 2 * math.asin(min(1, math.sqrt(d)))


def nm(a, b):
    """Distance (NM) entre deux points { 'lat', 'lon' } en degrés."""
    return nm_ll(a['lat'], a['lon'], b['lat'], b['lon'])


def nm_pair(a, b):
    """Distance (NM) entre deux points (lat, lon) en degrés."""
    return nm_ll(a[0], a[1], b[0], b[1])


def chord_nm(a, b):
    """Distance (NM) entre deux positions déjà en radians avec leur cosinus : a = (lat, lon, cos lat, …) ; pour les boucles de millions d'appels (`fra.graph`), où le sinus et le cosinus sont faits une fois par point."""
    return R_NM * 2 * math.asin(min(1, math.sqrt(math.sin((b[0] - a[0]) / 2) ** 2 + a[2] * b[2] * math.sin((b[1] - a[1]) / 2) ** 2)))
