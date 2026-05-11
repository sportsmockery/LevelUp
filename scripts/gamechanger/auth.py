"""GameChanger Eden Auth: HMAC signing + token refresh + pluggable storage.

Mirrors the algorithm in web.gc.com/assets/gamechanger-auth-BdPG7WBu.js
(makeRequest, signPayload, valuesForSigner). Critical detail: gc-timestamp
is in SECONDS, not ms.

Refresh flow:
  POST /auth  body={"type":"refresh"}  gc-token=<refresh JWT>
  -> {"type":"token","access":{data,expires},"refresh":{data,expires}}

Both tokens rotate on refresh, so the new refresh JWT MUST be persisted.

Stores:
  FileTokenStore       — JSON file (local dev)
  SupabaseTokenStore   — gc_auth_tokens row (production / GitHub Actions)
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path
from typing import Any

import requests

EDEN_BASE = "https://api.team-manager.gc.com"
CLIENT_ID = "001acc71-6c9f-42e6-82ca-e7a0ebe6b255"
CLIENT_KEY_B64 = "ZyGC18Fs7S4rtSPV7jDWl9MN0xDsLpShHsI3IEg380U="
STORAGE_KEY_B64 = "tCveS/ThcKvE87Zq6JGCo9r4XjdrlEod4w87QWgcfWo="

# Refresh access token when this many seconds remain.
ACCESS_REFRESH_WINDOW = 300


def _values_for_signer(f: Any) -> list[str]:
    if isinstance(f, list):
        out: list[str] = []
        for v in f:
            out.extend(_values_for_signer(v))
        return out
    if isinstance(f, bool):
        raise ValueError("Unknown type: bool")
    if isinstance(f, dict):
        if not f:
            return ["null"]
        out = []
        for k in sorted(f.keys()):
            out.extend(_values_for_signer(f[k]))
        return out
    if f is None:
        return ["null"]
    if isinstance(f, str):
        return [f]
    if isinstance(f, (int, float)):
        return [str(f)]
    raise ValueError(f"Unknown type: {type(f)}")


def _sign(timestamp: int, nonce_bytes: bytes, body: Any,
          previous_signature_b64: str | None = None) -> str:
    key = base64.b64decode(CLIENT_KEY_B64)
    h = hmac.new(key, digestmod=hashlib.sha256)
    h.update(f"{timestamp}|".encode())
    h.update(nonce_bytes)
    h.update(b"|")
    h.update("|".join(_values_for_signer(body)).encode())
    if previous_signature_b64:
        h.update(b"|")
        h.update(base64.b64decode(previous_signature_b64))
    return base64.b64encode(h.digest()).decode()


def _post_auth(body: dict, *, token: str | None, device_id: str) -> dict:
    ts = int(time.time())
    nonce_bytes = secrets.token_bytes(32)
    nonce_b64 = base64.b64encode(nonce_bytes).decode()
    sig = _sign(ts, nonce_bytes, body)
    headers = {
        "content-type": "application/json; charset=utf-8",
        "gc-app-name": "web",
        "gc-app-version": "0.0.0",
        "gc-client-id": CLIENT_ID,
        "gc-device-id": device_id,
        "gc-timestamp": str(ts),
        "gc-signature": f"{nonce_b64}.{sig}",
        "origin": "https://web.gc.com",
        "referer": "https://web.gc.com/",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    }
    if token:
        headers["gc-token"] = token
    r = requests.post(
        f"{EDEN_BASE}/auth",
        data=json.dumps(body, separators=(",", ":")),
        headers=headers,
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def refresh(refresh_token: str, device_id: str) -> dict:
    """Exchange a refresh token for a fresh token pair (both rotate)."""
    data = _post_auth({"type": "refresh"}, token=refresh_token, device_id=device_id)
    if data.get("type") != "token":
        raise RuntimeError(f"Unexpected /auth response: {data}")
    return {
        "accessToken": data["access"]["data"],
        "accessExpires": data["access"]["expires"],
        "refreshToken": data["refresh"]["data"],
        "refreshExpires": data["refresh"]["expires"],
    }


def decrypt_browser_blob(blob: str) -> dict:
    """Decrypt the eden-auth-tokens localStorage value to seed the store.

    blob format: '<iv_b64>.<ciphertext_b64>'
    Returns: {version, tokens:{accessToken, refreshToken}, deviceId}
    """
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad

    iv_b64, ct_b64 = blob.split(".", 1)
    key = base64.b64decode(STORAGE_KEY_B64)
    iv = base64.b64decode(iv_b64)[:16]
    ct = base64.b64decode(ct_b64)
    pt = unpad(AES.new(key, AES.MODE_CBC, iv).decrypt(ct), AES.block_size)
    return json.loads(pt.decode())


# ---------- token store base ----------

class TokenStore:
    """Base class. Subclasses implement load() and save()."""

    def load(self) -> dict | None:
        raise NotImplementedError

    def save(self, data: dict) -> None:
        raise NotImplementedError

    def get_valid_access_token(self) -> tuple[str, str]:
        """Return (access_token, device_id), refreshing if expiry is near."""
        data = self.load()
        if not data:
            raise RuntimeError(
                f"{type(self).__name__}: no tokens found. Run seed_tokens.py first."
            )

        now = int(time.time())
        access_ok = (
            data.get("accessToken")
            and (data.get("accessExpires", 0) - now) > ACCESS_REFRESH_WINDOW
        )
        if access_ok:
            return data["accessToken"], data["deviceId"]

        refresh_token = data.get("refreshToken")
        device_id = data.get("deviceId")
        if not refresh_token or not device_id:
            raise RuntimeError("Token store missing refreshToken or deviceId")
        if data.get("refreshExpires", 0) and data["refreshExpires"] < now:
            raise RuntimeError(
                "Refresh token expired. Reseed from a fresh browser localStorage dump."
            )

        print("  access token expired/expiring — refreshing...")
        new_tokens = refresh(refresh_token, device_id)
        data.update(new_tokens)
        self.save(data)
        print(
            f"  refreshed; new access expires in {(new_tokens['accessExpires']-now)/60:.0f} min, "
            f"new refresh in {(new_tokens['refreshExpires']-now)/86400:.1f} days"
        )
        return data["accessToken"], data["deviceId"]


class FileTokenStore(TokenStore):
    """JSON-file backend for local dev."""

    def __init__(self, path: Path):
        self.path = path

    def load(self) -> dict | None:
        if not self.path.exists():
            return None
        try:
            return json.loads(self.path.read_text())
        except (json.JSONDecodeError, OSError):
            return None

    def save(self, data: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, indent=2))


class SupabaseTokenStore(TokenStore):
    """gc_auth_tokens row backend. Survives across machines and CI runs."""

    def __init__(self, sb, row_id: str = "default"):
        self.sb = sb
        self.row_id = row_id

    def load(self) -> dict | None:
        res = (
            self.sb.table("gc_auth_tokens")
            .select("*")
            .eq("id", self.row_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        row = rows[0]
        return {
            "accessToken": row.get("access_token") or "",
            "accessExpires": row.get("access_expires") or 0,
            "refreshToken": row.get("refresh_token") or "",
            "refreshExpires": row.get("refresh_expires") or 0,
            "deviceId": row.get("device_id") or "",
        }

    def save(self, data: dict) -> None:
        row = {
            "id": self.row_id,
            "access_token": data.get("accessToken"),
            "access_expires": data.get("accessExpires"),
            "refresh_token": data.get("refreshToken"),
            "refresh_expires": data.get("refreshExpires"),
            "device_id": data.get("deviceId"),
            "updated_at": "now()",
        }
        self.sb.table("gc_auth_tokens").upsert(row, on_conflict="id").execute()
