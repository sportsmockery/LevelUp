'use client';

import { motion } from 'framer-motion';
import { Upload, Cpu, Zap } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Your Match',
    description:
      'Record any practice or competition match and upload it to the app. Our AI handles the rest.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI Breaks It Down',
    description:
      "GPT-4o analyzes every frame — scoring positions, identifying patterns, and spotting opportunities you'd miss.",
  },
  {
    number: '03',
    icon: Zap,
    title: 'Level Up',
    description:
      'Get personalized drills, earn XP, climb the ranks, and watch your wrestler transform from good to elite.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  }),
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mb-16 text-center md:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="gradient-text text-4xl font-bold font-[family-name:var(--font-space-grotesk)] md:text-5xl"
          >
            How LevelUp Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-[#A1A1AA]"
          >
            Three simple steps to wrestling greatness
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative flex flex-col items-stretch gap-8 md:flex-row md:gap-6 lg:gap-8">
          {/* Dashed connector line (desktop only) */}
          <div
            className="pointer-events-none absolute top-1/2 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] hidden -translate-y-1/2 md:block"
            aria-hidden="true"
          >
            <svg
              className="h-[2px] w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 2"
            >
              <line
                x1="0"
                y1="1"
                x2="1000"
                y2="1"
                stroke="url(#dash-gradient)"
                strokeWidth="2"
                strokeDasharray="12 8"
              />
              <defs>
                <linearGradient
                  id="dash-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#E91E8C" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="group relative flex-1"
            >
              {/* Mobile connector arrow */}
              {i < steps.length - 1 && (
                <div className="flex justify-center py-0 md:hidden" aria-hidden="true">
                  {/* rendered after the card via CSS order trick — handled by gap */}
                </div>
              )}

              <div className="relative flex h-full flex-col items-center rounded-3xl border border-[#27272A] bg-[#18181B] p-8 text-center transition-colors hover:border-[#2563EB]/30">
                {/* Step number */}
                <span className="gradient-text text-6xl font-extrabold leading-none font-[family-name:var(--font-space-grotesk)] md:text-7xl">
                  {step.number}
                </span>

                {/* Icon */}
                <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB]/20 to-[#E91E8C]/20 ring-1 ring-[#27272A]">
                  <step.icon className="h-7 w-7 text-[#2563EB]" strokeWidth={1.8} />
                </div>

                {/* Title */}
                <h3 className="mt-6 text-xl font-bold text-white font-[family-name:var(--font-space-grotesk)]">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="mt-3 leading-relaxed text-[#A1A1AA]">
                  {step.description}
                </p>
              </div>

              {/* Mobile vertical arrow between cards */}
              {i < steps.length - 1 && (
                <div className="flex justify-center py-2 md:hidden" aria-hidden="true">
                  <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
                    <line
                      x1="12"
                      y1="0"
                      x2="12"
                      y2="24"
                      stroke="url(#arrow-grad)"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                    <path
                      d="M6 20L12 28L18 20"
                      stroke="url(#arrow-grad)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient
                        id="arrow-grad"
                        x1="12"
                        y1="0"
                        x2="12"
                        y2="32"
                      >
                        <stop offset="0%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#E91E8C" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
