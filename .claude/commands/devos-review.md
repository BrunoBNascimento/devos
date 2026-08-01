---
description: Standalone code review with Brain KB cross-reference
---

Read the review skill at `.devos/skills/review/SKILL.md` and execute it against the current changes in the workspace.

This will:
1. Read ALL knowledge entries from `.devos/memory/brain_kb/`
2. Diff current changes against the base branch
3. Run the full review checklist (correctness, security, performance, maintainability)
4. Cross-reference with known gotchas and traps
5. Issue a verdict

This review runs for ANY code change, not just those from `/devos.develop`.
