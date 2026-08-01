# Start Workflow — Daily Tactical Digest

> **Trigger:** `/devos.start`
> **Purpose:** Ingest raw context from configured sources via parallel skills, correlate signals, consult Brain KB, and produce a Daily Tactical Digest.

## Step 1: Multi-Source Ingestion via Skills
- Read `skills.start_sources` from `config.yaml`.
- For each listed source, read its corresponding `SKILL.md` in `.devos/skills/`.
- If `skills.parallel_ingestion: true`, spawn one subagent per skill to fetch data concurrently.
- Store results silently.

## Step 2: Cross-Source Correlation
- Extract semantic signals (keywords, tickets, users) from all ingested items.
- Build a correlation matrix finding exact, semantic, and temporal matches across sources.
- Rank correlated clusters by confidence score, recency, and urgency.

## Step 3: Knowledge Extraction
- Scan `.devos/memory/brain_kb/` silently.
- Identify new decisions, gotchas, or rules from the ingested context that are not yet in the KB.

## Step 4: Classify Active Items
- Categorize correlated clusters (e.g., Ready for Development, Blocked, In Progress, Review Required).
- Extract immediate action items requiring human attention.

## Step 5: Generate Daily Tactical Digest
- Create the digest file in `.devos/memory/digests/YYYY-MM-DD/digest_HHMMSS.md`.
- Include a `last_edited: <YYYY-MM-DD HH:MM>` field in the YAML frontmatter.
- Overwrite `.devos/memory/state/daily_digest.md` with the exact same content for Desktop App compatibility.

**File Structure (Concise):**
```markdown
---
type: digest
last_edited: <YYYY-MM-DD HH:MM>
---
# Daily Tactical Digest

## Action Required
- <Blocked items or PRs needing review>

## Ready for Development
- <Correlated tasks ready for execution>
```

## Step 6: Present Digest (Concise)
Output a short summary:
> **Daily Tactical Digest ready.**
> Found `<N>` action items and `<N>` tasks ready for development.
> Run `/devos.develop` to begin.
