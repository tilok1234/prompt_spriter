# Tests

Automated coverage includes:

- review-state transitions and Archive restrictions;
- persisted Approve, Intake-note, Deny, Return-to-Intake, Archive, and Restore
  actions;
- unresolved-note approval blocking and legacy Revise migration;
- stale-review and exact-revision conflict refusal;
- immutable asset/revision/artifact hashes across review mutations;
- sprite sheet frame-to-background-position mapping;
- completion-required, immutable new-asset ingestion;
- completion-required existing-asset revision ingestion;
- exact active-Intake-base-with-notes enforcement and identity/contract
  protection;
- idempotent revision-ingestion retry from retained transaction evidence;
- approved-revision protection while a newer candidate returns to Intake;
- all immutable revisions exposed for side-by-side comparison;
- deterministic revision-batch metadata and Markdown brief generation;
- stale, wrong-lane, duplicate-selection, and batch-overwrite refusal;
- review and sprite hashes unchanged by batch creation;
- local library records exposed to the viewer;
- cell-edge contact reporting with one-based frame coordinates.

Tests may prove structural and rendering consistency. They cannot approve sprite
art on the user's behalf.
