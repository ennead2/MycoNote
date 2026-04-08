'use client';
import PageHeader from '@/components/layout/PageHeader';
import { UI_TEXT } from '@/constants/ui-text';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title={UI_TEXT.settings.title} />
      <div className="space-y-6 px-4 py-4">
        <section className="rounded-lg border border-forest-700 bg-forest-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-forest-300">{UI_TEXT.settings.appInfo}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-forest-400">アプリ名</dt>
              <dd className="text-forest-100">{UI_TEXT.settings.appName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-forest-400">バージョン</dt>
              <dd className="text-forest-100">{UI_TEXT.settings.version}</dd>
            </div>
            <div>
              <dt className="mb-1 text-forest-400">概要</dt>
              <dd className="text-forest-200">{UI_TEXT.settings.appDescription}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-forest-700 bg-forest-800 p-4">
          <h2 className="mb-2 text-sm font-bold text-forest-300">ライセンス</h2>
          <p className="text-xs text-forest-400">図鑑データ: Wikipedia日本語版 (CC BY-SA 4.0)</p>
          <p className="text-xs text-forest-400">写真: Wikimedia Commons (CC BY / CC BY-SA)</p>
        </section>
      </div>
    </div>
  );
}
