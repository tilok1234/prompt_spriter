# Sprite authoring quality gate

This is the required creator-side visual gate for Prompt Spriter sprite jobs.
It turns the existing category and style rules into a repeatable drawing and
self-review sequence. It does not change a category or style contract, and it
does not constitute the user's visual approval. The four-direction idle
checkpoint applies equally to legacy v1 and production v2 jobs.

## 1. Translate the brief into visible anchors

Before drawing, identify the smallest set of features that must survive at
32x32:

- one controlled body plan: `quadruped`, `biped`, `flyer`, `serpent`,
  `arthropod`, or `fungus-amorphous`;
- body plan: head, torso, support or locomotion anatomy, and major appendages;
- species or creature-type cue that must read from the silhouette;
- one dominant signature feature and any required asymmetry;
- material masses that need distinct clustered values;
- idle, walk, and attack actions expressed as body movement rather than effects.

When small secondary details compete for space, prioritize the body plan,
dominant feature, and action read. Do not replace anatomy with texture or a
generic blob. If the body plan and dominant feature cannot fit the contract
cleanly, stop and report the conflict instead of silently changing the format.
State the chosen controlled body plan before drawing. Every direction must use
that same construction; do not independently reinterpret the creature per row.

## 2. Lock one camera and ground plane

All four rows show the same creature turning on one fixed ground plane under
the same elevated three-quarter game camera. Rotate the creature in the world;
do not rotate the finished side-view drawing or the canvas by 90 degrees.

- Left and right profiles may expose the creature's full nose-to-tail length.
- Down and up views of a long, low creature must foreshorten that length. Place
  the torso behind the head or rear mass with visible overlap and depth; do not
  turn the full side silhouette into a narrow vertical column.
- Keep feet, fins, belly, coils, or other support anatomy connected to the
  ground plane. A horizontal creature must not appear to balance upright on a
  tail, stalk, or single end unless the brief explicitly calls for that pose.
- For eels, snakes, and similarly long creatures, use overlap, a shallow
  ground-plane S-curve, or a compact coil in down and up views. A full-length
  vertical squiggle is not a valid front or rear view.
- Preserve the same head size, body thickness, major masses, and signature
  features through the turn. Foreshortening changes visible length, not the
  creature's anatomy.
- A `quadruped` must remain a low four-legged body in down and up. Keep a
  horizontal torso mass with four supports attached or visibly overlapped
  around it; never reinterpret the front or rear view as an upright biped,
  humanoid torso, or tail-balanced figure.

Before building any animation, render only the four idle key poses together
and inspect them at 1x and nearest-neighbor 4x. Do not fill the complete
40-frame timeline until these four poses share one camera, ground plane, body
plan, and anatomical scale. If the sprite is being constructed by a script,
the script must still stop at this four-pose checkpoint; generating all frames
in one pass and then asserting that they were reviewed does not satisfy it.

## 3. Pass the four-direction silhouette gate

Establish one idle key pose for down, left, right, and up before filling the
animation. Inspect the body and outline without effects at native 1x scale.
Every direction must pass all of these checks:

- the creature type can be identified without reading its name or prompt;
- the facing direction is clear from the head, body axis, limbs, and appendages;
- the creature remains grounded and does not rotate its long body axis into an
  upright stance between profile and down/up views;
- a quadruped remains recognizably low and four-legged in down and up instead
  of becoming an upright humanoid;
- the shape does not resemble an unrelated box, rock, furniture item, or terrain
  prop;
- the side view is a constructed profile, not a narrowed front view;
- the up view shows rear anatomy and does not retain front-facing facial detail;
- down, left, and right contain a connected face or eye focal cluster of at
  least two pixels, unless the brief explicitly defines an eyeless substitute;
- limbs, feet, wings, fins, tails, and eyestalks visibly connect to their parent
  body mass;
- required left/right asymmetry stays on the creature's anatomical side;
- the silhouette has breathing room for the largest attack pose and effect.

Color and internal markings may strengthen a read, but they cannot be the only
evidence of species, facing direction, or pose.

## 4. Pass the anatomy-first motion gate

Build animation from the creature's body before adding effects:

- **Idle:** use restrained breathing, posture, ear, tail, throat, foliage, or
  material motion. The two frames must not look like an accidental one-pixel
  jitter.
- **Walk:** show four meaningful locomotion phases appropriate to the body plan,
  such as contact, passing, lift, and settle. Keep support and ground contact
  stable; do not slide an unchanged body around the cell.
- **Attack:** show anticipation, action or release, impact, and recovery. With
  the effects layer hidden, a reviewer must still understand that the creature
  attacks and where the action originates.

Effects support the body action. Projectiles, sparks, droplets, shards, or
shockwaves must not substitute for a changed pose. Reusing a neutral pose as a
deliberate recovery is acceptable; repeatedly reusing unchanged frames across
idle, walk, and attack is not.

## 5. Pass the material and cluster gate

- Use a few large value groups before small texture marks.
- Keep material shading in deliberate clusters under the upper-left light rule.
- Reserve the strongest useful contrast for the face, signature feature, or
  attack origin.
- Avoid checkerboard, lattice, or evenly scattered texture that overwhelms the
  underlying anatomy.
- Remove isolated pixels that do not clarify shape, material, direction, or
  motion.

## 6. Inspect before completion

Open or render the exact exported `sheet.png` at native 1x and nearest-neighbor
4x. Review every direction and animation, including the effects-disabled body
poses in the saved source. Ask:

1. Can the creature type be named in all four directions?
2. Do all views use one camera and ground plane, with down/up foreshortening
   rather than a side pose rotated vertically?
3. Does the dominant signature feature survive at 1x?
4. Does walk animate locomotion rather than translation or bobbing alone?
5. Does attack read with the effects layer hidden?
6. Are volume, grounding, lighting, and anatomical sides consistent?
7. Are all poses and effects comfortably inside the 32x32 cell?

If any answer is no, repair the current assigned staging job and repeat the
review before writing `completion.json`. Do not claim a replacement prompt or
create a second job merely because the first drawing fails this gate.

Automated validation may still pass a visually weak sprite. A validator pass is
required technical evidence, never a reason to ignore a failed visual gate and
never the user's approval.
