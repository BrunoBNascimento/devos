# DevOS Framework

This workspace uses DevOS for autonomous development orchestration.

Before any work:
1. Read `.devos/system_prompts/orchestrator.md`
2. Read `.devos/config.yaml`
3. Consult `.devos/memory/brain_kb/` for known gotchas

Core rules:
- Always work with local files in the configured `repositories_path`
- Always consult brain_kb before making code decisions
- All code changes must pass build, lint, and test verification
- Keep output concise
