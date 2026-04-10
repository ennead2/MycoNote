import { describe, it, expect, vi, beforeEach } from 'vitest';
import { identifyMushroom, streamPlanChat, getApiKey, testApiKey } from './claude';
import type { Base64Image, CompactMushroom, ChatMessage, PlanContext } from '@/types/chat';

// globalThis.fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// localStorage モック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  mockFetch.mockReset();
  localStorageMock.clear();
});

describe('getApiKey', () => {
  it('returns null when no key is set', () => {
    expect(getApiKey()).toBeNull();
  });

  it('returns the stored key', () => {
    localStorageMock.setItem('anthropic_api_key', 'sk-ant-test123');
    expect(getApiKey()).toBe('sk-ant-test123');
  });
});

describe('identifyMushroom', () => {
  const images: Base64Image[] = [{ data: 'base64data', mediaType: 'image/jpeg' }];
  const mushroomList: CompactMushroom[] = [
    { id: 'hiratake', name_ja: 'ヒラタケ', scientific: 'Pleurotus ostreatus', toxicity: 'edible' },
  ];

  it('returns parsed identify result on success', async () => {
    const apiResponse = {
      candidates: [{ id: 'hiratake', name_ja: 'ヒラタケ', confidence: 'high', reason: '形状一致' }],
      cautions: ['要確認'],
      similar_toxic: ['ツキヨタケ'],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(apiResponse) }],
      }),
    });

    const result = await identifyMushroom({ apiKey: 'sk-ant-test', images, mushroomList });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name_ja).toBe('ヒラタケ');
    expect(result.similar_toxic).toContain('ツキヨタケ');
  });

  it('sends correct headers including dangerous-direct-browser-access', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"candidates":[],"cautions":[],"similar_toxic":[]}' }],
      }),
    });

    await identifyMushroom({ apiKey: 'sk-ant-test', images, mushroomList });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
    expect(options.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('throws with user-friendly message on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(identifyMushroom({ apiKey: 'bad-key', images, mushroomList }))
      .rejects.toThrow('APIキーが無効です');
  });

  it('throws with user-friendly message on 429', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(identifyMushroom({ apiKey: 'sk-ant-test', images, mushroomList }))
      .rejects.toThrow('リクエストが多すぎます');
  });
});

describe('testApiKey', () => {
  it('returns true on successful API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    const result = await testApiKey('sk-ant-valid');
    expect(result).toBe(true);
  });

  it('returns false on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await testApiKey('sk-ant-invalid');
    expect(result).toBe(false);
  });
});

describe('streamPlanChat', () => {
  it('calls onChunk for each SSE data event', async () => {
    const sseBody = [
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"こんにちは"}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"！"}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
      '',
    ].join('\n');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseBody));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({ ok: true, body: stream });

    const chunks: string[] = [];
    const context: PlanContext = { currentMonth: 4, recordsSummary: 'なし' };
    const messages: ChatMessage[] = [{ role: 'user', content: 'テスト' }];

    await streamPlanChat({
      apiKey: 'sk-ant-test',
      messages,
      context,
      onChunk: (text) => chunks.push(text),
    });

    expect(chunks).toEqual(['こんにちは', '！']);
  });
});
