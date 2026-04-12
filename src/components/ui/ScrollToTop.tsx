'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  /** Scroll Y threshold (px) before the button appears. Default 240. */
  threshold?: number;
  /** aria-label override. Default: "ページ上部へ戻る". */
  ariaLabel?: string;
}

/**
 * Floating "scroll to top" pill — translucent overlay in the top-right corner,
 * visible whenever the user has scrolled past `threshold` px. Uses
 * backdrop-blur for the overlay feel so page content is faintly visible behind
 * the button. Respects `prefers-reduced-motion` (instant scroll).
 */
export function ScrollToTop({ threshold = 240, ariaLabel = 'ページ上部へ戻る' }: ScrollToTopProps) {
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
      className={`fixed top-3 right-3 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-soil-elevated/70 backdrop-blur-md text-washi-cream border border-washi-cream/15 shadow-lg shadow-soil-bg/60 transition-all duration-200 hover:bg-moss-primary/80 hover:border-moss-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-light ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'
      }`}
    >
      <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
