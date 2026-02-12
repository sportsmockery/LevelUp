'use client';

import { useState, useRef } from 'react';
import { analyzeVideo } from '@/lib/mock-ai';
import BottomNav from '@/components/BottomNav';
import { Upload, Video, Zap, CheckCircle, ChevronRight } from 'lucide-react';

type AnalysisResult = {
  overall_score: number;
  position_scores: { standing: number; top: number; bottom: number };
  strengths: string[];
  weaknesses: string[];
  drills: string[];
  xp: number;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 300);

    const data = await analyzeVideo(URL.createObjectURL(file));
    clearInterval(interval);
    setProgress(100);

    setTimeout(() => {
      setResult(data);
      setAnalyzing(false);
    }, 500);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-heading tracking-tight">Upload Match</h1>
        <p className="text-zinc-400 text-sm mt-1">Get AI-powered analysis + earn XP</p>
      </div>

      {!result ? (
        <div className="p-6">
          {/* Upload Zone */}
          <div
            className="border-2 border-dashed border-zinc-700 rounded-3xl p-10 text-center cursor-pointer hover:border-[#2563EB] transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="space-y-3">
                <Video className="w-12 h-12 mx-auto text-[#2563EB]" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-zinc-400 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 mx-auto text-zinc-500" />
                <p className="text-zinc-300 font-medium">Tap to select match video</p>
                <p className="text-zinc-500 text-sm">MP4, MOV up to 500MB</p>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          {file && !analyzing && (
            <button
              onClick={handleUpload}
              className="w-full mt-6 bg-gradient-to-r from-[#2563EB] to-[#E91E8C] text-white font-heading font-bold py-4 rounded-2xl text-lg"
            >
              <Zap className="inline w-5 h-5 mr-2 -mt-0.5" />
              ANALYZE WITH AI
            </button>
          )}

          {/* Progress */}
          {analyzing && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Analyzing footage...</span>
                <span className="text-[#E91E8C] font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {['Detecting takedowns...', 'Scoring positions...', 'Building drills...'].map((step, i) => (
                  <div key={i} className="bg-zinc-900 rounded-2xl p-3 text-center">
                    <div className={`text-xs ${progress > (i + 1) * 30 ? 'text-[#2563EB]' : 'text-zinc-500'}`}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results */
        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="bg-zinc-900 rounded-3xl p-6 text-center border border-[#2563EB]/30">
            <p className="text-zinc-400 text-sm mb-2">OVERALL TECH SCORE</p>
            <div className="text-6xl font-heading font-bold bg-gradient-to-r from-[#2563EB] to-[#E91E8C] bg-clip-text text-transparent">
              {result.overall_score}
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <span className="bg-[#2563EB]/20 text-[#2563EB] text-xs px-3 py-1 rounded-full">+{result.xp} XP</span>
              <span className="bg-[#E91E8C]/20 text-[#E91E8C] text-xs px-3 py-1 rounded-full">Match Analyzed</span>
            </div>
          </div>

          {/* Position Scores */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(result.position_scores).map(([pos, score]) => (
              <div key={pos} className="bg-zinc-900 rounded-2xl p-4 text-center">
                <div className="text-3xl font-heading">{score}</div>
                <div className="text-zinc-400 text-xs mt-1 uppercase">{pos}</div>
              </div>
            ))}
          </div>

          {/* Strengths */}
          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-[#2563EB] font-medium text-sm mb-3">STRENGTHS</p>
            {result.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>

          {/* Weaknesses */}
          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-[#E91E8C] font-medium text-sm mb-3">NEEDS WORK</p>
            {result.weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <ChevronRight className="w-4 h-4 text-[#E91E8C] shrink-0" />
                <span className="text-sm">{w}</span>
              </div>
            ))}
          </div>

          {/* Recommended Drills */}
          <div className="bg-zinc-900 rounded-3xl p-5">
            <p className="text-white font-medium text-sm mb-3">RECOMMENDED DRILLS</p>
            {result.drills.map((d, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#2563EB]/20 flex items-center justify-center text-xs text-[#2563EB] font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm text-zinc-300">{d}</span>
              </div>
            ))}
          </div>

          {/* Upload Another */}
          <button
            onClick={() => { setResult(null); setFile(null); setProgress(0); }}
            className="w-full bg-zinc-800 text-white font-heading font-bold py-4 rounded-2xl text-lg"
          >
            UPLOAD ANOTHER MATCH
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
