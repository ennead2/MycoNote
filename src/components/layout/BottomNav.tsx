'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UI_TEXT } from '@/constants/ui-text';

const NAV_ITEMS = [
  { href: '/zukan', label: UI_TEXT.nav.zukan, icon: '📖' },
  { href: '/identify', label: UI_TEXT.nav.identify, icon: '🔍' },
  { href: '/plan', label: UI_TEXT.nav.plan, icon: '🗺' },
  { href: '/records', label: UI_TEXT.nav.records, icon: '📝' },
  { href: '/settings', label: UI_TEXT.nav.settings, icon: '⚙' },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-forest-900 border-t border-forest-700">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center justify-center flex-1 py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-forest-300' : 'text-forest-500'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
