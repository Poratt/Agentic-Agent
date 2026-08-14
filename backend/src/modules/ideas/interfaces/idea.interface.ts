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
  riskPenalty: number;  // 0-3, subtracted from the final score server-side
}

export interface ValidationResult {
  validationScore?: number;
  validationBreakdown?: ValidationBreakdown;
  validationReason: string;
  risks: string[];
  competitors: string[];
  nextSteps: string[];
  signalsReferenced: string[];
  techStackSuggestion?: string;
  firstDistributionStep?: string;
  estimatedMvpDays?: number;
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
  techStackSuggestion?: string; // concrete stack for a fast solo-dev MVP
  firstDistributionStep?: string; // first zero-budget distribution channel
  estimatedMvpDays?: number; // estimated days to MVP for one developer
}

export interface GenerateIdeasResponse {
  success: boolean;
  message: string;
  partial: boolean; // true if some ideas failed due to timeout/error
  result: BusinessIdea[];
  failedCount?: number; // present only when partial === true
}

/** A discovered niche/domain returned by topic discovery (nightly cron).
 *  `domain` is Hebrew for display, `searchQuery` is the English search term
 *  used for web searches, `rationale` explains the opportunity. */
export interface DiscoveredTopic {
  domain: string;
  searchQuery?: string;
  rationale: string;
}

export type IdeasProgressEvent =
  | { phase: 0; status: string }
  | { phase: 1; status: string }
  | { phase: 2; status: string; ideaIndex?: number; idea?: BusinessIdea }
  | { phase: 'done'; result: GenerateIdeasResponse };
