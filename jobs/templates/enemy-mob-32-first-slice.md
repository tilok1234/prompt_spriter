# Enemy Mob 32x32 first-slice job

Use this template only for a new `enemy-mob-32` candidate containing the first
vertical slice.

## Fixed contract

- Category: `enemy-mob-32@0.1.0`
- Style: exact Promptinator claim; otherwise `assembler-inspired-v2@0.1.0`
- Cell: 32x32 pixels
- Directions and rows: down, left, right, up
- Animations and columns:
  - idle: columns 0-1, 2 frames, 400 ms, loop
  - walk: columns 2-5, 4 frames, 150 ms, loop
  - attack: columns 6-9, 4 frames, 120 ms, once
- Sheet: 10 columns x 4 rows, 320x128 pixels
- Alpha: transparent background with hard alpha
- Opaque palette: obey the selected profile (`v1`: 16 maximum; `v2`: 12)
- Source layers and tags: follow `docs/ASEPRITE_CONTRACT.md`

## Required visual authoring gate

Follow `docs/SPRITE_AUTHORING_CHECKLIST.md` before completing the job. In
particular:

- establish readable down, left, right, and up idle silhouettes before filling
  the timeline;
- render those four idle poses as a checkpoint before generating the remaining
  frames for both v1 and v2, even when a Lua or JavaScript generator is used;
- keep one fixed elevated game camera and ground plane; for long, low bodies,
  foreshorten and overlap the body in down/up views instead of rotating a full
  side silhouette into a vertical pose;
- keep quadrupeds low and four-legged in down/up; never reinterpret them as
  upright bipeds or humanoids;
- preserve a recognizable creature body plan instead of collapsing the subject
  into a blob, box, rock, or prop-like shape;
- make profiles and the rear view genuinely rotate the anatomy and required
  asymmetry;
- animate four meaningful locomotion phases rather than translating or bobbing
  an unchanged body;
- make anticipation, action, impact, and recovery readable with the effects
  layer hidden;
- inspect the exact exported sheet at 1x and nearest-neighbor 4x and repair any
  failed checklist answer in this same staging job.

All job-specific scripts and previews belong inside the assigned staging
directory. Do not create per-sprite generator files under repository `tools/`.

Technical validation can pass an artistically weak sheet. Do not use a passing
validator or ingestion readiness as a substitute for this creator-side gate.

For a claimed job, use the exact style printed by the claim. The production
`assembler-inspired-v2@0.1.0` profile requires its master palette, binary
contour rule, controlled body-plan anchors, and construction order. A deliberate
legacy-v1 claim remains v1; never substitute one profile for the other.

## Required manifest values

`submission.json`:

```json
{
  "kind": "agent-submission",
  "schemaVersion": "1.0.0",
  "jobId": "<same as staging folder>",
  "assetId": "<new stable kebab-case asset ID>",
  "baseRevisionId": null,
  "requestedName": "<display name>",
  "request": "<the user's exact request>",
  "category": {
    "id": "enemy-mob-32",
    "version": "0.1.0"
  },
  "style": {
    "id": "<exact selected style ID>",
    "version": "<exact selected style version>"
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

Do not add approval, lane, Archive, or user-note fields. Those belong to Prompt
Spriter after ingestion.

For a Promptinator-claimed job, use the exact prompt printed between the
`PROMPTINATOR PROMPT START` and `PROMPTINATOR PROMPT END` markers as `request`.
Keep the printed expected asset ID as both the staging job ID and `assetId`.
Do not claim a second entry to replace or retry the current one; an interrupted
claim remains resumable in Promptinator.

## Completion marker

After `validation.json` agrees with the validator result, write
`completion.json` last:

```json
{
  "kind": "completion-marker",
  "schemaVersion": "1.0.0",
  "jobId": "<same as staging folder>",
  "assetId": "<same as submission.json>",
  "submissionPath": "submission.json",
  "validationPath": "validation.json",
  "filePaths": [
    "submission.json",
    "validation.json",
    "source.aseprite",
    "sheet.png",
    "thumbnail.png"
  ],
  "producer": {
    "application": "Antigravity with Aseprite Pro MCP",
    "model": "Gemini 3.6 High",
    "sessionId": null
  },
  "completedAt": "<ISO-8601 timestamp>"
}
```

After writing `completion.json`, run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
npm.cmd run ingest:submission -- workspace/staging/<job-id>
```

Stop only after trusted ingestion reports the exact asset as `r001` in Intake.
For a claimed job, it must also report the Promptinator entry as `completed`.
Do not write Library, transaction, or review files directly, and do not approve
the candidate.
