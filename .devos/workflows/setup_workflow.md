# DevOS Setup Workflow (v2)

This workflow defines the systematic, idempotent process for initializing a new DevOS workspace. 

**Core Principles for the Agent executing this workflow:**
- **Wizard-based HITL:** Group related questions into blocks. Do NOT ask for configuration line-by-line.
- **Discovery > Interrogation:** Auto-detect as much as possible. Only ask the user for information that cannot be inferred.
- **Non-Destructive:** Existing files must be merged or preserved, never blindly overwritten.
- **Aggressive KB Seeding:** Automatically index any existing knowledge sources found.

---

## Step 0: Preflight Checks

1. Verify running inside a valid workspace directory (must have `.devos/` or be completely empty).
2. Ensure DevOS configuration state file `.devos/config/state.json` can be created or updated.
3. Validate basic agent capabilities (read/write access, access to environment variables if applicable).

## Step 1: Workspace & Repository Discovery

**Action: Configure Primary Repository Path & Auto-Scan**
1. **Wizard Prompt - `repositories_path`:** 
   Ask the user for their primary directory containing project repositories (e.g., `~/projects`, `C:/workspace`). Offer candidates based on the current directory context.
2. **Auto-Scan:** Once the user confirms the `repositories_path`, scan the directory for all Git repositories. 
3. **Auto-fetch:** Perform a background `git fetch` (refs only) on all discovered repositories to check remote sync status.
4. **Result:** Build a "Repos Status Table" showing branch and remote sync status. Store in `state.json`.

## Step 2: MCP Inventory

**Action: Discover Available MCP Servers**
1. Look for known MCP configs (e.g., in `.claude`, system settings).
2. Attempt to detect integrations (Jira, Slack, GitHub, Notion, etc.).
3. **Wizard Prompt - MCP Confirm:** Present the detected MCP servers and ask the user in a single block if they wish to enable/disable any, or if they need to add more.

## Step 3: MCP Authentication

**Action: Validate Integrations**
1. For each enabled MCP server, execute a simple health check or identity request (e.g., `get_current_user`).
2. Log successful authentications.
3. If an auth fails, prompt the user with instructions on how to provide the correct credentials/tokens. Group failures together for a single fix-it prompt if possible.

## Step 4: Integration Mapping

**Action: Configure External Sources via Wizard Blocks**
Instead of asking one question at a time, group by domain.

- **Jira Wizard:** "Please provide your Jira configuration: Base URL, Target Project Key, Default Boards, and any active JQL filters."
- **Slack Wizard:** "Which Slack channels should be monitored for project context? (Provide channel names or IDs)"
- **GitHub/GitLab Wizard:** "Default org/repo paths? Default reviewers?"

Save all responses systematically in `.devos/config/integrations.yaml`.

## Step 5: Knowledge System (Auto-Index)

**Action: Seed the Brain KB Aggressively**
1. Automatically scan the workspace for files like `CLAUDE.md`, `AGENTS.md`, `docs/`, `wiki/`, and `ADRs/`.
2. Do **not** ask for per-file permission. 
3. Ingest all discovered markdown/text files into the DevOS Brain KB (`.devos/memory/knowledge/`).
4. Log a summary of indexed items to the user.

## Step 6: Git & PR Conventions

**Action: Detect and Confirm Git Standards**
1. Check existing commits in the discovered repositories to infer naming conventions (e.g., Conventional Commits).
2. Check for `PULL_REQUEST_TEMPLATE.md` or similar.
3. **Wizard Prompt - Git Setup:** Display the inferred conventions (e.g., "Detected Conventional Commits") and ask the user to confirm or overwrite them in a single prompt block.

## Step 7: Verification Policy

**Action: Establish CI/CD & Testing Baselines**
1. Scan repositories for standard build tools (`package.json`, `Makefile`, `tox.ini`, `Cargo.toml`).
2. Scan for linting rules (`.eslintrc`, `.flake8`).
3. **Wizard Prompt - Verification:** Display the discovered build/test commands. "I've detected `npm test` and `npm run lint`. Should these be the standard universal verification steps for all code changes?" Confirm in one block.

## Step 8: Write & Validate

**Action: Commit State**
1. Generate the final configuration files:
   - `.devos/config/state.json`
   - `.devos/config/integrations.yaml`
   - `.devos/config/verification.yaml`
2. Perform a final schema validation against the DevOS config schemas.
3. Ensure no secrets are hardcoded in plain text (use environment variable references if needed).

## Step 9: Report

**Action: Final Setup Summary**
Output a concise success message and table.
```text
DevOS v2 Setup Complete.
- Repositories mapped: X
- Integrations active: Y
- Knowledge items indexed: Z

Next steps:
Run `/devos.start` to begin parallel ingestion and context fusion.
```

---

## Appendices

### A. Targeted Re-runs
You can re-run specific blocks of the setup without starting from scratch:
- `/devos.setup knowledge`: Rescans the workspace and aggressively re-indexes knowledge files.
- `/devos.setup integrations`: Reruns the Integration Mapping wizards.
- `/devos.setup repos`: Allows changing the `repositories_path` and rescanning.

### B. State Schema
State must be maintained locally in JSON format at `.devos/config/state.json`. See the `docs/schemas/state_schema.md` for exact typing.
