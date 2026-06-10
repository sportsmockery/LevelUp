import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { promises as fs, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

export const runtime = 'nodejs';
export const maxDuration = 300;

const FRAME_COUNT = 16;
const TARGET_W = 768;
const FFMPEG_TIMEOUT_MS = 120_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Resolve the ffmpeg binary at runtime. After bundling, ffmpeg-static's
// exported path can point at a non-existent location (e.g. /ROOT/...), so we
// verify it exists and fall back to the real node_modules path under cwd.
function resolveFfmpegPath(): string {
  const exported = (ffmpegStatic as unknown as string) || '';
  const candidates = [
    exported,
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    exported ? path.join(process.cwd(), 'node_modules', 'ffmpeg-static', path.basename(exported)) : '',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (existsSync(c)) return c;
    } catch {
      /* keep looking */
    }
  }
  return exported || 'ffmpeg';
}

const ffmpegPath = resolveFfmpegPath();

type Auth = { cookie: string; referer: string };

// HTTP options ffmpeg should apply to every request for an input (manifest +
// every HLS segment). Passing the browser session cookie + referer lets it
// read a private, login-gated stream the user is authorized to view.
function ffmpegInputPrefix(auth: Auth): string[] {
  const headerLines: string[] = [];
  if (auth.cookie) headerLines.push(`Cookie: ${auth.cookie}`);
  if (auth.referer) headerLines.push(`Referer: ${auth.referer}`);
  const prefix = ['-user_agent', BROWSER_UA];
  if (headerLines.length > 0) prefix.push('-headers', headerLines.join('\r\n') + '\r\n');
  return prefix;
}

type RunResult = { code: number | null; stdout: Buffer; stderr: string };

function runFfmpeg(args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('ffmpeg timed out while reading the video.'));
    }, FFMPEG_TIMEOUT_MS);

    child.stdout.on('data', (d: Buffer) => stdoutChunks.push(d));
    child.stderr.on('data', (d: Buffer) => {
      // Cap retained stderr so a chatty log can't grow unbounded.
      if (stderr.length < 64_000) stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(stdoutChunks), stderr });
    });
  });
}

// Parse "Duration: HH:MM:SS.ms" out of ffmpeg's stderr.
function parseDuration(stderr: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(stderr);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3]);
  const total = h * 3600 + min * 60 + s;
  return isFinite(total) && total > 0 ? total : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Best-effort: if the URL serves an HTML page, look for a directly-playable
// media URL (.m3u8 / .mp4) embedded in it. This will NOT defeat sites that
// gate their streams behind authentication (e.g. Hudl player pages).
async function resolveMediaUrl(url: string, auth: Auth): Promise<{ mediaUrl: string; note?: string }> {
  const fetchHeaders: Record<string, string> = { 'User-Agent': BROWSER_UA, Accept: '*/*' };
  if (auth.cookie) fetchHeaders.Cookie = auth.cookie;
  if (auth.referer) fetchHeaders.Referer = auth.referer;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: fetchHeaders,
      redirect: 'follow',
    });
  } catch {
    // Could not even fetch it — let ffmpeg try the original URL directly.
    return { mediaUrl: url };
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');

  if (!isHtml) {
    // Treat as a direct media URL (video/*, application/vnd.apple.mpegurl, etc.)
    return { mediaUrl: url };
  }

  const buf = await res.arrayBuffer();
  const html = Buffer.from(buf.slice(0, MAX_HTML_BYTES)).toString('utf8');
  const candidate =
    /https?:\\?\/\\?\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i.exec(html)?.[0] ||
    /https?:\\?\/\\?\/[^"'\s\\]+\.mp4[^"'\s\\]*/i.exec(html)?.[0];

  if (candidate) {
    const cleaned = candidate.replace(/\\\//g, '/');
    return { mediaUrl: cleaned, note: 'Resolved a stream URL from the page.' };
  }

  throw new Error(
    'That link is a web page, not a video file, and no playable stream URL was found in it. If it is a Hudl/YouTube player page, download the clip and use the Upload tab instead.',
  );
}

export async function POST(request: NextRequest) {
  let body: { url?: string; cookie?: string; referer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !isHttpUrl(url)) {
    return NextResponse.json({ error: 'Provide a valid http(s) video URL.' }, { status: 400 });
  }

  // Optional auth for private/login-gated streams. The cookie is used only for
  // this request and never stored or logged.
  let referer = typeof body.referer === 'string' ? body.referer.trim() : '';
  if (!referer) {
    try {
      const u = new URL(url);
      referer = `${u.protocol}//${u.host}/`;
    } catch {
      referer = '';
    }
  }
  const auth: Auth = {
    cookie: typeof body.cookie === 'string' ? body.cookie.trim() : '',
    referer,
  };

  let mediaUrl = url;
  try {
    const resolved = await resolveMediaUrl(url, auth);
    mediaUrl = resolved.mediaUrl;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not resolve the link.';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Probe duration (ffmpeg prints it to stderr; exits non-zero with no output).
  let duration: number | null = null;
  try {
    const probe = await runFfmpeg(['-hide_banner', ...ffmpegInputPrefix(auth), '-i', mediaUrl]);
    duration = parseDuration(probe.stderr);
    if (duration == null && /Server returned 4\d\d|403|401|Invalid data|No such|not found/i.test(probe.stderr)) {
      return NextResponse.json(
        {
          error:
            'Could not open the video from that URL (it may require a login or block direct access). Download the clip and use the Upload tab instead.',
        },
        { status: 422 },
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to read the video.';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oliq-'));
  try {
    // Evenly sample FRAME_COUNT frames across the clip. With a known duration we
    // derive an fps that yields ~FRAME_COUNT frames; otherwise fall back to a
    // fixed sampling rate and cap the count.
    const fpsExpr = duration && duration > 0 ? `${FRAME_COUNT}/${duration}` : '2';
    const pattern = path.join(tmpDir, 'frame_%03d.jpg');
    const extractArgs = [
      '-hide_banner',
      '-loglevel',
      'error',
      ...ffmpegInputPrefix(auth),
      '-i',
      mediaUrl,
      '-vf',
      `fps=${fpsExpr},scale=${TARGET_W}:-2:flags=lanczos`,
      '-frames:v',
      String(FRAME_COUNT),
      '-q:v',
      '4',
      '-y',
      pattern,
    ];

    const result = await runFfmpeg(extractArgs);

    let files = (await fs.readdir(tmpDir)).filter((f) => f.endsWith('.jpg')).sort();
    if (files.length === 0) {
      return NextResponse.json(
        {
          error: `Could not extract frames from the video. ${result.stderr.split('\n').filter(Boolean).pop() || ''}`.trim(),
        },
        { status: 422 },
      );
    }

    files = files.slice(0, FRAME_COUNT);
    const frames: string[] = [];
    for (const f of files) {
      const data = await fs.readFile(path.join(tmpDir, f));
      frames.push(`data:image/jpeg;base64,${data.toString('base64')}`);
    }

    return NextResponse.json({ frames, framesExtracted: frames.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Frame extraction failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
