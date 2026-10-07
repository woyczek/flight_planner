"""Serveur local pour tools/textures_generator.html : sert le dépôt et accepte PUT /shared/textures/<nom>.webp.

Usage : python tools/save_textures.py [--src DOSSIER], puis ouvrir
  http://localhost:8765/tools/textures_generator.html (matières procédurales : cartes, radar, caoutchouc) ou
  http://localhost:8765/tools/textures_from_photos.html (matières photographiques CC0 : --src = dossier des JPG
  « <Asset>_color.jpg » / « <Asset>_normal.jpg » extraits des archives 1K-JPG d'ambientCG, servi sous /src/) ;
arrêter le serveur (Ctrl+C) une fois les textures écrites. N'écrit que des .webp dans shared/textures/.
"""
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'shared', 'textures')
SRC = sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else None


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        """Gestionnaire servant la racine du dépôt."""
        super().__init__(*a, directory=ROOT, **k)

    def translate_path(self, path):
        """Chemins /src/… servis depuis le dossier --src (nom de fichier seul) ; les autres depuis le dépôt."""
        if SRC and path.startswith('/src/'):
            return os.path.join(SRC, os.path.basename(path.split('?')[0]))
        return super().translate_path(path)

    def do_PUT(self):
        """Écrit le .webp reçu sous shared/ (textures, icônes et décors des designs à matières) ; 403 hors de ces dossiers."""
        # textures, icônes et éléments décoratifs des designs à matières (tools/icons_from_sheets.html)
        m = re.fullmatch(r'/shared/((?:textures|icons/skeuo/(?:cabinet|field|aqua|flightlog)|icons/defa|deco/(?:cabinet|field|aqua|flightlog))/[a-z0-9-]+\.webp)', self.path)
        if not m:
            self.send_error(403)
            return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        path = os.path.join(ROOT, 'shared', *m.group(1).split('/'))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(data)
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
