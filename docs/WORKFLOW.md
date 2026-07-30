# Prompt Spriter workflow

This is the concise operating workflow. The architecture and delivery sequence
remain in `MASTER_PLAN.md`.

## Creation loop

1. The user starts an Antigravity chat from this repository.
2. The user requests a sprite.
3. The agent follows the selected category contract and style profile.
4. The agent creates and inspects the exact result in Aseprite through the
   existing shared Aseprite Pro MCP setup.
5. The agent runs technical validation and completes its staging submission.
6. Prompt Spriter ingests the new immutable candidate revision into Intake.
7. The user reviews it whenever convenient.

Intake may accumulate across sessions. It is not a chat or revision-note queue.

## User decisions

From Intake, the user can:

- **Approve:** set the exact candidate revision as the Library revision.
- **Send to Revise:** move the working candidate into Revise and add notes.

There is no Denied state and no general-purpose WIP state.

Both actions require an explicit confirmation in the viewer. Send to Revise
requires at least one non-empty note. A note may optionally target a direction,
animation, and one or more one-based frame numbers. More notes can be added
later from Revise.

The viewer rejects stale decisions when `review.json` changed after the page
loaded. Reload the item and decide against the current exact revision instead
of overwriting newer review state.

## Revision loop

For an unapproved candidate, **Send to Revise** creates the first actionable
note. For an approved asset with no active candidate, **Start revision** creates
a separate Revise candidate against the exact approved revision and requires
the first actionable note.

1. The user reviews one or more Revise items and writes actionable notes.
2. The user optionally groups selected items into a named revision batch.
3. The user asks an Antigravity agent to process an item or that later batch.
4. The agent reads `asset.json`, `review.json`, the exact base revision, and all
   unresolved notes.
5. The agent creates a new source and complete submission in a new staging
   folder. It never overwrites the ingested base source or edits `review.json`.
6. Trusted Prompt Spriter ingestion allocates the next revision ID and returns
   that immutable candidate to Intake.
7. Notes processed by that ingestion remain in history with a processed marker.

Earlier revisions remain immutable and available for comparison.

Revision ingestion requires the submitted `assetId` and `baseRevisionId` to
match the exact active Revise candidate. It also requires the name, category,
and style to match the existing asset. A stale or mismatched job is refused
instead of being attached to the wrong history.

## Revision batches

Revision batches are dispatch metadata, not workflow lanes or storage owners.

1. In Revise, select one or more exact candidates.
2. Choose **Generate batch brief** and confirm a unique kebab-case batch ID.
3. Prompt Spriter rechecks every selected revision, its current
   `review.updatedAt`, its Revise lane, and its unresolved notes.
4. It writes:

   ```text
   workspace/batches/revision/<batch-id>/
     batch.json
     brief.md
   ```

5. Copy the generated brief into an Antigravity chat started from this
   repository.

The brief lists each exact asset ID, base revision, source path, contract, style,
and unresolved note. It repeats the protected write boundaries and completion
command. One staging job is created per selected asset.

Creating a batch does not change `review.json`, resolve notes, approve sprites,
move lanes, archive candidates, launch Antigravity, or ingest output. A stale
selection is refused so a brief cannot silently target review state that
changed after the page loaded.

## Archive rule

Archive is a secondary, recoverable holding area.

- Archive is available only from Revise.
- There is no direct Intake-to-Archive action.
- There is no direct Library-to-Archive action.
- Restore always returns the candidate to Revise with notes and history.
- Archiving a newer working candidate does not remove an older approved Library
  revision.
- Agents cannot archive candidates.

The Archive control is shown only for a candidate currently in Revise. The
Archive view offers Restore, which returns the same candidate and preserved
notes to Revise.

## Library rule

The Library shows exact revisions manually approved by the user. When the user
starts new work from an approved asset:

- the approved revision remains in the Library;
- **Start revision** requires a note and opens the exact approved revision as a
  separate working candidate in Revise;
- the next completed agent result becomes a new immutable Intake revision;
- only a later manual approval replaces the Library revision.

Game-ready export defaults to the exact approved revision, never an unapproved
working candidate.

Review actions change only `review.json`. Ingested revision directories and
their Aseprite/PNG artifacts remain immutable.

When more than one revision exists, the review view exposes side-by-side
comparison. The focused animation, direction, frame, and review background are
applied to both revisions wherever both contracts support them.

## Validation rule

Technical outcomes are:

- passed;
- passed with warnings;
- failed;
- not completed.

None of these outcomes means visually approved. A technically invalid candidate
may still appear in Intake with a clear warning.
