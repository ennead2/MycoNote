'use client';
import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Sparkles, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApp } from '@/contexts/AppContext';
import { useRecords } from '@/contexts/RecordsContext';
import { testApiKey } from '@/lib/claude';
import { UI_TEXT } from '@/constants/ui-text';
import { APP_VERSION_LABEL } from '@/constants/app-info';
import { buildExportData, downloadExportFile, parseImportFile, importData } from '@/lib/export-import';
import type { ImportResult } from '@/types/export';
import type { MigrationRecord } from '@/types/migration';

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const { reload: reloadRecords } = useRecords();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.apiKey) {
      setKeyInput(state.apiKey);
      setConnectionStatus('connected');
    }
  }, [state.apiKey]);

  const maskedKey = (key: string) => {
    if (key.length <= 12) return '•'.repeat(key.length);
    return key.slice(0, 7) + '•'.repeat(key.length - 11) + key.slice(-4);
  };

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setConnectionStatus('testing');
    const valid = await testApiKey(keyInput.trim());
    if (valid) {
      dispatch({ type: 'SET_API_KEY', payload: keyInput.trim() });
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('failed');
    }
  };

  const handleDelete = () => {
    if (!confirm(UI_TEXT.settings.apiKeyDeleteConfirm)) return;
    dispatch({ type: 'SET_API_KEY', payload: null });
    setKeyInput('');
    setConnectionStatus('idle');
    setShowKey(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(UI_TEXT.settings.exporting);
    try {
      const data = await buildExportData(includePhotos, (msg) => setExportProgress(msg));
      downloadExportFile(data);
      setExportProgress(UI_TEXT.settings.exportComplete);
    } catch {
      setExportProgress(UI_TEXT.common.error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportError(null);
    setImportResult(null);

    const text = await file.text();
    const parsed = parseImportFile(text);

    if (!parsed.valid) {
      setImportError(parsed.error);
      return;
    }

    const data = parsed.data;
    const recordCount = data.records.length;
    const chatCount = data.chatSessions.length;
    const photoCount = data.photos?.length ?? 0;

    const summary = `${UI_TEXT.settings.importRecords} ${recordCount}件・${UI_TEXT.settings.importChats} ${chatCount}件${photoCount > 0 ? `・${UI_TEXT.settings.importPhotos} ${photoCount}枚` : ''}${UI_TEXT.settings.importConfirm}`;
    if (!confirm(summary)) return;

    setIsImporting(true);
    try {
      const result = await importData(data);
      setImportResult(result);
      await reloadRecords();
    } catch {
      setImportError(UI_TEXT.common.error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div>
      <PageHeader title={UI_TEXT.settings.title} />
      <div className="space-y-6 px-4 py-4">
        {/* Phase 13-F: お知らせセクション */}
        <NoticeSection migration={state.migration} />

        {/* APIキー設定セクション */}
        <section className="rounded-lg border border-border bg-soil-surface p-4">
          <h2 className="mb-3 text-sm font-bold text-moss-light">{UI_TEXT.settings.aiSection}</h2>
          <div className="mb-3">
            <label htmlFor="api-key-input" className="block text-xs text-moss-light mb-1">
              {UI_TEXT.settings.apiKeyLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={showKey ? keyInput : (keyInput ? maskedKey(keyInput) : '')}
                onChange={(e) => { setKeyInput(e.target.value); setConnectionStatus('idle'); }}
                onFocus={() => setShowKey(true)}
                placeholder={UI_TEXT.settings.apiKeyPlaceholder}
                className="flex-1 rounded-lg bg-soil-surface border border-moss-primary text-washi-cream placeholder-washi-dim px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-moss-light"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg bg-soil-surface border border-moss-primary px-3 py-2 text-moss-light hover:text-washi-muted transition-colors inline-flex items-center"
                aria-label={showKey ? UI_TEXT.settings.apiKeyHide : UI_TEXT.settings.apiKeyShow}
              >
                {showKey ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {connectionStatus !== 'idle' && (
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'failed' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-xs text-moss-light">
                {connectionStatus === 'testing' && UI_TEXT.settings.apiKeyTesting}
                {connectionStatus === 'connected' && UI_TEXT.settings.apiKeyConnected}
                {connectionStatus === 'failed' && UI_TEXT.settings.apiKeyFailed}
              </span>
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!keyInput.trim() || connectionStatus === 'testing'} className="flex-1">
              {connectionStatus === 'testing' ? UI_TEXT.settings.apiKeyTesting : UI_TEXT.settings.apiKeySave}
            </Button>
            {state.apiKey && (
              <Button variant="secondary" size="sm" onClick={handleDelete} className="text-red-400 border-red-800 hover:bg-red-900/30">
                {UI_TEXT.settings.apiKeyDelete}
              </Button>
            )}
          </div>
          <p className="text-xs text-washi-dim leading-relaxed">{UI_TEXT.settings.apiKeyDescription}</p>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-moss-light underline hover:text-moss-light mt-1 inline-block">
            {UI_TEXT.settings.apiKeyGetLink}
          </a>
        </section>

        {/* データ管理 */}
        <section className="rounded-lg border border-border bg-soil-surface p-4">
          <h2 className="mb-3 text-sm font-bold text-moss-light">{UI_TEXT.settings.dataSection}</h2>

          {/* エクスポート */}
          <div className="mb-4">
            <div className="mb-2">
              <Checkbox
                id="include-photos"
                checked={includePhotos}
                onChange={setIncludePhotos}
                label={UI_TEXT.settings.exportIncludePhotos}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? exportProgress : UI_TEXT.settings.exportButton}
            </Button>
          </div>

          {/* インポート */}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? UI_TEXT.settings.importing : UI_TEXT.settings.importButton}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="sr-only"
              onChange={handleImportFile}
            />
          </div>

          {/* インポート結果 */}
          {importResult && (
            <div className="mt-3 rounded-md bg-soil-surface p-3 text-xs text-moss-light">
              <p className="font-bold mb-1">{UI_TEXT.settings.importComplete}</p>
              <p>{UI_TEXT.settings.importRecords}: {importResult.recordsAdded}{UI_TEXT.settings.importAdded}（{importResult.recordsSkipped}{UI_TEXT.settings.importSkipped}）</p>
              <p>{UI_TEXT.settings.importChats}: {importResult.chatSessionsAdded}{UI_TEXT.settings.importAdded}（{importResult.chatSessionsSkipped}{UI_TEXT.settings.importSkipped}）</p>
              {(importResult.bookmarksAdded > 0 || importResult.bookmarksSkipped > 0) && (
                <p>{UI_TEXT.settings.importBookmarks}: {importResult.bookmarksAdded}{UI_TEXT.settings.importAdded}（{importResult.bookmarksSkipped}{UI_TEXT.settings.importSkipped}）</p>
              )}
              {importResult.photosAdded > 0 && (
                <p>{UI_TEXT.settings.importPhotos}: {importResult.photosAdded}{UI_TEXT.settings.importAdded}</p>
              )}
            </div>
          )}

          {/* インポートエラー */}
          {importError && (
            <div className="mt-3 rounded-md bg-red-900/30 border border-red-800 p-3 text-xs text-red-300">
              {importError}
            </div>
          )}
        </section>

        {/* アプリ情報 */}
        <section className="rounded-lg border border-border bg-soil-surface p-4">
          <h2 className="mb-3 text-sm font-bold text-moss-light">{UI_TEXT.settings.appInfo}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-moss-light">アプリ名</dt>
              <dd className="text-washi-cream">{UI_TEXT.settings.appName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-moss-light">バージョン</dt>
              <dd className="text-washi-cream mono-data text-xs">{APP_VERSION_LABEL}</dd>
            </div>
            <div>
              <dt className="mb-1 text-moss-light">概要</dt>
              <dd className="text-washi-muted">{UI_TEXT.settings.appDescription}</dd>
            </div>
          </dl>
        </section>

        {/* ライセンス */}
        <section className="rounded-lg border border-border bg-soil-surface p-4">
          <h2 className="mb-2 text-sm font-bold text-moss-light">ライセンス</h2>
          <p className="text-xs text-moss-light">図鑑データ: Wikipedia 日本語版 (CC BY-SA 4.0) / 大菌輪 (CC BY 4.0) / 厚生労働省自然毒のリスクプロファイル (政府標準利用規約)</p>
          <p className="text-xs text-moss-light">写真: iNaturalist (各撮影者の CC ライセンス)</p>
          <p className="text-xs text-moss-light">分類: GBIF Backbone Taxonomy / 日本産菌類集覧 (CC BY 4.0)</p>
        </section>
      </div>
    </div>
  );
}

/**
 * Phase 13-F: お知らせセクション。v2 移行の経緯と migration 結果を恒久掲載。
 * 最新（v2.1）は常時展開、それ以外（v2.0 / 移行結果）はタップで開く details 形式。
 */
function NoticeSection({ migration }: { migration: MigrationRecord | null }) {
  const T = UI_TEXT.settings;
  return (
    <section className="rounded-lg border border-moss-light/30 bg-soil-elevated p-4">
      <h2 className="mb-3 text-sm font-bold text-moss-light flex items-center gap-2">
        <Sparkles size={16} aria-hidden="true" />
        {T.noticeSection}
      </h2>
      <div className="space-y-3">
        {/* v2.2 (最新、Phase 17) — 常時展開 */}
        <div>
          <h3 className="text-sm font-bold text-washi-cream mb-1">{T.noticeV22Title}</h3>
          <p className="text-xs text-washi-muted leading-relaxed">{T.noticeV22Body}</p>
        </div>
        {/* v2.1 (Phase 14) — 折り畳み */}
        <NoticeEntry title={T.noticeV21Title}>
          <p className="text-xs text-washi-muted leading-relaxed">{T.noticeV21Body}</p>
        </NoticeEntry>
        {/* v2.0 (Phase 13-F) — 折り畳み */}
        <NoticeEntry title={T.noticeV2Title}>
          <p className="text-xs text-washi-muted leading-relaxed">{T.noticeV2Body}</p>
        </NoticeEntry>
        {/* 移行結果 — 折り畳み */}
        {migration && (
          <NoticeEntry title={T.noticeMigrationLabel}>
            {migration.bookmarksDeleted === 0 && migration.recordsReset === 0 ? (
              <p className="text-xs text-washi-muted">{T.noticeMigrationNoChange}</p>
            ) : (
              <ul className="text-xs text-washi-muted space-y-0.5 list-disc list-inside">
                {migration.bookmarksDeleted > 0 && (
                  <li>{T.noticeMigrationBookmarks.replace('{n}', String(migration.bookmarksDeleted))}</li>
                )}
                {migration.recordsReset > 0 && (
                  <li>{T.noticeMigrationRecords.replace('{n}', String(migration.recordsReset))}</li>
                )}
              </ul>
            )}
            <p className="mono-data text-[10px] text-washi-dim mt-1.5">
              {T.noticeMigrationRanAt} {new Date(migration.ranAt).toLocaleString('ja-JP')}
            </p>
          </NoticeEntry>
        )}
      </div>
    </section>
  );
}

/**
 * 折り畳み可能なお知らせエントリ。<details> 要素でキーボード・スクリーンリーダ対応。
 * 上部の border-t は同じ親 space-y-3 の中で視覚的な区切りを保つため。
 */
function NoticeEntry({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-border pt-3">
      <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-bold text-washi-cream hover:text-moss-light transition-colors">
        <span>{title}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="text-washi-dim transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
