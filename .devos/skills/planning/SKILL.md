---
name: planning
description: Decompose tasks into epics, generate execution DAG
type: lifecycle
parallel: false
requires_mcp: none
standalone: true
---
# Skill: Planning

## Purpose
Decompose tasks into epics, generate an execution DAG (Directed Acyclic Graph).

## Execution
1. Read the task context and instructions.
2. Consult `brain_kb` for historical context, rules, and known gotchas.
3. Scan the target repository to understand the current architecture and scope.
4. Decompose the task into Epics and Tasks. Detail the scope, dependencies, acceptance criteria, and risks for each.
5. Generate a Mermaid DAG diagram visualizing the execution plan.
6. Identify parallel layers where tasks can be executed concurrently.

## Rules
- ALWAYS generate a DAG diagram (even if it's a single-node DAG).
- ALWAYS consult the `brain_kb` for planning.

## Output
Append the implementation plan and the Mermaid DAG to the current state file in `.devos/memory/state/`.
