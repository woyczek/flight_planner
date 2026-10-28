"""Static server of the runner (run.py): the repository root over http://127.0.0.1:<port>/, standard library only.

`python -m http.server` lost loads at random under Windows (28 Oct 2026: "Failed to fetch dynamically imported module",
the service worker's 503 on a module file, `net::ERR_ADDRESS_IN_USE`, timeouts, the same on the unchanged base). It
speaks HTTP/1.0: one TCP connection per file, and a run of the suite opens tens of thousands of them; each closed one
holds a port for two minutes (TIME_WAIT: 13,375 at the end of a run), and Windows runs out of ports for the browser's
connections. Its listen queue also holds only 5 connections while Chromium opens many at once for a page's module imports.
Here:
  * HTTP/1.1 with keep-alive: a page's files go through a few connections (an idle one is closed after 30 s);
  * a long listen queue (512) and one thread per connection;
  * fixed types for the files a page loads (never the Windows registry's: `.js` there may be `text/plain`, which a module
    script refuses);
  * a client that closes its connection early (a navigation that moves on) is not an error;
  * no cache (`Cache-Control: no-store`): every run reads the tree as it is.

Usage: python tests/v3/static_server.py <port> <root>
"""
import http.server
import socketserver
import sys
from functools import partial

TYPES = {
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.pbf': 'application/x-protobuf',
    '.zip': 'application/zip',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    timeout = 30                                      # an idle kept-alive connection is closed
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 512
    daemon_threads = True

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (ConnectionError, TimeoutError)):
            return                                    # the page went on: not the server's error
        super().handle_error(request, client_address)


def main():
    port, root = int(sys.argv[1]), sys.argv[2]
    socketserver.TCPServer.allow_reuse_address = False
    with Server(('127.0.0.1', port), partial(Handler, directory=root)) as srv:
        srv.serve_forever()


if __name__ == '__main__':
    main()
