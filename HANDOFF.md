# Prompt Spriter handoff

**Date:** 2026-08-02
**Canonical repository:** `C:\Users\headc\Documents\prompt_spriter`
**Checkpoint branch:** `main` (pushed to `https://github.com/tilok1234/prompt_spriter`)
**Current phase:** Automated production loop live; v2 production style active

## Start here

This is the continuation point for a fresh chat. Read, in order:

1. `AGENTS.md`
2. this handoff
3. `docs/STATUS.md`
4. `docs/WORKFLOW.md`
5. `docs/BOUNDARIES.md`
6. `launcher/README.md` for the dispatch automation
7. the relevant section of `docs/MASTER_PLAN.md`

Before changing anything, verify the canonical path, branch, exact Git status,
and `npm.cmd run check`. The older checkout under
`C:\Users\headc\Documents\AI_training_lab\prompt_spriter` is obsolete and must
not be used. The pre-merge launcher copy under
`C:\Users\headc\Documents\Antigravity Queue Launcher` is superseded by
`launcher/` in this repository and is safe to delete.

## The automated loop (what changed on 2026-08-02)

The full production loop now runs unattended except for the user's review:

1. The user imports structured prompt catalogs into Promptinator
   (`npm run promptinator:import`).
2. The **Antigravity Queue Launcher** (`launcher/`, start via
   `launcher/Launch Queue.cmd` or the user's desktop shortcut) auto-sends
   conversations to the Antigravity CLI in hidden print mode. Source priority
   per send: local queue messages, then pending **revision-batch items**, then
   fresh **Promptinator claims** (claimed in a background process; full claim
   printout is the conversation message).
3. Each conversation follows the repository docs, draws under the full
   guidance stack, validates, and ingests through the trusted command; claims
   and revision items complete themselves via ingestion provenance.
4. The user reviews Intake in the viewer; approvals, Revise notes, Start
   revision, and Archive remain exclusively human decisions.
5. Below-floor approved assets can be moved to Revise through the trusted
   `start-revision` action with measured notes and grouped into revision
   batches (`workspace/batches/revision/`), which the launcher then dispatches
   and retires automatically.

First full cycle completed 2026-08-02: 19 approved below-floor assets were
repaired to new revisions (including `alchemist-brigand` r002, which resolves
every finding of the original quality review) alongside 62 new creations in
one unattended run.

## Guidance stack (why quality rose)

Prompts rendered for structured-v2 entries carry, in addition to the creative
brief: the recognition budget, directional derivation rules (per-row prop
visibility and on-screen attack direction), and a pointer to the promoted
style exemplars. Supporting machinery:

- **Style exemplars:** `styles/assembler-inspired-v2/examples.json` holds
  user-promoted reference sheets (currently `orbit-owl`, `banner-drummer`,
  `masked-chirurgeon`). Promote/demote with
  `npm run style:promote-example -- <assetId> --note "..."` (requires the
  asset's user-approved revision; enforces style and hash integrity).
- **Motion validators** (advisory, in `validation.anatomyMotion`,
  `validation.groundContact`, `validation.attackReadability` of the category
  contract): translation-only idle/walk detection via best-shift residuals,
  ground-contact stability for grounded plans, body-readable attacks,
  facing-cone effect trajectories, and effect edge margins.
- **Construction recipes:** per-body-plan minimum masses in
  `docs/SPRITE_AUTHORING_CHECKLIST.md`; the no-straight-sided-slab rule.
- **Promptinator store:** schema `1.7.0`; Ready-only migrations append new
  rule tiers; claimed/completed prompt text is immutable.

## Library state at this handoff

- Lanes: 97+ approved Library assets, ~81 fresh candidates in Intake awaiting
  the user (19 repair revisions + 62 creations), Revise holds only items whose
  repairs are pending approval, 148 archived (all restorable), Promptinator
  has ~25 Ready entries left — the user plans to import new catalogs (format
  documented in chat and derivable from `tools/lib/promptinator.mjs`
  `parsePromptCatalog`; next entry ordinal 347, next collection ordinal 36).
- The A/B painter comparison concluded: Claude-drawn candidates
  (`deepwell-shaman-claude`, `chainclaw-troglodyte-claude`) were approved;
  Flash 3.6 High with the full guidance stack remains the volume painter.

## Launcher facts a fresh session must know

- Lives in `launcher/`; `launcher/data/` is untracked runtime state (queue,
  logs, backups, crash log). Tests: `launcher/tests/run-tests.ps1`
  (112 assertions, must pass under Windows PowerShell 5.1 and PowerShell 7).
- Conversations and background claims launch through `conhost --headless`
  because Windows Terminal ignores `-WindowStyle Hidden`.
- Dispatcher exceptions are caught and logged to
  `launcher/data/logs/launcher-crash.log`; the window survives handler bugs.
- The desktop `Stop Antigravity Queue.bat` kills the launcher, runners, and
  agy conversations; claims stay resumable.
- Auto-send is always off at startup. `data/settings.json` keys:
  `promptinatorEnabled`, `promptinatorRepo` (empty = this repo),
  `promptinatorClaimant`, `dispatchRevisionBatches`.

## Safeguard checkpoint

- `enemy-mob-32` frames require 32 opaque pixels, a 6x6 footprint, two visible
  opaque colors; idle needs two distinct frames, walk and attack three each.
- Advisory motion floors: idle at least 6px beyond best-shift translation,
  walk at least 15px on two frames, stable ground contact for grounded plans,
  attack body motion of 12px on two frames, effects within 60 degrees of
  facing and 2px inside cell edges.
- The four-direction idle checkpoint applies to all jobs, including scripted
  ones, before timeline expansion.
- Style profiles are immutable once used; exemplar promotion never edits
  `style.json`.
- Agents never write review state, approvals, or launcher data; trusted tools
  own every workspace write.

## Open items

- User to import new prompt catalogs (Promptinator nearly drained).
- ~81 Intake candidates await user review; approving a repair retires its
  Revise entry automatically.
- `enemy-mob-32-alchemist-brigand` r002: amber flask is only 1px in the right
  profile (correct side, weak prominence) — acceptable or one more revision,
  user's call at review.
- Asset `anvilkin-porter` lacks the `enemy-mob-32-` prefix (manual-dispatch
  naming drift); harmless, rename only via a deliberate migration if desired.
- Library scan over `workspace/library` reports ~128 pre-existing failures
  from retroactive quality floors on old assets; `enforceQuality: false` is
  the intended legacy-tolerant path — a decision on how to scan history is
  still open.
- Promptinator UI does not yet surface exemplar promotion; CLI only.
