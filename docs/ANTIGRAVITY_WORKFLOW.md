# Antigravity sprite workflow

This is the paved road for a user-started Antigravity chat. It uses the existing
shared Aseprite Pro MCP setup as-is. It does not require or permit repository MCP
configuration.

## What the user does

Start Antigravity from this repository and make a natural-language request. For
the first live test, use:

> Read and follow the project documentation. Create an enemy-mob-32 sprite
> named "Lion".

The user does not need to provide sheet dimensions, frame counts, tag names,
palette limits, paths, or ingestion instructions. The repository contracts
define those details, and the completed candidate must appear in Intake.

For normal queued production, the user can instead say:

> Read and follow the project documentation. Create the next sprite in the
> Promptinator queue.

No Promptinator clipboard step is required.

## Claiming the next Promptinator sprite

Only when the user asks for the next queued sprite, run this command once:

```powershell
npm.cmd run promptinator:claim-next
```

The trusted command reconciles already ingested prompt provenance, atomically
claims the lowest-ordinal Ready entry, and prints:

- the stable Promptinator entry and exclusive claim IDs;
- the expected new asset/job ID;
- the exact category and style profile;
- the complete structured prompt.

Use the printed expected asset ID for both `workspace/staging/<job-id>/` and
`submission.json.assetId`. Use the exact text between the prompt markers as
`submission.json.request`. Do not claim another entry to retry the same work.
An interrupted claim remains In progress and can be resumed from its displayed
prompt or deliberately returned to Ready by the user.

The claim command does not launch Antigravity, open Aseprite, create a sprite,
ingest an asset, or change human review state. It only reserves one queue entry.

## What the agent reads

In order:

1. `AGENTS.md`
2. `docs/STATUS.md`
3. `docs/BOUNDARIES.md`
4. `docs/ASEPRITE_CONTRACT.md`
5. `docs/ASEPRITE_CAPABILITIES.md`
6. `categories/enemy-mob-32/CATEGORY.md`
7. `categories/enemy-mob-32/category.json`
8. the exact style guide selected by the request or Promptinator claim;
9. that same style profile's `style.json`;
10. `docs/SPRITE_AUTHORING_CHECKLIST.md`
11. `jobs/templates/enemy-mob-32-first-slice.md`

The JSON contracts are authoritative when prose and structured values disagree.
An ordinary unqueued job and a newly imported Promptinator entry default to
`assembler-inspired-v2@0.1.0`. Read its `STYLE_GUIDE.md` and adjacent
`style.json`. If a Promptinator claim deliberately prints the legacy
`assembler-inspired-v1@0.1.0` profile, follow v1 exactly instead of silently
upgrading it.

For a revision job, replace step 11 with
`jobs/templates/enemy-mob-32-revision.md` and also read the selected asset's:

1. `asset.json`
2. `review.json`
3. exact `revisions/<base-revision-id>/revision.json`
4. exact base `source.aseprite`

The base revision must be the active candidate in Intake with at least one
unresolved note. Read its unresolved notes as the revision brief, but do not
edit `review.json`.

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

The job may author files only inside its own directory. The agent must not
overwrite an older staging job to create a second attempt. After the staging job
is complete, it may invoke only the documented trusted ingestion command; it
must not write Library, transaction, or review files directly.

This includes temporary Lua, JavaScript, generated previews, and other
job-specific helpers. Keep them inside the assigned staging directory. Do not
create per-sprite generator files in repository `tools/` or elsewhere in the
project tree.

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

After writing `completion.json`, run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

The creation agent stops only after trusted ingestion reports the exact
`assetId` and `r001` in Intake. It must not edit application-owned review
records directly.

For a Promptinator-claimed job, the same ingestion command must additionally
report the stable Promptinator entry as `completed`. Ingestion matches the
exact stored structured request, name, category, style, and expected asset ID
before it can complete the active claim.

## Revising an existing asset

The user first adds revision notes to the Intake candidate. For an approved
Library item, the user does this with **Start revision**; the approved revision
remains selected throughout the work while the base candidate appears in
Intake.

Use a new staging job ID and keep the existing asset identity:

```text
workspace/staging/<new-revision-job-id>/
```

In `submission.json`, set:

- `assetId` to the exact existing asset ID;
- `baseRevisionId` to the exact active Intake candidate revision;
- `requestedName`, category, and style to the existing asset values;
- `request` to a concise revision brief covering the unresolved notes.

Copy or open the exact base source, make the requested changes, and save the
result as the staging folder's new `source.aseprite`. Never save over the
ingested base source. Re-export the sheet and thumbnail from the new saved
source, validate them, and write `completion.json` last.

After completion-required validation passes, the revision agent invokes trusted
Prompt Spriter ingestion. Ingestion allocates the next immutable revision ID,
preserves any approved revision, marks the processed notes in history, and
returns the new candidate to Intake. The agent stops only after that Intake
handoff succeeds.

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
2. confirm the listed base is still the active Intake candidate with unresolved
   notes;
3. create one new staging directory for that asset;
4. follow `jobs/templates/enemy-mob-32-revision.md`;
5. validate, complete, and ingest that staging job into Intake;
6. continue with the next batch item.

If any item is stale, stop that item and report it without changing review
state. A batch never grants permission to edit another asset, approve work,
archive a candidate, patch review state directly, or alter MCP configuration.

## Trusted Prompt Spriter ingestion

After completion-required validation passes, the creation or revision agent
invokes:

```powershell
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

Ingestion requires a valid completion marker, refuses paths outside the assigned
staging root, refuses duplicate asset IDs, calculates artifact hashes, validates
the generated library records, and registers a new immutable `r001` candidate
in Intake. It leaves the original staging job untouched.

If Windows interrupts the final new-asset registration move, rerunning the same
ingestion command revalidates the retained prepared transaction against the
current staging manifests and artifact hashes before resuming. It never
overwrites an existing Library asset.

When `baseRevisionId` is non-null, the same command performs existing-asset
revision ingestion. It requires that exact base to still be the active Intake
candidate with unresolved notes, refuses identity or contract drift, creates
the next `rNNN`
directory, and leaves every earlier revision untouched. Retained transaction
evidence makes a safe retry idempotent after an interrupted finalization.

Refresh or reopen the viewer after ingestion. The Vite development server reads
the local `workspace/library/` manifests directly and streams only the selected
PNG artifacts to the browser.

Running this command does not grant permission to approve, add or resolve
notes, Deny, return to Intake, Archive, restore, or patch `review.json`.

## Aseprite evidence

Before completion, the agent must open or render the exact `sheet.png` and
inspect all four direction rows at both native scale and an enlarged review
scale. It must also inspect the saved source with the effects layer hidden and
apply every question in `docs/SPRITE_AUTHORING_CHECKLIST.md`.

The first visual checkpoint is a four-pose idle preview made before the rest of
the timeline for both v1 and v2 jobs. Confirm that all four poses use one fixed
elevated game camera and ground plane. For long, low creatures, down and up must
use foreshortening and body overlap; rotating a full-length side pose into a
vertical drawing is a failed checkpoint and must be rebuilt before walk or
attack frames are added. A quadruped must retain a low horizontal torso and
four connected or visibly overlapped supports in down/up; an upright humanoid
reinterpretation fails this checkpoint.

Do not write `completion.json` while the creature is an ambiguous blob or
object, a direction lacks constructed anatomy, locomotion is only translation,
or attack is readable only because of projectile/effect pixels. Repair the
current assigned staging job, re-export from the saved source, and repeat the
inspection. This is creator-side quality control only. The candidate still
enters Intake for the user's visual decision.

## Failure behavior

- If Aseprite capabilities are missing, stop and report the missing capability.
- Do not repair, replace, or reconfigure the shared MCP setup.
- If validation fails, keep the job incomplete and repair only that job.
- If trusted ingestion fails, retain the completed staging job and report the
  exact error. Do not bypass ingestion by copying into the Library or editing
  review state.
- If a Promptinator job fails or is interrupted before ingestion, leave its
  claim In progress. Do not silently requeue it or claim a replacement.
- If the subject cannot fit the contract cleanly, report the conflict instead
  of silently changing frame size or animation layout.
