# Enemy Mob 32x32

**Contract ID:** `enemy-mob-32`  
**Version:** `0.1.0`  
**Status:** Draft for the first vertical slice

This category creates compact four-direction enemies on a 32x32 logical canvas.
It is intended for ordinary mobs rather than large bosses.

## Required identity

At native 1x scale, every direction must clearly communicate:

- creature type;
- facing direction;
- primary silhouette;
- head and locomotion structure;
- attack or casting origin where relevant.

Animation should move the creature's actual anatomy rather than translate an
unchanged body around the cell.

## Full contract

- Directions: down, left, right, up
- Animations: idle, walk, run, attack, hurt, cast, death
- Frames per direction: 26
- Total frames: 104
- Canonical sheet: 832x128

See `category.json` for exact columns and timing and
`../../docs/ASEPRITE_CONTRACT.md` for source rules.

## First test

The first live Antigravity/Aseprite test uses idle, walk, and attack in all four
directions. It is a pipeline test, not permission to omit the other animations
from the final category.

## Mirroring

Left/right may be mirrored for a genuinely symmetrical creature. Any one-sided
marking, injury, equipment piece, or attachment requires separately resolved
side art or an explicit documented exception.

## Review emphasis

- no accidental crawling or sliding in walk/run;
- stable ground contact;
- readable anticipation, impact, and recovery in attack;
- consistent volume and anatomy across directions;
- no clipped motion;
- no baked shadow;
- readable at both 1x and 4x nearest-neighbor scale.

