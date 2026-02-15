'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'My son went from a 0-4 record to qualifying for states in one season. The AI drills are like having a personal coach 24/7.',
    author: 'Sarah M.',
    role: 'Wrestling Mom, Ohio',
    stars: 5,
  },
  {
    quote:
      'I coach 30 kids and LevelUp lets me give every one of them personalized attention. The video analysis is a game-changer.',
    author: 'Coach Mike D.',
    role: 'Pennsylvania',
    stars: 5,
  },
  {
    quote:
      "My daughter was ready to quit wrestling. Now she's addicted to earning XP and just hit Level 12. Best investment we've made.",
    author: 'James T.',
    role: 'Wrestling Dad, Iowa',
    stars: 5,
  },
];

const stats = [
  { value: '5,000+', label: 'Families' },
  { value: '50,000+', label: 'Matches Analyzed' },
  { value: '94%', label: 'Of Parents Recommend' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  }),
};

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 md:py-32">
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
            Families Love LevelUp
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-[#A1A1AA]"
          >
            Hear from parents and coaches who&apos;ve seen the transformation
          </motion.p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
              className="flex flex-col rounded-3xl border border-[#27272A] bg-[#18181B] p-8 transition-colors hover:border-[#2563EB]/30"
            >
              {/* Star Rating */}
              <div className="mb-5 flex gap-1">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star
                    key={s}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                    strokeWidth={1.5}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="flex-1 text-base leading-relaxed text-white/90 italic">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 border-t border-[#27272A] pt-5">
                <p className="font-bold text-white font-[family-name:var(--font-space-grotesk)]">
                  {t.author}
                </p>
                <p className="mt-0.5 text-sm text-[#A1A1AA]">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 rounded-3xl border border-[#27272A] bg-[#18181B] px-6 py-10 md:mt-20 md:px-12"
        >
          <div className="flex flex-col items-center justify-around gap-10 md:flex-row md:gap-4">
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <span className="gradient-text text-4xl font-extrabold font-[family-name:var(--font-space-grotesk)] md:text-5xl">
                  {stat.value}
                </span>
                <span className="mt-2 text-sm font-medium uppercase tracking-wider text-[#A1A1AA]">
                  {stat.label}
                </span>
                {/* Divider (mobile only between items) */}
                {i < stats.length - 1 && (
                  <div className="mt-10 h-px w-16 bg-gradient-to-r from-[#2563EB] to-[#E91E8C] md:hidden" />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
