'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

/* ── CSS SCROLL REVEAL ─────────────────────────────────────────────── */

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.1 });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${v ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`relative px-5 sm:px-6 py-16 sm:py-20 md:py-32 ${className}`}>
      {children}
    </section>
  );
}

/* ── INTERACTIVE PARTICLE CANVAS ────────────────────────────────────── */

function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let animId: number;
    let visible = true;
    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 40 : 70;
    const CONNECTION_DIST_SQ = 140 * 140;
    const MOUSE_RADIUS = 180;
    const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
    const G = { r: 0, g: 200, b: 83 };

    let particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * rect.width, y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2.5 + 1, alpha: Math.random() * 0.5 + 0.3,
        });
      }
    };

    const draw = () => {
      if (!visible) { animId = requestAnimationFrame(draw); return; }
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x, my = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const dx = p.x - mx, dy = p.y - my;
        const dSq = dx * dx + dy * dy;
        if (dSq < MOUSE_RADIUS_SQ && dSq > 0) {
          const dist = Math.sqrt(dSq);
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
        }

        // Core dot
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = `rgb(${G.r},${G.g},${G.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 6.283);
        ctx.fill();

        // Connections (squared distance, no sqrt)
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const cdx = p.x - q.x, cdy = p.y - q.y;
          const cdSq = cdx * cdx + cdy * cdy;
          if (cdSq < CONNECTION_DIST_SQ) {
            ctx.globalAlpha = (1 - cdSq / CONNECTION_DIST_SQ) * 0.12;
            ctx.strokeStyle = `rgb(${G.r},${G.g},${G.b})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    const onMouse = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) {
        const r = canvas.getBoundingClientRect();
        mouseRef.current = { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
      }
    };

    const visObs = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    visObs.observe(canvas.parentElement!);

    resize();
    draw();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('touchend', onLeave);
    return () => {
      cancelAnimationFrame(animId);
      visObs.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('touchend', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}

/* ── DATA ──────────────────────────────────────────────────────────── */

const identityCards = [
  { title: 'Customer', desc: 'You pay for protection. Someone else builds the plan.', border: 'border-white/10' },
  { title: 'Builder', desc: 'You get licensed. You learn the business. You serve families directly.', border: 'border-[#D4AF37]/40' },
  { title: 'Leader', desc: 'You mentor others. You create a team. You build generational impact.', border: 'border-[#00D4FF]/40' },
];

const whyJasonCards = [
  { title: '22 Years Experience', desc: 'Two decades in financial services, from the field to executive leadership.' },
  { title: 'Mentorship From the Front', desc: 'Jason works alongside his team — not from a distance.' },
  { title: 'Real Conversations', desc: 'No hype. Honest dialogue about effort, timelines, and what it takes.' },
  { title: 'Confidence Under Pressure', desc: 'Built through thousands of client conversations and real-world adversity.' },
  { title: 'Family-Driven Leadership', desc: 'Genesis and the kids are part of the mission — this is a family operation.' },
  { title: 'Builder Culture', desc: 'A team environment focused on growth, accountability, and ownership.' },
];

const blueprintSteps = [
  { step: 1, title: 'Private Interest', desc: 'The client raises their hand and requests Builder Access.', goal: 'Determine if they are curious, coachable, and serious enough for the next conversation.' },
  { step: 2, title: 'Builder Conversation', desc: 'Jason or Genesis has a direct conversation to understand their goals, fears, family situation, current income pressure, and why this opportunity matters.', goal: 'Make sure this is aligned before anyone invests money.' },
  { step: 3, title: 'Education Commitment', desc: 'Selected candidates begin the initial education step. Jason covers the $125 education fee for qualified candidates.', goal: 'Start with learning before licensing.' },
  { step: 4, title: 'License Decision', desc: 'Candidate decides whether to invest approximately $500 into the required licensing process.', goal: 'Turn interest into commitment.' },
  { step: 5, title: 'Mental Preparation', desc: 'Candidate is trained on confidence, risk, fear, rejection, communication, and emotional control before selling.', goal: 'Prepare the person before preparing the producer.' },
  { step: 6, title: 'First Client Plan', desc: 'Jason helps the candidate identify their first warm-market conversations and build a 14\u201330 day first-client action plan.', goal: 'Create a realistic path toward first production activity.' },
  { step: 7, title: 'First Policy / First Win', desc: 'Candidate learns how to serve a real family, guide the conversation, and understand the value of proper protection.', goal: 'Turn licensing into service and experience.' },
  { step: 8, title: 'Producer Rhythm', desc: 'Candidate develops weekly habits: conversations, follow-ups, education, mentorship, and accountability.', goal: 'Build consistency instead of relying on motivation.' },
  { step: 9, title: 'Leadership Transfer', desc: 'Once the candidate understands the system, they learn how to invite, educate, and mentor others.', goal: 'Move from selling to leading.' },
  { step: 10, title: 'Builder to Leader', desc: "The candidate becomes part of Jason and Genesis\u2019s builder culture \u2014 helping others grow while building their own business.", goal: 'Create leaders, not just agents.' },
];

const curriculum = [
  { step: 1, title: 'The Wake-Up', desc: 'Why most families are one event away from financial crisis.' },
  { step: 2, title: 'The Opportunity', desc: 'What World System Builders actually is — and what it is not.' },
  { step: 3, title: 'Risk Rewired', desc: 'How to think about risk, protection, and financial products differently.' },
  { step: 4, title: 'Mental Operating System', desc: 'Mindset shifts that separate builders from bystanders.' },
  { step: 5, title: 'Builder Sales Process', desc: 'How to have real conversations that serve families.' },
  { step: 6, title: 'First Win', desc: 'Getting your first client and understanding the economics.' },
  { step: 7, title: 'Family + Pressure', desc: 'Building a business while protecting your home life.' },
  { step: 8, title: 'Leadership', desc: 'Growing from individual contributor to team mentor.' },
];

const forYou = [
  'You believe in financial education',
  "You're willing to get licensed",
  'You want mentorship, not a shortcut',
  "You're coachable and hungry to learn",
  "You're ready to grow into something bigger",
];

const notForYou = [
  'Looking for shortcuts or get-rich-quick schemes',
  'Expecting guaranteed income without effort',
  'Seeking passive income with no real work',
];

/* ── BUILDER ACCESS FLOW (CSS-ANIMATED MODAL) ─────────────────────── */

interface FlowAnswers {
  q1: string; q2: string; q3: string;
  commitConfirm: boolean; financialAware: boolean; expectationsAgreed: boolean;
  name: string; email: string; phone: string;
}

const INITIAL_ANSWERS: FlowAnswers = {
  q1: '', q2: '', q3: '', commitConfirm: false, financialAware: false,
  expectationsAgreed: false, name: '', email: '', phone: '',
};

const TOTAL_STEPS = 5;

function BuilderAccessFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<FlowAnswers>(INITIAL_ANSWERS);
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const canAdvance = useCallback(() => {
    switch (step) {
      case 1: return answers.q1.trim() !== '' && answers.q2.trim() !== '' && answers.q3.trim() !== '';
      case 2: return answers.commitConfirm;
      case 3: return answers.financialAware;
      case 4: return answers.expectationsAgreed;
      case 5: return answers.name.trim() !== '' && answers.email.trim() !== '';
      default: return false;
    }
  }, [step, answers]);

  const handleSubmit = () => {
    setSubmitted(true);
    const subject = encodeURIComponent('Builder Access Request');
    const body = encodeURIComponent(
      `Name: ${answers.name}\nEmail: ${answers.email}\nPhone: ${answers.phone}\n\n` +
      `Why financial education matters: ${answers.q1}\n\nWhat excites you about becoming a builder: ${answers.q2}\n\nCurrent situation: ${answers.q3}`
    );
    window.location.href = `mailto:cbur22@gmail.com?subject=${subject}&body=${body}`;
  };

  const progressPct = (step / TOTAL_STEPS) * 100;
  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#D4AF37]/50 focus:outline-none transition-colors';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B0F1A]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-[0.97]'}`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors text-xl leading-none">&#10005;</button>

        <div className="mb-6">
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Step {step} of {TOTAL_STEPS}</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#00D4FF] transition-all duration-400" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#10003;</div>
            <h3 className="text-xl font-bold mb-2">You&apos;re In</h3>
            <p className="text-white/60 text-sm leading-relaxed">Your email client should open with your Builder Access request. Jason will follow up directly.</p>
            <button onClick={onClose} className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 transition-all">Close</button>
          </div>
        ) : (
          <div>
            {step === 1 && (
              <div>
                <h3 className="text-xl font-bold mb-1">Tell us about you</h3>
                <p className="text-white/50 text-sm mb-6">Three quick questions so Jason knows who he&apos;s talking to.</p>
                <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">Why does financial education matter to you?</span>
                  <textarea value={answers.q1} onChange={(e) => setAnswers({ ...answers, q1: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Your answer..." /></label>
                <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">What excites you about becoming a builder?</span>
                  <textarea value={answers.q2} onChange={(e) => setAnswers({ ...answers, q2: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Your answer..." /></label>
                <label className="block"><span className="text-sm text-white/70 mb-1 block">Describe your current situation briefly.</span>
                  <textarea value={answers.q3} onChange={(e) => setAnswers({ ...answers, q3: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Your answer..." /></label>
              </div>
            )}
            {step === 2 && (
              <div>
                <h3 className="text-xl font-bold mb-1">Commitment Check</h3>
                <p className="text-white/50 text-sm mb-6">This path requires real effort. No shortcuts.</p>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 mb-6 space-y-3 text-sm text-white/60 leading-relaxed">
                  <p>Jason covers the $125 education fee for qualified candidates.</p>
                  <p>You will be responsible for approximately $500 in licensing costs.</p>
                  <p>You will need to study, prepare, and show up consistently.</p>
                  <p>This is a mentorship path — not a passive income stream.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={answers.commitConfirm} onChange={(e) => setAnswers({ ...answers, commitConfirm: e.target.checked })} className="mt-1 accent-[#D4AF37] w-4 h-4 shrink-0" />
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">I understand this requires real commitment and I am ready to invest my time and effort.</span>
                </label>
              </div>
            )}
            {step === 3 && (
              <div>
                <h3 className="text-xl font-bold mb-1">Financial Awareness</h3>
                <p className="text-white/50 text-sm mb-6">Transparency is part of the builder culture.</p>
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6 mb-6 space-y-3 text-sm text-yellow-200/80 leading-relaxed">
                  <p>Licensing, compensation, and income are <strong>not guaranteed</strong>.</p>
                  <p>Results depend on effort, approvals, state requirements, carrier decisions, and market conditions.</p>
                  <p>No one can promise you a specific income level or timeline.</p>
                  <p>Any examples shared are illustrative and not a guarantee of earnings.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={answers.financialAware} onChange={(e) => setAnswers({ ...answers, financialAware: e.target.checked })} className="mt-1 accent-[#D4AF37] w-4 h-4 shrink-0" />
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">I understand that income is not guaranteed and results depend on many factors.</span>
                </label>
              </div>
            )}
            {step === 4 && (
              <div>
                <h3 className="text-xl font-bold mb-1">Set Expectations</h3>
                <p className="text-white/50 text-sm mb-6">Clarity before commitment protects everyone.</p>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 mb-6 space-y-3 text-sm text-white/60 leading-relaxed">
                  <p>This is a <strong className="text-white/80">mentorship-driven path</strong>, not a recruiting funnel.</p>
                  <p>Jason and Genesis work directly with a small group — not everyone will be accepted.</p>
                  <p>You will be expected to learn, practice, and grow through real conversations.</p>
                  <p>Building takes months, not days. Patience and consistency are required.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" checked={answers.expectationsAgreed} onChange={(e) => setAnswers({ ...answers, expectationsAgreed: e.target.checked })} className="mt-1 accent-[#D4AF37] w-4 h-4 shrink-0" />
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">I accept these expectations and want to move forward.</span>
                </label>
              </div>
            )}
            {step === 5 && (
              <div>
                <h3 className="text-xl font-bold mb-1">Request Builder Conversation</h3>
                <p className="text-white/50 text-sm mb-6">Last step. Jason will reach out directly.</p>
                <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">Full Name *</span>
                  <input type="text" value={answers.name} onChange={(e) => setAnswers({ ...answers, name: e.target.value })} className={inputCls} placeholder="Your full name" /></label>
                <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">Email *</span>
                  <input type="email" value={answers.email} onChange={(e) => setAnswers({ ...answers, email: e.target.value })} className={inputCls} placeholder="you@email.com" /></label>
                <label className="block"><span className="text-sm text-white/70 mb-1 block">Phone (optional)</span>
                  <input type="tel" value={answers.phone} onChange={(e) => setAnswers({ ...answers, phone: e.target.value })} className={inputCls} placeholder="(555) 555-5555" /></label>
              </div>
            )}
            <div className="flex items-center justify-between mt-8">
              {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-sm text-white/50 hover:text-white/80 transition-colors">&larr; Back</button> : <span />}
              {step < TOTAL_STEPS ? (
                <button onClick={() => setStep(step + 1)} disabled={!canAdvance()} className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-7 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed">Next Step</button>
              ) : (
                <button onClick={handleSubmit} disabled={!canAdvance()} className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-7 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed">Request Builder Conversation</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── QUESTION PANEL (CSS-ANIMATED SLIDE-IN) ────────────────────────── */

function QuestionPanel({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const canSend = question.trim() !== '' && name.trim() !== '' && email.trim() !== '';
  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#D4AF37]/50 focus:outline-none transition-colors';

  const handleSend = () => {
    setSent(true);
    const subject = encodeURIComponent('Question About WSB');
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nQuestion:\n${question}`);
    window.location.href = `mailto:cbur22@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md border-l border-white/10 bg-[#0B0F1A]/98 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-lg font-bold">Ask a Question</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none">&#10005;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {sent ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">&#10003;</div>
              <h4 className="text-lg font-bold mb-2">Question Sent</h4>
              <p className="text-white/60 text-sm leading-relaxed">Your email client should open with your question. Jason will get back to you.</p>
              <button onClick={onClose} className="mt-6 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 transition-all">Close</button>
            </div>
          ) : (
            <>
              <p className="text-white/50 text-sm mb-6">Have a question about the builder path, licensing, or mentorship? Ask here and Jason will follow up directly.</p>
              <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">Your Name *</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Full name" /></label>
              <label className="block mb-4"><span className="text-sm text-white/70 mb-1 block">Your Email *</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@email.com" /></label>
              <label className="block mb-6"><span className="text-sm text-white/70 mb-1 block">Your Question *</span>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={5} className={`${inputCls} resize-none`} placeholder="What would you like to know?" /></label>
              <button onClick={handleSend} disabled={!canSend} className="w-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-7 py-3 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed">Send Question</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PAGE ──────────────────────────────────────────────────────────── */

export default function WSBPage() {
  const [flowOpen, setFlowOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);

  const openFlow = () => setFlowOpen(true);
  const closeFlow = () => setFlowOpen(false);

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white overflow-hidden">
      {flowOpen && <BuilderAccessFlow onClose={closeFlow} />}
      {questionOpen && <QuestionPanel onClose={() => setQuestionOpen(false)} />}

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <Section className="min-h-[85vh] md:min-h-[90vh] flex items-center">
        <ParticleHero />
        <div className="relative z-10 mx-auto max-w-7xl w-full grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <Reveal>
            <p className="text-[#D4AF37] font-semibold tracking-widest uppercase text-xs sm:text-sm mb-3 sm:mb-4">World System Builders</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight">
              From Customer<br />
              <span className="bg-gradient-to-r from-[#D4AF37] to-[#00D4FF] bg-clip-text text-transparent">to Builder.</span>
            </h1>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">Jason and Genesis Beninato are opening the door for a select group to become licensed leaders inside World System Builders.</p>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/50 max-w-xl leading-relaxed">You already believe in financial education. Now you have the opportunity to learn the business, earn your license, serve families, and build something bigger — with mentorship from people who live it every day.</p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <button onClick={openFlow} className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-105 text-center">Start Step 1</button>
              <a href="#blueprint" className="rounded-full border border-white/20 px-6 sm:px-8 py-3.5 sm:py-4 text-sm font-semibold uppercase tracking-wider text-white/80 hover:bg-white/5 transition-all duration-300 text-center">See the Builder Blueprint</a>
            </div>
          </Reveal>
          <Reveal className="relative flex justify-center">
            <div className="relative group w-full max-w-[600px]">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#D4AF37]/30 to-[#00D4FF]/20 blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <Image src="/images/wsb-financial-literacy.jpg" alt="Jason and Genesis Beninato at the National Financial Literacy Campaign" width={1600} height={1200} className="relative rounded-2xl shadow-2xl object-cover w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]" priority sizes="(max-width: 768px) 100vw, 600px" />
              <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl bg-gradient-to-t from-black/70 to-transparent px-4 sm:px-6 py-3 sm:py-4">
                <p className="text-xs sm:text-sm font-medium text-white/90 tracking-wide">Leading the National Financial Literacy Campaign.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── IDENTITY SHIFT ─────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold">Most people stay customers. <span className="text-[#D4AF37]">Builders choose ownership.</span></h2>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-3 gap-6 items-stretch">
            {identityCards.map((c) => (
              <Reveal key={c.title} className="h-full">
                <div className={`rounded-2xl border ${c.border} bg-white/[0.03] p-8 hover:bg-white/[0.06] transition-colors duration-300 h-full`}>
                  <h3 className="text-xl font-bold mb-3">{c.title}</h3>
                  <p className="text-white/60 leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── THE BUILDER BLUEPRINT (TIMELINE) ───────────────────────── */}
      <Section id="blueprint">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The <span className="text-[#D4AF37]">Builder Blueprint</span></h2>
            <p className="text-white/50 max-w-2xl mx-auto leading-relaxed">A simple path from interested client to licensed leader — with Jason and Genesis guiding the process.</p>
          </Reveal>
          <div className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#D4AF37]/40 via-[#00D4FF]/30 to-[#D4AF37]/10 md:-translate-x-px" />
            <div className="space-y-8 md:space-y-12">
              {blueprintSteps.map((s, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <Reveal key={s.step} className={`relative flex items-start gap-6 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#0B0F1A] border-2 border-[#D4AF37]/50 flex items-center justify-center shadow-lg shadow-[#D4AF37]/10">
                        <span className="text-sm font-bold text-[#D4AF37]">{s.step}</span>
                      </div>
                    </div>
                    <div className={`ml-16 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? 'md:pr-4 md:mr-auto' : 'md:pl-4 md:ml-auto'}`}>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05] hover:border-[#00D4FF]/30 transition-colors duration-300">
                        <h3 className="text-base font-bold mb-2">{s.title}</h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-3">{s.desc}</p>
                        <p className="text-xs text-[#00D4FF]/70 leading-relaxed"><span className="font-semibold text-[#00D4FF]/90">Goal:</span> {s.goal}</p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
          <Reveal className="text-center mt-16">
            <button onClick={openFlow} className="inline-block rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-10 py-4 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-105">Start the Builder Conversation</button>
          </Reveal>
          <Reveal className="text-center mt-8">
            <p className="text-xs text-white/25 max-w-2xl mx-auto leading-relaxed">This blueprint is educational and informational. Licensing approval, compensation, sales, and income are not guaranteed. Results depend on state requirements, carrier approvals, effort, skill development, market conditions, and individual performance.</p>
          </Reveal>
        </div>
      </Section>

      {/* ── WHY JASON ──────────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-6xl">
          <Reveal><h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Why <span className="text-[#00D4FF]">Jason</span></h2></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyJasonCards.map((c) => (
              <Reveal key={c.title}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 hover:border-[#D4AF37]/30 transition-colors duration-300 h-full">
                  <h3 className="text-lg font-bold mb-2 text-[#D4AF37]">{c.title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── THE COMMITMENT ─────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><h2 className="text-3xl md:text-4xl font-bold mb-6">The <span className="text-[#D4AF37]">Commitment</span></h2></Reveal>
          <Reveal><p className="text-white/60 leading-relaxed mb-12">Getting started requires two things: education and licensing. Jason covers the first part. You invest in the second.</p></Reveal>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Reveal>
              <div className="rounded-2xl border border-[#D4AF37]/30 bg-white/[0.03] p-8">
                <p className="text-4xl font-bold text-[#D4AF37]">$125</p>
                <p className="text-sm text-white/50 mt-2 uppercase tracking-wider">Education — Covered by Jason</p>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-2xl border border-[#00D4FF]/30 bg-white/[0.03] p-8">
                <p className="text-4xl font-bold text-[#00D4FF]">~$500</p>
                <p className="text-sm text-white/50 mt-2 uppercase tracking-wider">Licensing — Your Investment</p>
              </div>
            </Reveal>
          </div>
          <Reveal>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-6 py-4 text-sm text-yellow-200/80 leading-relaxed">
              This is not a guaranteed income opportunity. Licensing, compensation, and results vary based on effort, approvals, and many factors.
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── ECONOMIC REALITY ───────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><h2 className="text-3xl md:text-4xl font-bold mb-6">One client can <span className="text-[#00D4FF]">change your perspective.</span></h2></Reveal>
          <Reveal><p className="text-white/60 leading-relaxed mb-4">Imagine helping a family protect themselves with a plan that costs around $200 per month. As a licensed agent, you would earn a commission on that policy. One conversation. One family served. One step toward building something real.</p></Reveal>
          <Reveal><p className="text-white/40 text-sm leading-relaxed mb-4">Multiply that across multiple families, and the math starts to shift — not overnight, but over time, with consistent effort and real mentorship.</p></Reveal>
          <Reveal><p className="text-xs text-white/30 italic">Examples are illustrative, not guaranteed. Actual compensation depends on products, carriers, licensing status, and individual performance.</p></Reveal>
        </div>
      </Section>

      {/* ── 8-STEP CURRICULUM ──────────────────────────────────────── */}
      <Section>
        <div id="curriculum" className="mx-auto max-w-5xl scroll-mt-24">
          <Reveal><h2 className="text-3xl md:text-4xl font-bold text-center mb-16">The <span className="text-[#D4AF37]">8-Step</span> Curriculum</h2></Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {curriculum.map((s) => (
              <Reveal key={s.step}>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-[#D4AF37]/40 hover:-translate-y-1 transition-all duration-300 h-full">
                  <span className="inline-block text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 rounded-full px-3 py-1 mb-4">Step {s.step}</span>
                  <h3 className="text-base font-bold mb-2">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ── JASON + GENESIS ────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          <Reveal className="relative flex justify-center">
            <div className="relative group w-full max-w-[560px]">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#00D4FF]/15 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <Image src="/images/jason-family.jpg" alt="Jason and Genesis Beninato with family" width={560} height={560} className="relative rounded-2xl shadow-2xl object-cover w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, 560px" />
            </div>
          </Reveal>
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">This is built <span className="text-[#D4AF37]">together.</span></h2>
            <p className="text-white/60 leading-relaxed mb-6">Jason and Genesis have spent years building, learning, and navigating pressure together. This is not theory — it is lived experience. Every lesson in the curriculum comes from real conversations, real setbacks, and real wins.</p>
            <blockquote className="border-l-2 border-[#D4AF37]/60 pl-5 text-white/80 italic leading-relaxed">&ldquo;We are not looking for everyone. We are looking for people ready to become builders.&rdquo;</blockquote>
            <p className="mt-2 text-sm text-[#D4AF37]/80">— Jason &amp; Genesis Beninato</p>
          </Reveal>
        </div>
      </Section>

      {/* ── WHO THIS IS FOR ────────────────────────────────────────── */}
      <Section>
        <div className="mx-auto max-w-4xl">
          <Reveal><h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Is this <span className="text-[#00D4FF]">for you?</span></h2></Reveal>
          <div className="grid md:grid-cols-2 gap-8">
            <Reveal>
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8">
                <h3 className="text-lg font-bold text-green-400 mb-5">This is for you if:</h3>
                <ul className="space-y-3">
                  {forYou.map((item) => (<li key={item} className="flex items-start gap-3 text-white/70 text-sm"><span className="text-green-400 mt-0.5 shrink-0">&#10004;</span>{item}</li>))}
                </ul>
              </div>
            </Reveal>
            <Reveal>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
                <h3 className="text-lg font-bold text-red-400 mb-5">This is NOT for you if:</h3>
                <ul className="space-y-3">
                  {notForYou.map((item) => (<li key={item} className="flex items-start gap-3 text-white/70 text-sm"><span className="text-red-400 mt-0.5 shrink-0">&#10008;</span>{item}</li>))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ──────────────────────────────────────────────── */}
      <Section className="text-center">
        <div className="mx-auto max-w-2xl">
          <Reveal><h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to take the <span className="bg-gradient-to-r from-[#D4AF37] to-[#00D4FF] bg-clip-text text-transparent">next step?</span></h2></Reveal>
          <Reveal><p className="text-white/50 mb-10">Request access and start a conversation with Jason directly.</p></Reveal>
          <Reveal>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={openFlow} className="inline-block rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] px-10 py-4 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all duration-300 hover:scale-105">Request Builder Access</button>
              <button onClick={() => setQuestionOpen(true)} className="inline-block rounded-full border border-white/20 px-10 py-4 text-sm font-semibold uppercase tracking-wider text-white/80 hover:bg-white/5 transition-all duration-300">Ask a Question</button>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── LEGAL / COMPLIANCE ─────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs text-white/30 leading-relaxed">Licensing, compensation, and income are not guaranteed and depend on multiple factors including effort, approvals, and market conditions. World System Builders and its affiliates make no promises regarding earnings or results. This page is an invitation to learn more, not a guarantee of outcome. All trademarks belong to their respective owners.</p>
        </div>
      </footer>
    </main>
  );
}
