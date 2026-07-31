# Prompt Spriter handoff

**Date:** 2026-08-01
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

- The browser viewer handles Intake, Denied, Archive, and approved Library
  state without Godot.
- Intake is the sole active candidate lane. Derived **Awaiting review** and
  **Revision requested** filters are based on unresolved notes, and open notes
  block approval.
- Denied candidates can return to Intake or move to Archive. Archive restores
  only to Denied, keeping reactivation deliberate and reversible.
- Review actions stay on the current viewer tab and protect immutable revision
  artifacts.
- Creation and revision submissions validate, ingest through a trusted command,
  and arrive in Intake.
- Promptinator is a viewer tab with catalog import, Ready/In progress/Completed
  lanes, manual copy fallback, atomic next-entry claims, resumable work, and
  exact completion provenance.
- Promptinator can pin 2-24 selected Ready entries as one explicit v2 test
  batch. Its dispatch panel shows the exact next claim/style, and claiming
  refuses to spill into unrelated Ready work when the batch is exhausted.
- Revision batches generate durable agent briefs without moving review state.
- Stored creation prompts remain attached to immutable revisions and can be
  copied from the viewer.

## v2 production-default decision

The user explicitly promoted `assembler-inspired-v2@0.1.0` as the main style
for creation work.

- New imports and unqueued creation default to v2 / `structured-v2`.
- Promptinator store schema `1.4.0` retains the still-Ready v1-to-v2 migration
  and adds the active test-batch dispatch pin.
- Copied, claimed, completed, and ingested entries keep their exact style.
- A Ready entry can deliberately choose legacy v1 before dispatch.
- Revisions always keep the existing asset's recorded style.
- Promotion does not approve a sprite, select a golden example, relabel a v1
  asset, or authorize a remaster.

The ignored local store was still schema `1.2.0` before this checkpoint. The
new loader presents its 269 Ready entries as migrated v2 entries with no active
test batch, and the next trusted queue write persists schema `1.4.0`. Do not
hand-edit the store merely to force persistence.

## Safeguard checkpoint

- `enemy-mob-32` requires at least 32 opaque pixels, a 6x6 occupied footprint,
  and two visible opaque colors in every finished frame.
- Idle must contain two distinct frames per direction; walk and attack must
  each contain at least three distinct frames per direction.
- The four-direction idle checkpoint applies to both v1 and v2 before timeline
  expansion, including scripted jobs.
- Quadruped down/up views must retain a low four-legged construction and cannot
  become upright bipeds or humanoids.
- These are creator and technical safeguards only. They do not change palette,
  approve art, or make a user review decision.

The review workflow also has an explicit safeguard: an Intake candidate with
any unresolved revision note cannot be approved. Revision batches select only
those Intake candidates, and successful trusted revision ingestion resolves
their old notes before the new immutable candidate returns to Intake.

Legacy schema `1.0.0` review records are projected in memory to `1.1.0`:
legacy Revise becomes Intake while notes, approvals, archive history, and
timestamps are preserved. The migrated record is persisted only by the next
trusted review action or ingestion; production review files were not bulk
hand-edited.

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
failures that the earlier structural validation did not catch.

The subsequent explicit v2 test batch is now fully completed. All six entries
record exact `assembler-inspired-v2@0.1.0` provenance and immutable `r001`
Intake results:

- #32 Snowcap Ram -> `enemy-mob-32-snowcap-ram`;
- #34 Driftwing Owl -> `enemy-mob-32-driftwing-owl`;
- #35 Slushbelly Yeti -> `enemy-mob-32-slushbelly-yeti`;
- #36 Glaciershell Beetle -> `enemy-mob-32-glaciershell-beetle`;
- #56 Kelpcoil Serpent -> `enemy-mob-32-kelpcoil-serpent`;
- #261 Meadow Slime -> `enemy-mob-32-meadow-slime`.

The active batch ID remains
`v2-test-79cfbb26-b09d-427a-87fb-513f347cf05f`; it is exhausted rather than
silently spilling into unrelated Ready entries.

## Local runtime snapshot

The ignored production data snapshot at handoff contained:

- Promptinator: 37 Completed, 263 Ready;
- raw schema-1.0 review files: 20 Intake, 10 legacy Revise, 9 Archive;
- projected viewer lanes: 30 Intake, 0 Denied, 9 Archive;
- no user-approved Library revision in this snapshot.

These counts are local runtime state, not Git content. Refresh them rather than
assuming they remain current.

## Validation at this checkpoint

`npm.cmd run check` passed on 2026-08-01:

- foundation: 20 required files and 2 protected paths;
- contracts: fixture asset and revision passed with 12 advisory warnings;
- tests: 9 files, 49 tests passed;
- TypeScript and Vite production build passed.
- local viewer smoke test: 39 live revisions loaded as 30 Intake, 0 Denied,
  0 Library, and 9 Archive; all six exact v2 results appeared as Awaiting
  review; the Revision-requested filter showed only candidates with open notes;
  Approve was disabled for an open-note candidate; Archive offered **Restore to
  Denied**; no browser warnings or errors were logged.

This is technical validation only. It does not approve any sprite visually.

The read-only live `scan:library` also correctly reports legacy quality debt in
Brambletail Slinker, Dunecrest Jackal, Needleback Skink, Oasis Husk, and Rimepaw
Lynx under the new structural floors. These immutable older results were not
rewritten. Revision ingestion keeps validating each incoming submission against
the current floors but no longer lets unrelated historical quality debt block
the transaction's library-integrity check.

## Recommended next work

1. Review the six exact v2 Intake candidates separately and record revision
   notes, approvals, or denials through the viewer. Automated checks do not make
   those visual decisions.
2. Calibrate the new technical floors and the strengthened quadruped rule from
   those exact v2 results before changing palette or overall art direction.
3. Exercise the simplified Intake/Denied workflow against the live candidates,
   including the unresolved-note approval block and reversible Denied path.
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
- Only the user makes visual approval, revision-note, Denied, and Archive
  decisions.
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
