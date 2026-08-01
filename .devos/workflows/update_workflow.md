# Update Workflow

> **Trigger:** `/devos.update`
> **Purpose:** Incremental context refresh. Re-ingest only what changed since the last digest.

## Step 1: Find Last Digest
- Locate the most recent digest in `.devos/memory/digests/`.
- Extract the `last_updated` timestamp.

## Step 2: Delta Ingestion
- For each configured integration source skill, pass a `since` timestamp based on `last_updated`.
- Skills must ONLY fetch items modified after that timestamp.
- If `skills.parallel_ingestion` is true, spawn subagents in parallel to execute the sources.

## Step 3: Status Reconciliation
- Compare newly fetched items with the previous digest.
- If a Jira ticket is now Done/Merged, update its status.
- If a PR is merged/closed, update its status.
- Remove completed/non-actionable items from the active list.

## Step 4: Generate Updated Digest
- Generate an updated digest in `.devos/memory/digests/YYYY-MM-DD/`.
- Update `last_edited` timestamp.
- Highlight **NEW** items and show state transitions (e.g., `In Progress → Done`) for changed items.
- Also overwrite `.devos/memory/state/daily_digest.md` for Desktop App compatibility.

**Concise Summary Output:**
Report only the number of new items and items that changed state. No verbose logs.
