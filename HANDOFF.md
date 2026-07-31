# Prompt Spriter handoff

**Date:** 2026-07-31
**Canonical repository:** `C:\Users\headc\Documents\prompt_spriter`
**Checkpoint branch:** `main`
**Current phase:** Phase 4 revision batches; v2 production style active

## Start here

This is the continuation point for a fresh chat. Read, in order:

1. `AGENTS.md`
2. this handoff
3. `docs/STATUS.md`
4. `docs/WORKFLOW.md`
5. `docs/BOUNDARIES.md`
6. the relevant section of `docs/MASTER_PLAN.md`

Before changing anything, verify the canonical path, branch, exact Git status,
and `npm.cmd run check`. The older checkout under
`C:\Users\headc\Documents\AI_training_lab\prompt_spriter` is obsolete and must
not be used.

## What is working

- The browser viewer handles Intake, Revise, Archive, and approved Library
  state without Godot.
- Review actions stay on the current viewer tab and protect immutable revision
  artifacts.
- Creation and revision submissions validate, ingest through a trusted command,
  and arrive in Intake.
- Promptinator is a viewer tab with catalog import, Ready/In progress/Completed
  lanes, manual copy fallback, atomic next-entry claims, resumable work, and
  exact completion provenance.
- Revision batches generate durable agent briefs without moving review state.
- Stored creation prompts remain attached to immutable revisions and can be
  copied from the viewer.

## v2 production-default decision

The user explicitly promoted `assembler-inspired-v2@0.1.0` as the main style
for creation work.

- New imports and unqueued creation default to v2 / `structured-v2`.
- Promptinator store schema `1.3.0` migrates only still-Ready v1-default entries
  to v2.
- Copied, claimed, completed, and ingested entries keep their exact style.
- A Ready entry can deliberately choose legacy v1 before dispatch.
- Revisions always keep the existing asset's recorded style.
- Promotion does not approve a sprite, select a golden example, relabel a v1
  asset, or authorize a remaster.

The ignored local store was still schema `1.2.0` at this checkpoint. The new
loader presents its 269 Ready entries as migrated v2 entries, and the next
trusted queue write persists schema `1.3.0`. Do not hand-edit the store merely
to force persistence.

## Exact test-batch provenance

Promptinator entries 20-31 are all completed, but only Mirewitch Newt (20) was
actually v2 / `structured-v2`. Entries 21-31 were v1 / `structured-v1`:

- Sandglass Scarab
- Dunecrest Jackal
- Needleback Skink
- Sunspoke Vulture
- Dustveil Cobra
- Flintclaw Scorpion
- Mirage Hare
- Tumblethorn Roller
- Oasis Husk
- Caravan Ravager
- Rimepaw Lynx

Do not attribute those eleven results to v2. Sunspoke Vulture, Dustveil Cobra,
Flintclaw Scorpion, and Mirage Hare were the strongest readable examples. The
batch also exposed very sparse/unreadable drawings and long-body projection
failures that current structural validation cannot catch.

## Local runtime snapshot

The ignored production data snapshot at handoff contained:

- Promptinator: 31 Completed, 269 Ready;
- review candidates: 18 Intake, 6 Revise, 9 Archive;
- no user-approved Library revision in this snapshot.

These counts are local runtime state, not Git content. Refresh them rather than
assuming they remain current.

## Validation at this checkpoint

`npm.cmd run check` passed on 2026-07-31:

- foundation: 20 required files and 2 protected paths;
- contracts: fixture asset and revision passed with 12 advisory warnings;
- tests: 8 files, 40 tests passed;
- TypeScript and Vite production build passed.
- local viewer smoke test: Promptinator showed 269 Ready entries as **v2
  default**, exposed **Use legacy v1**, rendered `structured-v2` provenance,
  and logged no browser errors.

This is technical validation only. It does not approve any sprite visually.

## Recommended next work

1. Run a smaller genuine v2 batch in fresh Antigravity chats. Verify every
   claim prints v2 before drawing, then judge the exact candidates in Intake.
2. Design and test category-level structural checks for minimum opaque
   occupancy, minimum bounding box, per-frame color use, and meaningful frame
   distinctness. Suggested starting values from the review were 32 opaque
   pixels and a 6x6 bounding box, but these are proposals, not frozen contracts.
3. Continue refining the four-idle checkpoint and long/quadruped down/up
   foreshortening rules from real v2 failures instead of adding generic prose.
4. Finish the remaining Phase 4 revision-batch outcome links, counts, and
   filters.
5. Consider fresh-agent scheduled queue automation only after style quality is
   stable; it is intentionally not part of the current checkpoint.

## Dirty-tree warning

This project was built across a long session, so the promoted checkpoint
contains many intentional application, contract, documentation, and test
changes. The root also contains untracked one-off sprite generator scripts
matching `tools/build-*`, `tools/create-*`, and `tools/finish-*`, plus
`scratch/`. They are excluded from the checkpoint because job-specific helpers
belong in `workspace/staging/<job-id>/`. Do not delete or commit those files
without a separate user request.

Production `workspace/` data is ignored and must not be added to Git.

## Protected boundaries

- Do not change `.mcp.json` or shared/global MCP configuration.
- Reuse the existing Aseprite Pro MCP setup as-is.
- Keep `C:\Users\headc\Documents\8-bit sprite assembler` read-only.
- Do not add Godot or Godot MCP integration.
- Only the user makes visual approval, Revise, and Archive decisions.
- A sprite job may affect review state only through trusted completed ingestion
  into Intake.

## Useful commands

```powershell
npm.cmd run check
npm.cmd run dev
npm.cmd run promptinator:claim-next
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

Suggested first message in the next chat:

> Read AGENTS.md and HANDOFF.md, verify the canonical repository and current
> Git state, then continue from the v2-default checkpoint. Do not change MCP,
> review state, or existing asset provenance.
