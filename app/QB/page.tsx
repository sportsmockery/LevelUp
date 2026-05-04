'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Video, Zap, CheckCircle, ChevronRight, AlertCircle, Brain, FileText, X } from 'lucide-react';

type QBIQResult = {
  overall_score: number;
  position_scores: {
    mechanics: number;
    decision_making: number;
    pocket_presence: number;
  };
  reasoning: {
    mechanics: string;
    decision_making: string;
    pocket_presence: string;
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function extractFrames(file: File, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D not supported'));
      return;
    }
    const frames: string[] = [];

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const targetW = 768;
      canvas.width = targetW;
      canvas.height = Math.round(targetW * (video.videoHeight / video.videoWidth));
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video duration'));
        return;
      }
      const interval = duration / (count + 1);
      let currentFrame = 0;

      const captureNext = () => {
        if (currentFrame >= count) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        video.currentTime = interval * (currentFrame + 1);
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        currentFrame++;
        captureNext();
      };

      captureNext();
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
}

export default function QBPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<QBIQResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(0);
    setError('');

    try {
      setStatusMessage('Extracting key frames...');
      setProgress(10);
      const frames = await extractFrames(file, FRAME_COUNT);
      setProgress(30);

      let pdfPayload: { name: string; data: string } | undefined;
      if (pdfFile) {
        setStatusMessage('Reading PDF...');
        const data = await readFileAsDataUrl(pdfFile);
        pdfPayload = { name: pdfFile.name, data };
        setProgress(40);
      }

      setStatusMessage('QBIQ is studying the tape...');
      const tick = setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 6));
      }, 600);

      const res = await fetch('/api/qb/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          prompt: prompt.trim() || undefined,
          pdf: pdfPayload,
        }),
      });
      clearInterval(tick);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `QBIQ request failed (${res.status})`);
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
  }, [file, pdfFile, prompt]);

  const reset = () => {
    setFile(null);
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

  return (
    <div className="min-h-screen pb-20 bg-zinc-950 text-white">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-heading tracking-tight">QBIQ</h1>
            <p className="text-zinc-400 text-sm">AI quarterback film study</p>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="p-6">
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-amber-400 text-[10px] font-medium tracking-widest mb-2">EVALUATING</p>
            <p className="text-white font-medium text-sm">Carter Burhans — QB</p>
            <p className="text-zinc-400 text-xs mt-1">
              Class of 2030 • 5&apos;10&quot; • 3.9 GPA • Victor J. Andrew HS • also plays FS
            </p>
            <p className="text-zinc-500 text-xs">Multi-sport: Baseball (.500 AAA), Track</p>
          </div>

          <div
            className="border-2 border-dashed border-zinc-700 rounded-3xl p-10 text-center cursor-pointer hover:border-amber-500 transition-colors"
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
                <Video className="w-12 h-12 mx-auto text-amber-400" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-zinc-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-zinc-500" />
                <p className="text-zinc-300 font-medium">Tap to select QB film</p>
                <p className="text-zinc-500 text-sm">MP4, MOV — single play works best</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              ATTACH PDF (optional — playbook, scouting report, route concept)
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
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
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
                className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-400 hover:border-amber-500 hover:text-amber-400 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Attach PDF (max 20 MB)
              </button>
            )}
          </div>

          <div className="mt-6">
            <label htmlFor="qbiq-prompt" className="block text-xs font-medium text-zinc-400 mb-2">
              ASK QBIQ (optional)
            </label>
            <textarea
              id="qbiq-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g., Focus on his footwork on the drop, or Was he locked onto his first read?"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60 resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1 text-right">{prompt.length}/2000</p>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">QBIQ Error</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {file && !analyzing && (
            <button
              onClick={handleAnalyze}
              className="w-full mt-6 bg-gradient-to-r from-amber-400 to-orange-600 text-black font-heading font-bold py-4 rounded-2xl text-lg"
            >
              <Zap className="inline w-5 h-5 mr-2 -mt-0.5" />
              ANALYZE WITH QBIQ
            </button>
          )}

          {analyzing && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">{statusMessage}</span>
                <span className="text-amber-400 font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-600 transition-all duration-300"
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
              <span className="text-[10px] px-3 py-1 rounded-full bg-amber-500/20 text-amber-400">
                {result.model} • {result.framesAnalyzed} frames
              </span>
            </div>
          )}

          <div className="bg-zinc-900 rounded-3xl p-6 text-center border border-amber-500/30">
            <p className="text-zinc-400 text-sm mb-2">QBIQ SCORE</p>
            <div className="text-6xl font-heading font-bold bg-gradient-to-r from-amber-400 to-orange-600 bg-clip-text text-transparent">
              {result.overall_score}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <span className="bg-amber-500/20 text-amber-400 text-xs px-3 py-1 rounded-full">QB IQ</span>
              <span className="bg-orange-500/20 text-orange-400 text-xs px-3 py-1 rounded-full">Film Studied</span>
            </div>
          </div>

          {result.summary && (
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
              <p className="text-zinc-400 text-xs mb-2">QBIQ ASSESSMENT</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['mechanics', 'MECHANICS'],
                ['decision_making', 'DECISIONS'],
                ['pocket_presence', 'POCKET'],
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
                ['mechanics', 'Mechanics'],
                ['decision_making', 'Decision-Making'],
                ['pocket_presence', 'Pocket Presence'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="bg-zinc-900 rounded-2xl p-4">
                <p className="text-amber-400 text-xs font-medium mb-1">{label.toUpperCase()}</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{result.reasoning[key]}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-amber-400 font-medium text-sm mb-3">STRENGTHS</p>
            {result.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-orange-400 font-medium text-sm mb-3">NEEDS WORK</p>
            {result.weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
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
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs text-amber-400 font-bold shrink-0">
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
