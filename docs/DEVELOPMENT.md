# Development

## Current validation

Install dependencies once with `npm.cmd install`, then run:

```powershell
npm.cmd run check
```

This runs the foundation checks, contract and fixture scan, unit tests, and
production build.

## Stable command contract

```text
npm.cmd run check
npm.cmd run test
npm.cmd run dev
npm.cmd run build
```

`check` remains the complete non-visual technical gate. Visual sprite approval
is never part of an automated command.

Validate a live staging job with:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id>
```

Register a completed new-asset job in Intake with:

```powershell
npm.cmd run ingest:submission -- workspace/staging/<job-id>
npm.cmd run scan:library -- workspace/library
```

Ingestion is completion-required and refuses to overwrite an existing asset.
The source staging folder remains unchanged. Transaction receipts are retained
under the ignored `workspace/transactions/` root.

The same command registers an existing-asset revision when
`submission.json.baseRevisionId` names the exact active Revise candidate.
Revision ingestion:

- requires the existing asset ID, display name, category, and style to match;
- allocates the next immutable `rNNN` directory;
- preserves the exact approved revision, if any;
- returns the new revision to Intake;
- retains earlier revisions and staging artifacts unchanged;
- marks the unresolved notes processed without deleting their history;
- resumes safely from retained transaction evidence when finalization was
  interrupted.

Completion-required validation re-exports the saved `.aseprite` file into the
ignored `workspace/qa/source-validation/` area. Its pixels, frame count,
durations, required layers, and required tags must agree with the submitted
sheet and manifests before ingestion can proceed.

The first Antigravity run is documented in `ANTIGRAVITY_WORKFLOW.md`.

## Local review actions

The Vite development server exposes a same-origin, JSON-only review endpoint
used by the viewer. It supports:

- Approve from Intake;
- Send to Revise with a required note;
- add another note while in Revise;
- Archive only from Revise;
- Restore only from Archive.
- Start revision from an approved Library item with no active candidate.

Every request names the exact asset/revision and includes the `updatedAt` value
the viewer loaded. Stale or illegal transitions are rejected. Successful
actions atomically replace only the asset's `review.json`; immutable revision
manifests and artifacts are not rewritten.

Start revision keeps the exact approved revision selected while opening the
same revision as the Revise base with a required note. The later agent job
still cannot mutate review state; only trusted ingestion replaces that working
base with the newly allocated Intake revision.

Tests exercise review actions against temporary library copies. Do not use the
production `workspace/library` to automate approval or state-transition tests.

## Revision batches

The Revise viewer can select multiple exact candidates and POST a batch request
to the same-origin local server. The server revalidates each asset, base
revision, Revise lane, `review.updatedAt`, and unresolved-note set before
writing anything.

Registered revision batches live under:

```text
workspace/batches/revision/<batch-id>/
  batch.json
  brief.md
```

Creation uses a retained transaction receipt under
`workspace/transactions/create-revision-batch-<batch-id>/`. Existing batch IDs,
stale selections, non-Revise candidates, duplicate selections, and candidates
without unresolved notes are refused. Batch creation never changes
`review.json` or an immutable revision artifact.

The development viewer exposes:

```text
GET  /__prompt-spriter/batches
POST /__prompt-spriter/batches
```

The Batches view reads saved briefs. It does not launch or message Antigravity.

## Windows development launcher

`scripts/open-viewer.bat` starts the Vite viewer and opens it in the default
browser. The terminal window owns the local development server and must remain
open while the viewer is in use.

The launcher runs `npm.cmd ci` only when `node_modules/` is absent. Its
`PROJECT_DIR` value must be updated if the repository is moved.

## Repository data split

Committed:

- application source;
- documentation;
- schemas;
- category and style definitions;
- tests and small deterministic fixtures;
- development tools.

Ignored:

- the production `workspace/` library;
- staging jobs;
- generated runtime indexes;
- local backups and exports;
- installed dependencies and build output.

Do not add generated production sprites to Git merely because they were created
from inside the repository.
