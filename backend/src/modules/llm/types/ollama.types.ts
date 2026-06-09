export type OllamaModel = {
  name: string;
  size?: number;
  details?: {
    family?: string;
  };
};

export type OllamaTagsResponse = {
  models?: OllamaModel[];
};