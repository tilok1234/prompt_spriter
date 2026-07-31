# Assembler Inspired v1

**Style ID:** `assembler-inspired-v1`  
**Version:** `0.1.0`  
**Status:** Draft

This profile captures reusable visual principles from selected, read-only
8-bit Sprite Assembler sheets. It does not copy that application's code or make
the new project depend on it.

## Visual target

Sprites should feel compact, direct, and readable:

- the silhouette identifies the subject before internal detail is considered;
- a small number of clustered colors describes materials and volume;
- facial and attack focal points receive the strongest useful contrast;
- directions agree on anatomy and mass;
- pixels remain crisp at native scale.

## Palette

- Recommended: 6-12 opaque colors
- Maximum: 16 opaque colors
- Maximum material shade steps: 3
- Alpha: 0 or 255
- Pure black: discouraged unless necessary for contrast
- Dithering: avoided by default

Transparency is not a palette color.

## Contours and shading

A continuous black outline is not required. Use selective darker contours,
contact separations, and local dark colors where they improve readability.

Shade with deliberate clusters and a generally upper-left light direction.
Avoid isolated highlight and shadow pixels that do not form a readable shape.

## Animation

Before animation, follow the shared mandatory construction order in
`docs/SPRITE_AUTHORING_CHECKLIST.md`: draw only the down, left, right, and up
idle key poses, inspect them together at 1x and nearest-neighbor 4x, and repair
camera, ground-plane, body-plan, and direction failures before expanding the
timeline. This checkpoint is required for v1 as well as v2 and cannot be
skipped by a Lua or JavaScript generator.

For a quadruped, down and up must preserve a low horizontal torso with four
connected or visibly overlapped supports. A front or rear view that becomes an
upright biped, humanoid torso, or tail-balanced figure fails the checkpoint.

Every animation needs an anatomical reason:

- idle changes posture, breathing, ears, tail, or another living feature;
- walk and run show different weight and cadence;
- attack has anticipation, action, impact, and recovery;
- hurt recoils without turning into a different creature;
- cast shows origin, buildup, release, and recovery;
- death loses support and settles into a final pose.

Do not treat animation as moving an unchanged drawing around the cell.

## Reference use

The selected reference sheets may guide abstraction, palette restraint,
silhouette, and animation clarity. They must remain unmodified, and their exact
pixels should not be copied into a new subject.

## Iteration

Feedback changes asset revisions first. A recurring improvement that should
affect future sprites becomes a proposed new style-profile version and is tested
on a small canary set before promotion.
