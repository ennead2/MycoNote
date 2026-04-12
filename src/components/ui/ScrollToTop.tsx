'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  /** Scroll Y threshold (px) before the button appears. Default 400. */
  threshold?: number;
  /** aria-label override. Default: "ページ上部へ戻る". */
  ariaLabel?: string;
}

/**
 * Floating "scroll to top" button. Appears after scrolling past `threshold` px,
 * placed above BottomNav (fixed bottom-20 right-4). CSS-only transition for
 * fade-in/out. Respects `prefers-reduced-motion` (instant scroll).
 */
export function ScrollToTop({ threshold = 400, ariaLabel = 'ページ上部へ戻る' }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const handleClick = () => {
    if (typeof window === 'undefined') return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-20 right-4 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-moss-primary text-washi-cream shadow-lg shadow-soil-bg/60 border border-moss-light/30 transition-all duration-200 hover:bg-moss-light hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-light ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-2'
      }`}
    >
      <ArrowUp size={20} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
