"""
GameChanger -> Supabase sync.

Env vars (in .env.local at project root):
  GC_TEAM_IDS                      comma-separated public_ids
                                   (or GC_TEAM_ID for a single team)
  GC_TOKEN                         JWT from web app; required for stats
  GC_DEVICE_ID                     required when GC_TOKEN is set
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  python scripts/gamechanger/sync.py
  python scripts/gamechanger/sync.py --probe       # explore endpoints
  python scripts/gamechanger/sync.py --teams       # list /me/teams
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import Client, create_client

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local")

GC_BASE = "https://api.team-manager.gc.com"
PROBE_DIR = ROOT / "scripts" / "gamechanger" / "probes"

WEB_HEADERS = {
    "gc-app-name": "web",
    "origin": "https://web.gc.com",
    "referer": "https://web.gc.com/",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    ),
    "accept": "application/json",
    "accept-language": "en-US,en;q=0.9",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def env(name: str, *, required: bool = True) -> str:
    val = os.getenv(name)
    if required and not val:
        sys.exit(f"Missing env var: {name} (set it in .env.local)")
    return val or ""


def get_team_ids() -> list[str]:
    ids = os.getenv("GC_TEAM_IDS") or os.getenv("GC_TEAM_ID")
    if not ids:
        sys.exit("Missing GC_TEAM_IDS (comma-separated) or GC_TEAM_ID in .env.local")
    return [s.strip() for s in ids.split(",") if s.strip()]


def decode_jwt_payload(token: str) -> dict[str, Any] | None:
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        return None


def check_token_freshness(token: str) -> None:
    payload = decode_jwt_payload(token)
    if not payload or "exp" not in payload:
        return
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    remaining = (exp - datetime.now(timezone.utc)).total_seconds()
    if remaining <= 0:
        sys.exit(f"GC_TOKEN expired {-remaining/60:.0f} min ago. Re-capture from DevTools.")
    print(f"  token ok, expires in {remaining/60:.0f} min ({payload.get('email')})")


def gc_get(path: str, *, accept: str | None = None, token: str | None = None,
           device_id: str | None = None, extra: dict[str, str] | None = None,
           url_override: str | None = None) -> tuple[int, Any, dict]:
    headers = dict(WEB_HEADERS)
    if accept:
        headers["accept"] = accept
    if token:
        headers["gc-token"] = token
    if device_id:
        headers["gc-device-id"] = device_id
    if extra:
        headers.update(extra)
    url = url_override or f"{GC_BASE}{path}"
    r = requests.get(url, headers=headers, timeout=30)
    try:
        body = r.json()
    except ValueError:
        body = {"_non_json_body": r.text[:2000]}
    return r.status_code, body, dict(r.headers)


def fetch_my_teams(token: str, device_id: str) -> list[dict]:
    """Page through /me/teams and return all teams."""
    all_teams: list[dict] = []
    url = f"{GC_BASE}/me/teams?include=user_team_associations"
    while url:
        status, body, headers = gc_get(
            path="",
            accept="application/vnd.gc.com.team:list+json; version=0.10.0",
            token=token, device_id=device_id,
            extra={"x-pagination": "true"},
            url_override=url,
        )
        if status != 200 or not isinstance(body, list):
            print(f"  /me/teams page failed: HTTP {status}")
            break
        all_teams.extend(body)
        url = headers.get("x-next-page")
        if not body:
            break
    return all_teams


# ---------- upserts ----------

def upsert_team(sb: Client, public_id: str, internal_uuid: str,
                public_payload: dict, my_team: dict | None) -> str:
    location = public_payload.get("location") or {}
    season = public_payload.get("team_season") or {}
    raw = {
        **public_payload,
        "_internal_uuid": internal_uuid,
        "_my_team_meta": my_team,
    }
    row = {
        "gc_id": public_id,
        "name": public_payload.get("name") or (my_team or {}).get("name", "Unknown"),
        "sport": public_payload.get("sport") or (my_team or {}).get("sport"),
        "level": public_payload.get("age_group") or (my_team or {}).get("age_group"),
        "raw": raw,
        "updated_at": now_iso(),
    }
    res = sb.table("gc_teams").upsert(row, on_conflict="gc_id").execute()
    return res.data[0]["id"]


def upsert_players(sb: Client, team_uuid: str, players: list[dict]) -> dict[str, str]:
    """Returns gc_player_id -> supabase player UUID map."""
    if not players:
        return {}
    rows = []
    for p in players:
        gc_pid = p.get("id")
        if not gc_pid:
            continue
        bats = p.get("bats") or {}
        rows.append({
            "gc_id": gc_pid,
            "team_id": team_uuid,
            "first_name": p.get("first_name"),
            "last_name": p.get("last_name"),
            "jersey_number": _maybe_int(p.get("number")),
            "position": None,
            "bats": bats.get("batting_side"),
            "throws": bats.get("throwing_hand"),
            "raw": p,
            "updated_at": now_iso(),
        })
    res = sb.table("gc_players").upsert(rows, on_conflict="gc_id").execute()
    return {r["gc_id"]: r["id"] for r in res.data}


def _maybe_int(v) -> int | None:
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def format_result(score: dict | None) -> str | None:
    if not score: return None
    team, opp = score.get("team"), score.get("opponent_team")
    if team is None or opp is None: return None
    verdict = "W" if team > opp else ("L" if team < opp else "T")
    return f"{verdict} {team}-{opp}"


def upsert_games(sb: Client, team_uuid: str, games: list[dict]) -> int:
    rows = []
    for g in games:
        gc_id = g.get("id")
        if not gc_id: continue
        start_ts = g.get("start_ts")
        rows.append({
            "gc_id": gc_id,
            "team_id": team_uuid,
            "opponent": (g.get("opponent_team") or {}).get("name"),
            "date": start_ts.split("T")[0] if start_ts else None,
            "home_away": g.get("home_away"),
            "result": format_result(g.get("score")),
            "raw": g,
            "updated_at": now_iso(),
        })
    if not rows: return 0
    sb.table("gc_games").upsert(rows, on_conflict="gc_id").execute()
    return len(rows)


# Field maps from GC stat keys to our column names.
BATTING_MAP = {
    "AB": "at_bats", "H": "hits", "2B": "doubles", "3B": "triples", "HR": "home_runs",
    "RBI": "rbi", "BB": "base_on_balls", "SO": "strikeouts", "SB": "stolen_bases",
    "CS": "caught_stealing", "SHF": "sacrifice_flies", "SHB": "sacrifice_hits",
    "HBP": "hit_by_pitch",
}
PITCHING_MAP = {
    "IP": "innings_pitched", "H": "hits_allowed", "R": "runs_allowed",
    "ER": "earned_runs", "BB": "base_on_balls_allowed", "SO": "strikeouts_pitched",
    "WP": "wild_pitches", "BK": "balks", "HBP": "hit_by_pitch_allowed",
}
FIELDING_MAP = {
    "PO": "putouts", "A": "assists", "E": "errors", "DP": "double_plays",
}


def upsert_season_stats(sb: Client, gc_to_uuid: dict[str, str],
                        season: dict) -> tuple[int, int, int]:
    """Returns (batting_rows, pitching_rows, fielding_rows) counts."""
    players_block = (season.get("stats_data") or {}).get("players") or {}
    bat, pit, fld = [], [], []
    for gc_pid, entry in players_block.items():
        player_uuid = gc_to_uuid.get(gc_pid)
        if not player_uuid:
            continue
        stats = entry.get("stats") or {}
        offense = stats.get("offense") or {}
        defense = stats.get("defense") or {}

        if offense:
            row = {"player_id": player_uuid, "game_id": None, "is_season_total": True,
                   "raw": offense, "updated_at": now_iso()}
            for src, dst in BATTING_MAP.items():
                v = offense.get(src)
                if v is not None:
                    row[dst] = v
            bat.append(row)

        if defense:
            # Pitching: only insert if the player actually pitched (has IP or BF).
            ip = defense.get("IP")
            bf = defense.get("BF")
            if (ip and ip > 0) or (bf and bf > 0):
                prow = {"player_id": player_uuid, "game_id": None, "is_season_total": True,
                        "raw": defense, "updated_at": now_iso()}
                for src, dst in PITCHING_MAP.items():
                    v = defense.get(src)
                    if v is not None:
                        prow[dst] = v
                pit.append(prow)
            # Fielding: insert for everyone who has any defensive activity
            tc = defense.get("TC")  # total chances
            if tc and tc > 0:
                frow = {"player_id": player_uuid, "game_id": None, "is_season_total": True,
                        "raw": defense, "updated_at": now_iso()}
                for src, dst in FIELDING_MAP.items():
                    v = defense.get(src)
                    if v is not None:
                        frow[dst] = v
                fld.append(frow)

    if bat:
        sb.table("gc_batting_stats").upsert(bat, on_conflict="player_id,game_id,is_season_total").execute()
    if pit:
        sb.table("gc_pitching_stats").upsert(pit, on_conflict="player_id,game_id,is_season_total").execute()
    if fld:
        sb.table("gc_fielding_stats").upsert(fld, on_conflict="player_id,game_id,is_season_total").execute()
    return len(bat), len(pit), len(fld)


# ---------- main flows ----------

def sync_one_team(sb: Client, public_id: str, my_teams_index: dict[str, dict],
                  token: str, device_id: str) -> None:
    my_team = my_teams_index.get(public_id)
    if not my_team:
        print(f"  {public_id}: not in your /me/teams list — skipping (not authorized?)")
        return
    internal_uuid = my_team["id"]
    name = my_team.get("name", "?")
    print(f"\n=== {name}  (short={public_id}, uuid={internal_uuid}) ===")

    # Public team profile (no auth needed)
    status, public_team, _ = gc_get(
        f"/public/teams/{public_id}",
        accept="application/vnd.gc.com.public_team_profile+json; version=0.1.0",
    )
    if status != 200:
        print(f"  public team fetch failed HTTP {status}; falling back to /me/teams data")
        public_team = {}

    team_uuid = upsert_team(sb, public_id, internal_uuid, public_team, my_team)
    print(f"  team upserted ({team_uuid})")

    # Games via public endpoint (richer score data than /schedule)
    status, games, _ = gc_get(f"/public/teams/{public_id}/games")
    if status == 200 and isinstance(games, list):
        n = upsert_games(sb, team_uuid, games)
        print(f"  {n} games upserted")
    else:
        print(f"  games fetch HTTP {status}")

    # Roster (auth required, UUID required)
    status, players, _ = gc_get(f"/teams/{internal_uuid}/players",
                                token=token, device_id=device_id)
    if status != 200 or not isinstance(players, list):
        print(f"  players fetch failed HTTP {status}")
        return
    gc_to_uuid = upsert_players(sb, team_uuid, players)
    print(f"  {len(gc_to_uuid)} players upserted")

    # Season stats (auth required, UUID required)
    status, season, _ = gc_get(f"/teams/{internal_uuid}/season-stats",
                               token=token, device_id=device_id)
    if status != 200 or not isinstance(season, dict):
        print(f"  season-stats fetch failed HTTP {status}")
        return
    b, p, f = upsert_season_stats(sb, gc_to_uuid, season)
    print(f"  season stats: {b} batting, {p} pitching, {f} fielding")


def cmd_sync(token: str, device_id: str, supabase_url: str, service_key: str,
             team_public_ids: list[str]) -> None:
    sb = create_client(supabase_url, service_key)
    print("Fetching /me/teams index...")
    my_teams = fetch_my_teams(token, device_id)
    index = {t["public_id"]: t for t in my_teams if t.get("public_id")}
    print(f"  indexed {len(index)} teams from your account")
    for pid in team_public_ids:
        sync_one_team(sb, pid, index, token, device_id)


def cmd_teams(token: str, device_id: str) -> None:
    teams = fetch_my_teams(token, device_id)
    for t in teams:
        print(f"  {t.get('public_id')}  {t.get('id')}  "
              f"{t.get('season_year')}  {t.get('name')}  "
              f"assoc={t.get('user_team_associations')}  "
              f"archived={t.get('archived')}")


def cmd_probe(team_public_id: str, token: str, device_id: str) -> None:
    PROBE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    my_teams = fetch_my_teams(token, device_id)
    match = next((t for t in my_teams if t.get("public_id") == team_public_id), None)
    if not match:
        sys.exit(f"team {team_public_id} not in /me/teams")
    uuid = match["id"]
    paths = [
        f"/public/teams/{team_public_id}",
        f"/public/teams/{team_public_id}/games",
        f"/teams/{uuid}",
        f"/teams/{uuid}/players",
        f"/teams/{uuid}/season-stats",
        f"/teams/{uuid}/schedule",
    ]
    print(f"\nprobing {team_public_id} ({uuid}):")
    for p in paths:
        status, body, _ = gc_get(p, token=token, device_id=device_id)
        out = PROBE_DIR / f"{stamp}_{p.replace('/','_').strip('_')}.json"
        out.write_text(json.dumps({"status": status, "path": p, "body": body}, indent=2))
        preview = json.dumps(body)[:70].replace("\n", " ")
        print(f"  {status} {p:55s} {preview}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", metavar="PUBLIC_ID", nargs="?", const="__first__",
                    help="Probe endpoints for one team (defaults to first GC_TEAM_IDS)")
    ap.add_argument("--teams", action="store_true", help="List your teams")
    args = ap.parse_args()

    token = env("GC_TOKEN")
    device_id = env("GC_DEVICE_ID")
    check_token_freshness(token)

    if args.teams:
        cmd_teams(token, device_id)
        return

    team_ids = get_team_ids()

    if args.probe is not None:
        pid = args.probe if args.probe != "__first__" else team_ids[0]
        cmd_probe(pid, token, device_id)
        return

    cmd_sync(token, device_id,
             env("NEXT_PUBLIC_SUPABASE_URL"),
             env("SUPABASE_SERVICE_ROLE_KEY"),
             team_ids)


if __name__ == "__main__":
    main()
