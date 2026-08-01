# Enemy Mob 32x32 revision job

Use this template only when an existing `enemy-mob-32` asset is already an
active candidate in Revise with actionable notes.

## Before drawing

Read:

1. the asset's `asset.json`;
2. the asset's application-owned `review.json`;
3. the exact base `revisions/<base-revision-id>/revision.json`;
4. the exact base `source.aseprite`;
5. every unresolved note in `review.json`.

Confirm that `review.candidate.revisionId` is the selected base revision and
`review.candidate.lane` is `revise`. If either value differs, stop because the
job is stale.

The base asset and revision are read-only. Create a new kebab-case staging job
directory and save every changed artifact there.

## Fixed first-slice contract

- Category: `enemy-mob-32@0.1.0`
- Style: exact style recorded by the existing asset and base revision
- Cell: 32x32 pixels
- Directions and rows: down, left, right, up
- Animations and columns:
  - idle: columns 0-1, 2 frames, 400 ms, loop
  - walk: columns 2-5, 4 frames, 150 ms, loop
  - attack: columns 6-9, 4 frames, 120 ms, once
- Sheet: 10 columns x 4 rows, 320x128 pixels
- Alpha: transparent background with hard alpha
- Opaque palette: obey the recorded style profile
- Source layers and tags: follow `docs/ASEPRITE_CONTRACT.md`

Do not silently change the existing asset name, category, style, dimensions,
directions, animation layout, or timing.

The production-default promotion does not upgrade an existing revision. A v1
asset remains v1 unless a separately authorized remaster creates a new asset or
versioned workflow.

## Required visual authoring gate

Follow `docs/SPRITE_AUTHORING_CHECKLIST.md` before completing the revision.
Compare the exact base and new sheet at the same native and nearest-neighbor 4x
scales. Preserve the strongest readable parts of the base while ensuring that:

- every unresolved user note is visibly addressed;
- creature identity and direction read in all four rows;
- for a v2 revision, the recognition budget remains limited to one dominant
  silhouette anchor and one secondary feature, with neither hidden or merged at
  native 1x;
- for v2, thin, winged, or spectral bodies retain a solid center; equipment
  stays separate from a biped torso; plant or construct cores stay distinct
  from their supports;
- all four idle poses use one fixed elevated game camera and ground plane;
- long, low bodies use foreshortening and overlap in down/up views instead of a
  full side silhouette rotated into a vertical pose;
- quadrupeds remain low and four-legged in down/up instead of becoming upright
  bipeds or humanoids;
- profiles and the up view use constructed anatomy rather than recolored or
  narrowed front poses;
- locomotion changes support anatomy instead of sliding the body;
- attack remains readable with the effects layer hidden;
- the revised result does not introduce a blob, box, prop-like silhouette,
  repetitive lattice texture, or clipped motion.

Repair failed checklist answers in this new staging job. Never overwrite the
ingested base and never treat creator self-review as the user's approval.
Keep any job-specific generator or preview helper inside this staging
directory; do not add per-sprite scripts to repository `tools/`.

## Required manifest values

`submission.json` uses the same structure as the first-slice creation template,
with these revision-specific values:

```json
{
  "kind": "agent-submission",
  "schemaVersion": "1.0.0",
  "jobId": "<same as this new staging folder>",
  "assetId": "<exact existing asset ID>",
  "baseRevisionId": "<exact active Revise revision, such as r001>",
  "requestedName": "<exact existing asset display name>",
  "request": "<concise revision brief covering the unresolved notes>",
  "category": {
    "id": "enemy-mob-32",
    "version": "0.1.0"
  },
  "style": {
    "id": "<exact existing style ID>",
    "version": "<exact existing style version>"
  },
  "producer": {
    "application": "Antigravity with Aseprite Pro MCP",
    "model": "Gemini 3.6 High",
    "sessionId": null
  },
  "output": {
    "sourcePath": "source.aseprite",
    "sheetPath": "sheet.png",
    "thumbnailPath": "thumbnail.png",
    "directions": ["down", "left", "right", "up"],
    "animations": [
      {
        "id": "idle",
        "startColumn": 0,
        "frames": 2,
        "durationMs": 400,
        "playback": "loop"
      },
      {
        "id": "walk",
        "startColumn": 2,
        "frames": 4,
        "durationMs": 150,
        "playback": "loop"
      },
      {
        "id": "attack",
        "startColumn": 6,
        "frames": 4,
        "durationMs": 120,
        "playback": "once"
      }
    ]
  },
  "submittedAt": "<ISO-8601 timestamp>"
}
```

Do not add, remove, resolve, or rewrite user notes. Do not set a candidate lane,
approval, Archive state, or revision ID for the output. Prompt Spriter owns
those decisions and allocates the next revision ID during ingestion.

## Output and completion

The staging directory must contain:

```text
source.aseprite
sheet.png
thumbnail.png
submission.json
validation.json
completion.json
```

Re-export both PNG files from the saved staging source. Run the staging
validator, make `validation.json` agree with its computed result, then write
`completion.json` last. Finally run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
```

When that command passes, run:

```powershell
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

Stop only after trusted ingestion reports the new immutable revision in Intake.
Do not edit the asset's `review.json` directly or make any user review decision.
