Read AGENTS.md first.

Goal: fix one bug with the smallest safe change.

Before editing, state:
1. observed bug
2. likely root cause
3. files to inspect
4. verification command

Workflow:
1. Reproduce or identify the failing path.
2. Read the smallest relevant code area.
3. Find one nearby example or existing pattern.
4. Patch only the root cause.
5. Add or update a focused test if practical.
6. Run verification.

Rules:
- Do not refactor while fixing.
- Do not change unrelated behavior.
- If the bug cannot be reproduced, explain the best evidence and residual risk.