export class SavedIdea {
  id!: number;
  userId!: number;
  sessionId!: number;
  title!: string;
  description!: string;
  targetMarket!: string;
  validationScore!: number;
  validationBreakdown?: { competition: number; signalFit: number; feasibility: number; marketSize: number; riskPenalty?: number };
  validationReason!: string;
  risks!: string[];
  competitors!: string[];
  nextSteps!: string[];
  signalsReferenced!: string[];
  groundedInSignals!: boolean;
  techStackSuggestion?: string | null;
  firstDistributionStep?: string | null;
  estimatedMvpDays?: number | null;
  isFavorite!: boolean;
  createdAt!: string;
}
