export class SavedIdea {
  id!: number;
  userId!: number;
  sessionId!: number;
  title!: string;
  description!: string;
  targetMarket!: string;
  validationScore!: number;
  validationReason!: string | null;
  risks!: string[] | null;
  competitors!: string[] | null;
  nextSteps!: string[] | null;
  signalsReferenced!: string[] | null;
  groundedInSignals!: boolean;
  isFavorite!: boolean;
  createdAt!: string;
}
