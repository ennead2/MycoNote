'use client';

/**
 * App Router template — re-mounts on every navigation.
 * Applies a subtle fade-in on route change (DESIGN.md motion: 300ms ease-out).
 * Unlike layout.tsx, children here remount on path change, triggering the animation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
