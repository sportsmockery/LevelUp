'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Users, Baby, ChevronRight, Dumbbell, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

type Step = 'role' | 'details' | 'club' | 'welcome';

const weightClasses = [
  '50', '55', '60', '65', '70', '75', '80', '85', '90', '95',
  '100', '106', '113', '120', '126', '132', '138', '145', '152', '160', '170', '182', '195', '220', '285',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<'athlete' | 'parent' | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [clubCode, setClubCode] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (showConfetti) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#2563EB', '#E91E8C', '#FFFFFF', '#FFD700'],
      });
    }
  }, [showConfetti]);

  const handleFinish = () => {
    // In production, save to Supabase here
    localStorage.setItem('levelup_onboarded', 'true');
    localStorage.setItem('levelup_user', JSON.stringify({ role, name, age, weight, gender, clubCode }));
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] transition-all duration-500"
          style={{
            width: step === 'role' ? '25%' : step === 'details' ? '50%' : step === 'club' ? '75%' : '100%',
          }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center p-6">
        {/* Step 1: Role */}
        {step === 'role' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-heading tracking-tighter">LEVELUP</h1>
              <p className="text-zinc-400 text-sm mt-2">Who&apos;s using this?</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setRole('athlete'); setStep('details'); }}
                className={`w-full bg-zinc-900 rounded-3xl p-6 flex items-center gap-4 border transition-colors hover:border-[#2563EB] ${
                  role === 'athlete' ? 'border-[#2563EB]' : 'border-zinc-800'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#2563EB]/20 flex items-center justify-center">
                  <Dumbbell className="w-7 h-7 text-[#2563EB]" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-heading text-lg">I&apos;m a Wrestler</p>
                  <p className="text-zinc-400 text-sm">Track your progress, get AI coaching</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </button>
              <button
                onClick={() => { setRole('parent'); setStep('details'); }}
                className={`w-full bg-zinc-900 rounded-3xl p-6 flex items-center gap-4 border transition-colors hover:border-[#E91E8C] ${
                  role === 'parent' ? 'border-[#E91E8C]' : 'border-zinc-800'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#E91E8C]/20 flex items-center justify-center">
                  <Users className="w-7 h-7 text-[#E91E8C]" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-heading text-lg">I&apos;m a Parent</p>
                  <p className="text-zinc-400 text-sm">Follow your athlete&apos;s journey</p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && (
          <div className="space-y-6">
            <div>
              <button onClick={() => setStep('role')} className="text-zinc-400 text-sm mb-4">← Back</button>
              <h2 className="text-2xl font-heading">
                {role === 'athlete' ? 'About You' : 'About Your Wrestler'}
              </h2>
              <p className="text-zinc-400 text-sm mt-1">This helps our AI personalize everything</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs block mb-1.5">
                  {role === 'athlete' ? 'YOUR NAME' : 'WRESTLER\'S NAME'}
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="First name"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-[#2563EB] focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs block mb-1.5">AGE</label>
                  <input
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    type="number"
                    min="6"
                    max="18"
                    placeholder="8-18"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:border-[#2563EB] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs block mb-1.5">GENDER</label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 py-3.5 rounded-2xl text-sm font-medium transition-colors ${
                          gender === g
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g === 'male' ? 'Male' : 'Female'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-zinc-400 text-xs block mb-1.5">WEIGHT CLASS (lbs)</label>
                <div className="flex flex-wrap gap-2">
                  {weightClasses.map(w => (
                    <button
                      key={w}
                      onClick={() => setWeight(w)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        weight === w
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep('club')}
              disabled={!name || !age || !weight}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] text-white font-heading font-bold py-4 rounded-2xl text-lg disabled:opacity-30 disabled:cursor-not-allowed"
            >
              CONTINUE
            </button>
          </div>
        )}

        {/* Step 3: Club */}
        {step === 'club' && (
          <div className="space-y-6">
            <div>
              <button onClick={() => setStep('details')} className="text-zinc-400 text-sm mb-4">← Back</button>
              <h2 className="text-2xl font-heading">Join a Club</h2>
              <p className="text-zinc-400 text-sm mt-1">Enter your club&apos;s code, or skip for now</p>
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1.5">CLUB CODE</label>
              <input
                value={clubCode}
                onChange={e => setClubCode(e.target.value.toUpperCase())}
                placeholder="e.g. TITAN-2026"
                maxLength={12}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white text-center text-xl tracking-widest font-heading placeholder:text-zinc-600 placeholder:text-base placeholder:tracking-normal focus:border-[#2563EB] focus:outline-none transition-colors"
              />
            </div>
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800">
              <p className="text-sm text-zinc-300">Don&apos;t have a code?</p>
              <p className="text-xs text-zinc-500 mt-1">Ask your coach, or skip to join later. You can also create a new club from your Profile.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setStep('welcome'); setShowConfetti(true); }}
                className="w-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] text-white font-heading font-bold py-4 rounded-2xl text-lg"
              >
                {clubCode ? 'JOIN CLUB & START' : 'SKIP & START'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Welcome */}
        {step === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-28 h-28">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C] animate-pulse" />
              <div className="absolute inset-1 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-heading font-bold">1</div>
                  <div className="text-[10px] text-zinc-400">LEVEL</div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-heading">Welcome, {name || 'Wrestler'}!</h2>
              <p className="text-zinc-400 mt-2">You just earned your first XP</p>
            </div>
            <div className="bg-zinc-900 rounded-3xl p-6 mx-auto max-w-xs">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-heading font-bold text-yellow-400">+250 XP</span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] w-[12.5%] transition-all duration-1000" />
              </div>
              <p className="text-zinc-500 text-xs mt-2">250 / 2,000 XP to Level 2</p>
            </div>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4 text-[#2563EB]" />
                <span>Level 1 Badge Unlocked</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#E91E8C]" />
                <span>AI Analysis Ready</span>
              </div>
            </div>
            <button
              onClick={handleFinish}
              className="w-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] text-white font-heading font-bold py-4 rounded-2xl text-lg"
            >
              LET&apos;S GO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
