# Revision batch: v2-directional-body-plan-repair

Created: 2026-08-01T00:08:00.562Z
Items: 3

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
- Base revision: `r001`
- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v2@0.1.0`
- Source: `workspace/library/assets/enemy-mob-32-driftwing-owl/revisions/r001/source.aseprite`

Unresolved notes:

- [entire sprite] Revise the existing sheet; do not restart from scratch. Preserve the strong front/back owl face and expressive wing motion. Replace the left/right attack frame 3 boundary-touching rectangular blocks with curved feather crescents fully inside the cell. Strengthen the right-eye patch and left-wingtip notch consistently through down, left, right, and up. Increase pose variation so walk and attack read as deliberate motion rather than repeated holds. Pass when the asymmetric features rotate correctly at 1x and the attack effects no longer look clipped.

Submission identity:

- `assetId`: `enemy-mob-32-driftwing-owl`
- `baseRevisionId`: `r001`
- `requestedName`: `Driftwing Owl`

### 2. Kelpcoil Serpent

- Asset ID: `enemy-mob-32-kelpcoil-serpent`
- Base revision: `r001`
- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v2@0.1.0`
- Source: `workspace/library/assets/enemy-mob-32-kelpcoil-serpent/revisions/r001/source.aseprite`

Unresolved notes:

- [entire sprite] doesnt read as a snake
- [entire sprite] Rebuild the current candidate around the same concept while preserving the green kelp mane, pearl eye, pale coral hook, and palette. Remove the rectangular plinths and upright pillar construction. Build one continuous connected serpent body: a low 24-29 px side profile with a wider head and tapered tail, plus a compact overlap or shallow S-curve in down and up on the same ground plane. Attach the fronds and scales to the body and keep the coral hook on the anatomical right. Redraw the attack as a body-led curved sweep or crescent rather than horizontal bars. Pass when all four rows unmistakably read as the same grounded serpent at 1x.

Submission identity:

- `assetId`: `enemy-mob-32-kelpcoil-serpent`
- `baseRevisionId`: `r001`
- `requestedName`: `Kelpcoil Serpent`

### 3. Snowcap Ram

- Asset ID: `enemy-mob-32-snowcap-ram`
- Base revision: `r001`
- Category: `enemy-mob-32@0.1.0`
- Style: `assembler-inspired-v2@0.1.0`
- Source: `workspace/library/assets/enemy-mob-32-snowcap-ram/revisions/r001/source.aseprite`

Unresolved notes:

- [entire sprite] Revise the existing sheet; do not restart from scratch. Preserve the low side-view ram silhouette, off-white/slate/pale-blue palette, and charge concept. Rebuild down and up so the same animal remains a low four-legged quadruped: keep a horizontal torso visible, connect four supports around it, and remove the upright mask-like front/rear read. Rotate the broken right horn and heavier left-shoulder snow consistently in every direction. Shorten or shift the left/right attack frame 3 effects so no opaque pixel touches the cell edge. Pass when all four directions read as one ram at 1x and attack effects remain inside their 32x32 cells.

Submission identity:

- `assetId`: `enemy-mob-32-snowcap-ram`
- `baseRevisionId`: `r001`
- `requestedName`: `Snowcap Ram`

## Completion

For every item, run:

```powershell
npm.cmd run validate:submission -- workspace/staging/<job-id> --require-completion
```

Report each completed staging path separately. Prompt Spriter performs trusted ingestion later.
