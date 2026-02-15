'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import Image from 'next/image';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const avatarColors = ['#2563EB', '#E91E8C', '#7C3AED', '#10B981', '#F59E0B'];

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden grid-bg">
      {/* Background decorative blurs */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[#2563EB] opacity-20 blur-[120px]"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#E91E8C] opacity-20 blur-[120px]"
      />
      <motion.div
        animate={{
          y: [0, 15, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="pointer-events-none absolute left-1/2 top-16 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#7C3AED] opacity-10 blur-[100px]"
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex max-w-4xl flex-col items-center gap-8"
        >
          {/* Logo */}
          <motion.div variants={fadeUp}>
            <Image
              src="/logo.png"
              alt="LevelUp Wrestling"
              width={400}
              height={150}
              className="h-32 w-auto sm:h-40 md:h-48"
              priority
            />
          </motion.div>

          {/* Badge */}
          <motion.div variants={fadeUp}>
            <span className="gradient-border inline-flex items-center gap-2 rounded-full bg-[#18181B]/80 px-5 py-2 text-sm font-medium text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
              <span className="text-base">&#127942;</span>
              The #1 AI Wrestling App for Kids
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-3xl font-bold leading-tight tracking-tight font-[family-name:var(--font-space-grotesk)] sm:text-5xl md:text-7xl"
          >
            <span className="text-white">
              Level Up Your Kid&apos;s Wrestling Game
            </span>
            <br />
            <span className="gradient-text">The AI Coach in Their Pocket</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-2xl text-lg leading-relaxed text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)] md:text-xl"
          >
            Gamified drills, instant video breakdowns, and personalized paths to
            podiums — designed for wrestlers ages 8-14 who want to go from good
            to unstoppable.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <motion.a
              href="#waitlist"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#2563EB]/25 transition-shadow hover:shadow-[#2563EB]/40 font-[family-name:var(--font-plus-jakarta)] sm:text-lg"
            >
              Get Early Access
            </motion.a>
            <motion.a
              href="#features"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center rounded-2xl border border-[#27272A] bg-transparent px-8 py-4 text-base font-bold text-white transition-colors hover:border-[#3F3F46] hover:bg-[#18181B]/50 font-[family-name:var(--font-plus-jakarta)] sm:text-lg"
            >
              See How It Works
            </motion.a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-3 pt-4 sm:flex-row"
          >
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {avatarColors.map((color, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-[#0A0A0A]"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Stars */}
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className="fill-[#F59E0B] text-[#F59E0B]"
                  />
                ))}
              </div>
              <span className="text-sm text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
                Join 5,000+ families already on the waitlist
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
