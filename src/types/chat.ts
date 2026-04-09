export interface Base64Image {
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompactMushroom {
  id: string;
  name_ja: string;
  scientific: string;
  toxicity: string;
}

export interface IdentifyCandidate {
  id: string | null;
  name_ja: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface IdentifyResult {
  candidates: IdentifyCandidate[];
  cautions: string[];
  similar_toxic: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PlanContext {
  date?: string;
  location?: string;
  targetSpecies?: string[];
  experienceLevel?: ExperienceLevel;
  currentMonth: number;
  recordsSummary: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context: PlanContext;
  created_at: string;
  updated_at: string;
}
