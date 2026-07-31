# Assembler Inspired v2

**Style ID:** `assembler-inspired-v2`
**Version:** `0.1.0`
**Status:** Active production default

This profile turns the strongest reusable traits of the read-only 8-bit Sprite
Assembler references into concrete constraints for a 32x32 drawing agent. It
is the default for new and still-Ready Promptinator work. It does not modify
`assembler-inspired-v1@0.1.0`; existing, copied, claimed, completed, and
ingested assets retain their original style provenance.

## Palette recipe

Use only colors in `style.json`. For one normal creature:

1. choose one primary material ramp;
2. choose at most one secondary material ramp;
3. choose at most one accent ramp when the concept needs it;
4. use `#1A1C2C` only for eyes, mouth, deepest overlaps, and contact
   separations;
5. use `#F4F4F4` only as a tiny focal light, eye, tooth, or bone highlight.

Target 4-8 opaque colors and never exceed 12. Do not invent an almost-matching
color between ramp steps. Broad flat masses are the target; gradients,
checkerboards, and noisy texture are not.

## Binary contour rule

Do **not** wrap the full creature in a continuous dark outline. The assembler
references are defined by flat silhouette masses against transparency. Add the
shared shadow-line color only where it separates touching forms or creates a
required focal mark. Interior contours stay short and purposeful.

## Controlled body plans

Choose and state exactly one plan before drawing the four idle poses. If a
brief is ambiguous, infer the nearest plan and record the choice before
authoring; do not let each direction improvise a different anatomy.

| Body plan | Side-view occupancy | Down/up construction | Required anchors |
| --- | --- | --- | --- |
| `quadruped` | 22-29 px wide, 12-21 px high | 14-23 px wide, 16-25 px high; head/rear overlaps torso | four supports connected to torso, head at one end, tail at the other |
| `biped` | 12-22 px wide, 18-27 px high | similar height with shoulder/hip rotation | head, torso, two connected supports; arms or equipment remain attached |
| `flyer` | 18-29 px wide, 12-24 px high | wing spread rotates around one central body | connected central body, paired wings, readable head or eye focus |
| `serpent` | 24-29 px long, 8-16 px high | compact 12-22 px by 16-26 px footprint using overlap or shallow S-curve | head remains wider or higher contrast than tail; body stays on ground plane |
| `arthropod` | 22-29 px wide, 10-18 px high | 18-27 px wide, 14-23 px high | shell/body segments plus connected legs or claws; no box-only silhouette |
| `fungus-amorphous` | 12-24 px wide, 16-27 px high | mass rotates without becoming a signpost or terrain prop | living face/focal cluster plus connected support or locomotion anatomy |

Grounded plans normally place their lowest support pixels on rows 28-30 and
leave row 31 transparent. Attack motion may use more room, but opaque boundary
contact remains a warning that must be visually inspected. Flyers keep at
least two transparent pixels above and below the idle silhouette.

Limbs, feet, wings, fins, eyestalks, and tails must visibly join their parent
mass. Detached decorative pixels do not count as anatomy.

## Camera and direction construction

Use one elevated three-quarter camera and one ground plane. Rotate the creature
in the world; never rotate a completed side drawing on the canvas. Long, low
creatures show full length in profile but use overlap and foreshortening in
down/up. A vertical full-length eel, crocodile, or tail-balanced body is a
failed view.

Down, left, and right normally require a readable eye or face cluster of at
least two connected high-contrast pixels. Up must show rear anatomy and must
not retain front-facing eyes. An explicitly eyeless concept must substitute a
different stable two-pixel focal cluster stated in the brief.

## Mandatory construction order

1. Draw only down, left, right, and up idle key poses.
2. Render those four poses together at 1x and nearest-neighbor 4x.
3. Repair body-plan, camera, occupancy, attachment, face, and palette failures.
4. Only after the four-pose gate passes, expand idle, walk, and attack.
5. Inspect the body with effects hidden before completion.

Lua or JavaScript construction does not skip this order. A generator must stop
at the four-pose checkpoint rather than stamp all 40 frames and self-certify the
result afterward.

## Example promotion

No Prompt Spriter sheet is a golden example until the user explicitly approves
that exact immutable revision and separately promotes it as a style example.
Intake, Revise, Archive, creator opinion, or technical validation is not enough.
Until that happens, use only the listed read-only assembler sheets as visual
references and do not copy their pixels into a requested subject.
