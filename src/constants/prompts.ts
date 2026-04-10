import type { CompactMushroom, PlanContext } from '@/types/chat';

export const IDENTIFY_SYSTEM_PROMPT = `あなたはキノコの識別を補助するアシスタントです。
提供された写真と図鑑データをもとに、可能性のあるキノコの種類を提示してください。

【重要な制約】
- 断定的な識別は行わない
- 必ず複数の候補を提示する
- 毒キノコの可能性がある場合は必ず警告する
- 採取の最終判断は専門家または経験者に委ねるよう案内する

出力は必ず以下のJSON形式で返してください：
{
  "candidates": [
    { "id": "図鑑ID or null", "name_ja": "和名", "confidence": "high|medium|low", "reason": "根拠" }
  ],
  "cautions": ["注意点の配列"],
  "similar_toxic": ["似ている毒キノコの和名の配列"]
}`;

const PLAN_SYSTEM_TEMPLATE = `あなたはキノコ採取の安全なアドバイザーです。
ユーザーの採取計画立案を、安全を最優先にサポートしてください。

【コンテキスト】
現在の月: {{current_month}}
予定日: {{date}}
場所: {{location}}
ターゲット種: {{target_species}}
経験レベル: {{experience_level}}
ユーザーの過去の採取記録: {{records_summary}}

【ガイドライン】
- 毒キノコとの誤認リスクについて積極的に言及する
- 採取が禁止されているエリア（国立公園等）への注意を促す
- 天気・装備・同行者についても適切にアドバイスする
- 不確かな情報は断定せず、確認を促す`;

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: '初心者',
  intermediate: '中級者',
  advanced: '上級者',
};

export function buildIdentifyPrompt(mushroomList: CompactMushroom[]): string {
  const lines = mushroomList.map(
    (m) => `${m.id}|${m.name_ja}|${m.scientific}|${m.toxicity}`
  );
  return `以下は図鑑に収録されているキノコのリストです（id|和名|学名|毒性）:\n${lines.join('\n')}`;
}

export function buildPlanSystemPrompt(context: PlanContext): string {
  return PLAN_SYSTEM_TEMPLATE
    .replace('{{current_month}}', String(context.currentMonth))
    .replace('{{date}}', context.date ?? '未設定')
    .replace('{{location}}', context.location ?? '未設定')
    .replace('{{target_species}}', context.targetSpecies?.join(', ') ?? '未設定')
    .replace('{{experience_level}}', context.experienceLevel ? EXPERIENCE_LABELS[context.experienceLevel] ?? context.experienceLevel : '未設定')
    .replace('{{records_summary}}', context.recordsSummary);
}
