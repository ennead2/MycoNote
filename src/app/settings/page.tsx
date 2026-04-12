'use client';
import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { useRecords } from '@/contexts/RecordsContext';
import { testApiKey } from '@/lib/claude';
import { UI_TEXT } from '@/constants/ui-text';
import { buildExportData, downloadExportFile, parseImportFile, importData } from '@/lib/export-import';
import type { ImportResult } from '@/types/export';

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
                className="rounded-lg bg-soil-surface border border-moss-primary px-3 py-2 text-sm text-moss-light hover:text-washi-muted"
                aria-label={showKey ? UI_TEXT.settings.apiKeyHide : UI_TEXT.settings.apiKeyShow}
              >
                {showKey ? '🙈' : '👁'}
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
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="include-photos"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="rounded border-moss-primary bg-soil-surface text-washi-dim"
              />
              <label htmlFor="include-photos" className="text-xs text-moss-light">
                {UI_TEXT.settings.exportIncludePhotos}
              </label>
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
              className="hidden"
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
              <dd className="text-washi-cream">{UI_TEXT.settings.version}</dd>
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
          <p className="text-xs text-moss-light">図鑑データ: Wikipedia日本語版 (CC BY-SA 4.0)</p>
          <p className="text-xs text-moss-light">写真: Wikimedia Commons (CC BY / CC BY-SA)</p>
        </section>
      </div>
    </div>
  );
}
