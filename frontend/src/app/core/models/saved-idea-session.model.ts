import { SavedIdea } from './saved-idea.model';

export class SavedIdeaSession {
  id!: number;
  userId!: number;
  domain!: string;
  provider!: string | null;
  model!: string | null;
  nightly!: boolean;
  unread!: boolean;
  createdAt!: string;
  updatedAt!: string;
  ideas?: SavedIdea[];
  ideasCount?: number;
}
