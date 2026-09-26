"""Serveur local pour tools/textures_generator.html : sert le dépôt et accepte PUT /shared/textures/<nom>.webp.

Usage : python tools/save_textures.py, puis ouvrir http://localhost:8765/tools/textures_generator.html ;
arrêter le serveur (Ctrl+C) une fois les textures écrites. N'écrit que des .webp dans shared/textures/.
"""
import http.server
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'shared', 'textures')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def do_PUT(self):
        m = re.fullmatch(r'/shared/textures/([a-z0-9-]+\.webp)', self.path)
        if not m:
            self.send_error(403)
            return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, m.group(1)), 'wb') as f:
            f.write(data)
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
