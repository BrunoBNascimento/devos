---
description: Report current workspace status — active workflows, repo branches, digest info
---

Quickly report:
1. Scan `.devos/memory/state/` for active workflow artifacts and their current `phase`
2. Show repository status from `.devos/memory/state/_repos_status.json` if available
3. Report last digest date from `.devos/memory/digests/`
4. List any pending HITL gates

Keep output concise — table format preferred.
