#!/usr/bin/env python3
"""
Archii S10-NAS Bridge

Private, token-authenticated adapter between Archii/Vercel and the existing
loopback-only WebDAV server on the Samsung S10.

Expected deployment:
  public HTTPS tunnel -> 127.0.0.1:8770 -> this bridge
  this bridge -> 127.0.0.1:8766/S10-NAS/Projects -> WebDAV -> SAF -> HDD

The bridge never exposes arbitrary Android paths. Every operation is forced
under /S10-NAS/Projects/<projectId>/.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

HOST = os.environ.get("ARCHII_NAS_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("ARCHII_NAS_BRIDGE_PORT", "8770"))
TOKEN = os.environ.get("ARCHII_NAS_BRIDGE_TOKEN", "")
WEBDAV_BASE = os.environ.get("ARCHII_NAS_WEBDAV", "http://127.0.0.1:8766").rstrip("/")
PROJECTS_ROOT = "/S10-NAS/Projects"
DAV_TIMEOUT = float(os.environ.get("ARCHII_NAS_DAV_TIMEOUT", "12"))
MAX_BODY = int(os.environ.get("ARCHII_NAS_BRIDGE_MAX_BODY_MB", "16")) * 1024 * 1024

DEFAULT_FOLDERS = (
    "01_Planos",
    "02_Renders",
    "03_Presupuestos",
    "04_Contratos",
    "05_Fotos",
    "06_Entregables",
)

SAFE_PROJECT = re.compile(r"^[A-Za-z0-9_-]{1,160}$")
DOUBLE_ENCODED = re.compile(r"%[0-9A-Fa-f]{2}")

DAV_NS = {"d": "DAV:"}


class BridgeError(Exception):
    def __init__(self, message: str, status: int = 400, code: str = "BAD_REQUEST"):
        super().__init__(message)
        self.status = status
        self.code = code


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def _project_id(value: str) -> str:
    if not SAFE_PROJECT.fullmatch(value or ""):
        raise BridgeError("projectId inválido", 400, "INVALID_PROJECT_ID")
    return value


def _normalize_relative(value: str) -> str:
    raw = value or ""
    try:
        decoded = urllib.parse.unquote(raw, errors="strict")
    except Exception as exc:
        raise BridgeError("Ruta inválida", 400, "INVALID_PATH") from exc

    if "\x00" in decoded or "\\" in decoded or "://" in decoded:
        raise BridgeError("Ruta inválida", 400, "INVALID_PATH")
    if DOUBLE_ENCODED.search(decoded):
        raise BridgeError("Ruta con doble encoding rechazada", 400, "DOUBLE_ENCODING")

    clean = decoded.strip("/")
    if not clean:
        return ""

    parts = clean.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise BridgeError("Traversal de ruta rechazado", 400, "PATH_TRAVERSAL")
    return "/".join(parts)


def _safe_name(value: str) -> str:
    name = urllib.parse.unquote((value or "").strip(), errors="strict")
    if not name or name in (".", "..") or "/" in name or "\\" in name or "\x00" in name:
        raise BridgeError("Nombre inválido", 400, "INVALID_NAME")
    if DOUBLE_ENCODED.search(name):
        raise BridgeError("Nombre con doble encoding rechazado", 400, "DOUBLE_ENCODING")
    return name


def _encode_path(path: str) -> str:
    return "/" + "/".join(urllib.parse.quote(p, safe="") for p in path.strip("/").split("/") if p)


def _dav_path(project_id: str, rel_path: str = "") -> str:
    pid = _project_id(project_id)
    rel = _normalize_relative(rel_path)
    absolute = f"{PROJECTS_ROOT}/{pid}"
    if rel:
        absolute += f"/{rel}"
    return absolute


def _dav_url(project_id: str, rel_path: str = "") -> str:
    return WEBDAV_BASE + _encode_path(_dav_path(project_id, rel_path))


def _dav_request(
    method: str,
    url: str,
    *,
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, bytes, dict[str, str]]:
    request_headers = dict(headers or {})
    req = urllib.request.Request(url, data=body, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(req, timeout=DAV_TIMEOUT) as response:
            return response.status, response.read(), dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(), dict(exc.headers.items())


def _expect_dav(
    method: str,
    url: str,
    *,
    body: bytes | None = None,
    headers: dict[str, str] | None = None,
    allowed: tuple[int, ...] = (200, 201, 204, 207),
) -> tuple[int, bytes, dict[str, str]]:
    status, payload, response_headers = _dav_request(method, url, body=body, headers=headers)
    if status not in allowed:
        code = "PROJECT_STORAGE_NOT_FOUND" if status == 404 else "WEBDAV_ERROR"
        raise BridgeError(f"WebDAV HTTP {status}", status, code)
    return status, payload, response_headers


def _mkcol(url: str) -> int:
    status, _, _ = _dav_request("MKCOL", url)
    if status in (201, 204, 405):
        return status
    raise BridgeError(f"No se pudo crear carpeta: HTTP {status}", status, "MKCOL_FAILED")


def _ensure_project(project_id: str) -> list[str]:
    root = _dav_url(project_id)
    _mkcol(root)
    created: list[str] = []
    for name in DEFAULT_FOLDERS:
        status = _mkcol(_dav_url(project_id, name))
        if status in (201, 204):
            created.append(name)
    return created


def _parse_propfind(project_id: str, rel_path: str, payload: bytes) -> list[dict[str, Any]]:
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as exc:
        raise BridgeError("XML WebDAV inválido", 502, "INVALID_WEBDAV_XML") from exc

    requested = _dav_path(project_id, rel_path).rstrip("/")
    items: list[dict[str, Any]] = []

    for response in root.findall("d:response", DAV_NS):
        href = response.findtext("d:href", default="", namespaces=DAV_NS)
        decoded_href = urllib.parse.unquote(urllib.parse.urlparse(href).path).rstrip("/")
        if decoded_href == requested:
            continue

        if not decoded_href.startswith(requested + "/"):
            continue

        child_name = decoded_href[len(requested) + 1 :]
        if "/" in child_name or not child_name:
            continue

        prop = response.find("d:propstat/d:prop", DAV_NS)
        if prop is None:
            continue

        resource_type = prop.find("d:resourcetype", DAV_NS)
        is_directory = resource_type is not None and resource_type.find("d:collection", DAV_NS) is not None
        display_name = prop.findtext("d:displayname", default=child_name, namespaces=DAV_NS) or child_name
        length_text = prop.findtext("d:getcontentlength", default="", namespaces=DAV_NS)
        modified = prop.findtext("d:getlastmodified", default="", namespaces=DAV_NS)

        try:
            size = int(length_text) if length_text else 0
        except ValueError:
            size = 0

        last_modified = None
        if modified:
            try:
                last_modified = parsedate_to_datetime(modified).isoformat()
            except Exception:
                last_modified = modified

        rel = _normalize_relative(rel_path)
        relative_item_path = f"{rel}/{display_name}".strip("/")
        mime_type, _ = mimetypes.guess_type(display_name)

        items.append(
            {
                "name": display_name,
                "path": relative_item_path,
                "isDirectory": is_directory,
                "size": 0 if is_directory else size,
                "mimeType": "inode/directory" if is_directory else (mime_type or "application/octet-stream"),
                "lastModified": last_modified,
            }
        )

    items.sort(key=lambda item: (not item["isDirectory"], item["name"].lower()))
    return items


class Handler(BaseHTTPRequestHandler):
    server_version = "ArchiiS10Bridge/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[nas-bridge] {self.address_string()} {fmt % args}", flush=True)

    def _authorized(self) -> bool:
        if not TOKEN:
            return False
        presented = self.headers.get("X-Archii-Bridge-Token", "")
        return hmac.compare_digest(presented, TOKEN)

    def _send_json(self, status: int, payload: Any) -> None:
        data = _json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_error(self, error: Exception) -> None:
        if isinstance(error, BridgeError):
            self._send_json(error.status, {"ok": False, "error": str(error), "code": error.code})
        else:
            print(f"[nas-bridge] unexpected: {error!r}", flush=True)
            self._send_json(500, {"ok": False, "error": "Internal bridge error", "code": "INTERNAL_ERROR"})

    def _params(self) -> tuple[urllib.parse.ParseResult, dict[str, str]]:
        parsed = urllib.parse.urlparse(self.path)
        raw = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        params = {key: values[-1] if values else "" for key, values in raw.items()}
        return parsed, params

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length < 0 or length > MAX_BODY:
            raise BridgeError("Body demasiado grande", 413, "BODY_TOO_LARGE")
        data = self.rfile.read(length) if length else b"{}"
        try:
            parsed = json.loads(data.decode("utf-8"))
        except Exception as exc:
            raise BridgeError("JSON inválido", 400, "INVALID_JSON") from exc
        if not isinstance(parsed, dict):
            raise BridgeError("JSON inválido", 400, "INVALID_JSON")
        return parsed

    def _guard(self) -> bool:
        if not self._authorized():
            self._send_json(401, {"ok": False, "error": "Unauthorized", "code": "UNAUTHORIZED"})
            return False
        return True

    def do_GET(self) -> None:
        if not self._guard():
            return
        try:
            parsed, params = self._params()

            if parsed.path == "/health":
                status, _, _ = _dav_request(
                    "PROPFIND",
                    WEBDAV_BASE + _encode_path(PROJECTS_ROOT),
                    body=b'<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:allprop/></d:propfind>',
                    headers={"Depth": "0", "Content-Type": "application/xml; charset=utf-8"},
                )
                self._send_json(
                    200 if status == 207 else 503,
                    {
                        "ok": status == 207,
                        "backend": "S10-NAS",
                        "webdav": status,
                        "root": PROJECTS_ROOT,
                    },
                )
                return

            project_id = _project_id(params.get("projectId", ""))
            rel_path = _normalize_relative(params.get("path", ""))

            if parsed.path == "/files":
                _, payload, _ = _expect_dav(
                    "PROPFIND",
                    _dav_url(project_id, rel_path),
                    headers={"Depth": "1", "Content-Type": "application/xml; charset=utf-8"},
                    body=b'<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:allprop/></d:propfind>',
                    allowed=(207,),
                )
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "projectId": project_id,
                        "path": rel_path,
                        "items": _parse_propfind(project_id, rel_path, payload),
                    },
                )
                return

            if parsed.path == "/download":
                if not rel_path:
                    raise BridgeError("path requerido", 400, "INVALID_PATH")
                status, payload, headers = _expect_dav("GET", _dav_url(project_id, rel_path), allowed=(200,))
                filename = rel_path.rsplit("/", 1)[-1]
                self.send_response(status)
                self.send_header("Content-Type", headers.get("Content-Type", "application/octet-stream"))
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Content-Disposition", f'attachment; filename="{filename.replace(chr(34), "")}"')
                self.send_header("Cache-Control", "private, no-store")
                self.end_headers()
                self.wfile.write(payload)
                return

            raise BridgeError("Endpoint no encontrado", 404, "NOT_FOUND")
        except Exception as exc:
            self._send_error(exc)

    def do_POST(self) -> None:
        if not self._guard():
            return
        try:
            parsed, _ = self._params()
            body = self._read_json()
            project_id = _project_id(str(body.get("projectId", "")))

            if parsed.path == "/projects/ensure":
                created = _ensure_project(project_id)
                self._send_json(200, {"ok": True, "projectId": project_id, "created": created})
                return

            if parsed.path == "/folders":
                rel_path = _normalize_relative(str(body.get("path", "")))
                name = _safe_name(str(body.get("name", "")))
                destination = f"{rel_path}/{name}".strip("/")
                _mkcol(_dav_url(project_id, destination))
                self._send_json(201, {"ok": True, "path": destination})
                return

            if parsed.path == "/move":
                source = _normalize_relative(str(body.get("path", "")))
                destination = _normalize_relative(str(body.get("destination", "")))
                if not source or not destination:
                    raise BridgeError("Origen y destino requeridos", 400, "INVALID_PATH")
                dest_url = _dav_url(project_id, destination)
                _expect_dav(
                    "MOVE",
                    _dav_url(project_id, source),
                    headers={"Destination": dest_url, "Overwrite": "F"},
                    allowed=(201, 204),
                )
                self._send_json(200, {"ok": True, "path": destination})
                return

            raise BridgeError("Endpoint no encontrado", 404, "NOT_FOUND")
        except Exception as exc:
            self._send_error(exc)

    def do_PUT(self) -> None:
        if not self._guard():
            return
        try:
            parsed, params = self._params()
            if parsed.path != "/upload":
                raise BridgeError("Endpoint no encontrado", 404, "NOT_FOUND")

            project_id = _project_id(params.get("projectId", ""))
            rel_path = _normalize_relative(params.get("path", ""))
            name = _safe_name(params.get("name", ""))
            length = int(self.headers.get("Content-Length", "0") or 0)
            if length < 0 or length > MAX_BODY:
                raise BridgeError("Archivo demasiado grande para este bridge", 413, "BODY_TOO_LARGE")
            payload = self.rfile.read(length)
            target = f"{rel_path}/{name}".strip("/")
            content_type = self.headers.get("Content-Type", "application/octet-stream")

            status, _, _ = _expect_dav(
                "PUT",
                _dav_url(project_id, target),
                body=payload,
                headers={"Content-Type": content_type},
                allowed=(200, 201, 204),
            )
            self._send_json(
                201 if status == 201 else 200,
                {
                    "ok": True,
                    "path": target,
                    "size": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                },
            )
        except Exception as exc:
            self._send_error(exc)

    def do_PATCH(self) -> None:
        if not self._guard():
            return
        try:
            parsed, _ = self._params()
            if parsed.path != "/rename":
                raise BridgeError("Endpoint no encontrado", 404, "NOT_FOUND")

            body = self._read_json()
            project_id = _project_id(str(body.get("projectId", "")))
            source = _normalize_relative(str(body.get("path", "")))
            new_name = _safe_name(str(body.get("newName", "")))
            if not source:
                raise BridgeError("path requerido", 400, "INVALID_PATH")

            parent = source.rsplit("/", 1)[0] if "/" in source else ""
            destination = f"{parent}/{new_name}".strip("/")
            _expect_dav(
                "MOVE",
                _dav_url(project_id, source),
                headers={"Destination": _dav_url(project_id, destination), "Overwrite": "F"},
                allowed=(201, 204),
            )
            self._send_json(200, {"ok": True, "path": destination})
        except Exception as exc:
            self._send_error(exc)

    def do_DELETE(self) -> None:
        if not self._guard():
            return
        try:
            parsed, params = self._params()
            if parsed.path != "/files":
                raise BridgeError("Endpoint no encontrado", 404, "NOT_FOUND")
            project_id = _project_id(params.get("projectId", ""))
            rel_path = _normalize_relative(params.get("path", ""))
            if not rel_path:
                raise BridgeError("No se puede eliminar la raíz del proyecto", 400, "ROOT_DELETE_DENIED")
            _expect_dav("DELETE", _dav_url(project_id, rel_path), allowed=(200, 204))
            self._send_json(200, {"ok": True, "deleted": rel_path})
        except Exception as exc:
            self._send_error(exc)


def main() -> None:
    if not TOKEN:
        raise SystemExit("ARCHII_NAS_BRIDGE_TOKEN is required")
    if HOST != "127.0.0.1":
        raise SystemExit("Bridge must bind to 127.0.0.1; expose it only through an authenticated HTTPS tunnel")

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"[nas-bridge] listening on http://{HOST}:{PORT}", flush=True)
    print(f"[nas-bridge] WebDAV backend: {WEBDAV_BASE}", flush=True)
    print(f"[nas-bridge] root: {PROJECTS_ROOT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
