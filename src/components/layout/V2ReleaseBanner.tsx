'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { UI_TEXT } from '@/constants/ui-text';

// v2.2 用に key を変更 → v2.1 を dismiss 済のユーザーにも v2.2 告知が表示される
const STORAGE_KEY = 'v2-2-release-banner-dismissed';

/**
 * Phase 13-F (v2.0) / Phase 14 (v2.1) / Phase 17 (v2.2): リリース告知バナー。layout に置いて全画面で表示。
 * - 初回マウント時に localStorage を読み、dismiss されていれば描画しない。
 * - × ボタンで dismiss → localStorage に flag を保存し再描画しない。
 * - バージョン毎に STORAGE_KEY を切り替えて再告知。
 */
export function V2ReleaseBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
    // 旧 key を掃除 (履歴整理のため、新 key 優先)
    try {
      localStorage.removeItem('v2-release-banner-dismissed');
      localStorage.removeItem('v2-1-release-banner-dismissed');
    } catch {}
  }, []);

  if (!mounted || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="v2.1 リリース告知"
      className="bg-soil-elevated border-b border-moss-light/30 px-4 py-3"
    >
      <div className="max-w-lg mx-auto flex items-start gap-3">
        <Sparkles size={18} className="text-moss-light shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0 text-xs leading-relaxed">
          <p className="font-bold text-washi-cream mb-0.5">{UI_TEXT.banner.v2Title}</p>
          <p className="text-washi-muted">
            {UI_TEXT.banner.v2Body.split('設定 > お知らせ')[0]}
            <Link href="/settings" className="text-moss-light hover:text-washi-cream underline mx-0.5">
              設定 &gt; お知らせ
            </Link>
            {UI_TEXT.banner.v2Body.split('設定 > お知らせ')[1] ?? ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={UI_TEXT.banner.dismiss}
          className="shrink-0 text-washi-dim hover:text-washi-cream transition-colors p-1 -m-1"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
