"""Seed the GameChanger token store from a fresh browser localStorage dump.

Run this once. After seeding, the daily sync auto-refreshes forever — refresh
tokens last ~14 days and rotate on each refresh, so as long as the cron runs
at least every ~13 days the store self-sustains.

Steps:
  1. Chrome on web.gc.com -> DevTools -> Application -> Local Storage.
  2. Copy the value of the `eden-auth-tokens` key (entire string).
  3. python scripts/gamechanger/seed_tokens.py
  4. Paste, press Ctrl-D.

Writes to BOTH Supabase (gc_auth_tokens) and the local tokens.json file so
that local runs and CI both pick it up.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from auth import FileTokenStore, SupabaseTokenStore, decrypt_browser_blob

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local")

TOKENS_PATH = Path(__file__).parent / "tokens.json"


def main() -> None:
    print("Paste eden-auth-tokens value, then EOF (Ctrl-D on a new line):")
    blob = sys.stdin.read().strip().strip('"').strip("'")
    if not blob or "." not in blob:
        sys.exit("Did not get a valid blob (expected '<iv>.<ciphertext>').")

    parsed = decrypt_browser_blob(blob)
    tokens = parsed.get("tokens") or {}
    access = tokens.get("accessToken") or {}
    refresh_tok = tokens.get("refreshToken") or {}
    device_id = parsed.get("deviceId")

    if not refresh_tok.get("data") or not device_id:
        sys.exit(f"Decrypted blob missing refresh token or device id: {json.dumps(parsed)[:300]}")

    data = {
        "accessToken": access.get("data", ""),
        "accessExpires": access.get("expires", 0),
        "refreshToken": refresh_tok["data"],
        "refreshExpires": refresh_tok.get("expires", 0),
        "deviceId": device_id,
    }

    # Always write the local file.
    FileTokenStore(TOKENS_PATH).save(data)
    print(f"Wrote {TOKENS_PATH}")

    # Also write to Supabase if creds are set.
    sb_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if sb_url and sb_key:
        from supabase import create_client
        sb = create_client(sb_url, sb_key)
        try:
            SupabaseTokenStore(sb).save(data)
            print("Wrote gc_auth_tokens row in Supabase")
        except Exception as e:  # noqa: BLE001
            print(f"WARN: Supabase write failed ({e}). "
                  "Apply migration 019_gc_auth_tokens.sql via the Supabase SQL editor.")
    else:
        print("(skip Supabase — set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)")

    now = int(time.time())
    print(f"\n  deviceId        {device_id}")
    print(f"  access expires  {(data['accessExpires']-now)/60:.0f} min from now")
    print(f"  refresh expires {(data['refreshExpires']-now)/86400:.1f} days from now")


if __name__ == "__main__":
    main()
