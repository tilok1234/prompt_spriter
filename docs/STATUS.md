# Project status

**Current phase:** Phase 4 - revision batches underway; v2 production style active
**Plan:** `docs/MASTER_PLAN.md`, version 0.4
**Repository:** `https://github.com/tilok1234/prompt_spriter`

## Completed checkpoint

Phases 0 through 2 are complete:

- root agent instructions;
- protected-boundary documentation;
- JSON schemas for category, style, asset, revision, review, batch, submission,
  validation, and completion records;
- frozen first-slice `enemy-mob-32` and `assembler-inspired-v1` contracts;
- Aseprite source, layer, tag, timing, and export contract;
- deterministic four-direction fixture sheet;
- animated browser Intake viewer with direction, animation, frame, zoom, and
  background controls;
- contract/library scanner and structural PNG validation;
- review-state unit tests, including Archive-only-from-Revise;
- production TypeScript/Vite build.
- read-only inventory of the visible Aseprite Pro MCP capabilities;
- user-started Antigravity workflow;
- one conversational first-lion prompt;
- one staging directory and completion-marker convention;
- exact first-slice creation template;
- staging submission validator;
- completion-required new-asset ingestion;
- immutable revision registration with hashes and retained transaction receipt;
- duplicate-ID and overwrite refusal;
- live local-library manifest and artifact endpoint for the development viewer;
- fixture fallback before the first production asset exists.
- first real `enemy-mob-32` lion candidate;
- corrected saved-source/sheet parity;
- immutable lion revision `r001` ingested into Intake;
- live viewer proof against the exact local-library artifact.

`npm.cmd run check` passes the completed Phase 2 gate. Technical validation and
the user's visual decision remain separate.

## Phase 3 completed checkpoint

The complete Phase 3 review loop is implemented:

- manual Approve of one exact Intake revision;
- Send to Revise with one required actionable note;
- optional note targets for direction, animation, and frames;
- additional notes from the Revise view;
- Archive action available only from Revise;
- Restore action returning Archive candidates to Revise;
- Library membership for the exact approved revision;
- atomic `review.json` replacement with retry-safe Windows writes;
- stale-review conflict detection and exact revision/lane enforcement;
- same-origin, JSON-only local review mutation endpoint;
- tests proving review persistence never changes immutable revision artifacts.
- protected **Start revision** from an approved Library revision with a required
  actionable note;
- completion-required existing-asset revision ingestion from the exact active
  Revise candidate;
- automatic next `rNNN` allocation with parent-revision provenance;
- preserved approved revision while a newer immutable candidate returns to
  Intake;
- resolved-note history retained after revision ingestion;
- retained staging jobs and retry-safe transaction evidence;
- all immutable revisions exposed to the viewer;
- synchronized side-by-side comparison across animation, direction, frame, and
  background;
- a dedicated Antigravity `enemy-mob-32` revision-job template;
- unit coverage for legal revision creation, stale/base refusal, idempotent
  retry, preserved `r001` hashes, and protected Library membership;
- disposable two-revision browser QA with no runtime errors.

The live lion remains in Intake with `approvedRevisionId: null`. Implementation
and tests do not make a visual decision for the user.

`npm.cmd run check` passes the current gate with 8 test files and 40 tests.
Technical validation and the user's visual decision remain separate.

## Phase 4 current work

The first revision-batch slice is implemented:

- multi-selection of exact candidates in Revise;
- unique kebab-case revision-batch identity;
- stale `review.updatedAt`, exact revision, lane, and unresolved-note checks;
- deterministic `batch.json` registration;
- generated Markdown Antigravity brief with exact asset IDs, base revisions,
  sources, contracts, styles, notes, and protected boundaries;
- retained batch-creation transaction receipt;
- read-only Batches view with saved briefs and copy control;
- tests proving batch creation never changes review records or immutable sprite
  artifacts.
- recovery of a fully validated new-asset transaction when Windows interrupts
  the final registration move;
- development-viewer exclusion of the ignored `workspace/` tree from Vite file
  watching so staging and transaction directories are not held open.
- automatic Antigravity handoff through trusted ingestion so a completed
  creation or revision job finishes in Intake without permitting direct review
  state edits.
- native Promptinator viewer tab with validated bulk import, Ready and Copied
  queues, clipboard-first transitions, requeue, search, and prompt preview;
- immutable prompt provenance displayed on sprite revisions;
- 300 structured prompts across 30 collections preserved in the ignored local
  Promptinator store.
- trusted atomic `promptinator:claim-next` dispatch with exclusive claim IDs,
  expected asset identity, and no clipboard dependency;
- resumable Promptinator In-progress state plus immutable Completed links to
  exact asset/revision provenance;
- automatic claim completion only after successful trusted Intake ingestion;
- safe reconciliation of older manually copied prompts from immutable Library
  request provenance;
- Promptinator viewer lanes for Ready, In progress, and Completed, including a
  refresh control for external Antigravity updates.
- `assembler-inspired-v2@0.1.0` promoted to the production creation default;
- Promptinator store schema `1.3.0`, which migrates only still-Ready legacy-v1
  entries while preserving copied, claimed, completed, and ingested provenance;
- Ready-only legacy-v1 selection for deliberate compatibility work.

Remaining Phase 4 work:

- connect completed revision submissions back to their originating batch;
- calculate per-batch queued, returned-to-Intake, approved, and remaining
  outcome counts;
- add batch-based asset filtering;
- decide whether creation-session batches need a first-class manual control or
  whether existing producer/session provenance is sufficient.

## Prompt calibration checkpoint

The first prompt-density canary is recorded in
`docs/PROMPT_CALIBRATION.md`.

- The structured Mossback Tuskling brief produced the stronger complete
  four-direction result.
- The minimal prompt produced an appealing front direction, but the user found
  the other three directions malformed.
- The structured formula is the current leader, but it is not promoted as a
  final standard until it is checked against at least one flying and one
  humanoid subject.
- A seven-candidate, mostly fresh-chat production sample exposed recurring
  visual failures that structural validation cannot detect: prop-like
  silhouettes, weak direction rotation, repeated body poses, and effects-led
  attacks.
- `docs/SPRITE_AUTHORING_CHECKLIST.md` now turns the existing style/category
  expectations into a mandatory creator-side gate without rewriting the used
  `assembler-inspired-v1@0.1.0` profile or granting visual approval.
- A five-candidate checklist canary exposed a specific long-body projection
  failure and full-timeline procedural self-certification. The gate now fixes
  one camera and ground plane, requires a four-idle-pose checkpoint, names a
  controlled body plan, and keeps per-job generator helpers inside staging.
- `assembler-inspired-v2@0.1.0` is now the active production default for new
  and still-Ready creation work. The promotion does not relabel any prior v1
  candidate and does not visually approve a golden sprite.
- In the completed entries 20-31 test batch, only Mirewitch Newt used v2.
  Entries 21-31 used v1, so their successes and failures must not be attributed
  to the v2 profile.
- The next quality work is a smaller genuine v2 batch plus structural checks
  for occupancy, per-frame color use, animation distinctness, and long-body
  down/up projection. Those checks are not part of this promotion checkpoint.

## Frozen first-slice decisions

- Idle 2 frames at 400 ms, walk 4 at 150 ms, attack 4 at 120 ms.
- Directions are down, left, right, and up.
- Left/right mirroring is allowed only for symmetric designs.
- The first-slice sheet is 320x128 with 32x32 cells and hard alpha.
- Source layers and direction-animation tags follow
  `docs/ASEPRITE_CONTRACT.md`.
- Legacy v1 uses 6-12 recommended opaque colors with a maximum of 16.
- Production v2 targets 4-8 opaque colors, allows at most 12, and uses its
  required master palette and contour rule.
- Empty frames, intermediate alpha, clipping, and contract mismatches fail;
  duplicate frames and boundary contact warn.

## Protected state

- Shared MCP configuration has not been changed.
- No Godot files or dependencies are present.
- The 8-bit Sprite Assembler reference remains read-only.
- Human review state remains separate from agent validation.
