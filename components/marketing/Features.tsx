'use client';

import { motion } from 'framer-motion';
import {
  Video,
  Target,
  Trophy,
  TrendingUp,
  Users,
  Shield,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  accent: 'blue' | 'pink';
}

const features: Feature[] = [
  {
    icon: Video,
    title: 'AI Video Analysis',
    description:
      'Upload any match and get instant technique scores, position breakdowns, and personalized drill recommendations \u2014 all powered by GPT-4o vision.',
    accent: 'blue',
  },
  {
    icon: Target,
    title: 'Opponent Scouting',
    description:
      'AI-powered scout reports on upcoming opponents. Know their tendencies, weaknesses, and best counter-strategies before you step on the mat.',
    accent: 'pink',
  },
  {
    icon: Trophy,
    title: 'Gamified Training',
    description:
      'Earn XP for every upload, drill, and milestone. Level up from White Belt to Elite with badges, streaks, and leaderboards that make practice addictive.',
    accent: 'blue',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Paths',
    description:
      'AI simulates bracket scenarios and predicts optimal weight classes. Get a data-driven roadmap so your wrestler dominates the right division.',
    accent: 'pink',
  },
  {
    icon: Users,
    title: 'Family Dashboard',
    description:
      'Parents track progress, coaches manage rosters, and kids see their growth \u2014 all in one place. Weekly reports delivered to your inbox.',
    accent: 'blue',
  },
  {
    icon: Shield,
    title: 'Safe & Private',
    description:
      'Built for kids ages 8\u201314 with COPPA compliance, no ads, and zero data sharing. Your family\u2019s information stays yours.',
    accent: 'pink',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

export default function Features() {
  return (
    <section
      id="features"
      className="relative py-24 px-6 md:px-12 lg:px-24 bg-[#0A0A0A] grid-bg"
    >
      {/* Section header */}
      <div className="mx-auto max-w-6xl text-center mb-16">
        <motion.h2
          className="gradient-text text-4xl md:text-5xl font-bold font-[family-name:var(--font-space-grotesk)] mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          Everything Your Wrestler Needs
        </motion.h2>
        <motion.p
          className="text-[#A1A1AA] text-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Powered by AI. Designed for kids. Loved by parents.
        </motion.p>
      </div>

      {/* Feature cards grid */}
      <motion.div
        className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const isBlue = feature.accent === 'blue';

          return (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group bg-[#18181B] rounded-3xl p-8 border border-[#27272A] transition-all duration-300 hover:scale-[1.03] hover:border-transparent"
              style={{
                // Use a custom property so the hover border can reference the accent
              }}
              whileHover={{
                borderColor: isBlue ? '#2563EB' : '#E91E8C',
              }}
            >
              {/* Icon container */}
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-2xl mb-5 ${
                  isBlue
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'bg-[#E91E8C]/10 text-[#E91E8C]'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="font-bold text-xl text-white font-[family-name:var(--font-space-grotesk)] mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA banner */}
      <motion.div
        className="mx-auto max-w-6xl mt-16 rounded-3xl p-10 md:p-14 text-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(233, 30, 140, 0.10))',
        }}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-space-grotesk)] mb-6">
          Ready to see your wrestler level up?
        </h3>
        <a
          href="#waitlist"
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#2563EB] text-white font-semibold text-base transition-all duration-300 hover:bg-[#1d4ed8] glow-blue hover:scale-105"
        >
          Join the Waitlist
        </a>
      </motion.div>
    </section>
  );
}
