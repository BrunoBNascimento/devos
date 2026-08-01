# Changelog

All notable changes to DevOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-01

### Added
- **Skills System**: 10 self-contained skills (source_jira, source_slack, source_github, source_meetings, source_local_repos, planning, develop, review, verify, brain_sync)
- **Parallel Ingestion**: `/devos.start` spawns one subagent per source skill for parallel execution
- **DAG-Based Planning**: Implementation plans include execution DAGs with dependency tracking and parallel layers
- **AI Tool Native Folders**: `.claude/commands/`, `.cursor/rules/`, `.windsurf/rules/`, `.codex/` for native autocomplete
- **`/devos.init`**: Quick workspace context load without external ingestion
- **`/devos.update`**: Incremental context refresh — only re-ingests what changed
- **Digest History**: Digests stored in `memory/digests/YYYY-MM-DD/` with `last_edited` tracking
- **Configurable `repositories_path`**: No more hardcoded repo locations
- **Auto-fetch**: Repos auto-fetched on scan (refs only, no merge)
- **Repos Status Table**: Shows per-repo branch and remote sync status
- **Python Helper Scripts**: Data processing utilities in `.devos/scripts/`
- **VERSION file**: Semantic versioning

### Changed
- **Quiet Mode**: Framework runs silently by default. Verbose output opt-in.
- **Wizard-Based HITL**: Questions grouped into wizard blocks instead of step-by-step gates
- **Auto-KB Consultation**: Brain KB consulted transparently on ALL decisions without requiring persona
- **Local-First Resolution**: Files ALWAYS resolved locally before API calls
- **Universal Verification**: ALL code changes get review + build/lint/test, regardless of workflow origin
- **Simplified Entry Points**: CLAUDE.md, .cursorrules, .windsurfrules no longer use aggressive prompt injection
- **Setup Workflow**: More discovery, less interrogation. Wizard-based.
- **Orchestrator**: Intelligent boot sequence, new core rules, concise output
- **Planner Agent**: Now generates execution DAGs
- **Reviewer Agent**: Activates for all code changes, not just /devos.develop

### Removed
- Verbose phase transition announcements (now quiet by default)
- Hardcoded `repo_directories` config key (replaced by `repositories_path`)

## [1.0.0] - 2026-07-25

### Added
- Initial release of DevOS
- Orchestrator, Planner Agent, Reviewer Agent, Metrics Agent
- Workflows: setup, start, develop, metrics
- Brain KB accumulative memory
- Multi-source context fusion (Jira, Slack, GitHub, Meeting Notes)
- Human-in-the-Loop gates
- Desktop Control Plane app (Electron)
- DORA metrics tracking
