# Revision batch: v2-owl-ram-repair-pass

Created: 2026-08-01T00:21:17.243Z
Items: 2

## Operating rules

- Follow `AGENTS.md` and `docs/ANTIGRAVITY_WORKFLOW.md`.
- Work from each exact base revision listed below.
- Create one new staging job directory per asset.
- Never overwrite an ingested source or edit `review.json`.
- Do not approve, archive, ingest, or change MCP configuration.
- Keep each submission's `assetId` and `baseRevisionId` exact.
- Write `completion.json` last and stop after completed staging.

## Revision items

### 1. Driftwing Owl

- Asset ID: `enemy-mob-32-driftwing-owl`
- Base revision: `r002`
- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v2@0.1.0`
- Source: `workspace/library/assets/enemy-mob-32-driftwing-owl/revisions/r002/source.aseprite`

Unresolved notes:

- [entire sprite] Revise the existing sheet; do not restart from scratch. Preserve the compact owl silhouette, clear front/back rotation, right-eye patch, left-wingtip notch, and newly boundary-safe cells. In left and right attack frame 3, replace the straight white rectangular bar with a clearly curved crescent-feather cluster fully inside the 32x32 cell. Do not reuse exact walk poses as attack frames: redraw the body and wing silhouettes so every attack frame reads as a deliberate wind-up, release, or recovery rather than a repeated hold. Pass when the crescent attack reads at 1x, no attack frame duplicates a walk frame, and all asymmetrical features rotate consistently.

Submission identity:

- `assetId`: `enemy-mob-32-driftwing-owl`
- `baseRevisionId`: `r002`
- `requestedName`: `Driftwing Owl`

### 2. Snowcap Ram

- Asset ID: `enemy-mob-32-snowcap-ram`
- Base revision: `r002`
- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v2@0.1.0`
- Source: `workspace/library/assets/enemy-mob-32-snowcap-ram/revisions/r002/source.aseprite`

Unresolved notes:

- [entire sprite] Revise the existing sheet; do not restart from scratch. Preserve the readable side-view ram, palette, horn/snow identity, and boundary-safe charge. Redraw the down and up construction across idle, walk, and attack around a low horizontal torso with the head overlapping one end and the rear mass at the other. Show four connected supports around that torso using near/far overlap; remove the current vertically stacked head over two long legs. Keep the broken right horn and heavier left-shoulder snow anatomically consistent. Pass when down and up unmistakably read as the same low four-legged ram at 1x, never an upright biped.

Submission identity:

- `assetId`: `enemy-mob-32-snowcap-ram`
- `baseRevisionId`: `r002`
- `requestedName`: `Snowcap Ram`

## Completion

For every item, run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
```

Report each completed staging path separately. Prompt Spriter performs trusted ingestion later.
