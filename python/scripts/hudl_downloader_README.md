# Hudl Video Downloader

A Python script (`scripts/hudl_downloader.py`) that logs into Hudl, walks one
or more video / library URLs, extracts the direct MP4 (or HLS) source from the
page's embedded metadata, and saves each angle to a local directory using
clean, predictable filenames. Intended for pulling match film you're entitled
to download into the LevelUp analysis pipeline.

## Install

```bash
pip install -r scripts/requirements-hudl.txt
# ffmpeg only needed for the HLS fallback path
apt-get install ffmpeg   # or: brew install ffmpeg
```

## Usage

```bash
# Credentials via env (preferred; keeps them out of shell history)
export HUDL_EMAIL=you@example.com
export HUDL_PASSWORD='secret'
python scripts/hudl_downloader.py --out ./hudl_archive \
  https://www.hudl.com/video/3/12345/abcdef0123 \
  https://www.hudl.com/video/3/12345/fedcba9876

# Credentials via flags
python scripts/hudl_downloader.py \
  --email you@example.com --password 'secret' \
  --out ./hudl_archive \
  https://www.hudl.com/video/3/12345/abcdef0123

# Bulk: one URL per line in a file
python scripts/hudl_downloader.py --out ./hudl_archive --urls-file urls.txt

# SSO / MFA accounts: log in with a browser, export cookies.txt (Netscape
# format), and reuse that session instead of email/password.
python scripts/hudl_downloader.py --out ./hudl_archive --cookies cookies.txt \
  https://www.hudl.com/video/3/12345/abcdef0123
```

## How it works

1. **Login** — hits `https://www.hudl.com/login`, follows the redirect to
   `identity.hudl.com`, parses the OAuth form (including any hidden state /
   CSRF fields), and posts credentials. The session cookie that comes back is
   reused for every subsequent request. For SSO/MFA accounts, pass an exported
   browser session with `--cookies` instead.
2. **Metadata extraction** — for each video URL, the page HTML is parsed and
   embedded JSON blobs (`__NEXT_DATA__`, Apollo state, inline `window.__*__`
   assignments, `application/json` script tags) are scanned. Title, game date,
   and a list of angles with their playable URLs are pulled from the blob — no
   DOM scraping, so the script is resilient to visual layout changes.
3. **Multi-angle handling** — Hudl's library entries expose an `angles` (or
   `clipAngles`) array. The script emits one `VideoSource` per angle and picks
   the best rendition for each (progressive MP4 preferred over HLS, higher
   resolution preferred within a kind).
4. **Download** — MP4s are streamed with HTTP `Range` resume support. If only
   an HLS manifest is available, the script shells out to `ffmpeg` to mux it
   into an MP4 (passing session cookies through so signed playlists keep
   working).
5. **Filenames** — `<YYYY-MM-DD>_<Title>_<Angle>_<Quality>.mp4`, with each
   component sanitized to `[A-Za-z0-9._-]`. Example:
   `2025-09-12_Varsity_vs_Maine-South_Endzone_1080p.mp4`.

## Notes & caveats

- Hudl's page structure is undocumented and changes occasionally. The script
  is defensive — it walks every JSON blob it finds and looks for any of the
  known URL/title/angle keys — but if Hudl renames things you may need to
  extend `MP4_KEYS` / `HLS_KEYS` / `ANGLE_KEYS` (and the `*_KEYS` siblings)
  near the top of the file.
- Accounts protected by MFA / SSO can't be driven by the form-post flow alone.
  For those, log in with a real browser, export the cookies (Netscape format),
  and pass them via `--cookies cookies.txt`.
- Some clips are stream-only (no progressive MP4, manifest signed for short
  windows). Those will be muxed via ffmpeg; if the manifest URL has expired
  by the time ffmpeg starts, re-run — the script will refetch the page and
  pick up a fresh signed URL.
- Only use this on accounts and footage you're entitled to download.
