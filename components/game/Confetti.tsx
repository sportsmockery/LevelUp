'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti({ trigger }: { trigger?: boolean }) {
  const fired = useRef(false);

  useEffect(() => {
    if (trigger && !fired.current) {
      fired.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#E91E8C', '#FFFFFF'],
      });
    }
  }, [trigger]);

  return null;
}
