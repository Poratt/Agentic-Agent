/**
 * Hardcoded routing enum for LLM providers.
 *
 * Phase 1 supports exactly these 4 values. Adding a new provider type
 * requires a code change because routing and client logic both branch on it.
 *
 * `OLLAMA_CLOUD` is special: it is a virtual provider computed at read-time
 * from local Ollama discovery (`/api/tags`) filtered by the `cloud` flag.
 * It is never persisted to the DB and admin CRUD endpoints reject it.
 */
export enum ProviderType {
  /** OpenRouter hosted multi-model gateway. */
  OPENROUTER = "openrouter",
  /** NVIDIA NIM hosted inference. */
  NVIDIA = "nvidia",
  /** Locally running Ollama daemon. */
  OLLAMA = "ollama",
  /** Virtual provider: cloud-tagged Ollama models. Read-only, never created via CRUD. */
  OLLAMA_CLOUD = "ollama-cloud",
}
