Read AGENTS.md first.
Read documents/HANDOFF.md and documents/STATUS.md.

Before editing, state:
1. task goal
2. change type
3. files you will touch
4. verification command

Rules:
- Make the smallest possible change.
- Do not refactor unrelated code.
- Do not rewrite whole files for small edits.
- Read the target file before editing.
- Re-read the changed section after editing.
- Preserve Hebrew and UTF-8 text exactly.

After editing:
- Run the smallest useful verification.
- Report changed files and verification result.
- Update HANDOFF, STATUS, and LOG if project state changed.