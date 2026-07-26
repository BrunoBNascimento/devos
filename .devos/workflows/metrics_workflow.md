# Metrics Workflow — DORA Extraction

> **Trigger:** `/devos.metrics` or automated trigger from `dev_workflow.md` Phase 7
> **Purpose:** Calculate DORA metrics and engineering efficiency by correlating Jira lifecycle timestamps with GitHub/GitLab PR histories.

## Prerequisites

- Orchestrator has completed Boot Sequence.
- Jira and GitHub integrations are active in `.devos/config.yaml` and `mcps.json`.
- The `Metrics Agent` persona is loaded.

---

## Step 1: Collect Delivery Data

**Action:** The Metrics Agent uses the GitHub MCP to pull the last 50 merged Pull Requests in the `workspace.repo_directories`.
- Identify PR author (Human vs Agent).
- Identify PR merge timestamp.
- Extract linked Jira ticket ID from PR title or branch name.

## Step 2: Collect Lifecycle Data

**Action:** The Metrics Agent uses the Jira MCP to query the history of the extracted ticket IDs.
- Find timestamp for when the ticket transitioned to `In Progress`.
- Find timestamp for when the ticket transitioned to `Done` or `Closed`.
- Check if the ticket was flagged as a bug and if it has a high priority (P1/P2) for MTTR calculations.

## Step 3: Calculate Metrics

1. **Lead Time for Changes:** For each PR, calculate `Merge Timestamp` minus `In Progress Timestamp`. Average this over the dataset.
2. **Deployment Frequency:** Count the number of merged PRs per week.
3. **Change Failure Rate:** Query Jira for bugs created *after* PR merges that reference those PRs, or check git history for `revert` commits. Calculate the percentage of failures.
4. **Mean Time to Recovery:** For all P1/P2 bugs, calculate `Closed Timestamp` minus `Created Timestamp`. Average this over the dataset.

## Step 4: Persist and Report

1. Check if `.devos/memory/metrics/dora.json` exists. If not, create it with `{ "history": [] }`.
2. Append the newly calculated batch to the `history` array.
3. Generate a Markdown summary of the metrics and save it to `.devos/memory/metrics/report_<DATE>.md`.

[DONE] Workflow completed.
