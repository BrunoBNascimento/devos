# Setup Workflow — Configuration Wizard

> **Trigger:** `/devos.setup`
> **Purpose:** Interactively build or repair `.devos/config.yaml` and `.devos/mcps.json` by discovering the real workspace — repositories, tech stacks, MCP servers, integration endpoints, git conventions — instead of asking the human to hand-edit YAML.

## Prerequisites

- The Orchestrator has completed its Boot Sequence.
- `.devos/config.example.yaml` and `.devos/mcps.example.json` exist (they are the schema reference).
- `config.yaml` MAY be missing or malformed — this is the one workflow allowed to run in that condition. If the Boot Sequence halted because `config.yaml` was unreadable, this workflow is the recovery path.

## Operating Principles

| Principle | Rule |
|---|---|
| **Non-destructive** | Never overwrite `config.yaml` or `mcps.json` without first copying them to `.devos/memory/state/backups/<file>.<YYMMDD-HHMM>.bak`. |
| **Discovery over interrogation** | Detect every value you can (repos, stacks, remotes, branch patterns, MCP servers). Only ask the human for what cannot be observed, or to confirm a detected value. |
| **Confirm per section** | Each Step ends with a confirmation gate. Never batch all questions and never write files mid-wizard. All writes happen in Step 8. |
| **Secrets stay out of git** | Real credentials go ONLY into `.devos/mcps.json`, which is listed in `.gitignore`. Before writing, verify that entry still exists — if not, add it and tell the human. Never echo a full token back in conversation output; mask as `ATATT…BED` (first 5 + last 3 chars). Never write a secret into `config.yaml`, a state artifact, or `brain_kb/`. |
| **Idempotent & resumable** | State lives in `.devos/memory/state/setup_YYMMDD.md`. If the wizard is interrupted, re-running `/devos.setup` resumes from the last completed step. |
| **Proposals are diffs** | When re-configuring an existing install, present changes as `key: old → new`, never as a wall of YAML. |

---

## Step 0: Preflight and Mode Detection

### Actions

1. Check for an in-flight wizard: scan `.devos/memory/state/` for a file matching `setup_*.md` with `phase: configuring`.
   - **If found:** read its `completed_steps` list, report `"Resuming setup from Step <N+1>"`, and jump straight to that step. Do NOT re-run completed steps.
   - **If not found:** create `.devos/memory/state/setup_YYMMDD.md` with the schema in [Appendix A](#appendix-a--state-artifact-schema).
2. Determine the **mode**:

| Condition | Mode | Behavior |
|---|---|---|
| `config.yaml` missing | `bootstrap` | Seed all values from `config.example.yaml`, then walk every step. |
| `config.yaml` exists and parses | `reconfigure` | Load current values as defaults. Show `old → new` diffs. Offer to skip untouched sections. |
| `config.yaml` exists but fails to parse | `repair` | Report the parse error with line number. Back up the broken file, then proceed as `bootstrap`. |

3. Detect the toolchain available for later steps and record what is present:
   ```bash
   command -v claude gh glab git jq yq node python3 2>/dev/null
   ```
4. Report the mode and detected tooling, then continue directly to Step 1 (no gate — nothing has changed yet).

---

## Step 1: Workspace and Repository Discovery

**Objective:** Populate `workspace.repo_directories` with real paths the human works in.

### 1.1 — Locate Candidate Roots

Ask the human for the workspace root, offering detected candidates as defaults:

> "Where do your repositories live? I found these candidates: `<list>`. Enter a path, or accept the default."

Build the candidate list by testing, in order: the current `workspace.repo_directories` value (if `reconfigure`), `./`, `../`, `~/projects`, `~/projects/repositories`, `~/dev`, `~/repos`, `~/workspace`, `~/src`, and any directory named in the human's reply.

### 1.2 — Scan for Repositories

For the chosen root, find git repositories up to 3 levels deep, respecting `.devosignore`:

```bash
find <root> -maxdepth 3 -type d -name .git -not -path '*/node_modules/*' -printf '%h\n'
```

For each repository found, gather:

| Field | How to detect |
|---|---|
| `name` | Directory basename |
| `remote` | `git -C <path> remote get-url origin` |
| `host / owner / repo` | Parse the remote URL (handle both `git@host:owner/repo.git` and `https://host/owner/repo.git`) |
| `default_branch` | `git -C <path> symbolic-ref refs/remotes/origin/HEAD` — fall back to `main`, then `master`, then `develop` |
| `current_branch` | `git -C <path> branch --show-current` |
| `stack` | Presence of `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `*.csproj`, `Gemfile`, `composer.json` |
| `framework` | Read the manifest's dependencies: NestJS, Next.js, Expo/React Native, Django, FastAPI, Spring, Rails, etc. |
| `package_manager` | Lockfile: `yarn.lock` → yarn, `package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `bun.lockb` → bun, `poetry.lock` → poetry |
| `scripts` | For Node projects, the keys of `package.json > scripts` matching build / lint / test / type-check / coverage |
| `agent_docs` | Presence of `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `README.md` |

### 1.3 — Discovery Table

```
Repositories Discovered (root: <root>)
| # | Repo | Stack | Framework | PM | Remote | Default | Current Branch |
|---|------|-------|-----------|----|--------|---------|----------------|
| 1 | <name> | <stack> | <framework> | <pm> | <owner/repo> | <branch> | <branch> |
```

### 1.4 — Confirmation Gate

> "Which repositories should DevOS manage? Reply `all`, a list of numbers (`1,3`), or `none` to enter paths manually.
> Also: should paths be stored **absolute** (portable across sessions, but machine-specific) or **relative** to the DevOS repo?"

Default to absolute paths when the repositories live outside the DevOS repository, relative when inside it.

Record the selection in the state artifact under `workspace`. **Do not write `config.yaml` yet.**

[STOP] **Wait for the human's selection before Step 2.**

---

## Step 2: MCP Inventory

**Objective:** Find every MCP server already configured on this machine so the human never re-enters a credential they already have.

### 2.1 — Harvest All Sources

Read every source below. A server may appear in several — record all occurrences so Step 2.3 can resolve conflicts.

| # | Source | Path / Command | Notes |
|---|---|---|---|
| 1 | DevOS inventory | `.devos/mcps.json` | Existing DevOS-managed servers (may not exist yet) |
| 2 | DevOS template | `.devos/mcps.example.json` | Schema and the set of servers DevOS knows how to use |
| 3 | Workspace project config | `<workspace_root>/.mcp.json` | Project-scope servers from Step 1's root |
| 4 | Per-repo project configs | `<each selected repo>/.mcp.json` | Repo-local servers |
| 5 | Claude Code user + local scope | `~/.claude.json` | Read the top-level `mcpServers` key AND the `mcpServers` key inside each entry of `projects` |
| 6 | Live runtime status | `claude mcp list` | The authoritative connection + auth state; includes remote claude.ai servers and plugin servers |

For source 6, parse each line into `name`, `url_or_command`, and `status` ∈ {`Connected`, `Needs authentication`, `Failed`}.

### 2.2 — Classify Against DevOS Needs

DevOS integrations map to MCP capabilities as follows. Mark each capability `SATISFIED` (a connected server provides it), `NEEDS_AUTH` (server configured but unauthenticated), or `MISSING`.

| DevOS integration | Satisfying servers (any of) |
|---|---|
| `integrations.jira` | `atlassian`, `mcp-atlassian`, `claude.ai Atlassian`, `jira` |
| `integrations.github` | `github`, `claude.ai GitHub`, or the `gh` CLI as a non-MCP fallback |
| `integrations.slack` | `slack`, `claude.ai Slack` |
| `integrations.meeting_notes` | `granola`, `tldv`, `claude.ai Google Drive`, `google-meet`, `otter_ai`, or the `manual` transcript directory |

### 2.3 — Conflict Resolution

When the same logical server appears in multiple sources with different config:

1. Prefer the entry that is **live and Connected** per `claude mcp list`.
2. Otherwise prefer the entry with a **populated credential** over one with an unresolved `${VAR}` placeholder or an empty value.
3. Otherwise prefer the **narrowest scope**: repo `.mcp.json` → workspace `.mcp.json` → `~/.claude.json` local → user → example template.
4. If two candidates still tie and differ materially (different base URL, different account), present both and ask. Never silently merge two credentials.

### 2.4 — Inventory Report

```
MCP Inventory
| Server | Transport | Status | Found in | Credential | DevOS use |
|--------|-----------|--------|----------|------------|-----------|
| <name> | stdio/http/sse | Connected / Needs auth / Not configured | <sources> | present (masked) / ${VAR} unresolved / OAuth / none | jira / github / slack / notes / unused |

Capability Coverage
| Capability | State | Server |
|------------|-------|--------|
| Jira | SATISFIED / NEEDS_AUTH / MISSING | <name> |
| GitHub | ... | ... |
| Slack | ... | ... |
| Meeting notes | ... | ... |
```

If a credential was found in plaintext in a file that is **not** git-ignored, add:

> [WARNING] `<file>` contains a plaintext credential for `<server>` and is not covered by a `.gitignore` rule. DevOS will not modify that file, but you should rotate the token if it has ever been committed or shared.

### 2.5 — Confirmation Gate

> "Which of these servers should DevOS adopt into `.devos/mcps.json`? Reply `all detected`, a list of names, or `skip`."

[STOP] **Wait for the human's selection before Step 3.**

---

## Step 3: MCP Authentication and New Servers

**Objective:** Get every capability the human's enabled integrations depend on into a `Connected` state.

### 3.1 — Authenticate Existing Servers

For each adopted server whose status is `Needs authentication`:

1. Determine the auth style:
   - **OAuth / remote** (`http` or `sse` transport, no credential in config): authentication is interactive and browser-based. DevOS cannot complete it headlessly.
   - **Token / stdio** (credential expected in `env`): the server needs a value the human must supply or paste.
2. For OAuth servers, instruct precisely and then wait:

   > "`<server>` needs an interactive OAuth login, which I can't do for you. Run `/mcp` in this session, select **<server>**, and complete the browser flow. Some servers also expose an `authenticate` tool I can call — say `try tool auth` and I'll attempt that instead. Tell me `done` when the login finishes and I'll re-check."

   If the server exposes an `authenticate` / `complete_authentication` tool, offer to call it — that path can complete in-session.
3. For token servers, ask for the credential:

   > "`<server>` needs `<ENV_VAR_NAME>`. Paste the value, or reply `skip` to leave this integration disabled. Get one at: `<provider token URL>`."

   Common provisioning URLs to offer:

   | Credential | Where to create it |
   |---|---|
   | `JIRA_API_TOKEN` | `https://id.atlassian.com/manage-profile/security/api-tokens` |
   | `GITHUB_TOKEN` | `https://github.com/settings/tokens` (scopes: `repo`, `read:org`) |
   | `SLACK_BOT_TOKEN` | `https://api.slack.com/apps` → OAuth & Permissions |

4. Re-run `claude mcp list` and confirm the new status. If it still fails, record the failure and continue — a failed integration must not abort the wizard.

### 3.2 — Add New Servers

Ask whether any capability marked `MISSING` should be added:

> "Capability `<X>` has no server. Want me to add one? I can use the remote claude.ai server (OAuth, no token on disk) or a local stdio server (needs a token)."

Register the server with Claude Code so it is usable **this session** — writing `.devos/mcps.json` alone does not activate anything:

```bash
# Remote server, OAuth — nothing sensitive touches disk
claude mcp add --transport http <name> <url> --scope local

# Local stdio server with a credential
claude mcp add <name> --scope local -e <VAR>=<value> -- npx -y <package>

# Complex config (multiple env vars, args) — pass the exact JSON object
claude mcp add-json <name> '<json>' --scope local
```

**Scope rule:** always use `--scope local` when the config carries a real credential. Local scope persists in `~/.claude.json` outside the repository, so the secret can never be committed. Use `--scope project` only for credential-free servers, and warn the human that project scope writes `./.mcp.json` inside the repo.

After adding, verify with `claude mcp list` before marking the capability satisfied.

### 3.3 — Confirmation Gate

Report the final capability table (`SATISFIED` / `NEEDS_AUTH` / `MISSING` / `DISABLED by choice`) and confirm:

> "Integrations for capabilities still unauthenticated will be written as `enabled: false` so workflows don't fail on them. You can re-run `/devos.setup` later to finish. Proceed?"

[STOP] **Wait for confirmation before Step 4.**

---

## Step 4: Integration Mapping

**Objective:** Fill `integrations.*` in `config.yaml` with real board IDs, channel IDs, and repositories — not the `YOUR_ORG` placeholders from the example.

For each integration: if its capability is not satisfied, set `enabled: false`, note why, and skip its questions entirely.

### 4.1 — Jira

1. **Base URL:** derive it from the MCP config (`JIRA_URL` / `JIRA_BASE_URL` env value) and confirm rather than ask.
2. **Project key:** if the Jira MCP is connected, query the human's recent issues and infer the dominant project key. Cross-check against branch names harvested in Step 1 — a branch like `feature/PLD-1226/...` strongly implies key `PLD`. Present the inference for confirmation.
3. **Boards:** query the live board list for the project. Present it as a numbered table (`id`, `name`, `type`) and let the human select. Never invent a board ID — if the query fails, ask for IDs or write an empty `boards: []` list with a note.
4. **Filters:** confirm `status`, `labels`, and `assignee` (default `current_user`), plus `lookback_days`, `include_comments`, `max_tickets`.

### 4.2 — Slack

1. If the Slack MCP is connected, list the channels the human is a member of.
2. Present them and ask which to monitor. For each selected channel, capture `id`, `name`, and a one-line `purpose` — the purpose drives correlation weighting in `start_workflow`, so ask for it if the channel topic is empty.
3. Confirm `lookback_days`, `thread_depth`, `max_messages_per_channel`.

### 4.3 — GitHub

1. Pre-fill `repositories` from the remotes detected in Step 1 — this needs no questions at all.
2. Confirm the `owner/repo` list and which `sources` to scan (`issues`, `pull_requests`, `discussions`).
3. If the remote host is not github.com (GitLab, Bitbucket, self-hosted), record the host and note that `pull_request.strategy` must be adjusted in Step 6.

### 4.4 — Meeting Notes

1. For each provider in the example config (`otter_ai`, `google_meet`, `manual`), set `enabled` based on Step 2's capability check plus the human's choice.
2. For `manual`, confirm `watch_path` (default `.devos/memory/transcripts/`) and create the directory if missing.
3. Confirm `lookback_days`, `filters`, `max_transcripts`.

### 4.5 — Confirmation Gate

Present a compact summary:

```
Integrations
| Integration | Enabled | Endpoint | Scope |
|-------------|---------|----------|-------|
| Jira | true | <base_url> (<KEY>) | <N> boards, last <N>d |
| Slack | true/false | <N> channels | last <N>d |
| GitHub | true | <owner/repo>, … | issues, PRs, discussions |
| Meeting notes | true | <providers> | last <N>d |
```

[STOP] **Wait for confirmation before Step 5.**

---

## Step 5: Knowledge System

**Objective:** Define the knowledge bases and seed `brain_kb/` so the very first `/devos.develop` has something to retrieve.

### 5.1 — Knowledge Bases

Present the current `knowledge_bases` map. For each entry, confirm `priority`, `path`, and `description`. Explicitly flag placeholder entries:

> "`kb_name_1` is an unconfigured placeholder from the template. Rename it, or should I drop it?"

Offer to add domains that match what Step 1 found (for example a `mobile` KB when an Expo/React Native repo is present, or an `api_contracts` KB when an OpenAPI spec is found).

Keep `business_rules` at the highest priority unless the human overrides it — Orchestrator Core Rule 5 depends on business rules outranking general knowledge.

### 5.2 — Seed brain_kb

Scan the workspace for existing knowledge assets worth importing:

- Directories named `base_conhecimento`, `docs/`, `knowledge/`, `wiki/`, `adr/`, `decisions/`
- Implementation plans, runbooks, smoke tests, test plans
- `CLAUDE.md` / `AGENTS.md` files inside the selected repositories (these encode conventions and gotchas — exactly what the knowledge router is for)
- OpenAPI / GraphQL schemas

Present what you found and ask:

> "I found `<N>` candidate knowledge assets. How should I seed `brain_kb/`?
> **(a) Copy** — duplicate files into `brain_kb/` (self-contained, but drifts from the source).
> **(b) Index** — write one summary note per asset in `brain_kb/` pointing at the source path (stays fresh, needs the source present).
> **(c) Skip** — leave `brain_kb/` empty."

Default to **(b) Index**: it avoids duplicating large files into the DevOS repo and keeps a single source of truth. Each index note gets frontmatter:

```markdown
---
kb: <knowledge_base_name>
source: <absolute path or URL>
type: convention | gotcha | runbook | contract | plan
indexed: <YYYY-MM-DD>
---

## <Title>
<2-4 sentence summary of what this asset answers and when to consult it>
```

Never copy a file matching `.devosignore`, and never copy a file containing a credential — summarize it instead and note the omission.

### 5.3 — Retrieval Tuning

Confirm `retrieval.top_k_per_kb`, `context.final_chunks`, `fusion.algorithm`, and `reranker.model`. Note that fusion and reranking are executed semantically by the agent, so the model name is documentation of intent rather than a loaded binary.

[STOP] **Confirm the knowledge system before Step 6.**

---

## Step 6: Git and Pull Request Conventions

**Objective:** Derive conventions from what the team already does, instead of imposing the template defaults.

### 6.1 — Detect Branch Convention

Sample real branch names across the selected repositories:

```bash
git -C <repo> for-each-ref --sort=-committerdate --count=30 --format='%(refname:short)' refs/remotes/origin
```

Infer the pattern and translate it into DevOS tokens (`<type>`, `<jira_key>`, `<short_slug>`, `<date>`). For example, observing `feature/PLD-1226/endpoint-agenda` yields `<type>/<jira_key>/<short_slug>`. Present the inference:

> "Your repos use `feature/PLD-1226/endpoint-agenda-do-dia-sala`, so I'll set `branch_naming: '<type>/<jira_key>/<short_slug>'` instead of the template's `devos/<type>/<jira_key>-<short_slug>`. This keeps DevOS branches indistinguishable from hand-made ones — confirm, or keep the `devos/` prefix to make automated branches obvious?"

### 6.2 — Detect Commit Convention

Sample recent commit subjects:

```bash
git -C <repo> log --oneline -30 --format='%s'
```

Classify as `conventional` (`feat:`, `fix:`, `chore:`), `angular`, or `freeform`, and confirm. Also confirm `commit_scope_from`, `auto_stage`, and `sign_commits` (check `git config commit.gpgsign` for the default).

### 6.3 — Base Branch

Set `git.base_branch` and `pull_request.base_branch` from each repo's detected default branch. **If the selected repositories disagree** (for example `main` in two and `develop` in a third), flag it — `config.yaml` holds a single value:

> "[WARNING] `<repo>` defaults to `develop` while the others use `main`. I'll set `main` and note the exception in `brain_kb/` so the dev workflow targets the right base for that repo. Confirm?"

### 6.4 — Pull Request Settings

1. `strategy`: resolve `auto` against reality now — check for an authenticated GitHub MCP, then `gh auth status`, then `glab`. Report which method will actually be used rather than leaving it abstract.
2. Confirm `draft`, `title_template`, `labels`, `reviewers`, `team_reviewers`.
3. Confirm `link_jira` and `jira_transition_on_pr` — validate the transition name against the live Jira workflow if the MCP is connected, since an invalid status string fails silently at PR time.
4. Confirm `body_sections` (default: keep all).

[STOP] **Confirm git and PR conventions before Step 7.**

---

## Step 7: Verification Policy

**Objective:** Decide which quality gates run in `dev_workflow` Phase 5, and their thresholds.

> **Design note:** `verification` holds **policy, not commands**. The dev workflow discovers the actual command per project by reading that project's manifest at run time (Phase 5.2). Do not add `command:` keys to `config.yaml` — a hardcoded `npm run build` breaks the moment a Python or yarn-based repo joins the workspace.

### 7.1 — Report Discovered Commands

Show what Phase 5 will find, per repository, so the human can spot gaps before they cause a failed run:

```
Verification Command Discovery (informational)
| Repo | Build | Lint | Type Check | Tests | Coverage |
|------|-------|------|------------|-------|----------|
| <name> | <yarn build> | <yarn lint> | <yarn type-check> | <yarn test> | <yarn test:coverage> |
| <name> | — none found — | <npm run lint> | <npx tsc --noEmit> | — none found — | — none found — |
```

Where a gate has no discoverable command in **any** selected repo, recommend disabling it rather than letting Phase 5 fail:

> "No repo defines a coverage script. I'll set `tests.coverage.enabled: false` — enable it later once a script exists. Agree?"

### 7.2 — Confirm Gates

| Gate | Ask |
|---|---|
| `build` | enabled, `timeout_seconds`, `max_retries` |
| `lint` | enabled, `auto_fix`, `fail_on_warnings` |
| `type_check` | enabled — default `true` when any selected repo has a `tsconfig.json` or is otherwise statically typed |
| `tests` | enabled, `must_pass`, `timeout_seconds`, coverage `threshold` + `fail_below_threshold` |
| `max_loop_iterations` | default 5 |

### 7.3 — Documentation Targets

The template lists `README.md`, `CLAUDE.md`, `docs/agents.md`, `CHANGELOG.md`, `API.md`. Keep only the files that exist in the selected repositories, or that the human wants created, and add any project-specific docs found in Step 1. Each entry keeps its `rule` string — that text is the instruction the reviewer persona follows.

### 7.4 — Instrumentation Checks

Confirm the five default checks (`logging`, `error_handling`, `metrics`, `tracing`, `security`). Drop or reword any that do not apply — for example, `tracing` is usually noise for a mobile-only workspace with no distributed services. Offer to add stack-specific checks (accessibility for frontend repos, migration-safety for repos with a migrations directory).

[STOP] **Confirm the verification policy before Step 8.**

---

## Step 8: Write and Validate

**Objective:** Persist everything atomically, only after the human has approved every section.

### 8.1 — Pre-Write Safety Checks

1. Verify `.gitignore` covers `.devos/config.yaml` and `.devos/mcps.json`. If either entry is missing, add it and report:
   > "[WARNING] `.gitignore` did not cover `<file>`, which will hold your credentials. I added the rule."
2. Back up existing files:
   ```bash
   mkdir -p .devos/memory/state/backups
   cp .devos/config.yaml .devos/memory/state/backups/config.yaml.<YYMMDD-HHMM>.bak   # if it exists
   cp .devos/mcps.json  .devos/memory/state/backups/mcps.json.<YYMMDD-HHMM>.bak     # if it exists
   ```
3. Run `git status --short .devos/` and confirm no credential-bearing file is staged for commit.

### 8.2 — Write config.yaml

Write the full file using `config.example.yaml` as the structural template. Rules:

- Preserve the example's section order, comments, and `# ---` banner separators. The comments are documentation the human reads later — carrying them over is deliberate, not incidental.
- Replace every placeholder (`YOUR_ORG`, `PROJ`, `BOARD_ID_1`, `C_CHANNEL_ID_1`) with a confirmed real value, or remove the entry.
- Keep `paths.*` pointing at the real DevOS directories.
- Never write a credential into this file. Integration auth stays as `auth: "MCP"`.

### 8.3 — Write mcps.json

Write `.devos/mcps.json` from `mcps.example.json`'s shape, containing only adopted servers. Per the configured secret policy, real credential values are written directly into this file, which `.gitignore` covers.

```json
{
  "mcpServers": {
    "<name>": {
      "command": "<cmd>",
      "args": ["<...>"],
      "env": { "<VAR>": "<real value>" },
      "enabled": true
    },
    "<remote-name>": {
      "transport": "http",
      "url": "<url>",
      "auth": "oauth",
      "enabled": true
    }
  }
}
```

Then set restrictive permissions, since the file now holds live credentials:

```bash
chmod 600 .devos/mcps.json
```

### 8.4 — Sync to Claude Code

`.devos/mcps.json` is the DevOS inventory; Claude Code does not read it. For each adopted server not already live in `claude mcp list`, register it with `--scope local` (see Step 3.2) so it works in this session without placing a secret inside the repository. Report anything that could not be registered.

### 8.5 — Validate

1. Re-read `.devos/config.yaml` from disk and confirm it parses as YAML.
2. Assert required keys are present and non-placeholder: `workspace.repo_directories`, `paths.*`, `knowledge_system.knowledge_bases` (≥1 entry), `git.base_branch`, `verification.max_loop_iterations`.
3. Confirm every path in `workspace.repo_directories` and `paths.*` exists on disk.
4. Re-read `.devos/mcps.json` and confirm it parses as JSON.
5. Run `claude mcp list` one final time and capture each adopted server's status.
6. If any assertion fails: **restore the backup**, report exactly what failed, and stop. A broken `config.yaml` halts every future session per the Orchestrator's error handling, so never leave one behind.

---

## Step 9: Final Report and Handoff

### 9.1 — Setup Report

```
DevOS Setup Complete

| Area | Result |
|------|--------|
| Mode | bootstrap / reconfigure / repair |
| Repositories | <N> configured: <names> |
| MCP servers | <N> adopted, <N> connected, <N> pending auth |
| Integrations | Jira <on/off>, Slack <on/off>, GitHub <on/off>, Notes <on/off> |
| Knowledge bases | <N> domains, <N> brain_kb entries seeded |
| Verification gates | build <on/off>, lint <on/off>, types <on/off>, tests <on/off> |
| Files written | .devos/config.yaml, .devos/mcps.json |
| Backups | .devos/memory/state/backups/<files> |

Pending Actions
- [ ] <e.g. Run /mcp and authenticate Slack, then re-run /devos.setup>
```

List every deferred item explicitly. A partially configured install that reports itself as complete is worse than one that names what is missing.

### 9.2 — Close the State Artifact

Update `.devos/memory/state/setup_YYMMDD.md` frontmatter to `phase: completed` with the final summary appended. Do not delete it — it is the audit trail of how this install was configured, and the input for the next `reconfigure` run.

### 9.3 — Handoff

> "DevOS is configured. Next: `/devos.start` to ingest context and generate your first draft.
> To change anything later, re-run `/devos.setup` — it loads current values as defaults and only rewrites what you touch."

---

## Appendix A — State Artifact Schema

`.devos/memory/state/setup_YYMMDD.md`:

```markdown
---
phase: configuring          # configuring | completed
type: setup
mode: bootstrap             # bootstrap | reconfigure | repair
created: <YYYY-MM-DD HH:MM>
last_updated: <YYYY-MM-DD HH:MM>
completed_steps: [0, 1, 2]  # resume point — the wizard restarts at max+1
author: devos-orchestrator
---

# DevOS Setup — <YYYY-MM-DD>

## Step 1: Workspace
<discovery table + human's selection>

## Step 2: MCP Inventory
<inventory table + adoption decisions>       # masked credentials only

## Step 3: Authentication
<per-server outcome>

## Step 4: Integrations
<confirmed values>

## Step 5: Knowledge System
<KB map + seeding mode + entries created>

## Step 6: Git & PR
<detected conventions + confirmations>

## Step 7: Verification
<command discovery table + gate decisions>

## Step 8: Write
<files written, backups, validation results>

## Pending Actions
- [ ] <deferred item>
```

**Never write an unmasked credential into this artifact.** It lives under `.devos/memory/state/`, which is not git-ignored.

---

## Appendix B — Targeted Re-Runs

The wizard accepts a section argument to skip straight to one step:

| Invocation | Behavior |
|---|---|
| `/devos.setup` | Full wizard (or resume, if an in-flight artifact exists) |
| `/devos.setup mcp` | Steps 2–3 only, then write |
| `/devos.setup repos` | Step 1 only, then write |
| `/devos.setup integrations` | Step 4 only, then write |
| `/devos.setup verification` | Step 7 only, then write |
| `/devos.setup validate` | Step 8.5 only — read-only health check, writes nothing |

For any targeted run, still execute Step 0 (preflight/backup) and Step 8 (write/validate), and leave all untouched sections of `config.yaml` byte-identical.
