'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Mail, ChevronDown } from 'lucide-react';

const leadSchema = z.object({
  email: z.email('Please enter a valid email address'),
  role: z.enum(['parent', 'coach', 'athlete'], {
    error: 'Please select your role',
  }),
});

type LeadFormData = z.infer<typeof leadSchema>;

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export default function LeadForm() {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      email: '',
      role: undefined,
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setStatus('loading');
    setServerMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, role: data.role }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setStatus('success');
        setServerMessage(json.message || "You're in! We'll notify you at launch.");
        reset();
      } else {
        setStatus('error');
        setServerMessage(json.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setServerMessage('Network error. Please check your connection and try again.');
    }
  };

  return (
    <section id="waitlist" className="relative overflow-hidden py-24 sm:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#2563EB] opacity-[0.07] blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-[#E91E8C] opacity-[0.05] blur-[120px]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="relative z-10 mx-auto max-w-2xl px-4 sm:px-6"
      >
        {/* Section heading */}
        <motion.div variants={fadeUp} className="mb-12 text-center">
          <h2 className="text-4xl font-bold gradient-text font-[family-name:var(--font-space-grotesk)] md:text-5xl">
            Get Early Access
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
            Be first to know when LevelUp launches. Plus, get a free AI analysis
            credit.
          </p>
        </motion.div>

        {/* Incentive badge */}
        <motion.div variants={fadeUp} className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#27272A] bg-[#18181B]/80 px-5 py-2.5 text-sm font-medium text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
            <span className="text-base">&#127873;</span>
            Free AI Analysis Credit for Early Subscribers
          </span>
        </motion.div>

        {/* Form */}
        <motion.div variants={fadeUp} className="mx-auto max-w-md">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col items-center gap-4 rounded-3xl border border-[#27272A] bg-[#18181B]/60 p-10 text-center backdrop-blur-sm"
              >
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 12,
                    delay: 0.15,
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#E91E8C]">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </motion.div>

                {/* Sparkle particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute h-2 w-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C]"
                    initial={{
                      opacity: 0,
                      x: 0,
                      y: 0,
                      scale: 0,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: (Math.random() - 0.5) * 200,
                      y: (Math.random() - 0.5) * 200,
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.2 + i * 0.08,
                      ease: 'easeOut',
                    }}
                  />
                ))}

                <h3 className="text-2xl font-bold text-white font-[family-name:var(--font-space-grotesk)]">
                  You&apos;re in! &#127881;
                </h3>
                <p className="text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
                  {serverMessage || "We'll notify you at launch."}
                </p>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStatus('idle')}
                  className="mt-2 text-sm font-medium text-[#2563EB] transition-colors hover:text-[#E91E8C] font-[family-name:var(--font-plus-jakarta)]"
                >
                  Sign up another email
                </motion.button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                {/* Email field */}
                <div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A1A1AA]" />
                    <input
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      {...register('email')}
                      className={`w-full bg-[#18181B] border rounded-2xl pl-13 pr-6 py-4 text-white placeholder-[#A1A1AA] focus:border-[#2563EB] focus:outline-none transition-colors font-[family-name:var(--font-plus-jakarta)] ${
                        errors.email ? 'border-red-500' : 'border-[#27272A]'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 pl-2 text-sm text-red-400 font-[family-name:var(--font-plus-jakarta)]"
                    >
                      {errors.email.message}
                    </motion.p>
                  )}
                </div>

                {/* Role select */}
                <div>
                  <div className="relative">
                    <select
                      {...register('role')}
                      defaultValue=""
                      className={`w-full appearance-none bg-[#18181B] border rounded-2xl px-6 py-4 text-white focus:border-[#2563EB] focus:outline-none transition-colors font-[family-name:var(--font-plus-jakarta)] ${
                        errors.role ? 'border-red-500' : 'border-[#27272A]'
                      }`}
                    >
                      <option value="" disabled className="text-[#A1A1AA]">
                        I am a...
                      </option>
                      <option value="parent">Parent</option>
                      <option value="coach">Coach</option>
                      <option value="athlete">Athlete</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#A1A1AA]" />
                  </div>
                  {errors.role && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 pl-2 text-sm text-red-400 font-[family-name:var(--font-plus-jakarta)]"
                    >
                      {errors.role.message}
                    </motion.p>
                  )}
                </div>

                {/* Error message from server */}
                {status === 'error' && serverMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-[family-name:var(--font-plus-jakarta)]"
                  >
                    {serverMessage}
                  </motion.div>
                )}

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={status === 'loading'}
                  whileHover={{ scale: status === 'loading' ? 1 : 1.02 }}
                  whileTap={{ scale: status === 'loading' ? 1 : 0.98 }}
                  className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] py-4 text-lg font-bold text-white shadow-lg shadow-[#2563EB]/25 transition-shadow hover:shadow-[#2563EB]/40 disabled:opacity-70 disabled:cursor-not-allowed font-[family-name:var(--font-plus-jakarta)]"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Join the Waitlist'
                  )}
                </motion.button>

                {/* Privacy note */}
                <p className="mt-2 text-center text-xs text-[#A1A1AA]/70 font-[family-name:var(--font-plus-jakarta)]">
                  &#128274; No spam. Unsubscribe anytime. Your privacy matters.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </section>
  );
}
