import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const jobId = "enemy-mob-32-reedcloak-lurker";
const stagingDir = `C:/Users/headc/Documents/prompt_spriter/workspace/staging/${jobId}`;
mkdirSync(stagingDir, { recursive: true });

// Color Indices:
// 0: trans
// 1: c_out (20, 28, 18) - dark mossy outline
// 2: c_bd  (38, 54, 32) - dark reed green
// 3: c_bm  (68, 92, 46) - mid reed green
// 4: c_bl  (112, 145, 62) - light reed green
// 5: c_sd  (84, 66, 38) - dark straw
// 6: c_sm  (148, 120, 68) - mid straw yellow
// 7: c_sl  (210, 178, 100) - light straw yellow
// 8: c_wd  (50, 38, 28) - dark beak & legs
// 9: c_wm  (95, 72, 52) - mid beak & legs
// 10: c_eye (255, 215, 0) - glowing yellow eye
// 11: c_ndl (255, 90, 0) - needle burst tip

function createEmptyGrid() {
  const grid = [];
  for (let y = 0; y < 32; y++) {
    grid[y] = new Array(32).fill(0);
  }
  return grid;
}

// Generate the 40 frames
const frames = [];

for (let f = 1; f <= 40; f++) {
  const outline = createEmptyGrid();
  const body = createEmptyGrid();
  const details = createEmptyGrid();
  const effects = createEmptyGrid();

  let dirIdx = 0; // 0=down, 1=left, 2=right, 3=up
  let animType = ""; // idle, walk, attack
  let subFrame = 0;

  if (f >= 1 && f <= 2) { dirIdx = 0; animType = "idle"; subFrame = f - 1; }
  else if (f >= 3 && f <= 6) { dirIdx = 0; animType = "walk"; subFrame = f - 3; }
  else if (f >= 7 && f <= 10) { dirIdx = 0; animType = "attack"; subFrame = f - 7; }
  else if (f >= 11 && f <= 12) { dirIdx = 1; animType = "idle"; subFrame = f - 11; }
  else if (f >= 13 && f <= 16) { dirIdx = 1; animType = "walk"; subFrame = f - 13; }
  else if (f >= 17 && f <= 20) { dirIdx = 1; animType = "attack"; subFrame = f - 17; }
  else if (f >= 21 && f <= 22) { dirIdx = 2; animType = "idle"; subFrame = f - 21; }
  else if (f >= 23 && f <= 26) { dirIdx = 2; animType = "walk"; subFrame = f - 23; }
  else if (f >= 27 && f <= 30) { dirIdx = 2; animType = "attack"; subFrame = f - 27; }
  else if (f >= 31 && f <= 32) { dirIdx = 3; animType = "idle"; subFrame = f - 31; }
  else if (f >= 33 && f <= 36) { dirIdx = 3; animType = "walk"; subFrame = f - 33; }
  else if (f >= 37 && f <= 40) { dirIdx = 3; animType = "attack"; subFrame = f - 37; }

  // Draw character based on dir, animType, subFrame
  buildFrameData(dirIdx, animType, subFrame, outline, body, details, effects);

  frames.push({ outline, body, details, effects });
}

function buildFrameData(dir, anim, sub, out, body, det, eff) {
  // Common offsets for walk/attack
  let dy = 0;
  let legPose = sub; // 0..3 for walk
  let headY = 0;
  let headX = 0;

  if (anim === "idle") {
    dy = (sub === 1) ? 1 : 0;
  } else if (anim === "walk") {
    // 4 step cycle
    if (sub === 1) dy = -1;
    if (sub === 3) dy = 1;
  } else if (anim === "attack") {
    if (sub === 0) dy = 1; // crouching anticipation
    if (sub === 1) dy = -2; // lunging forward
    if (sub === 2) dy = -1; // impact hold
    if (sub === 3) dy = 0; // recovery
  }

  // -------------------------------------------------------------
  // DIRECTION 0: DOWN (Facing South)
  // Creature's Right = Screen Left. Creature's Left = Screen Right.
  // Cloak hangs lower on Creature's Right (Screen Left).
  // Glowing eye on Creature's Left (Screen Right).
  // -------------------------------------------------------------
  if (dir === 0) {
    const hY = 7 + dy + (anim === "attack" && sub === 1 ? 2 : 0);

    // Stilt Legs (Body/Outline)
    let leftLegX = 11, rightLegX = 19;
    let lFootY = 28, rFootY = 28;
    if (anim === "walk") {
      if (sub === 0) { lFootY = 27; rFootY = 29; }
      if (sub === 1) { lFootY = 26; rFootY = 28; }
      if (sub === 2) { lFootY = 29; rFootY = 27; }
      if (sub === 3) { lFootY = 28; rFootY = 26; }
    }

    // Left Stilt Leg (Screen Left - Creature's Right Leg)
    for (let y = 22; y <= lFootY; y++) {
      body[y][leftLegX] = 8; // dark leg
      body[y][leftLegX + 1] = 9; // mid leg
      out[y][leftLegX - 1] = 1;
      out[y][leftLegX + 2] = 1;
    }
    body[lFootY][leftLegX - 1] = 8; // foot talon

    // Right Stilt Leg (Screen Right - Creature's Left Leg)
    for (let y = 22; y <= rFootY; y++) {
      body[y][rightLegX] = 8;
      body[y][rightLegX + 1] = 9;
      out[y][rightLegX - 1] = 1;
      out[y][rightLegX + 2] = 1;
    }
    body[rFootY][rightLegX + 2] = 8; // foot talon

    // Body & Reed Cloak
    // Cloak extends lower on Screen Left (y up to 24) vs Screen Right (y up to 21)
    for (let y = hY + 5; y <= 24 + dy; y++) {
      const leftBound = 8 - Math.floor((y - hY) / 3);
      const rightBound = (y > 21 + dy) ? 14 : 22 + Math.floor((y - hY) / 4);

      for (let x = leftBound; x <= rightBound; x++) {
        const isStraw = (x + y) % 2 === 0;
        body[y][x] = isStraw ? 6 : 3; // mid straw or mid reed green
        if (x === leftBound || x === rightBound || y === 24 + dy) {
          out[y][x] = 1;
        }
      }
    }

    // Reed Mantle details (vertical fibrous strands)
    for (let y = hY + 6; y <= 22 + dy; y++) {
      det[y][9] = 7;  // light straw streak
      det[y][12] = 4; // light green streak
      det[y][15] = 6;
      det[y][18] = 4;
      det[y][21] = 7;
    }

    // Head & Beak
    // Hunched head around hY (y=6..12)
    for (let y = hY; y <= hY + 5; y++) {
      for (let x = 12; x <= 19; x++) {
        body[y][x] = 2; // dark reed green head core
        if (x === 12 || x === 19 || y === hY) out[y][x] = 1;
      }
    }

    // Pointed Beak extending down (x=14..16, y=hY+4..hY+10)
    for (let y = hY + 4; y <= hY + 11; y++) {
      body[y][15] = 8; // dark beak
      body[y][16] = 9; // mid beak
      out[y][14] = 1;
      out[y][17] = 1;
    }
    out[hY + 12][15] = 1;

    // Single Glowing Eye (Screen Right - Creature's LEFT Eye)
    det[hY + 3][18] = 10; // glowing yellow eye
    det[hY + 4][18] = 10;
    det[hY + 3][17] = 11; // orange core accent
    out[hY + 2][18] = 1;
    out[hY + 3][19] = 1;

    // Attack Needles on Effects layer
    if (anim === "attack" && (sub === 2 || sub === 3)) {
      // Needles firing downwards from beak tip
      const startY = hY + 12;
      eff[startY][15] = 11;
      eff[startY + 1][15] = 11;
      eff[startY + 2][15] = 10;
      eff[startY + 3][15] = 11;
      eff[startY + 4][15] = 11;

      eff[startY + 1][13] = 11;
      eff[startY + 2][13] = 10;

      eff[startY + 1][17] = 11;
      eff[startY + 2][17] = 10;
    }
  }

  // -------------------------------------------------------------
  // DIRECTION 1: LEFT (Facing West)
  // Creature facing Left. Creature's Left side is in foreground (viewer side).
  // Glowing Eye (Creature's Left Eye) is clearly visible!
  // Beak points Left.
  // -------------------------------------------------------------
  else if (dir === 1) {
    const hY = 7 + dy + (anim === "attack" && sub === 1 ? 1 : 0);
    const bKx = (anim === "attack" && (sub === 1 || sub === 2)) ? -3 : 0;

    // Stilt Legs
    let lLegX = 14, rLegX = 20;
    let lY = 28, rY = 28;
    if (anim === "walk") {
      if (sub === 0) { lLegX = 12; rLegX = 22; lY = 27; }
      if (sub === 1) { lLegX = 14; rLegX = 20; rY = 27; }
      if (sub === 2) { lLegX = 17; rLegX = 15; lY = 27; }
      if (sub === 3) { lLegX = 15; rLegX = 18; rY = 27; }
    }

    // Front Leg (Creature's Left Leg)
    for (let y = 20; y <= lY; y++) {
      body[y][lLegX] = 9;
      out[y][lLegX - 1] = 1;
      out[y][lLegX + 1] = 1;
    }
    body[lY][lLegX - 1] = 8; // foot claw

    // Back Leg (Creature's Right Leg)
    for (let y = 20; y <= rY; y++) {
      body[y][rLegX] = 8;
      out[y][rLegX - 1] = 1;
      out[y][rLegX + 1] = 1;
    }
    body[rY][rLegX - 1] = 8;

    // Hunched Body & Mantle
    for (let y = hY + 4; y <= 22 + dy; y++) {
      const leftB = 10;
      const rightB = 23 - Math.floor((y - hY) / 3);
      for (let x = leftB; x <= rightB; x++) {
        body[y][x] = (x + y) % 2 === 0 ? 3 : 6;
        if (x === leftB || x === rightB || y === 22 + dy) out[y][x] = 1;
      }
    }

    // Mantle strands
    for (let y = hY + 5; y <= 21 + dy; y++) {
      det[y][13] = 4;
      det[y][16] = 7;
      det[y][19] = 6;
    }

    // Head (hY, x=10..18)
    for (let y = hY; y <= hY + 5; y++) {
      for (let x = 11 + bKx; x <= 18; x++) {
        body[y][x] = 2;
        if (x === 11 + bKx || x === 18 || y === hY) out[y][x] = 1;
      }
    }

    // Long Beak pointing Left (x=3+bKx..10+bKx, y=hY+3..hY+4)
    const beakStartX = Math.max(2, 4 + bKx);
    for (let x = beakStartX; x <= 11 + bKx; x++) {
      body[hY + 3][x] = 8;
      body[hY + 4][x] = 9;
      out[hY + 2][x] = 1;
      out[hY + 5][x] = 1;
    }
    out[hY + 3][beakStartX - 1] = 1;

    // Single Glowing Eye (Creature's LEFT Eye - visible facing Left)
    det[hY + 2][11 + bKx] = 10;
    det[hY + 2][12 + bKx] = 10;
    det[hY + 3][12 + bKx] = 11;
    out[hY + 1][11 + bKx] = 1;
    out[hY + 1][12 + bKx] = 1;

    // Attack Needles
    if (anim === "attack" && (sub === 2 || sub === 3)) {
      const needleY = hY + 3;
      for (let x = beakStartX - 1; x >= Math.max(0, beakStartX - 7); x -= 2) {
        eff[needleY][x] = 11;
        eff[needleY][x - 1] = 10;
      }
    }
  }

  // -------------------------------------------------------------
  // DIRECTION 2: RIGHT (Facing East)
  // Creature facing Right. Creature's Right side is in foreground!
  // Cloak hangs lower on Creature's Right (prominent in foreground).
  // Glowing eye is on Creature's Left (background side / hidden behind head).
  // Beak points Right.
  // -------------------------------------------------------------
  else if (dir === 2) {
    const hY = 7 + dy + (anim === "attack" && sub === 1 ? 1 : 0);
    const bKx = (anim === "attack" && (sub === 1 || sub === 2)) ? 3 : 0;

    // Stilt Legs
    let lLegX = 12, rLegX = 18;
    let lY = 28, rY = 28;
    if (anim === "walk") {
      if (sub === 0) { lLegX = 10; rLegX = 20; lY = 27; }
      if (sub === 1) { lLegX = 12; rLegX = 18; rY = 27; }
      if (sub === 2) { lLegX = 15; rLegX = 13; lY = 27; }
      if (sub === 3) { lLegX = 13; rLegX = 16; rY = 27; }
    }

    // Back Leg (Creature's Left Leg)
    for (let y = 20; y <= lY; y++) {
      body[y][lLegX] = 8;
      out[y][lLegX - 1] = 1;
      out[y][lLegX + 1] = 1;
    }
    body[lY][lLegX + 1] = 8;

    // Front Leg (Creature's Right Leg)
    for (let y = 20; y <= rY; y++) {
      body[y][rLegX] = 9;
      out[y][rLegX - 1] = 1;
      out[y][rLegX + 1] = 1;
    }
    body[rY][rLegX + 1] = 8;

    // Hunched Body & Lower Cloak (Foreground on Creature's Right Side)
    // Cloak hangs down to y=25+dy on screen right/foreground
    for (let y = hY + 4; y <= 25 + dy; y++) {
      const leftB = 9 + Math.floor((y - hY) / 3);
      const rightB = Math.min(26, 22);
      for (let x = leftB; x <= rightB; x++) {
        body[y][x] = (x + y) % 2 === 0 ? 6 : 3; // straw & reed green
        if (x === leftB || x === rightB || y === 25 + dy) out[y][x] = 1;
      }
    }

    // Straw reed strands
    for (let y = hY + 5; y <= 24 + dy; y++) {
      det[y][13] = 7;
      det[y][16] = 4;
      det[y][19] = 6;
      det[y][21] = 7;
    }

    // Head (hY, x=13..20)
    for (let y = hY; y <= hY + 5; y++) {
      for (let x = 13; x <= 20 + bKx; x++) {
        body[y][x] = 2;
        if (x === 13 || x === 20 + bKx || y === hY) out[y][x] = 1;
      }
    }

    // Long Beak pointing Right (x=20+bKx..27+bKx, y=hY+3..hY+4)
    const beakEndX = Math.min(29, 27 + bKx);
    for (let x = 20 + bKx; x <= beakEndX; x++) {
      body[hY + 3][x] = 8;
      body[hY + 4][x] = 9;
      out[hY + 2][x] = 1;
      out[hY + 5][x] = 1;
    }
    out[hY + 3][beakEndX + 1] = 1;

    // Eye is hidden on creature's far side (left eye)! No eye drawn in Right facing view.

    // Attack Needles
    if (anim === "attack" && (sub === 2 || sub === 3)) {
      const needleY = hY + 3;
      for (let x = beakEndX + 1; x <= Math.min(31, beakEndX + 7); x += 2) {
        eff[needleY][x] = 11;
        eff[needleY][x + 1] = 10;
      }
    }
  }

  // -------------------------------------------------------------
  // DIRECTION 3: UP (Facing North)
  // Back turned to viewer. Creature's Right = Screen Right. Creature's Left = Screen Left.
  // Cloak hangs lower on Creature's Right (Screen Right).
  // Eye is hidden (back of head).
  // -------------------------------------------------------------
  else if (dir === 3) {
    const hY = 7 + dy + (anim === "attack" && sub === 1 ? -1 : 0);

    // Stilt Legs
    let lLegX = 11, rLegX = 19;
    let lY = 28, rY = 28;
    if (anim === "walk") {
      if (sub === 0) { lY = 29; rY = 27; }
      if (sub === 1) { lY = 28; rY = 26; }
      if (sub === 2) { lY = 27; rY = 29; }
      if (sub === 3) { lY = 26; rY = 28; }
    }

    // Left Stilt Leg (Screen Left - Creature's Left Leg)
    for (let y = 22; y <= lY; y++) {
      body[y][lLegX] = 8;
      body[y][lLegX + 1] = 9;
      out[y][lLegX - 1] = 1;
      out[y][lLegX + 2] = 1;
    }
    body[lY][lLegX - 1] = 8;

    // Right Stilt Leg (Screen Right - Creature's Right Leg)
    for (let y = 22; y <= rY; y++) {
      body[y][rLegX] = 8;
      body[y][rLegX + 1] = 9;
      out[y][rLegX - 1] = 1;
      out[y][rLegX + 2] = 1;
    }
    body[rY][rLegX + 2] = 8;

    // Body & Reed Mantle
    // Cloak hangs lower on Screen Right (Creature's Right), y up to 24 vs Screen Left y up to 21
    for (let y = hY + 4; y <= 24 + dy; y++) {
      const leftB = (y > 21 + dy) ? 17 : 9 - Math.floor((y - hY) / 4);
      const rightB = 23 + Math.floor((y - hY) / 3);

      for (let x = leftB; x <= rightB; x++) {
        body[y][x] = (x + y) % 2 === 0 ? 2 : 5; // dark reed green & dark straw
        if (x === leftB || x === rightB || y === 24 + dy) out[y][x] = 1;
      }
    }

    // Fibrous Back Reeds
    for (let y = hY + 5; y <= 22 + dy; y++) {
      det[y][11] = 3;
      det[y][14] = 6;
      det[y][17] = 3;
      det[y][20] = 6;
      det[y][22] = 7;
    }

    // Back of Head
    for (let y = hY; y <= hY + 4; y++) {
      for (let x = 12; x <= 19; x++) {
        body[y][x] = 2;
        if (x === 12 || x === 19 || y === hY) out[y][x] = 1;
      }
    }

    // Beak tip peeking slightly above head top in attack
    if (anim === "attack" && (sub === 1 || sub === 2)) {
      body[hY - 1][15] = 8;
      body[hY - 2][15] = 8;
      out[hY - 3][15] = 1;
      out[hY - 1][14] = 1;
      out[hY - 1][16] = 1;
    }

    // Attack Needles firing UP on Effects layer
    if (anim === "attack" && (sub === 2 || sub === 3)) {
      const startY = hY - 3;
      for (let y = startY; y >= Math.max(0, startY - 6); y -= 2) {
        if (y >= 0 && y < 32) eff[y][15] = 11;
        if (y - 1 >= 0 && y - 1 < 32) eff[y - 1][15] = 10;
        if (y >= 0 && y < 32) {
          eff[y][13] = 11;
          eff[y][17] = 11;
        }
      }
    }
  }
}

// Generate Lua Code
let luaCode = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=20, g=28, b=18, a=255 },     -- 1: c_out
  Color{ r=38, g=54, b=32, a=255 },     -- 2: c_bd
  Color{ r=68, g=92, b=46, a=255 },     -- 3: c_bm
  Color{ r=112, g=145, b=62, a=255 },   -- 4: c_bl
  Color{ r=84, g=66, b=38, a=255 },     -- 5: c_sd
  Color{ r=148, g=120, b=68, a=255 },   -- 6: c_sm
  Color{ r=210, g=178, b=100, a=255 },  -- 7: c_sl
  Color{ r=50, g=38, b=28, a=255 },     -- 8: c_wd
  Color{ r=95, g=72, b=52, a=255 },     -- 9: c_wm
  Color{ r=255, g=215, b=0, a=255 },    -- 10: c_eye
  Color{ r=255, g=90, b=0, a=255 }      -- 11: c_ndl
}

for i=1,#colors do
  pal:setColor(i-1, colors[i])
end

-- Layers bottom to top: outline, body, details, effects, guides
local layerOutline = spr.layers[1]
layerOutline.name = "outline"

local layerBody = spr:newLayer()
layerBody.name = "body"

local layerDetails = spr:newLayer()
layerDetails.name = "details"

local layerEffects = spr:newLayer()
layerEffects.name = "effects"

local layerGuides = spr:newLayer()
layerGuides.name = "guides"
layerGuides.isVisible = false

-- Add 39 frames to reach 40 total
for f = 2, 40 do
  spr:newFrame()
end

-- Frame durations (ms)
local defaultDurations = {
  [1]=0.40, [2]=0.40,
  [3]=0.15, [4]=0.15, [5]=0.15, [6]=0.15,
  [7]=0.12, [8]=0.12, [9]=0.12, [10]=0.12,
  [11]=0.40, [12]=0.40,
  [13]=0.15, [14]=0.15, [15]=0.15, [16]=0.15,
  [17]=0.12, [18]=0.12, [19]=0.12, [20]=0.12,
  [21]=0.40, [22]=0.40,
  [23]=0.15, [24]=0.15, [25]=0.15, [26]=0.15,
  [27]=0.12, [28]=0.12, [29]=0.12, [30]=0.12,
  [31]=0.40, [32]=0.40,
  [33]=0.15, [34]=0.15, [35]=0.15, [36]=0.15,
  [37]=0.12, [38]=0.12, [39]=0.12, [40]=0.12
}

for f = 1, 40 do
  spr.frames[f].duration = defaultDurations[f]
end

-- Create tags
local function addTag(fromF, toF, tagName)
  local tag = spr:newTag(fromF, toF)
  tag.name = tagName
end

addTag(1, 2, "down_idle")
addTag(3, 6, "down_walk")
addTag(7, 10, "down_attack")

addTag(11, 12, "left_idle")
addTag(13, 16, "left_walk")
addTag(17, 20, "left_attack")

addTag(21, 22, "right_idle")
addTag(23, 26, "right_walk")
addTag(27, 30, "right_attack")

addTag(31, 32, "up_idle")
addTag(33, 36, "up_walk")
addTag(37, 40, "up_attack")
`;

// Emit pixel data function per frame
for (let f = 1; f <= 40; f++) {
  const { outline, body, details, effects } = frames[f - 1];

  luaCode += `
do
  local f = ${f}
  local imgOut = Image(32, 32, ColorMode.RGB)
  local imgBody = Image(32, 32, ColorMode.RGB)
  local imgDet = Image(32, 32, ColorMode.RGB)
  local imgEff = Image(32, 32, ColorMode.RGB)
`;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const o = outline[y][x];
      const b = body[y][x];
      const d = details[y][x];
      const e = effects[y][x];

      if (o > 0) luaCode += `  imgOut:drawPixel(${x}, ${y}, colors[${o + 1}])\n`;
      if (b > 0) luaCode += `  imgBody:drawPixel(${x}, ${y}, colors[${b + 1}])\n`;
      if (d > 0) luaCode += `  imgDet:drawPixel(${x}, ${y}, colors[${d + 1}])\n`;
      if (e > 0) luaCode += `  imgEff:drawPixel(${x}, ${y}, colors[${e + 1}])\n`;
    }
  }

  luaCode += `
  spr:newCel(layerOutline, f, imgOut)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDet)
  spr:newCel(layerEffects, f, imgEff)
end
`;
}

luaCode += `
spr:saveCopyAs("${stagingDir}/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="${stagingDir}/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
local f1Out = spr.layers[1]:cel(1).image
local f1Det = spr.layers[3]:cel(1).image

for y=0,31 do
  for x=0,31 do
    local pO = f1Out:getPixel(x, y)
    local pB = f1Body:getPixel(x, y)
    local pD = f1Det:getPixel(x, y)
    if pO ~= 0 then thumbImg:drawPixel(x, y, pO) end
    if pB ~= 0 then thumbImg:drawPixel(x, y, pB) end
    if pD ~= 0 then thumbImg:drawPixel(x, y, pD) end
  end
end

thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("${stagingDir}/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_REEDCLOAK_LURKER")
`;

writeFileSync("tools/build-reedcloak-lurker.lua", luaCode);
console.log("Written tools/build-reedcloak-lurker.lua");

// Write submission.json
const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0012-reedcloak-lurker
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Reedcloak Lurker".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A camouflaged marsh sniper that hides among tall vegetation.
- Body and silhouette: Tall hunched birdlike predator with stilt legs and a long pointed beak.
- Signature features: Reed mantle, narrow beak, and one glowing eye beneath the vegetation.
- Palette and materials: Dull green, straw yellow, dark brown, and fibrous reeds.
- Movement personality: Patient, tense, and unnaturally still.
- Attack concept: Reveals itself briefly to fire a narrow line of high-speed reed needles.
- Directional details: Its cloak hangs lower on the right side, and the visible eye is always the left one.
- Avoid: Humanoid archer, ordinary heron, invisible attack with no reveal animation.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: jobId,
  assetId: jobId,
  baseRevisionId: null,
  requestedName: "Reedcloak Lurker",
  request: promptText,
  category: {
    id: "enemy-mob-32",
    version: "0.1.0"
  },
  style: {
    id: "assembler-inspired-v1",
    version: "0.1.0"
  },
  producer: {
    application: "Antigravity with Aseprite Pro MCP",
    model: "Gemini Flash 3.6",
    sessionId: null
  },
  output: {
    sourcePath: "source.aseprite",
    sheetPath: "sheet.png",
    thumbnailPath: "thumbnail.png",
    directions: ["down", "left", "right", "up"],
    animations: [
      {
        id: "idle",
        startColumn: 0,
        frames: 2,
        durationMs: 400,
        playback: "loop"
      },
      {
        id: "walk",
        startColumn: 2,
        frames: 4,
        durationMs: 150,
        playback: "loop"
      },
      {
        id: "attack",
        startColumn: 6,
        frames: 4,
        durationMs: 120,
        playback: "once"
      }
    ]
  },
  submittedAt: new Date().toISOString()
};

writeFileSync(`${stagingDir}/submission.json`, JSON.stringify(submission, null, 2));
console.log("Written submission.json");
