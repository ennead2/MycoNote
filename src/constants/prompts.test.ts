import { describe, it, expect } from 'vitest';
import { buildIdentifyPrompt, buildPlanSystemPrompt } from './prompts';
import type { CompactMushroom, PlanContext } from '@/types/chat';

describe('buildIdentifyPrompt', () => {
  it('includes mushroom list in user message', () => {
    const list: CompactMushroom[] = [
      { id: 'matsutake', name_ja: 'マツタケ', scientific: 'Tricholoma matsutake', toxicity: 'edible' },
    ];
    const result = buildIdentifyPrompt(list);
    expect(result).toContain('マツタケ');
    expect(result).toContain('Tricholoma matsutake');
    expect(result).toContain('edible');
  });

  it('uses pipe-delimited compact format', () => {
    const list: CompactMushroom[] = [
      { id: 'amanita', name_ja: 'タマゴテングタケ', scientific: 'Amanita phalloides', toxicity: 'deadly_toxic' },
    ];
    const result = buildIdentifyPrompt(list);
    expect(result).toContain('amanita|タマゴテングタケ|Amanita phalloides|deadly_toxic');
  });
});

describe('buildPlanSystemPrompt', () => {
  it('injects context values into system prompt', () => {
    const context: PlanContext = {
      date: '2026-04-12',
      location: '高尾山',
      targetSpecies: ['ヒラタケ'],
      experienceLevel: 'intermediate',
      currentMonth: 4,
      recordsSummary: '過去に3回採取経験あり',
    };
    const result = buildPlanSystemPrompt(context);
    expect(result).toContain('4');
    expect(result).toContain('2026-04-12');
    expect(result).toContain('高尾山');
    expect(result).toContain('ヒラタケ');
    expect(result).toContain('中級者');
    expect(result).toContain('過去に3回採取経験あり');
  });

  it('handles missing optional fields gracefully', () => {
    const context: PlanContext = {
      currentMonth: 10,
      recordsSummary: 'なし',
    };
    const result = buildPlanSystemPrompt(context);
    expect(result).toContain('10');
    expect(result).toContain('未設定');
    expect(result).toContain('なし');
  });
});
