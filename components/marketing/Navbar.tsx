'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToWaitlist = () => {
    setMobileOpen(false);
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-[#27272A]'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center">
            <Image
              src="/logo.png"
              alt="LevelUp Wrestling"
              width={160}
              height={60}
              className="h-10 w-auto md:h-12"
              priority
            />
          </a>

          {/* Desktop nav + CTA */}
          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Testimonials', href: '#testimonials' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#A1A1AA] transition-colors hover:text-white font-[family-name:var(--font-plus-jakarta)]"
              >
                {link.label}
              </a>
            ))}
            <motion.button
              onClick={scrollToWaitlist}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2563EB]/20 transition-shadow hover:shadow-[#2563EB]/40 font-[family-name:var(--font-plus-jakarta)] cursor-pointer"
            >
              Get Early Access
            </motion.button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#A1A1AA] hover:text-white md:hidden cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-[#27272A] bg-[#0A0A0A]/95 backdrop-blur-lg md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-6">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Testimonials', href: '#testimonials' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-white active:bg-[#18181B] font-[family-name:var(--font-plus-jakarta)]"
                >
                  {link.label}
                </a>
              ))}
              <motion.button
                onClick={scrollToWaitlist}
                whileTap={{ scale: 0.97 }}
                className="mt-3 w-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#E91E8C] px-6 py-3.5 text-base font-bold text-white font-[family-name:var(--font-plus-jakarta)] cursor-pointer"
              >
                Get Early Access
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
