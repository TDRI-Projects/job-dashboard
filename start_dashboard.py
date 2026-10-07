#!/usr/bin/env python3
"""Serve this dashboard folder locally; Python standard library only."""
import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    missing = [name for name in ('index.html', 'main.csv', 'occupation.csv', 'field_of_study.csv', 'skill.csv')
               if not (ROOT / name).is_file() and not (ROOT / (name + '.gz')).is_file()]
    if missing:
        print('Missing dashboard files: ' + ', '.join(missing), file=sys.stderr)
        return 1
    url = f'http://localhost:{args.port}/'
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/index.html', timeout=3) as response:
                same_dashboard = response.read() == (ROOT / 'index.html').read_bytes()
        except Exception:
            same_dashboard = False
        if not same_dashboard:
            print(f'Port {args.port} is used by another server. Close it or run with --port 8766.', file=sys.stderr)
            return 1
        print(f'Dashboard is already running: {url}', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return 0
    print(f'Dashboard is running: {url}', flush=True)
    print('Keep this Terminal window open. Press Control+C to stop the server.', flush=True)
    if not args.no_browser:
        opener = threading.Timer(0.5, webbrowser.open, args=(url,))
        opener.daemon = True
        opener.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('Dashboard server stopped.')
    finally:
        server.server_close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
