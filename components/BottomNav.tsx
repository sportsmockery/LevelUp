'use client';

import { Home, Upload, LineChart, Calendar } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/upload', icon: Upload, label: 'Upload' },
  { href: '/stats', icon: LineChart, label: 'Stats' },
  { href: '/plan', icon: Calendar, label: 'Plan' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1">
              <Icon
                size={20}
                className={active ? 'text-[#2563EB]' : 'text-zinc-500'}
              />
              <span className={`text-[10px] ${active ? 'text-[#2563EB] font-medium' : 'text-zinc-500'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
