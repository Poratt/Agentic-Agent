# Documentation Handoff

## Current Structure

```txt
documents/
  STATUS.md
  LOG.md
  HANDOFF.md
  architecture-diagram.md
  audit/
  done/
  features/
    todo/
    incomplete/
  todo/
  incomplete/
```

## How To Use

- Put new approved feature plans in `documents/features/todo/`.
- Put unfinished drafts in `documents/features/incomplete/`.
- Move completed implementation plans to `documents/done/`.
- Put scan/review reports in `documents/audit/`.
- Keep `documents/architecture-diagram.md` updated when backend or frontend architecture changes.

## Notes For Next Agent

- `documents/todo/` and `documents/incomplete/` remain as compatibility folders, but new work should prefer `documents/features/`.
- Do not move `documents/done/` or `documents/audit/` unless explicitly asked.
- For code architecture changes, update `documents/architecture-diagram.md` or explicitly state that no diagram update was needed.
- The LLM service refactor is implemented at build level. Runtime checks that require a live server, JWT, and provider credentials should still be performed manually.
- `documents/done/llm-service-refactor-plan.md` is now closed.
- Next likely cleanup: split `gen-ui-spec.constant.ts` into a stable base template plus smaller consistent endpoint hints.
