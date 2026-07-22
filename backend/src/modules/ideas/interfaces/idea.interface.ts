export interface Signal {
  signal: string;
  source: string;
}

export interface RawIdea {
  title: string;
  description: string;
  targetMarket: string;
}

export interface ValidationBreakdown {
  competition: number;  // 0-3
  signalFit: number;    // 0-3
  feasibility: number;  // 0-2
  marketSize: number;   // 0-2
}

export interface ValidationResult {
  validationScore?: number;
  validationBreakdown?: ValidationBreakdown;
  validationReason: string;
  risks: string[];
  competitors: string[];
  nextSteps: string[];
  signalsReferenced: string[];
}

export interface BusinessIdea {
  title: string;
  description: string;
  targetMarket: string;
  validationScore: number; // 1–10
  validationBreakdown?: ValidationBreakdown;
  validationReason: string; // short Hebrew explanation
  risks: string[];
  competitors: string[]; // top 3–5 competitors found
  nextSteps: string[];
  signalsReferenced: string[]; // pain points / trends from signal gathering
  groundedInSignals: boolean; // false if Phase 0 failed → fallback mode
}

export interface GenerateIdeasResponse {
  success: boolean;
  message: string;
  partial: boolean; // true if some ideas failed due to timeout/error
  result: BusinessIdea[];
  failedCount?: number; // present only when partial === true
}

export type IdeasProgressEvent =
  | { phase: 0; status: string }
  | { phase: 1; status: string }
  | { phase: 2; status: string; ideaIndex?: number; idea?: BusinessIdea }
  | { phase: 'done'; result: GenerateIdeasResponse };
