# Antigravity sprite workflow

This is the paved road for a user-started Antigravity chat. It uses the existing
shared Aseprite Pro MCP setup as-is. It does not require or permit repository MCP
configuration.

## What the user does

Start Antigravity from this repository and make a natural-language request. For
the first live test, use:

> Create a 32x32 enemy mob lion using the first vertical slice. Give it idle,
> walk, and attack animations in down, left, right, and up directions. Follow
> the repository instructions and put the completed candidate in Intake-ready
> staging. Do not change project code, contracts, review state, or MCP setup.

The user does not need to provide sheet dimensions, frame counts, tag names,
palette limits, or paths. The repository contracts define those details.

## What the agent reads

In order:

1. `AGENTS.md`
2. `docs/STATUS.md`
3. `docs/BOUNDARIES.md`
4. `docs/ASEPRITE_CONTRACT.md`
5. `docs/ASEPRITE_CAPABILITIES.md`
6. `categories/enemy-mob-32/CATEGORY.md`
7. `categories/enemy-mob-32/category.json`
8. `styles/assembler-inspired-v1/STYLE_GUIDE.md`
9. `styles/assembler-inspired-v1/style.json`
10. `jobs/templates/enemy-mob-32-first-slice.md`

The JSON contracts are authoritative when prose and structured values disagree.

For a revision job, replace step 10 with
`jobs/templates/enemy-mob-32-revision.md` and also read the selected asset's:

1. `asset.json`
2. `review.json`
3. exact `revisions/<base-revision-id>/revision.json`
4. exact base `source.aseprite`

The base revision must be the active candidate in Revise. Read its unresolved
notes as the revision brief, but do not edit `review.json`.

## Assigned staging directory

Each creation attempt gets one kebab-case job ID:

```text
workspace/staging/<job-id>/
  source.aseprite
  sheet.png
  thumbnail.png
  submission.json
  validation.json
  completion.json
```

The job may write only inside its own directory. The agent must not overwrite an
older staging job to create a second attempt.

`completion.json` is written last. Its presence means the folder is ready for
ingestion, not that the sprite is visually approved.

## Validation

Before writing `completion.json`, run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id>
```

Use the computed result to write `validation.json`, then run the same command
again. Write `completion.json` only after the manifest, artifacts, and
validation report agree.

The check covers contract identity, safe relative paths, file presence, sheet
dimensions, directions, animation layout and timing, hard alpha, empty frames,
palette limit, duplicate-frame warnings, opaque cell-edge contact, source
layers/tags/durations, and exact pixel parity between the saved `.aseprite`
source and `sheet.png`.

The completion marker must list:

```text
submission.json
validation.json
source.aseprite
sheet.png
thumbnail.png
```

The creation agent stops after writing `completion.json`. It must not run
ingestion or edit application-owned review records.

## Revising an existing asset

The user first places the item in Revise with notes. For an approved Library
item, the user does this with **Start revision**; the approved revision remains
selected throughout the work.

Use a new staging job ID and keep the existing asset identity:

```text
workspace/staging/<new-revision-job-id>/
```

In `submission.json`, set:

- `assetId` to the exact existing asset ID;
- `baseRevisionId` to the exact active Revise candidate revision;
- `requestedName`, category, and style to the existing asset values;
- `request` to a concise revision brief covering the unresolved notes.

Copy or open the exact base source, make the requested changes, and save the
result as the staging folder's new `source.aseprite`. Never save over the
ingested base source. Re-export the sheet and thumbnail from the new saved
source, validate them, and write `completion.json` last.

The revision agent stops at completed staging. Trusted Prompt Spriter ingestion
allocates the next immutable revision ID, preserves any approved revision,
marks the processed notes in history, and returns the new candidate to Intake.

## Processing a revision batch

Prompt Spriter stores a generated batch under:

```text
workspace/batches/revision/<batch-id>/
  batch.json
  brief.md
```

The user copies `brief.md` into an Antigravity chat started from this
repository. Treat its asset IDs, base revisions, source paths, and unresolved
notes as the exact dispatch list.

Process each item independently:

1. re-read the asset's current `review.json`;
2. confirm the listed base is still the active Revise candidate;
3. create one new staging directory for that asset;
4. follow `jobs/templates/enemy-mob-32-revision.md`;
5. validate and complete that staging job;
6. continue with the next batch item.

If any item is stale, stop that item and report it without changing review
state. A batch never grants permission to edit another asset, ingest results,
approve work, archive a candidate, or alter MCP configuration.

## Prompt Spriter ingestion

After the agent reports completion, the trusted Prompt Spriter operator runs:

```powershell
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

Ingestion requires a valid completion marker, refuses paths outside the assigned
staging root, refuses duplicate asset IDs, calculates artifact hashes, validates
the generated library records, and registers a new immutable `r001` candidate
in Intake. It leaves the original staging job untouched.

When `baseRevisionId` is non-null, the same command performs existing-asset
revision ingestion. It requires that exact base to still be the active Revise
candidate, refuses identity or contract drift, creates the next `rNNN`
directory, and leaves every earlier revision untouched. Retained transaction
evidence makes a safe retry idempotent after an interrupted finalization.

Refresh or reopen the viewer after ingestion. The Vite development server reads
the local `workspace/library/` manifests directly and streams only the selected
PNG artifacts to the browser.

## Aseprite evidence

Before completion, the agent must open or render the exact `sheet.png` and
inspect all four direction rows at both native scale and an enlarged review
scale. This is creator-side inspection only. The candidate still enters Intake
for the user's visual decision.

## Failure behavior

- If Aseprite capabilities are missing, stop and report the missing capability.
- Do not repair, replace, or reconfigure the shared MCP setup.
- If validation fails, keep the job incomplete and repair only that job.
- If the subject cannot fit the contract cleanly, report the conflict instead
  of silently changing frame size or animation layout.
