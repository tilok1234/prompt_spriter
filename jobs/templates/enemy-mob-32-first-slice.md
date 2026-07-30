# Enemy Mob 32x32 first-slice job

Use this template only for a new `enemy-mob-32` candidate containing the first
vertical slice.

## Fixed contract

- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v1@0.1.0`
- Cell: 32x32 pixels
- Directions and rows: down, left, right, up
- Animations and columns:
  - idle: columns 0-1, 2 frames, 400 ms, loop
  - walk: columns 2-5, 4 frames, 150 ms, loop
  - attack: columns 6-9, 4 frames, 120 ms, once
- Sheet: 10 columns x 4 rows, 320x128 pixels
- Alpha: transparent background with hard alpha
- Opaque palette: no more than 16 colors
- Source layers and tags: follow `docs/ASEPRITE_CONTRACT.md`

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
    "id": "assembler-inspired-v1",
    "version": "0.1.0"
  },
  "producer": {
    "application": "Antigravity with Aseprite Pro MCP",
    "model": "Gemini Flash 3.6",
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
    "model": "Gemini Flash 3.6",
    "sessionId": null
  },
  "completedAt": "<ISO-8601 timestamp>"
}
```

Stop after completion. Prompt Spriter, not the creation agent, performs
ingestion and creates the Intake review record.
