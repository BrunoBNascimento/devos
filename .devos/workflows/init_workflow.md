# Init Workflow

> **Trigger:** `/devos.init`
> **Purpose:** Rapidly load workspace context without external ingestion.

## Step 1: Workspace Scan + Branch Sync
- Read `repositories_path` from `config.yaml`.
- Invoke the `source_local_repos` skill.
- If `auto_fetch: true` in config, auto-fetch branches.
- Collect branch status per repository.

## Step 2: KB Preload (Silent)
- Read ALL `.devos/memory/brain_kb/` files.
- Index gotchas and conventions internally.
- Do not list entries; just confirm the count.

## Step 3: State Check (Silent)
- Scan `.devos/memory/state/` for any active workflows.
- Check for the latest daily digest.

## Step 4: Report (Concise)
Output a concise status table:

| Repository | Branch | Remote Status |
|---|---|---|
| `<Repo Name>` | `<Branch>` | `<Ahead/Behind/Up-to-date>` |

**Summary:**
- **KB Entries:** `<Count>` indexed.
- **Active Workflows:** `<Count>` found.
- **Last Digest:** `<Date>`

No HITL gate needed. Ready for commands.
