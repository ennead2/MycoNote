'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/contexts/AppContext';
import { testApiKey } from '@/lib/claude';
import { UI_TEXT } from '@/constants/ui-text';

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');

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

  return (
    <div>
      <PageHeader title={UI_TEXT.settings.title} />
      <div className="space-y-6 px-4 py-4">
        {/* APIキー設定セクション */}
        <section className="rounded-lg border border-forest-700 bg-forest-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-forest-300">{UI_TEXT.settings.aiSection}</h2>
          <div className="mb-3">
            <label htmlFor="api-key-input" className="block text-xs text-forest-400 mb-1">
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
                className="flex-1 rounded-lg bg-forest-900 border border-forest-600 text-forest-100 placeholder-forest-500 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg bg-forest-900 border border-forest-600 px-3 py-2 text-sm text-forest-400 hover:text-forest-200"
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
              <span className="text-xs text-forest-300">
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
          <p className="text-xs text-forest-500 leading-relaxed">{UI_TEXT.settings.apiKeyDescription}</p>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-forest-400 underline hover:text-forest-300 mt-1 inline-block">
            {UI_TEXT.settings.apiKeyGetLink}
          </a>
        </section>

        {/* アプリ情報 */}
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

        {/* ライセンス */}
        <section className="rounded-lg border border-forest-700 bg-forest-800 p-4">
          <h2 className="mb-2 text-sm font-bold text-forest-300">ライセンス</h2>
          <p className="text-xs text-forest-400">図鑑データ: Wikipedia日本語版 (CC BY-SA 4.0)</p>
          <p className="text-xs text-forest-400">写真: Wikimedia Commons (CC BY / CC BY-SA)</p>
        </section>
      </div>
    </div>
  );
}
