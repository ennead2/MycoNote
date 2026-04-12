'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, BookOpen, Search, Map, FileText, Settings } from 'lucide-react';
import { UI_TEXT } from '@/constants/ui-text';

const NAV_ITEMS = [
  { href: '/', label: UI_TEXT.nav.home, Icon: House },
  { href: '/zukan', label: UI_TEXT.nav.zukan, Icon: BookOpen },
  { href: '/identify', label: UI_TEXT.nav.identify, Icon: Search },
  { href: '/plan', label: UI_TEXT.nav.plan, Icon: Map },
  { href: '/records', label: UI_TEXT.nav.records, Icon: FileText },
  { href: '/settings', label: UI_TEXT.nav.settings, Icon: Settings },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-soil-surface border-t border-border">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center flex-1 py-2 pb-3 text-[10px] gap-1 transition-colors ${
                isActive ? 'text-moss-light' : 'text-washi-dim hover:text-washi-muted'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b bg-moss-light"
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className="mono-data tracking-wider">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
