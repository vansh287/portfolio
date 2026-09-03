#!/usr/bin/env python3
"""Local editor for the site.

    python editor.py

Opens a small web app at http://127.0.0.1:8765 where you can edit every piece
of text on the site, reorder or delete entries, and swap the portrait — then
hit Save, which rewrites site/content.json and rebuilds index.html.

Nothing leaves your machine: the server binds to localhost only.
"""

import base64
import io
import json
import os
import shutil
import socket
import sys
import threading
import time
import webbrowser
from datetime import datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"
CONTENT = SITE / "content.json"
BACKUPS = SITE / "backups"
PORT = 8765

sys.path.insert(0, str(ROOT))
import build as builder  # noqa: E402

PORTRAIT_RATIO = 880 / 1105
PORTRAIT_SIZES = (880, 560, 340)


def json_bytes(obj, status_ok=True):
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def backup_content():
    BACKUPS.mkdir(exist_ok=True)
    if CONTENT.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(CONTENT, BACKUPS / f"content-{stamp}.json")
        # keep the last 20
        old = sorted(BACKUPS.glob("content-*.json"))[:-20]
        for f in old:
            f.unlink(missing_ok=True)


def save_portrait(image_bytes, offset=0.5, zoom=1.0):
    """Crop to the portrait ratio and write every size the page asks for."""
    from PIL import Image, ImageOps

    src = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("RGB")
    w, h = src.size

    # largest box of the right shape, scaled by zoom (1.0 = as large as fits)
    box_h = min(h, int(w / PORTRAIT_RATIO))
    box_w = int(box_h * PORTRAIT_RATIO)
    zoom = max(1.0, min(float(zoom), 3.0))
    box_w, box_h = int(box_w / zoom), int(box_h / zoom)

    left = max(0, min(w - box_w, (w - box_w) // 2))
    offset = max(0.0, min(float(offset), 1.0))
    top = int((h - box_h) * offset)
    top = max(0, min(h - box_h, top))

    crop = src.crop((left, top, left + box_w, top + box_h))

    img_dir = ROOT / "img"
    img_dir.mkdir(exist_ok=True)
    crop.resize((880, 1105), Image.LANCZOS).save(
        img_dir / "vansh.jpg", quality=90, optimize=True, progressive=True)
    for size in PORTRAIT_SIZES:
        r = crop.resize((size, round(size / PORTRAIT_RATIO)), Image.LANCZOS)
        r.save(img_dir / f"vansh-{size}.webp", "WEBP", quality=82, method=6)
        r.save(img_dir / f"vansh-{size}.jpg", "JPEG", quality=82,
               optimize=True, progressive=True)

    # keep the untouched original so the crop can be redone later
    (img_dir / "_original-portrait.jpg").write_bytes(image_bytes)

    buf = io.BytesIO()
    crop.resize((320, 402), Image.LANCZOS).save(buf, "JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        path = args[0] if args else ""
        if "/api/" in str(path):
            sys.stderr.write("  %s\n" % (fmt % args))

    # ---------- helpers ----------
    def send_json(self, obj, status=200):
        payload = json_bytes(obj)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def end_headers(self):
        # the preview iframe must always show the newest build
        if self.path.endswith((".html", ".json")) or self.path == "/":
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    # ---------- routes ----------
    def do_GET(self):
        route = urlparse(self.path).path
        if route == "/":
            self.path = "/site/editor.html"
            return SimpleHTTPRequestHandler.do_GET(self)
        if route == "/api/content":
            try:
                return self.send_json(json.loads(CONTENT.read_text(encoding="utf-8")))
            except Exception as exc:  # noqa: BLE001
                return self.send_json({"error": str(exc)}, 500)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        route = urlparse(self.path).path
        try:
            if route == "/api/save":
                data = self.read_json()
                content = data.get("content")
                if not isinstance(content, dict):
                    return self.send_json({"error": "no content"}, 400)
                backup_content()
                CONTENT.write_text(
                    json.dumps(content, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")
                html = builder.render(content)
                (ROOT / "index.html").write_text(html, encoding="utf-8")
                return self.send_json({
                    "ok": True,
                    "kb": round(len(html.encode("utf-8")) / 1024),
                    "at": datetime.now().strftime("%H:%M:%S"),
                })

            if route == "/api/photo":
                data = self.read_json()
                raw = data.get("data", "")
                if "," in raw:
                    raw = raw.split(",", 1)[1]
                thumb = save_portrait(base64.b64decode(raw),
                                      data.get("offset", 0.5),
                                      data.get("zoom", 1.0))
                return self.send_json({"ok": True, "thumb": thumb})

            if route == "/api/recrop":
                data = self.read_json()
                original = ROOT / "img" / "_original-portrait.jpg"
                if not original.exists():
                    return self.send_json({"error": "no original stored"}, 400)
                thumb = save_portrait(original.read_bytes(),
                                      data.get("offset", 0.5),
                                      data.get("zoom", 1.0))
                return self.send_json({"ok": True, "thumb": thumb})

        except Exception as exc:  # noqa: BLE001
            import traceback
            traceback.print_exc()
            return self.send_json({"error": str(exc)}, 500)

        return self.send_json({"error": "unknown route"}, 404)


def free_port(start):
    for p in range(start, start + 20):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    return start


def main():
    if not CONTENT.exists():
        print(f"missing {CONTENT}")
        raise SystemExit(1)

    port = free_port(PORT)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{port}/"

    print("\n  Website editor")
    print(f"  {url}")
    print("  Edit, press Save, and index.html is rebuilt.")
    print("  Ctrl+C here when you are done.\n")

    threading.Thread(target=lambda: (time.sleep(0.7), webbrowser.open(url)),
                     daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped.")


if __name__ == "__main__":
    main()
