import { Mail } from 'lucide-react';
import Image from 'next/image';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Waitlist', href: '#waitlist' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'COPPA Compliance', href: '#' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#27272A] bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Image
              src="/logo.png"
              alt="LevelUp Wrestling"
              width={180}
              height={68}
              className="h-14 w-auto"
            />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#A1A1AA] font-[family-name:var(--font-plus-jakarta)]">
              The AI-powered wrestling app for young champions.
            </p>
            <p className="mt-6 text-xs text-[#A1A1AA]/60 font-[family-name:var(--font-plus-jakarta)]">
              &copy; {new Date().getFullYear()} LevelUp Wrestling. All rights reserved.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white font-[family-name:var(--font-space-grotesk)]">
              Navigate
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[#A1A1AA] transition-colors hover:text-white font-[family-name:var(--font-plus-jakarta)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white font-[family-name:var(--font-space-grotesk)]">
              Legal
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[#A1A1AA] transition-colors hover:text-white font-[family-name:var(--font-plus-jakarta)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white font-[family-name:var(--font-space-grotesk)]">
              Contact
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a
                  href="mailto:hello@levelupwrestling.com"
                  className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] transition-colors hover:text-white font-[family-name:var(--font-plus-jakarta)]"
                >
                  <Mail className="h-4 w-4" />
                  hello@levelupwrestling.com
                </a>
              </li>
            </ul>

            {/* Social icons placeholder */}
            <div className="mt-6 flex gap-3">
              {['X', 'IG', 'YT'].map((platform) => (
                <a
                  key={platform}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272A] bg-[#18181B] text-xs font-medium text-[#A1A1AA] transition-colors hover:border-[#3F3F46] hover:text-white font-[family-name:var(--font-plus-jakarta)]"
                  aria-label={platform}
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#27272A]/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-[#A1A1AA]/50 font-[family-name:var(--font-plus-jakarta)]">
            Made with &#10084;&#65039; for the wrestling community
          </p>
        </div>
      </div>
    </footer>
  );
}
