import { IDENTIFY_SYSTEM_PROMPT, buildIdentifyPrompt, buildPlanSystemPrompt } from '@/constants/prompts';
import type { Base64Image, CompactMushroom, IdentifyResult, ChatMessage, PlanContext } from '@/types/chat';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const IDENTIFY_MODEL = 'claude-opus-4-6';
const PLAN_MODEL = 'claude-sonnet-4-6';

export function getApiKey(): string | null {
  return localStorage.getItem('anthropic_api_key');
}

function apiHeaders(apiKey: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

function handleApiError(status: number): never {
  if (status === 401) throw new Error('APIキーが無効です。設定画面で確認してください。');
  if (status === 429) throw new Error('リクエストが多すぎます。しばらく待ってから再試行してください。');
  throw new Error('サーバーエラーが発生しました。再試行してください。');
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders(apiKey),
      body: JSON.stringify({
        model: PLAN_MODEL,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function identifyMushroom(params: {
  apiKey: string;
  images: Base64Image[];
  mushroomList: CompactMushroom[];
}): Promise<IdentifyResult> {
  const { apiKey, images, mushroomList } = params;

  const imageContent = images.map((img) => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: img.mediaType, data: img.data },
  }));

  const textContent = {
    type: 'text' as const,
    text: buildIdentifyPrompt(mushroomList),
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: IDENTIFY_MODEL,
      max_tokens: 2048,
      system: IDENTIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [...imageContent, textContent] }],
    }),
  });

  if (!response.ok) handleApiError(response.status);

  const data = await response.json();
  const text = data.content[0].text;

  // JSON部分を抽出（マークダウンコードブロック内の場合に対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('識別結果のパースに失敗しました');

  return JSON.parse(jsonMatch[0]) as IdentifyResult;
}

export async function streamPlanChat(params: {
  apiKey: string;
  messages: ChatMessage[];
  context: PlanContext;
  onChunk: (text: string) => void;
}): Promise<void> {
  const { apiKey, messages, context, onChunk } = params;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: PLAN_MODEL,
      max_tokens: 4096,
      stream: true,
      system: buildPlanSystemPrompt(context),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) handleApiError(response.status);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6);
      if (jsonStr === '[DONE]') return;

      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          onChunk(event.delta.text);
        }
      } catch {
        // JSON パースエラーは無視（不完全な行）
      }
    }
  }
}
