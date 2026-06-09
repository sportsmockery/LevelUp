'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Video,
  Zap,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  Shield,
  FileText,
  X,
  User,
  Pencil,
  Link as LinkIcon,
} from 'lucide-react';

type Athlete = {
  name: string;
  position: string;
  classYear: string;
  height: string;
  weight: string;
  school: string;
  notes: string;
};

type OLIQResult = {
  overall_score: number;
  position_scores: {
    pass_protection: number;
    run_blocking: number;
    footwork_leverage: number;
  };
  reasoning: {
    pass_protection: string;
    run_blocking: string;
    footwork_leverage: string;
  };
  strengths: string[];
  weaknesses: string[];
  drills: string[];
  summary: string;
  model?: string;
  framesAnalyzed?: number;
};

const FRAME_COUNT = 16;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const STORAGE_KEY = 'oliq_athlete';

const EMPTY_ATHLETE: Athlete = {
  name: '',
  position: '',
  classYear: '',
  height: '',
  weight: '',
  school: '',
  notes: '',
};

const OL_POSITIONS = ['LT', 'LG', 'C', 'RG', 'RT', 'OL'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Extract evenly-spaced frames from a video source (object URL or remote URL).
// For remote URLs we request CORS access so the canvas isn't tainted; if the
// host doesn't allow it, frame capture throws a SecurityError that we surface.
function extractFramesFromSource(
  src: string,
  count: number,
  opts: { crossOrigin: boolean; revoke: boolean },
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D not supported'));
      return;
    }
    const frames: string[] = [];
    const cleanup = () => {
      if (opts.revoke) URL.revokeObjectURL(src);
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    if (opts.crossOrigin) video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const targetW = 768;
      canvas.width = targetW;
      canvas.height = Math.round(targetW * (video.videoHeight / video.videoWidth));
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error('Could not read video duration'));
        return;
      }
      const interval = duration / (count + 1);
      let currentFrame = 0;

      const captureNext = () => {
        if (currentFrame >= count) {
          cleanup();
          resolve(frames);
          return;
        }
        video.currentTime = interval * (currentFrame + 1);
      };

      video.onseeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          cleanup();
          reject(
            new Error(
              'Could not read frames from this link. The host blocks cross-origin access (CORS). Use a direct, CORS-enabled video URL, or upload the file instead.',
            ),
          );
          return;
        }
        currentFrame++;
        captureNext();
      };

      captureNext();
    };

    video.onerror = () => {
      cleanup();
      reject(
        new Error(
          'Failed to load video from this link. Make sure it points directly to a video file (e.g. .mp4/.mov), not an embed/watch page.',
        ),
      );
    };
    video.src = src;
  });
}

function extractFrames(file: File, count: number): Promise<string[]> {
  return extractFramesFromSource(URL.createObjectURL(file), count, {
    crossOrigin: false,
    revoke: true,
  });
}

function athleteSummary(a: Athlete): string {
  const parts = [
    a.classYear && `Class of ${a.classYear}`,
    a.height,
    a.weight,
    a.school,
  ].filter(Boolean);
  return parts.join(' • ');
}

export default function OLIQPage() {
  const [athlete, setAthlete] = useState<Athlete>(EMPTY_ATHLETE);
  const [draft, setDraft] = useState<Athlete>(EMPTY_ATHLETE);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<OLIQResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Load saved athlete profile from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...EMPTY_ATHLETE, ...JSON.parse(raw) } as Athlete;
        setAthlete(parsed);
        setDraft(parsed);
        setEditingProfile(!parsed.name);
      } else {
        setEditingProfile(true);
      }
    } catch {
      setEditingProfile(true);
    }
    setProfileLoaded(true);
  }, []);

  const hasProfile = Boolean(athlete.name.trim());

  const saveProfile = () => {
    const cleaned: Athlete = {
      name: draft.name.trim(),
      position: draft.position.trim(),
      classYear: draft.classYear.trim(),
      height: draft.height.trim(),
      weight: draft.weight.trim(),
      school: draft.school.trim(),
      notes: draft.notes.trim(),
    };
    if (!cleaned.name) {
      setError('Add the athlete’s name to save the profile.');
      return;
    }
    setAthlete(cleaned);
    setEditingProfile(false);
    setError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      /* ignore storage errors */
    }
  };

  const trimmedUrl = videoUrl.trim();
  const hasVideo = inputMode === 'upload' ? Boolean(file) : trimmedUrl.length > 0;

  const handleAnalyze = useCallback(async () => {
    if (inputMode === 'upload' && !file) return;
    if (inputMode === 'link' && !trimmedUrl) return;
    setAnalyzing(true);
    setProgress(0);
    setError('');

    try {
      setStatusMessage('Extracting key frames...');
      setProgress(10);
      let frames: string[];
      if (inputMode === 'upload') {
        frames = await extractFrames(file as File, FRAME_COUNT);
      } else {
        // Direct video links are extracted on the server with ffmpeg, which can
        // read formats/streams (e.g. HLS .m3u8) the browser can't.
        const exRes = await fetch('/api/ol/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl, cookie: cookie.trim() || undefined }),
        });
        const exData = await exRes.json();
        if (!exRes.ok) {
          throw new Error(exData.error || `Could not read video from link (${exRes.status})`);
        }
        frames = exData.frames;
        if (!Array.isArray(frames) || frames.length === 0) {
          throw new Error('No frames could be extracted from that link.');
        }
      }
      setProgress(30);

      let pdfPayload: { name: string; data: string } | undefined;
      if (pdfFile) {
        setStatusMessage('Reading PDF...');
        const data = await readFileAsDataUrl(pdfFile);
        pdfPayload = { name: pdfFile.name, data };
        setProgress(40);
      }

      setStatusMessage('OLIQ is studying the tape...');
      const tick = setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 6));
      }, 600);

      const res = await fetch('/api/ol/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          prompt: prompt.trim() || undefined,
          pdf: pdfPayload,
          athlete: hasProfile ? athlete : undefined,
        }),
      });
      clearInterval(tick);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `OLIQ request failed (${res.status})`);
      }

      setProgress(100);
      setStatusMessage('Analysis complete');
      setTimeout(() => {
        setResult(data);
        setAnalyzing(false);
      }, 400);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      setError(message);
      setAnalyzing(false);
      setProgress(0);
      setStatusMessage('');
    }
  }, [inputMode, file, trimmedUrl, cookie, pdfFile, prompt, athlete, hasProfile]);

  const reset = () => {
    setFile(null);
    setVideoUrl('');
    setCookie('');
    setPdfFile(null);
    setPrompt('');
    setResult(null);
    setError('');
    setProgress(0);
    setStatusMessage('');
  };

  const handlePdfSelect = (selected: File | null) => {
    setError('');
    if (!selected) {
      setPdfFile(null);
      return;
    }
    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      setError('Attachment must be a PDF.');
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      setError(`PDF is too large (${(selected.size / 1024 / 1024).toFixed(1)} MB). Max 20 MB.`);
      return;
    }
    setPdfFile(selected);
  };

  const field = (
    key: keyof Athlete,
    label: string,
    placeholder: string,
    extra?: { type?: string; list?: string },
  ) => (
    <div>
      <label className="block text-[10px] font-medium text-zinc-500 tracking-widest mb-1">
        {label}
      </label>
      <input
        type={extra?.type || 'text'}
        list={extra?.list}
        value={draft[key]}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60"
      />
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-zinc-950 text-white">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-heading tracking-tight">OLIQ</h1>
            <p className="text-zinc-400 text-sm">AI offensive line film study</p>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="p-6">
          {/* Athlete profile */}
          {profileLoaded && (editingProfile || !hasProfile) ? (
            <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-sky-400" />
                <p className="text-sky-400 text-[10px] font-medium tracking-widest">
                  {hasProfile ? 'EDIT ATHLETE PROFILE' : 'CREATE ATHLETE PROFILE'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">{field('name', 'NAME', 'e.g., Jordan Mills')}</div>
                {field('position', 'POSITION', 'LT, LG, C, RG, RT', { list: 'ol-positions' })}
                <datalist id="ol-positions">
                  {OL_POSITIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {field('classYear', 'CLASS (GRAD YEAR)', 'e.g., 2030')}
                {field('height', 'HEIGHT', `e.g., 6'3"`)}
                {field('weight', 'WEIGHT', 'e.g., 270 lbs')}
                <div className="col-span-2">{field('school', 'SCHOOL', 'e.g., Victor J. Andrew HS')}</div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-medium text-zinc-500 tracking-widest mb-1">
                    NOTES (OPTIONAL)
                  </label>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    rows={2}
                    maxLength={500}
                    placeholder="Strengths to track, scheme (zone/gap), things to watch..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveProfile}
                  className="flex-1 bg-gradient-to-r from-sky-400 to-blue-600 text-black font-heading font-bold py-2.5 rounded-xl text-sm"
                >
                  Save Athlete
                </button>
                {hasProfile && (
                  <button
                    onClick={() => {
                      setDraft(athlete);
                      setEditingProfile(false);
                      setError('');
                    }}
                    className="px-4 bg-zinc-800 text-zinc-300 font-medium py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : profileLoaded && hasProfile ? (
            <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sky-400 text-[10px] font-medium tracking-widest mb-2">EVALUATING</p>
                  <p className="text-white font-medium text-sm">
                    {athlete.name}
                    {athlete.position ? ` — ${athlete.position}` : ''}
                  </p>
                  {athleteSummary(athlete) && (
                    <p className="text-zinc-400 text-xs mt-1">{athleteSummary(athlete)}</p>
                  )}
                  {athlete.notes && <p className="text-zinc-500 text-xs mt-1">{athlete.notes}</p>}
                </div>
                <button
                  onClick={() => {
                    setDraft(athlete);
                    setEditingProfile(true);
                  }}
                  className="flex items-center gap-1 text-zinc-400 hover:text-sky-400 text-xs shrink-0"
                  aria-label="Edit athlete profile"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>
          ) : null}

          {/* Video source: upload or link */}
          <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setInputMode('upload');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                inputMode === 'upload' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('link');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                inputMode === 'link' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              Video Link
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              className="border-2 border-dashed border-zinc-700 rounded-3xl p-10 text-center cursor-pointer hover:border-sky-500 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError('');
                }}
              />
              {file ? (
                <div className="space-y-3">
                  <Video className="w-12 h-12 mx-auto text-sky-400" />
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-zinc-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-zinc-500" />
                  <p className="text-zinc-300 font-medium">Tap to select OL film</p>
                  <p className="text-zinc-500 text-sm">MP4, MOV — single play works best</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-sky-400" />
                <p className="text-zinc-300 font-medium text-sm">Paste a direct video link</p>
              </div>
              <input
                type="url"
                inputMode="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setError('');
                }}
                placeholder="https://example.com/film/play.mp4  (.mp4 / .mov / .m3u8)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60"
              />
              <p className="text-zinc-500 text-xs mt-2">
                Works with direct video/stream links (.mp4, .mov, .m3u8) — read on our server. For
                a private Hudl clip, paste the <span className="text-zinc-300">.m3u8</span> stream
                URL from your browser&apos;s Network tab and add your session cookie below.
              </p>

              <button
                type="button"
                onClick={() => setShowAuth((v) => !v)}
                className="mt-3 text-xs text-sky-400 hover:text-sky-300"
              >
                {showAuth ? '− Hide' : '+ Private stream (Hudl login)'}
              </button>

              {showAuth && (
                <div className="mt-3 space-y-2">
                  <label className="block text-[10px] font-medium text-zinc-500 tracking-widest">
                    SESSION COOKIE (OPTIONAL — FOR PRIVATE STREAMS)
                  </label>
                  <textarea
                    value={cookie}
                    onChange={(e) => setCookie(e.target.value)}
                    rows={2}
                    placeholder="Paste the Cookie header from the .m3u8 request (DevTools → Network → Headers → Request Headers → cookie)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60 resize-none"
                  />
                  <details className="text-[11px] text-zinc-500">
                    <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">
                      How to get the stream URL + cookie
                    </summary>
                    <ol className="list-decimal ml-4 mt-2 space-y-1">
                      <li>Open the Hudl video in your browser (logged in) and press play.</li>
                      <li>Open DevTools (F12) → <span className="text-zinc-300">Network</span> tab → filter <span className="text-zinc-300">m3u8</span>.</li>
                      <li>
                        Right-click the <span className="text-zinc-300">.m3u8</span> request →
                        Copy → Copy URL. Paste it in the link box above.
                      </li>
                      <li>
                        On that same request, under Headers → Request Headers, copy the
                        <span className="text-zinc-300"> cookie</span> value and paste it here.
                      </li>
                    </ol>
                    <p className="mt-2">
                      Your cookie is used only to fetch this clip and is never stored.
                    </p>
                  </details>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              ATTACH PDF (optional — playbook, protection scheme, scouting report)
            </label>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handlePdfSelect(e.target.files?.[0] || null)}
            />
            {pdfFile ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                <FileText className="w-5 h-5 text-sky-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{pdfFile.name}</p>
                  <p className="text-xs text-zinc-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null);
                    if (pdfInputRef.current) pdfInputRef.current.value = '';
                  }}
                  className="text-zinc-500 hover:text-zinc-200"
                  aria-label="Remove PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-400 hover:border-sky-500 hover:text-sky-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Attach PDF (max 20 MB)
              </button>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="oliq-prompt" className="block text-xs font-medium text-zinc-400 mb-2">
              ASK OLIQ (optional)
            </label>
            <textarea
              id="oliq-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g., Grade his kick slide vs the speed rush, or Did he sustain his run block to the whistle?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/60 resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1 text-right">{prompt.length}/2000</p>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">OLIQ Error</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {hasVideo && !analyzing && (
            <button
              onClick={handleAnalyze}
              className="w-full mt-6 bg-gradient-to-r from-sky-400 to-blue-600 text-black font-heading font-bold py-4 rounded-2xl text-lg"
            >
              <Zap className="inline w-5 h-5 mr-2 -mt-0.5" />
              ANALYZE WITH OLIQ
            </button>
          )}

          {analyzing && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{statusMessage}</span>
                <span className="text-sky-400 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {result.model && (
            <div className="flex justify-center">
              <span className="text-[10px] px-3 py-1 rounded-full bg-sky-500/20 text-sky-400">
                {result.model} • {result.framesAnalyzed} frames
              </span>
            </div>
          )}

          <div className="bg-zinc-900 rounded-3xl p-6 text-center border border-sky-500/30">
            <p className="text-zinc-400 text-sm mb-2">OLIQ SCORE</p>
            <div className="text-6xl font-heading font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
              {result.overall_score}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <span className="bg-sky-500/20 text-sky-400 text-xs px-3 py-1 rounded-full">OL IQ</span>
              <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full">Film Studied</span>
            </div>
          </div>

          {result.summary && (
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
              <p className="text-zinc-400 text-xs mb-2">OLIQ ASSESSMENT</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['pass_protection', 'PASS PRO'],
                ['run_blocking', 'RUN BLOCK'],
                ['footwork_leverage', 'FOOTWORK'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="bg-zinc-900 rounded-2xl p-4 text-center">
                <div className="text-3xl font-heading">{result.position_scores[key]}</div>
                <div className="text-zinc-400 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {(
              [
                ['pass_protection', 'Pass Protection'],
                ['run_blocking', 'Run Blocking'],
                ['footwork_leverage', 'Footwork & Leverage'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-sky-400 text-xs font-medium mb-1">{label.toUpperCase()}</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.reasoning[key]}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-sky-400 font-medium text-sm mb-3">STRENGTHS</p>
            {result.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-blue-400 font-medium text-sm mb-3">NEEDS WORK</p>
            {result.weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm">{w}</span>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-white font-medium text-sm mb-3">RECOMMENDED DRILLS</p>
            {result.drills.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 border-b border-zinc-800 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-xs text-sky-400 font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm text-zinc-300">{d}</span>
              </div>
            ))}
          </div>

          <button
            onClick={reset}
            className="w-full bg-zinc-900 border border-zinc-800 text-white font-medium py-4 rounded-2xl"
          >
            Analyze Another Clip
          </button>
        </div>
      )}
    </div>
  );
}
