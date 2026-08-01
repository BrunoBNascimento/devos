---
name: review
description: Code review with mandatory KB cross-reference. Runs for ANY code change.
type: quality
parallel: false
requires_mcp: none
standalone: true
---
# Skill: Review

## Purpose
Code review with mandatory KB cross-reference.

## Execution
1. Read ALL `brain_kb` files to understand project-specific rules, constraints, and known issues.
2. Build a "trap index" based on known gotchas in the knowledge base.
3. Diff the current changes against the base branch.
4. Run the full review checklist: correctness, security, performance, maintainability, and architecture.
5. Cross-reference changes with the KB traps.
6. Issue a final verdict (Approve, Request Changes).

## Rules
- **CRITICAL**: This runs for ALL code changes, not just `/devos.develop`.
- KB consultation is non-negotiable.
- If fixes are required and applied, you must run `verify` again after fixes.
