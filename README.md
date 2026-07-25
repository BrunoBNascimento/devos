<p align="center">
  <h1 align="center">DevOS</h1>
  <p align="center"><strong>The AI-Agnostic Agentic Development Framework</strong></p>
  <p align="center">
    A filesystem-first operating system for LLM-powered autonomous development.<br/>
    No SDKs. No plugins. Just text files.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0-blue?style=flat-square" alt="version" />
  <img src="https://img.shields.io/badge/files-Markdown%20%7C%20YAML%20%7C%20JSON-green?style=flat-square" alt="files" />
  <img src="https://img.shields.io/badge/code-zero-red?style=flat-square" alt="no code" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="license" />
</p>

---

## What is DevOS?

DevOS is a **framework made entirely of text files** (Markdown, YAML, JSON) that turns any LLM-based coding assistant into a structured, stateful, autonomous development agent.

It works with **any AI tool** — no vendor lock-in, no proprietary APIs:

| Tool | Entry Point |
|---|---|
| Claude Code / Claude CLI | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Any other AI | `.devos/system_prompts/orchestrator.md` |

When an AI opens this repository, it is **automatically redirected** to the Orchestrator persona, which governs all development activity.

---

## Core Principles

| Principle | Description |
|---|---|
| **Filesystem First** | State, memory, and rules live in files — not in conversation history. Survives session resets. |
| **AI-Agnostic** | Works with Claude, Gemini, GPT, Cursor, Windsurf, Copilot — any LLM that reads project files. |
| **Persona-Based** | Three distinct AI personas (Orchestrator, Planner, Reviewer) with isolated responsibilities. |
| [STOP] **Human-in-the-Loop** | Every major phase transition requires explicit human approval. No autonomous runaway. |
| **Accumulative Memory** | Lessons learned and gotchas are persisted in the Brain KB, making the system smarter over time. |
| **Zero Code** | The entire framework is Markdown, YAML, and JSON. No Python, no Node.js, no bash scripts. |

---

## Directory Structure

```
.devos/
├── config.yaml                 # Control plane — workspace & knowledge configuration
├── .devosignore                # Patterns to exclude from AI discovery
├── mcps.json                   # MCP server configuration (extensible)
├── system_prompts/
│   ├── orchestrator.md         # Maestro — boots, routes, enforces rules
│   ├── planner_agent.md        # Planner — epics, tasks, risk assessment
│   └── reviewer_agent.md       # Reviewer — code review, brain KB cross-reference
├── workflows/
│   ├── start_workflow.md       # Context ingestion → draft artifact → HITL gate
│   └── dev_workflow.md         # 6-phase development lifecycle
└── memory/
    ├── state/                  # Runtime state files (draft artifacts, phase tracking)
    └── brain_kb/               # Permanent knowledge base (lessons learned, gotchas)
```

---

## How It Works

### The Boot Sequence

```
User opens repo with any AI tool
        │
        ▼
AI reads CLAUDE.md / .cursorrules / .windsurfrules / copilot-instructions.md
        │
        ▼
Redirect → orchestrator.md
        │
        ▼
Orchestrator boots:
  1. Reads config.yaml
  2. Loads .devosignore patterns
  3. Scans memory/state/ for active workflows
  4. Greets user with current status
        │
        ▼
Ready for commands.
```

### The Development Lifecycle

```
/devos.start                          /devos.develop
     │                                      │
     ▼                                      ▼
 Ingest Context (Multi-Source)      Phase 1: Discovery
 (Jira, Slack, Transcripts, GH)     Scan workspace structure
     │                                      │
     ▼                                      ▼
 Parse & Analyze                    Phase 2: Knowledge Router
     │                              Consult brain_kb for gotchas
     ▼                                      │
 Cross-Source Correlation           Phase 3: Planning (Planner Agent)
 (Matrix & Confidence Score)        Break into epics & tasks
     │                                      │
     ▼                                      ▼
 Consult Brain KB                   [STOP] HITL Gate — approve plan
     │                                      │
     ▼                                      ▼
 Generate Draft                     Phase 4: Execution
 (memory/state/draft_YYMMDD.md)     Write code iteratively
     │                                      │
     ▼                                      ▼
 [STOP] HITL Gate                   Phase 5: Verification
 Wait for human approval            Compile, lint, test & self-heal
                                            │
                                            ▼
                                    Phase 6: Review & Finalization
                                    - Instrumentation Audit
                                    - Documentation Verification
                                    - Reviewer Agent Verdict
                                            │
                                            ▼
                                    Phase 7: Delivery (PR Strategy)
                                    Smart detection: MCP, CLI, or compare link
                                            │
                                            ▼
                                        [DONE] Done
```

---

## Commands

| Command | Description |
|---|---|
| `/devos.start` | Ingest context from all enabled sources (Jira, Slack, Transcripts, GH), correlate signals, and create a draft |
| `/devos.develop` | Execute the full 7-phase autonomous development lifecycle |
| `/devos.review` | Trigger a standalone code review using the Reviewer persona |
| `/devos.status` | Report all state artifacts and their current phase |
| `/devos.brain` | List and summarize accumulated knowledge in the Brain KB |

---

## Personas

### Orchestrator
The central intelligence. Routes tasks, enforces rules, manages phase transitions, and invokes sub-personas as needed. Never writes code directly unless instructed.

### Planner Agent
Strategic thinker. Decomposes features into epics and tasks with risk assessments. Maps multi-repository dependencies. Updates YAML frontmatter to track planning state.

### Reviewer Agent
Insufferably meticulous Senior Code Reviewer. Runs a comprehensive checklist (correctness, security, performance, maintainability, architecture) and **must cross-reference all code against the Brain KB** for known traps before issuing a verdict.

---

## State Management

DevOS tracks workflow state through **YAML frontmatter** in Markdown files stored in `memory/state/`:

```yaml
---
phase: draft          # draft → planning → developing → reviewing → completed
type: feature
title: "User Authentication Flow"
created: 2025-07-25 14:00
last_updated: 2025-07-25 16:30
author: devos-orchestrator
---
```

Every phase transition is persisted to disk, making workflows **resumable across sessions**.

---

## Brain KB — Accumulative Memory

After every completed workflow, DevOS writes a `learned_YYMMDD_<slug>.md` file to `memory/brain_kb/` containing:

- **Gotchas & Traps** — Edge cases and pitfalls discovered during development
- **Conventions Established** — New patterns or standards that emerged
- **What Went Well** — Positive outcomes to reinforce
- **What Could Improve** — Areas for future improvement

The Reviewer Agent **must consult the Brain KB** before every code review, ensuring past mistakes are never repeated.

---

## Getting Started

1. **Clone this repo** into your project (or copy the `.devos/` directory):
   ```bash
   git clone https://github.com/BrunoBNascimento/devos.git
   ```

2. **Open with any AI-enabled editor** (Cursor, Windsurf, VS Code + Copilot, etc.)

3. **The AI will automatically boot as the DevOS Orchestrator**

4. **Type `/devos.start`** to begin your first session

---

## Extending DevOS

### Adding Knowledge
Drop Markdown files into `.devos/memory/brain_kb/` with domain-specific conventions, gotchas, or standards. The system will automatically consult them.

### Adding MCP Servers
Configure external tool servers in `.devos/mcps.json`:
```json
{
  "mcpServers": {
    "your-server": {
      "command": "...",
      "args": ["..."]
    }
  }
}
```

### Creating Custom Workflows
Add new `.md` files to `.devos/workflows/` and register them as triggers in `orchestrator.md`.

### Creating Custom Personas
Add new `.md` files to `.devos/system_prompts/` following the existing persona format.

---

## Philosophy

> **"The best framework is the one the AI can read."**

DevOS is built on the observation that LLMs are exceptional at following structured text instructions. Instead of building complex toolchains, SDKs, or plugins, DevOS leverages the one thing every AI tool already knows how to do: **read files**.

The entire framework is portable, version-controllable, and human-readable. There is no build step, no runtime, no dependencies. Just text.

---

## License

MIT — Use it, fork it, make it yours.
