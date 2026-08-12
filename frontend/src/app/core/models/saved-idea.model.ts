export class SavedIdea {
  id!: number;
  userId!: number;
  sessionId!: number;
  title!: string;
  description!: string;
  targetMarket!: string;
  validationScore!: number;
  validationBreakdown?: { competition: number; signalFit: number; feasibility: number; marketSize: number };
  validationReason!: string;
  risks!: string[];
  competitors!: string[];
  nextSteps!: string[];
  signalsReferenced!: string[];
  groundedInSignals!: boolean;
  isFavorite!: boolean;
  createdAt!: string;
}
