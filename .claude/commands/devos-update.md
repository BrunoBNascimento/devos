---
description: Incremental context refresh — re-ingest only what changed since last digest
---

Read and execute the DevOS update workflow at `.devos/workflows/update_workflow.md`.

This will:
1. Find the last digest and its timestamp
2. Only fetch items created/updated since then
3. Reconcile task statuses (merged, closed, resolved)
4. Generate an updated digest highlighting changes
