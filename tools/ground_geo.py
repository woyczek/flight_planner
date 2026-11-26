"""Small, explicit GeoPDF surface-chart transform; standard library only.

Supports rectangular four-corner geographic controls and EPSG:3006 SWEREF99 TM.
Unrecognized CRS, relative measurements, broken controls and extrapolation refuse.
Source geographic coordinates remain attributed to their source datum.
"""
import math


def tm_forward(lat, lon):
    """SWEREF99 TM (GRS80, central meridian15, k0=.9996, false easting500000)."""
    a, f, k = 6378137.0, 1/298.257222101, .9996
    e = f*(2-f); ep = e/(1-e)
    p, l = math.radians(lat), math.radians(lon-15)
    n = a/math.sqrt(1-e*math.sin(p)**2)
    t, c, v = math.tan(p)**2, ep*math.cos(p)**2, math.cos(p)*l
    m = a*((1-e/4-3*e**2/64-5*e**3/256)*p
           -(3*e/8+3*e**2/32+45*e**3/1024)*math.sin(2*p)
           +(15*e**2/256+45*e**3/1024)*math.sin(4*p)-35*e**3/3072*math.sin(6*p))
    x = 500000+k*n*(v+(1-t+c)*v**3/6+(5-18*t+t*t+72*c-58*ep)*v**5/120)
    y = k*(m+n*math.tan(p)*(v*v/2+(5-t+9*c+4*c*c)*v**4/24+(61-58*t+t*t+600*c-330*ep)*v**6/720))
    return x, y


def tm_inverse(x, y):
    a, f, k = 6378137.0, 1/298.257222101, .9996
    e = f*(2-f); ep = e/(1-e)
    mu = y/k/(a*(1-e/4-3*e*e/64-5*e**3/256))
    e1 = (1-math.sqrt(1-e))/(1+math.sqrt(1-e))
    p = (mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)
         +(21*e1*e1/16-55*e1**4/32)*math.sin(4*mu)
         +151*e1**3/96*math.sin(6*mu)+1097*e1**4/512*math.sin(8*mu))
    n = a/math.sqrt(1-e*math.sin(p)**2)
    r = a*(1-e)/(1-e*math.sin(p)**2)**1.5
    t, c, d = math.tan(p)**2, ep*math.cos(p)**2, (x-500000)/(n*k)
    lat = p-n*math.tan(p)/r*(d*d/2-(5+3*t+10*c-4*c*c-9*ep)*d**4/24
                             +(61+90*t+298*c+45*t*t-252*ep-3*c*c)*d**6/720)
    lon = math.radians(15)+(d-(1+2*t+c)*d**3/6+(5-2*c+28*t-3*c*c+8*ep+24*t*t)*d**5/120)/math.cos(p)
    lat,lon=math.degrees(lat),math.degrees(lon)
    # Refine the inverse-series seed against the forward projection. This avoids
    # the longitude truncation error near the eastern edge of the Swedish grid.
    for _ in range(2):
        east,north=tm_forward(lat,lon)
        e1,n1=tm_forward(lat+1e-6,lon)
        e2,n2=tm_forward(lat,lon+1e-6)
        a,b,c,d=(e1-east)/1e-6,(e2-east)/1e-6,(n1-north)/1e-6,(n2-north)/1e-6
        det=a*d-b*c
        if abs(det)<1:
            raise ValueError('degenerate inverse projection')
        de,dn=east-x,north-y
        lat-=(d*de-b*dn)/det
        lon-=(-c*de+a*dn)/det
    return lat,lon


def calibration(viewport):
    m = viewport.get('/Measure', {})
    if m.get('/Subtype') != '/GEO':
        raise ValueError('not a geographic measure')
    box = viewport.get('/BBox', [])
    lp, gp = m.get('/LPTS', []), m.get('/GPTS', [])
    bounds = m.get('/Bounds', lp)
    if len(box) != 4 or len(lp) != 8 or len(gp) != 8 or len(bounds) != 8:
        raise ValueError('unsupported GeoPDF control dimensions')
    if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in [*box, *lp, *gp, *bounds]):
        raise ValueError('nonfinite GeoPDF control')
    square = {(0,0), (1,0), (0,1), (1,1)}
    if set(zip(lp[::2], lp[1::2])) != square or set(zip(bounds[::2], bounds[1::2])) != square:
        raise ValueError('only a rectangular unit-square registration is supported')
    if box[2]-box[0] < 20 or box[3]-box[1] < 20:
        raise ValueError('degenerate GeoPDF viewport')
    crs = m.get('/GCS', {})
    epsg = crs.get('/EPSG')
    if (epsg == 3006 and crs.get('/Type') != '/PROJCS') or (epsg == 4326 and crs.get('/Type') != '/GEOGCS') or epsg not in (3006,4326):
        raise ValueError('unsupported source CRS')
    points = {}
    for i in range(0,8,2):
        lat, lon = gp[i:i+2]
        if not (-85 < lat < 85 and -180 < lon < 180):
            raise ValueError('control is not a latitude/longitude pair')
        if epsg == 3006 and not (54 <= lat <= 70 and 10 <= lon <= 25):
            raise ValueError('control outside SWEREF99 TM supported range')
        points[(lp[i], lp[i+1])] = tm_forward(lat,lon) if epsg == 3006 else (lon,lat)
    origin, east, north, check = [points[p] for p in ((0,0),(1,0),(0,1),(1,1))]
    dx = [east[i]-origin[i] for i in (0,1)]
    dy = [north[i]-origin[i] for i in (0,1)]
    residual = math.dist(check,[origin[i]+dx[i]+dy[i] for i in (0,1)])
    limit = .5 if epsg == 3006 else 1e-6
    if residual > limit or abs(dx[0]*dy[1]-dx[1]*dy[0]) < (1 if epsg==3006 else 1e-12):
        raise ValueError('inconsistent or degenerate geographic controls')
    return {'bbox':box,'origin':origin,'dx':dx,'dy':dy,'epsg':epsg,
            'datum':'SWEREF99' if epsg==3006 else 'WGS84', 'control_residual':residual,
            'control_residual_unit':'metre' if epsg==3006 else 'degree',
            'method':'four-corner-projected-affine' if epsg==3006 else 'four-corner-geographic-affine'}


def position(cal, xy):
    x0,y0,x1,y1 = cal['bbox']
    u,v = (xy[0]-x0)/(x1-x0), (xy[1]-y0)/(y1-y0)
    if not all(math.isfinite(n) for n in (u,v)) or not (0<=u<=1 and 0<=v<=1):
        raise ValueError('outside registered viewport')
    x,y = [cal['origin'][i]+u*cal['dx'][i]+v*cal['dy'][i] for i in (0,1)]
    lat,lon = tm_inverse(x,y) if cal['epsg']==3006 else (y,x)
    return [round(lon,8),round(lat,8)]
