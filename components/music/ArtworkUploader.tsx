'use client';

import { useEffect, useRef, useState } from 'react';

export function ArtworkUploader({ releaseId, currentPath, onUploaded }: { releaseId: string; currentPath: string | null; onUploaded: (path: string) => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!currentPath) {
      setPreviewUrl(null);
      return;
    }
    fetch(`/api/publishing/releases/${releaseId}/artwork/url`).then((r) => r.json()).then((j) => setPreviewUrl(j.url ?? null)).catch(() => {});
  }, [currentPath, releaseId]);

  const handleFile = async (file: File) => {
    setError(null);
    setDim(null);
    // Quick client-side dimension check (warning, not blocking).
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => setDim({ w: img.width, h: img.height });
      img.src = String(e.target?.result ?? '');
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/publishing/releases/${releaseId}/artwork`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onUploaded(json.artwork_path);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="w-40 h-40 rounded-lg border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center text-white/30 text-xs">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="release artwork" className="w-full h-full object-cover" />
          ) : (
            'No artwork'
          )}
        </div>
        <div className="flex-1 space-y-2 text-sm">
          <p className="text-white/70">Distributors require <strong className="text-white">3000 × 3000 RGB</strong> JPG / PNG / WEBP.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block text-xs text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-emerald-400 file:text-black file:px-4 file:py-1.5 file:font-medium hover:file:bg-emerald-300"
          />
          {dim && (
            <div className={'text-xs ' + (dim.w === 3000 && dim.h === 3000 ? 'text-emerald-300' : 'text-amber-300')}>
              Selected dimensions: {dim.w} × {dim.h}px {dim.w === 3000 && dim.h === 3000 ? '✓' : '(distributor warning — may be rejected)'}
            </div>
          )}
          {uploading && <p className="text-xs text-white/60">Uploading…</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
