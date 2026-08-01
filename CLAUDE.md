# DevOS Workspace

This workspace uses DevOS — a filesystem-first AI development framework.

## Auto-Initialization
On session start, silently:
1. Read `.devos/system_prompts/orchestrator.md` for operating rules
2. Read `.devos/config.yaml` for workspace configuration
3. Preload `.devos/memory/brain_kb/` (consult on ALL decisions)
4. Scan `workspace.repositories_path` for managed repositories

## Available Commands
See `.claude/commands/` for all available slash commands.

## Core Rules
- **LOCAL-FIRST**: ALWAYS resolve files from `repositories_path` before using APIs
- **AUTO-KB**: ALWAYS consult `brain_kb/` before code decisions
- **UNIVERSAL VERIFICATION**: ALL code changes get review + verification
- **QUIET MODE**: Minimal output by default
