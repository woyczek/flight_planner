#!/usr/bin/env python3
"""Render a static operational overlay on a supplied, north-up raster map.

Only Python's standard library and ImageMagick (magick.exe) are required.
Coordinates use WGS84 decimal degrees. The calibration is a geographic bounding
box; the renderer applies Web Mercator, matching standard OSM raster maps.
"""
from __future__ import annotations

import argparse
import base64
import csv
import json
import math
import mimetypes
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape


SIA = {'aixm': 'http://www.aixm.aero/schema/4.5', 'sia': 'https://sia.aviation-civile.gouv.fr/xml-sia', 'gml': 'http://www.opengis.net/gml/3.2'}


def mercator_y(latitude: float) -> float:
    latitude = max(min(latitude, 85.05112878), -85.05112878)
    return math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2))


class Projector:
    def __init__(self, bbox: list[float], width: int, height: int) -> None:
        self.west, self.south, self.east, self.north = bbox
        self.width, self.height = width, height
        self.south_y, self.north_y = mercator_y(self.south), mercator_y(self.north)

    def point(self, latitude: float, longitude: float) -> tuple[float, float]:
        x = (longitude - self.west) / (self.east - self.west) * self.width
        y = (self.north_y - mercator_y(latitude)) / (self.north_y - self.south_y) * self.height
        return x, y


def image_size(path: Path) -> tuple[int, int]:
    output = subprocess.check_output(['magick', 'identify', '-format', '%w %h', str(path)], text=True).strip()
    width, height = output.split()
    return int(width), int(height)


def embedded_image(background: Path, width: int, height: int) -> str:
    """Keep the supplied blank map inside SVG deliverables.

    The base map is deliberately kept as its original raster artwork; all
    operational additions remain native SVG and can therefore be edited in a
    vector editor afterwards.
    """
    mime = mimetypes.guess_type(background.name)[0] or 'image/png'
    payload = base64.b64encode(background.read_bytes()).decode('ascii')
    return svg_element('image', {
        'x': '0', 'y': '0', 'width': str(width), 'height': str(height),
        'href': f'data:{mime};base64,{payload}',
    })


def load_cities(path: Path) -> list[dict]:
    """Read a UTF-8 city catalogue: name,lat,lon,population (CSV headers)."""
    required = {'name', 'lat', 'lon', 'population'}
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError('Cities CSV must have name,lat,lon,population columns')
        return [
            {'name': row['name'], 'lat': float(row['lat']), 'lon': float(row['lon']),
             'population': int(float(row['population']))}
            for row in reader if row.get('name')
        ]


def selected_airspace_parts(xml_path: Path, selector: dict) -> list[list[tuple[float, float]]]:
    root = ET.parse(xml_path).getroot()
    wanted_type = selector.get('type', '').upper()
    wanted_name = selector.get('name', '').upper()
    wanted_key = selector.get('source_key', '').upper()
    wanted_parts = {str(item) for item in selector.get('parts', [])}
    output = []
    for airspace in root.findall('aixm:Airspace', SIA):
        kind = (airspace.findtext('aixm:type', '', SIA) or '').upper()
        name = (airspace.findtext('aixm:name', '', SIA) or '').upper()
        source_key = (airspace.findtext('sia:sourceKey', '', SIA) or '').upper()
        if wanted_type and kind != wanted_type:
            continue
        if wanted_name and wanted_name not in name:
            continue
        if wanted_key and wanted_key not in source_key:
            continue
        for part in airspace.findall('sia:airspacePart', SIA):
            if wanted_parts and part.get('name', '') not in wanted_parts and part.get('number', '') not in wanted_parts:
                continue
            positions = part.find('gml:LinearRing/gml:posList', SIA)
            if positions is None or not positions.text:
                continue
            values = [float(value) for value in positions.text.split()]
            output.append(list(zip(values[::2], values[1::2])))
    if not output:
        raise ValueError(f"No SIA airspace geometry found for {selector}")
    return output


def svg_element(tag: str, attrs: dict[str, str], content: str = '') -> str:
    rendered = ' '.join(f'{key}="{escape(str(value), {chr(34): "&quot;"})}"' for key, value in attrs.items())
    return f'<{tag} {rendered}>{content}</{tag}>'


def label(x: float, y: float, text: str, color: str = '#ffffff') -> str:
    return svg_element('text', {'x': f'{x:.1f}', 'y': f'{y:.1f}', 'fill': color, 'font-family': 'DejaVu Sans, Arial, sans-serif', 'font-size': '17', 'font-weight': '600', 'paint-order': 'stroke', 'stroke': '#17202a', 'stroke-width': '3', 'stroke-linejoin': 'round'}, escape(text))


def render(config: dict, background: Path, output: Path, zones_xml: Path | None) -> None:
    width, height = image_size(background)
    bbox = config['map']['bbox']
    if len(bbox) != 4:
        raise ValueError('map.bbox must contain [west, south, east, north]')
    projection = Projector(bbox, width, height)
    body = []
    for zone in config.get('zones', []):
        if zones_xml is None:
            raise ValueError('A zones section requires --zones-xml')
        style = zone.get('style', {})
        stroke = style.get('stroke', '#ffb000')
        fill = style.get('fill', '#ffb000')
        opacity = str(style.get('fill_opacity', 0.16))
        for ring in selected_airspace_parts(zones_xml, zone['selector']):
            polygon = ' '.join(f'{x:.1f},{y:.1f}' for x, y in (projection.point(lat, lon) for lat, lon in ring))
            body.append(svg_element('polygon', {'points': polygon, 'fill': fill, 'fill-opacity': opacity, 'stroke': stroke, 'stroke-width': str(style.get('stroke_width', 2)), 'stroke-dasharray': style.get('dash', '7 5')}))
    for circle in config.get('circles', []):
        lat, lon = circle['center']
        x, y = projection.point(lat, lon)
        kilometres = float(circle['radius_km'])
        lon_delta = kilometres / (111.32 * math.cos(math.radians(lat)))
        lat_delta = kilometres / 111.32
        rx = abs(projection.point(lat, lon + lon_delta)[0] - x)
        ry = abs(projection.point(lat + lat_delta, lon)[1] - y)
        style = circle.get('style', {})
        body.append(svg_element('ellipse', {'cx': f'{x:.1f}', 'cy': f'{y:.1f}', 'rx': f'{rx:.1f}', 'ry': f'{ry:.1f}', 'fill': style.get('fill', '#ffb000'), 'fill-opacity': str(style.get('fill_opacity', 0.10)), 'stroke': style.get('stroke', '#ffb000'), 'stroke-width': str(style.get('stroke_width', 2)), 'stroke-dasharray': style.get('dash', '7 5')}))
        if circle.get('label'):
            body.append(label(x + 10, y + 22, circle['label'], style.get('stroke', '#ffb000')))
    for route in config.get('routes', []):
        points = [projection.point(point['lat'], point['lon']) for point in route['points']]
        polyline = ' '.join(f'{x:.1f},{y:.1f}' for x, y in points)
        style = route.get('style', {})
        body.append(svg_element('polyline', {'points': polyline, 'fill': 'none', 'stroke': style.get('stroke', '#30a8ff'), 'stroke-width': str(style.get('stroke_width', 3)), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': style.get('dash', '')}))
    for point in config.get('points', []):
        x, y = projection.point(point['lat'], point['lon'])
        style = point.get('style', {})
        color = style.get('color', '#30a8ff')
        symbol = point.get('symbol', 'circle')
        if symbol == 'diamond':
            body.append(svg_element('path', {'d': f'M {x:.1f} {y-8:.1f} L {x+8:.1f} {y:.1f} L {x:.1f} {y+8:.1f} L {x-8:.1f} {y:.1f} Z', 'fill': color, 'stroke': '#17202a', 'stroke-width': '2'}))
        elif symbol == 'square':
            body.append(svg_element('rect', {'x': f'{x-6:.1f}', 'y': f'{y-6:.1f}', 'width': '12', 'height': '12', 'fill': color, 'stroke': '#17202a', 'stroke-width': '2'}))
        else:
            body.append(svg_element('circle', {'cx': f'{x:.1f}', 'cy': f'{y:.1f}', 'r': '6', 'fill': color, 'stroke': '#17202a', 'stroke-width': '2'}))
        if point.get('label'):
            dx, dy = point.get('label_offset', [10, -10])
            body.append(label(x + dx, y + dy, point['label'], color))
    city_options = config.get('city_labels', {})
    if city_options.get('enabled'):
        minimum = int(city_options.get('min_population', 200000))
        for city in config.get('cities', []):
            if int(city.get('population', 0)) < minimum:
                continue
            x, y = projection.point(float(city['lat']), float(city['lon']))
            body.append(svg_element('circle', {'cx': f'{x:.1f}', 'cy': f'{y:.1f}', 'r': '3.5', 'fill': '#252525'}))
            body.append(label(x + 7, y - 7, str(city['name']), '#252525'))
    title = config.get('title')
    if title:
        body.append(svg_element('rect', {'x': '14', 'y': '14', 'width': str(max(210, len(title) * 11)), 'height': '34', 'fill': '#17202a', 'fill-opacity': '.78'}))
        body.append(label(26, 37, title))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}">' + embedded_image(background, width, height)
           + ''.join(body) + '</svg>')
    # Use a predictable sibling path: some locked-down Windows environments deny
    # Python's automatically-created temporary directories.
    # A .svg output is the editable deliverable: base image + vector layers.
    if output.suffix.lower() == '.svg':
        output.write_text(svg, encoding='utf-8')
        return
    source_svg = output.with_name(f'{output.stem}.overlay.svg')
    source_svg.write_text(svg, encoding='utf-8')
    try:
        subprocess.run(['magick', str(background), '(', '-background', 'none', str(source_svg), ')', '-compose', 'over', '-composite', str(output)], check=True)
    finally:
        source_svg.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True, type=Path, help='JSON request file')
    parser.add_argument('--background', required=True, type=Path, help='Blank, north-up PNG/JPEG map')
    parser.add_argument('--output', required=True, type=Path, help='Rendered PNG/JPEG or editable SVG path')
    parser.add_argument('--zones-xml', type=Path, help='sia-airspaces-*.xml generated from SIA XML')
    parser.add_argument('--cities-csv', type=Path, help='Optional UTF-8 CSV: name,lat,lon,population')
    args = parser.parse_args()
    if not args.background.is_file():
        parser.error(f'Background not found: {args.background}')
    config = json.loads(args.config.read_text(encoding='utf-8'))
    if args.cities_csv:
        config['cities'] = load_cities(args.cities_csv)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    render(config, args.background, args.output, args.zones_xml)
    print(f'Created {args.output}')


if __name__ == '__main__':
    main()
