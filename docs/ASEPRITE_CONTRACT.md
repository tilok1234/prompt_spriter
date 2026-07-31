# Aseprite source contract

This document freezes the Phase 1 source layout for the first
`enemy-mob-32` category. It is based on capabilities already visible from the
user's shared Aseprite Pro MCP setup. It does not change that setup.

## One asset, one logical-frame canvas

- Source format: `.aseprite`
- Canvas: 32x32 RGBA
- Background: transparent
- Trim: disabled
- Baked ground shadow: prohibited
- One source file contains every direction and animation on one timeline.

The canvas remains 32x32. Frames are timeline frames, not cells painted into one
large source canvas.

## Timeline order

The timeline is direction-major:

1. all `down` animations;
2. all `left` animations;
3. all `right` animations;
4. all `up` animations.

Within each direction:

1. idle;
2. walk;
3. run;
4. attack;
5. hurt;
6. cast;
7. death.

Every direction therefore owns the same 26-column sequence. The full category
uses 104 timeline frames and exports to a 26-column by 4-row sheet.

## Animation tags

Every sequence has one tag:

```text
<direction>_<animation>
```

Examples:

```text
down_idle
left_attack
right_run
up_death
```

Tags must cover the exact sequence without overlap or gaps. Idle, walk, and run
are looping animations. Attack, hurt, and cast play once. Death plays once and
holds its final frame in the viewer.

## Frame counts and default timing

| Animation | Frames | Default frame duration | Playback |
|---|---:|---:|---|
| idle | 2 | 400 ms | loop |
| walk | 4 | 150 ms | loop |
| run | 4 | 100 ms | loop |
| attack | 4 | 120 ms | once |
| hurt | 2 | 140 ms | once |
| cast | 4 | 140 ms | once |
| death | 6 | 160 ms | once, hold final frame |

The death final frame is displayed for 600 ms in previews. Per-asset timing may
change only within a later versioned category allowance.

## Layer contract

Bottom to top:

1. `outline` - optional selective exterior contours and separations;
2. `body` - required primary silhouette and material masses;
3. `details` - required face, markings, texture accents, and small features;
4. `effects` - optional attack/cast pixels that belong to the character sheet;
5. `guides` - optional hidden construction layer, never exported.

The style does not require a continuous black outline. The `outline` layer may
use a darker local color and may be empty where silhouette contrast is already
clear.

## Canonical export

- Sheet scale: 1x
- Cell size: 32x32
- Columns: 26
- Rows: 4
- Sheet size: 832x128
- Row order: down, left, right, up
- Padding: 0
- Inner padding: 0
- Trim: false
- Alpha: 0 or 255 for the first style profile

A separate 4x review render may be generated with nearest-neighbor scaling. It
is not the canonical game-ready sheet.

## Initial vertical-slice export

The first live pipeline test uses idle, walk, and attack:

- 10 columns per direction;
- 4 direction rows;
- 40 frames;
- 320x128 canonical sheet.

This slice proves the source, tag, validation, and viewer contracts before the
full 104-frame request.

## Required agent checks

Before writing the completion marker, the agent must:

1. inspect sprite dimensions and frame count;
2. inspect layers and tags;
3. inspect frame durations;
4. run Aseprite animation validation;
5. inspect animation previews and the exact exported sheet;
6. confirm the export is untrimmed and transparent;
7. run the repository submission validator.

For `enemy-mob-32`, submission validation also requires every finished frame
to contain at least 32 opaque pixels, occupy at least a 6x6 bounding box, and
use at least two visible opaque colors. In each direction, the two idle frames
must be distinct, while walk and attack must each contain at least three
distinct frames. These are technical failure thresholds, not visual approval.

These are technical checks. They do not approve the sprite.
