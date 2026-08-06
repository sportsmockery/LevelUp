"""Hudl video downloader for LevelUp match film.

Logs into Hudl, walks one or more video / library URLs, extracts the direct
MP4 (or HLS) source from the page's embedded JSON metadata, and saves each
angle to a local directory using clean, predictable filenames. Intended for
pulling game / match footage you are entitled to download into the LevelUp
analysis pipeline.

Only use this on accounts and footage you are entitled to download.

Install:
    pip install -r scripts/requirements-hudl.txt
    # ffmpeg is only needed for the HLS fallback path:
    #   apt-get install ffmpeg   (or)   brew install ffmpeg

Usage:
    # Credentials via env (preferred — keeps them out of shell history)
    export HUDL_EMAIL=you@example.com
    export HUDL_PASSWORD='secret'
    python scripts/hudl_downloader.py --out ./hudl_archive \
        https://www.hudl.com/video/3/12345/abcdef0123

    # Credentials via flags
    python scripts/hudl_downloader.py \
        --email you@example.com --password 'secret' \
        --out ./hudl_archive \
        https://www.hudl.com/video/3/12345/abcdef0123

    # Bulk: one URL per line in a file
    python scripts/hudl_downloader.py --out ./hudl_archive --urls-file urls.txt

Notes:
    Hudl's page structure is undocumented and changes occasionally. This script
    is defensive — it walks every JSON blob it can find and looks for any of the
    known URL / title / angle keys — but if Hudl renames things you may need to
    extend MP4_KEYS / HLS_KEYS / ANGLE_KEYS / TITLE_KEYS / DATE_KEYS below.

    Accounts protected by MFA / SSO can't be driven by the form-post login flow
    alone. For those, log in with a real browser and pass the resulting cookies
    via --cookies cookies.txt (Netscape format) instead of --email/--password.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from http.cookiejar import MozillaCookieJar
from pathlib import Path
from typing import Iterable, Optional

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover - dependency hint
    sys.exit(
        "Missing dependencies. Install with:\n"
        "    pip install -r scripts/requirements-hudl.txt"
    )


# --- Tunable key lists -------------------------------------------------------
# If Hudl renames fields, extend these. Matching is case-insensitive.
MP4_KEYS = ("mp4Url", "mp4", "progressiveUrl", "downloadUrl", "videoUrl", "src", "url", "file")
HLS_KEYS = ("hlsUrl", "m3u8Url", "manifestUrl", "playlistUrl", "streamUrl")
ANGLE_KEYS = ("angles", "clipAngles", "videoAngles", "cameraAngles")
TITLE_KEYS = ("title", "name", "displayName", "gameTitle", "eventName")
DATE_KEYS = ("date", "gameDate", "eventDate", "createdDate", "startDate", "scheduledDate")
ANGLE_NAME_KEYS = ("angleName", "name", "label", "displayName", "type", "camera")
WIDTH_KEYS = ("width", "videoWidth", "resolutionWidth")
HEIGHT_KEYS = ("height", "videoHeight", "resolutionHeight", "resolution", "quality")

LOGIN_URL = "https://www.hudl.com/login"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

_MP4_RE = re.compile(r"https?://[^\s\"'<>\\]+\.mp4[^\s\"'<>\\]*", re.IGNORECASE)
_HLS_RE = re.compile(r"https?://[^\s\"'<>\\]+\.m3u8[^\s\"'<>\\]*", re.IGNORECASE)


# --- Data model --------------------------------------------------------------
@dataclass
class VideoSource:
    """A single playable angle for one video, with its best rendition chosen."""

    title: str
    date: Optional[str]          # ISO YYYY-MM-DD if parseable, else None
    angle: str
    url: str
    is_hls: bool
    quality: str = "src"         # e.g. "1080p", "720p", or "src" if unknown

    def filename(self) -> str:
        date_part = self.date or "undated"
        parts = [date_part, self.title, self.angle, self.quality]
        stem = "_".join(_sanitize(p) for p in parts if p)
        return f"{stem}.mp4"


# --- Helpers -----------------------------------------------------------------
def _sanitize(value: str) -> str:
    """Reduce a component to [A-Za-z0-9._-], collapsing runs of other chars."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", str(value)).strip("-_.")
    return cleaned or "unknown"


def _ci_get(d: dict, keys: Iterable[str]):
    """Case-insensitive first-match lookup of any of `keys` in dict `d`."""
    lowered = {k.lower(): v for k, v in d.items() if isinstance(k, str)}
    for key in keys:
        val = lowered.get(key.lower())
        if val not in (None, "", [], {}):
            return val
    return None


def _walk(obj):
    """Yield every dict found anywhere inside a nested JSON structure."""
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from _walk(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk(item)


def _normalize_date(raw) -> Optional[str]:
    """Best-effort parse of a date-ish value into ISO YYYY-MM-DD."""
    if not raw:
        return None
    text = str(raw).strip()
    # Already ISO-ish — take the leading date.
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return m.group(0)
    for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%B %d, %Y", "%b %d, %Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Epoch milliseconds / seconds.
    if text.isdigit():
        ts = int(text)
        if ts > 10_000_000_000:  # ms
            ts //= 1000
        try:
            return datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
        except (ValueError, OverflowError):
            return None
    return None


def _quality_label(node: dict, url: str) -> str:
    """Derive a human quality tag like '1080p' from a rendition node or URL."""
    height = _ci_get(node, HEIGHT_KEYS)
    if isinstance(height, str):
        m = re.search(r"(\d{3,4})\s*p?", height)
        height = int(m.group(1)) if m else None
    if isinstance(height, (int, float)) and height:
        return f"{int(height)}p"
    m = re.search(r"(\d{3,4})[pP](?:[^0-9]|$)", url)
    if m:
        return f"{m.group(1)}p"
    return "src"


def _rendition_score(is_hls: bool, quality: str) -> tuple:
    """Rank renditions: progressive MP4 over HLS, then higher resolution."""
    m = re.match(r"(\d+)p", quality)
    res = int(m.group(1)) if m else 0
    return (0 if is_hls else 1, res)


# --- Hudl client -------------------------------------------------------------
class HudlClient:
    def __init__(self, timeout: int = 30):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.timeout = timeout

    def load_cookies(self, path: Path) -> None:
        """Reuse cookies exported from a browser (Netscape/Mozilla format)."""
        jar = MozillaCookieJar(str(path))
        jar.load(ignore_discard=True, ignore_expires=True)
        self.session.cookies.update(jar)

    def login(self, email: str, password: str) -> None:
        """Form-post login flow.

        Hits the login page, follows the redirect to identity.hudl.com, parses
        the OAuth form (preserving hidden state / CSRF fields), and posts
        credentials. The resulting session cookie is reused for every request.
        """
        resp = self.session.get(LOGIN_URL, timeout=self.timeout)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        form = soup.find("form")
        if form is None:
            raise RuntimeError(
                "Could not find a login form. The login page may have changed, "
                "or the account uses SSO/MFA — use --cookies instead."
            )

        # Resolve the form's POST target relative to the page we landed on.
        action = form.get("action") or resp.url
        post_url = requests.compat.urljoin(resp.url, action)

        # Preserve every hidden field (CSRF token, OAuth state, return URL, ...).
        payload = {}
        for inp in form.find_all("input"):
            name = inp.get("name")
            if name:
                payload[name] = inp.get("value", "")

        # Fill the credential fields by best-known names, with fallbacks.
        payload.update(self._credential_fields(form, email, password))

        post = self.session.post(
            post_url, data=payload, timeout=self.timeout, allow_redirects=True
        )
        post.raise_for_status()

        if not self._looks_logged_in(post):
            raise RuntimeError(
                "Login appears to have failed (no session established). Check "
                "credentials, or use --cookies for SSO/MFA-protected accounts."
            )

    @staticmethod
    def _credential_fields(form, email: str, password: str) -> dict:
        """Map email/password onto the form's actual field names."""
        fields = {}
        email_name = password_name = None
        for inp in form.find_all("input"):
            itype = (inp.get("type") or "").lower()
            name = inp.get("name") or ""
            if itype == "password" and not password_name:
                password_name = name
            elif itype in ("email", "text") and not email_name:
                if re.search(r"email|user|login", name, re.IGNORECASE) or itype == "email":
                    email_name = name
        fields[email_name or "username"] = email
        fields[password_name or "password"] = password
        return fields

    def _looks_logged_in(self, resp) -> bool:
        """Heuristic: a session cookie was set and we're off the login page."""
        cookie_names = {c.name.lower() for c in self.session.cookies}
        has_session = any(
            "session" in n or "auth" in n or "hudl" in n for n in cookie_names
        )
        on_login_page = "login" in resp.url.lower() or "identity.hudl.com" in resp.url.lower()
        return has_session and not on_login_page

    def fetch_page(self, url: str) -> str:
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp.text


# --- Metadata extraction -----------------------------------------------------
def _extract_json_blobs(html: str) -> list:
    """Pull embedded JSON objects out of the page's <script> tags."""
    soup = BeautifulSoup(html, "html.parser")
    blobs = []

    # 1. __NEXT_DATA__ and any application/json script tags.
    for tag in soup.find_all("script"):
        tid = (tag.get("id") or "").lower()
        ttype = (tag.get("type") or "").lower()
        if tid == "__next_data__" or ttype == "application/json":
            text = tag.string or tag.get_text()
            if text:
                try:
                    blobs.append(json.loads(text))
                except json.JSONDecodeError:
                    pass

    # 2. Inline `window.__SOMETHING__ = {...};` assignments (Apollo, Redux, ...).
    for tag in soup.find_all("script"):
        text = tag.string or tag.get_text() or ""
        for m in re.finditer(
            r"window\.__[A-Z0-9_]+__\s*=\s*(\{.*?\})\s*;?\s*$",
            text,
            re.DOTALL | re.MULTILINE,
        ):
            parsed = _loads_lenient(m.group(1))
            if parsed is not None:
                blobs.append(parsed)

    return blobs


def _loads_lenient(text: str):
    """Parse a JSON object, trimming trailing junk after a balanced close."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    depth = 0
    for i, ch in enumerate(text):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[: i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _best_url_from_node(node: dict):
    """Return (url, is_hls, quality) for the best playable source in a node."""
    mp4 = _ci_get(node, MP4_KEYS)
    if isinstance(mp4, str) and _MP4_RE.search(mp4):
        return mp4, False, _quality_label(node, mp4)
    hls = _ci_get(node, HLS_KEYS)
    if isinstance(hls, str) and _HLS_RE.search(hls):
        return hls, True, _quality_label(node, hls)
    # A generic 'url'/'src' that happens to be a media link.
    generic = _ci_get(node, ("url", "src", "file"))
    if isinstance(generic, str):
        if _MP4_RE.search(generic):
            return generic, False, _quality_label(node, generic)
        if _HLS_RE.search(generic):
            return generic, True, _quality_label(node, generic)
    return None


def extract_sources(html: str) -> list:
    """Parse a Hudl video page into a list of VideoSource (one per angle)."""
    blobs = _extract_json_blobs(html)

    title = "Hudl_Video"
    date = None
    for blob in blobs:
        for node in _walk(blob):
            if title == "Hudl_Video":
                t = _ci_get(node, TITLE_KEYS)
                if isinstance(t, str) and t.strip():
                    title = t.strip()
            if date is None:
                date = _normalize_date(_ci_get(node, DATE_KEYS))
            if title != "Hudl_Video" and date:
                break

    # Collect angle nodes: prefer explicit angle arrays; fall back to any node
    # that directly carries a playable URL.
    angle_entries = []  # (angle_name, best_rendition_tuple)
    seen_urls = set()

    def consider(angle_name: str, node: dict):
        best = _best_url_from_node(node)
        if not best:
            return
        url, is_hls, quality = best
        if url in seen_urls:
            return
        seen_urls.add(url)
        angle_entries.append((angle_name, url, is_hls, quality))

    for blob in blobs:
        for node in _walk(blob):
            angles = _ci_get(node, ANGLE_KEYS)
            if isinstance(angles, list):
                for idx, angle in enumerate(angles):
                    if not isinstance(angle, dict):
                        continue
                    name = _ci_get(angle, ANGLE_NAME_KEYS) or f"Angle{idx + 1}"
                    # The playable URL may be on the angle or a nested rendition.
                    best_on_angle = _best_url_from_node(angle)
                    if best_on_angle:
                        consider(str(name), angle)
                    else:
                        for sub in _walk(angle):
                            consider(str(name), sub)

    # Fallback: no angle arrays found, but media URLs exist somewhere.
    if not angle_entries:
        for blob in blobs:
            for node in _walk(blob):
                consider("Main", node)

    # Last-ditch: regex the raw HTML for media URLs.
    if not angle_entries:
        for m in _MP4_RE.finditer(html):
            url = m.group(0)
            if url not in seen_urls:
                seen_urls.add(url)
                angle_entries.append(("Main", url, False, "src"))
        if not angle_entries:
            for m in _HLS_RE.finditer(html):
                url = m.group(0)
                if url not in seen_urls:
                    seen_urls.add(url)
                    angle_entries.append(("Main", url, True, "src"))

    # Keep the single best rendition per angle name.
    best_by_angle = {}
    for name, url, is_hls, quality in angle_entries:
        score = _rendition_score(is_hls, quality)
        prev = best_by_angle.get(name)
        if prev is None or score > prev[0]:
            best_by_angle[name] = (score, url, is_hls, quality)

    sources = [
        VideoSource(
            title=title,
            date=date,
            angle=name,
            url=url,
            is_hls=is_hls,
            quality=quality,
        )
        for name, (_, url, is_hls, quality) in best_by_angle.items()
    ]
    return sources


# --- Download ----------------------------------------------------------------
def download_source(client: HudlClient, source: VideoSource, out_dir: Path,
                    overwrite: bool = False) -> Optional[Path]:
    """Download one VideoSource into out_dir. Returns the saved path, or None."""
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / source.filename()

    if dest.exists() and not overwrite:
        print(f"  - skip (exists): {dest.name}")
        return dest

    if source.is_hls:
        return _download_hls(client, source, dest)
    return _download_mp4(client, source, dest)


def _download_mp4(client: HudlClient, source: VideoSource, dest: Path) -> Optional[Path]:
    """Stream an MP4 with HTTP Range resume support."""
    part = dest.with_suffix(dest.suffix + ".part")
    existing = part.stat().st_size if part.exists() else 0
    headers = {"Range": f"bytes={existing}-"} if existing else {}

    with client.session.get(
        source.url, headers=headers, stream=True, timeout=client.timeout
    ) as resp:
        if existing and resp.status_code == 200:
            # Server ignored the Range header; restart from scratch.
            existing = 0
            part.unlink(missing_ok=True)
        elif existing and resp.status_code == 416:
            # Already have the whole file.
            part.rename(dest)
            print(f"  - done (resumed complete): {dest.name}")
            return dest
        resp.raise_for_status()

        total = int(resp.headers.get("Content-Length", 0)) + existing
        mode = "ab" if existing else "wb"
        downloaded = existing
        with open(part, mode) as fh:
            for chunk in resp.iter_content(chunk_size=1 << 20):
                if chunk:
                    fh.write(chunk)
                    downloaded += len(chunk)
                    _progress(dest.name, downloaded, total)
    print()
    part.rename(dest)
    print(f"  - saved: {dest.name}")
    return dest


def _download_hls(client: HudlClient, source: VideoSource, dest: Path) -> Optional[Path]:
    """Mux an HLS manifest into an MP4 via ffmpeg, passing session cookies."""
    if shutil.which("ffmpeg") is None:
        print("  ! ffmpeg not found — cannot download HLS source. Install ffmpeg.")
        return None

    cookie_header = "; ".join(f"{c.name}={c.value}" for c in client.session.cookies)
    cmd = ["ffmpeg", "-y", "-loglevel", "warning"]
    headers = [f"User-Agent: {USER_AGENT}"]
    if cookie_header:
        headers.append(f"Cookie: {cookie_header}")
    cmd += ["-headers", "".join(h + "\r\n" for h in headers)]
    cmd += ["-i", source.url, "-c", "copy", "-bsf:a", "aac_adtstoasc", str(dest)]

    print(f"  - muxing HLS via ffmpeg: {dest.name}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("  ! ffmpeg failed. The signed manifest may have expired — re-run "
              "to refetch a fresh URL.")
        return None
    print(f"  - saved: {dest.name}")
    return dest


def _progress(name: str, done: int, total: int) -> None:
    if total:
        pct = done / total * 100
        bar = f"{done / 1e6:.1f}/{total / 1e6:.1f} MB ({pct:.0f}%)"
    else:
        bar = f"{done / 1e6:.1f} MB"
    sys.stdout.write(f"\r  - {name}: {bar}   ")
    sys.stdout.flush()


# --- CLI ---------------------------------------------------------------------
def _collect_urls(args) -> list:
    urls = list(args.urls)
    if args.urls_file:
        for line in Path(args.urls_file).read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)
    # De-dupe, preserve order.
    seen, ordered = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            ordered.append(u)
    return ordered


def main(argv: Optional[list] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Download Hudl match film you are entitled to access."
    )
    parser.add_argument("urls", nargs="*", help="One or more Hudl video/library URLs")
    parser.add_argument("--urls-file", help="File with one Hudl URL per line")
    parser.add_argument("--out", default="./hudl_archive", help="Output directory")
    parser.add_argument("--email", default=os.environ.get("HUDL_EMAIL"),
                        help="Hudl email (or set HUDL_EMAIL)")
    parser.add_argument("--password", default=os.environ.get("HUDL_PASSWORD"),
                        help="Hudl password (or set HUDL_PASSWORD)")
    parser.add_argument("--cookies",
                        help="Netscape cookies.txt from a logged-in browser "
                             "(use instead of email/password for SSO/MFA)")
    parser.add_argument("--overwrite", action="store_true",
                        help="Re-download even if the output file exists")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout (s)")
    args = parser.parse_args(argv)

    urls = _collect_urls(args)
    if not urls:
        parser.error("No URLs provided. Pass URLs as arguments or via --urls-file.")

    client = HudlClient(timeout=args.timeout)

    if args.cookies:
        cookie_path = Path(args.cookies)
        if not cookie_path.exists():
            parser.error(f"Cookies file not found: {cookie_path}")
        client.load_cookies(cookie_path)
        print(f"Loaded session cookies from {cookie_path}")
    elif args.email and args.password:
        print(f"Logging in as {args.email} ...")
        try:
            client.login(args.email, args.password)
        except Exception as exc:  # noqa: BLE001 - surface a clean message
            print(f"Login failed: {exc}", file=sys.stderr)
            return 2
        print("Login OK.")
    else:
        parser.error(
            "Provide credentials via --email/--password (or HUDL_EMAIL/"
            "HUDL_PASSWORD), or a browser session via --cookies."
        )

    out_dir = Path(args.out)
    total_saved, total_failed = 0, 0

    for url in urls:
        print(f"\n=== {url} ===")
        try:
            html = client.fetch_page(url)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! failed to fetch page: {exc}")
            total_failed += 1
            continue

        sources = extract_sources(html)
        if not sources:
            print("  ! no playable sources found. Hudl may have changed its page "
                  "structure — extend MP4_KEYS / HLS_KEYS / ANGLE_KEYS.")
            total_failed += 1
            continue

        print(f"  found {len(sources)} angle(s): "
              f"{', '.join(s.angle for s in sources)}")
        for source in sources:
            try:
                saved = download_source(client, source, out_dir,
                                        overwrite=args.overwrite)
                if saved:
                    total_saved += 1
                else:
                    total_failed += 1
            except Exception as exc:  # noqa: BLE001
                print(f"  ! download failed for angle '{source.angle}': {exc}")
                total_failed += 1

    print(f"\nDone. {total_saved} file(s) saved, {total_failed} failure(s). "
          f"Output: {out_dir.resolve()}")
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
