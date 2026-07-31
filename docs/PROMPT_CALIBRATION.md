# Prompt calibration

**Status:** Experimental
**Current leader:** Structured creative brief
**Human visual decision owner:** User

This document records controlled prompt-shape experiments for Antigravity with
Gemini 3.6 High. Technical validation and the user's visual comparison remain
separate.

## Formula candidates

### Minimal

The user supplies only the repository-reading instruction, category, and sprite
name.

### Structured

The user supplies:

- name;
- core concept;
- body and silhouette;
- signature features;
- palette and materials;
- movement personality;
- attack concept;
- directional details;
- avoid list.

Repository contracts still own dimensions, directions, animations, timing,
layers, tags, export paths, validation, ingestion, and protected boundaries.

## Canary 1: Mossback Tuskling

**Date:** 2026-07-31
**Category:** `enemy-mob-32@0.1.0`
**Style:** `assembler-inspired-v1@0.1.0`

Compared candidates:

- Structured: `enemy-mob-32-mossback-tuskling/r001`
- Minimal: `enemy-mob-32-mossback-tuskling-v2/r001`

Technical result:

- both candidates passed completion-required validation with advisory duplicate
  frame warnings;
- both were ingested as separate unapproved Intake candidates;
- technical validation did not decide the visual winner.

User visual result:

- the minimal candidate's front direction was appealing;
- its other three directions were malformed;
- the structured candidate won the complete four-direction comparison.

## Preliminary conclusion

The minimal prompt does not currently provide enough identity and directional
anchoring for reliable four-direction work. The structured brief is the
production-formula leader because it describes silhouette, signature features,
movement, attack intent, asymmetry, and unwanted interpretations while leaving
technical implementation to repository contracts.

This is one canary, not a final formula freeze. Before promotion, repeat the
comparison with:

1. one flying or hovering subject;
2. one humanoid subject with equipment and asymmetry.

Suggested catalog candidates:

- `Glyphwing Moth`;
- `Roadknife Cutpurse`.

## Fresh-chat production observation: entries 8-14

**Date:** 2026-07-31
**Category:** `enemy-mob-32@0.1.0`
**Style:** `assembler-inspired-v1@0.1.0`

Seven structured Promptinator entries were produced as Barkhide Mauler,
Sapspitter Gecko, Thornseed Shepherd, Bogbelly Croaker, Mudskipper Skirmisher,
Leechcoil Slitherer, and Reedcloak Lurker. The user reported that most were made
in separate fresh Antigravity chats. That makes accumulated chat context an
unlikely explanation for the repeated weaknesses.

Technical result:

- all seven were ingested as complete immutable revisions;
- all seven passed dimensions, grid, hard-alpha, and non-empty-frame checks;
- all seven retained advisory duplicate-frame warnings, and five also had cell
  boundary-contact advisories;
- technical validation did not detect the main artistic failures.

Creator-side calibration observations, not user approvals:

- Sapspitter Gecko had the strongest overall creature and attack read, while
  its front and rear silhouettes remained less specifically gecko-like;
- Mudskipper Skirmisher and Thornseed Shepherd retained salvageable identities
  but needed stronger anatomical motion or cleaner secondary masses;
- several candidates collapsed into a blob, box, prop, or repeated texture
  instead of preserving the requested body plan;
- reused body poses made some walks weak and some attacks readable mainly from
  projectile or effect pixels;
- front, profile, and rear anatomy were not consistently constructed as four
  views of the same creature.

These observations refine agent self-review rather than changing the immutable
style profile or making review decisions. `docs/SPRITE_AUTHORING_CHECKLIST.md`
now makes native-scale identity, four-direction anatomy, body-first animation,
effects-disabled attack readability, and clustered material treatment explicit
completion gates for the existing first-slice workflow.

## Checklist canary failure: entries 15-19

**Date:** 2026-07-31
**Category:** `enemy-mob-32@0.1.0`
**Style:** `assembler-inspired-v1@0.1.0`

The first five candidates created after the initial authoring checklist showed
that its questions were still too abstract for procedural coordinate drawing:

- Fenlight Moth, Shellmire Crab, and Rotbulb Toadstool passed technical checks
  while reading as unrelated prop-like shapes rather than their requested body
  plans;
- Gloomfin Eel and Marshjaw Snapper used full-length horizontal side views but
  rotated that long axis into full-length vertical down/up drawings, making the
  creatures appear upright rather than foreshortened on one ground plane;
- the jobs generated the complete timeline through one-off scripts before
  asserting that the visual checklist had passed, and left those scripts in
  repository `tools/` outside the documented staging write scope.

The response is construction-specific rather than a longer creative prompt:

1. choose one controlled body plan;
2. lock one elevated game camera and ground plane;
3. render and inspect only the four idle key poses before expanding the
   timeline;
4. use overlap and foreshortening for long creatures in down/up views;
5. keep every per-job helper inside the assigned staging directory.

At this checkpoint, `assembler-inspired-v2@0.1.0` was introduced as a separate
opt-in Promptinator canary with exact palette ramps, a binary contour rule,
body-plan occupancy anchors, and focal-cluster rules. That historical canary
state was superseded by the promotion decision below.

## v2 production-default decision

**Date:** 2026-07-31
**Decision:** promote `assembler-inspired-v2@0.1.0` as the default for new and
still-Ready creation work

The user approved v2 as the main creation style after the first promising exact
v2 result. This changes dispatch defaults, not review state: no candidate was
approved into Library or selected as a golden example by this decision.

The completed entries 20-31 batch must be interpreted by exact provenance:

- Mirewitch Newt (20) is the only `structured-v2` / v2 candidate;
- Sandglass Scarab, Dunecrest Jackal, Needleback Skink, Sunspoke Vulture,
  Dustveil Cobra, Flintclaw Scorpion, Mirage Hare, Tumblethorn Roller, Oasis
  Husk, Caravan Ravager, and Rimepaw Lynx (21-31) are all structured-v1 / v1.

The batch still provides useful system evidence. Sunspoke Vulture, Dustveil
Cobra, Flintclaw Scorpion, and Mirage Hare showed strong readable directions;
Sandglass Scarab, Dunecrest Jackal, Oasis Husk, Caravan Ravager, and Rimepaw
Lynx exposed unreadable occupancy, overly sparse or near-monochrome drawings,
and body-plan projection failures that technical validation did not catch.
Those v1 outcomes justify future validator and checklist work, but they are not
evidence for or against v2.

The next calibration should use the explicit pinned v2 test-batch control so
every selected entry is verified as v2 before dispatch. The first safeguards
are now enforced for `enemy-mob-32`: 32 opaque pixels, a 6x6 occupied
footprint, two visible opaque colors per frame, two distinct idle frames, and
three distinct walk and attack frames per direction. The shared creator gate
also requires the four-idle checkpoint for both styles and rejects quadruped
down/up views that become upright humanoids. These checks remain technical
floors, not visual approval. Do not silently change immutable prior profiles or
review state while testing them.
