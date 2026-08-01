import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-leechcoil-slitherer";
mkdirSync(stagingDir, { recursive: true });

const luaScript = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette (12 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(13)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=24, g=12, b=18, a=255 },     -- 1: c_out (dark burgundy/black outline)
  Color{ r=60, g=16, b=28, a=255 },      -- 2: c_mdark (maroon dark)
  Color{ r=108, g=28, b=48, a=255 },     -- 3: c_mmid (maroon mid)
  Color{ r=162, g=48, b=72, a=255 },     -- 4: c_mlight (maroon light highlight)
  Color{ r=42, g=22, b=45, a=255 },      -- 5: c_pdark (purple dark underbelly)
  Color{ r=78, g=42, b=82, a=255 },      -- 6: c_pmid (purple mid)
  Color{ r=118, g=68, b=124, a=255 },    -- 7: c_plight (purple light)
  Color{ r=170, g=160, b=140, a=255 },   -- 8: c_sring_dark (pale ring/stripe dark)
  Color{ r=225, g=215, b=190, a=255 },   -- 9: c_sring_mid (pale ring/stripe mid)
  Color{ r=250, g=245, b=225, a=255 },   -- 10: c_sring_light (pale ring/stripe light)
  Color{ r=120, g=10, b=20, a=255 },     -- 11: c_drop_dark (red-black droplet dark)
  Color{ r=210, g=30, b=45, a=255 }      -- 12: c_drop_light (red-black droplet light)
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

-- Drawing Helpers
local c_out   = colors[2]
local c_mdark = colors[3]
local c_mmid  = colors[4]
local c_mlight= colors[5]
local c_pdark = colors[6]
local c_pmid  = colors[7]
local c_plight= colors[8]
local c_sdark = colors[9]
local c_smid  = colors[10]
local c_slight= colors[11]
local c_ddark = colors[12]
local c_dlight= colors[13]

local function setPixel(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function computeOutline(bodyP)
  local outP = {}
  local grid = {}
  for y=0,31 do grid[y] = {} end
  for _, p in ipairs(bodyP) do
    grid[p[2]][p[1]] = true
  end
  for _, p in ipairs(bodyP) do
    local bx, by = p[1], p[2]
    for _, offset in ipairs({{-1,0},{1,0},{0,-1},{0,1}}) do
      local nx, ny = bx + offset[1], by + offset[2]
      if nx >= 0 and nx < 32 and ny >= 0 and ny < 32 then
        if not grid[ny][nx] then
          table.insert(outP, {nx, ny, c_out})
        end
      end
    end
  end
  return outP
end

local function buildFrame(f, outlinePixels, bodyPixels, detailPixels, effectPixels)
  local imgOut = Image(32, 32, ColorMode.RGB)
  if outlinePixels then
    for _, p in ipairs(outlinePixels) do setPixel(imgOut, p[1], p[2], p[3]) end
  end
  spr:newCel(layerOutline, f, imgOut)

  local imgBody = Image(32, 32, ColorMode.RGB)
  if bodyPixels then
    for _, p in ipairs(bodyPixels) do setPixel(imgBody, p[1], p[2], p[3]) end
  end
  spr:newCel(layerBody, f, imgBody)

  local imgDet = Image(32, 32, ColorMode.RGB)
  if detailPixels then
    for _, p in ipairs(detailPixels) do setPixel(imgDet, p[1], p[2], p[3]) end
  end
  spr:newCel(layerDetails, f, imgDet)

  local imgEff = Image(32, 32, ColorMode.RGB)
  if effectPixels then
    for _, p in ipairs(effectPixels) do setPixel(imgEff, p[1], p[2], p[3]) end
  end
  spr:newCel(layerEffects, f, imgEff)
end

--------------------------------------------------------------------------------
-- DOWN DIRECTION (Frames 1..10) (Facing Down towards viewer)
-- Anatomical LEFT side is on VIEWER'S RIGHT (X=18..21).
-- Pale stripe runs along anatomical LEFT side (viewer's right).
--------------------------------------------------------------------------------
local function getDownPixels(dy, mouthState)
  dy = dy or 0
  mouthState = mouthState or "normal" -- "normal", "wide", "closed"

  local bodyP = {}
  local detP = {}

  -- Head base (center X=12..19, Y=8+dy..14+dy)
  for y=8+dy,14+dy do
    for x=11,20 do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Glossy highlight on head top
  for x=13,18 do
    table.insert(bodyP, {x, 8+dy, c_mlight})
  end

  -- Torso (coiling down)
  for y=15+dy,22+dy do
    for x=10,21 do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Purple underbelly / left shadow (viewer's left side X=10..12)
  for y=13+dy,23+dy do
    for x=10,12 do
      table.insert(bodyP, {x, y, c_pmid})
    end
  end

  -- Rear curl at bottom (X=8..15, Y=23+dy..27+dy)
  for y=23+dy,27+dy do
    for x=9,17 do
      table.insert(bodyP, {x, y, c_mdark})
    end
  end
  -- Tail tip curling up at left (X=7..10, Y=20+dy..24+dy)
  for y=20+dy,24+dy do
    for x=7,9 do
      table.insert(bodyP, {x, y, c_mdark})
    end
  end

  -- Segment ridges across body (horizontal lines)
  for _, sy in ipairs({14+dy, 17+dy, 20+dy, 23+dy}) do
    for sx=11,19 do
      table.insert(bodyP, {sx, sy, c_pdark})
    end
  end

  -- PALE STRIPE along anatomical LEFT half (Viewer's RIGHT, X=18..20, Y=10+dy..21+dy)
  for y=10+dy,21+dy do
    table.insert(detP, {19, y, c_slight})
    table.insert(detP, {18, y, c_smid})
    table.insert(detP, {20, y, c_sdark})
  end

  -- CIRCULAR MOUTH (Details layer)
  if mouthState == "normal" then
    -- Ringed mouth at head center (X=14..17, Y=10+dy..12+dy)
    table.insert(detP, {14, 11+dy, c_smid})
    table.insert(detP, {17, 11+dy, c_smid})
    table.insert(detP, {15, 10+dy, c_slight})
    table.insert(detP, {16, 10+dy, c_slight})
    table.insert(detP, {15, 12+dy, c_sdark})
    table.insert(detP, {16, 12+dy, c_sdark})
    -- Inner mouth orifice
    table.insert(detP, {15, 11+dy, c_pdark})
    table.insert(detP, {16, 11+dy, c_pdark})
  elseif mouthState == "wide" then
    -- Expanded ringed mouth (X=13..18, Y=9+dy..13+dy)
    for x=14,17 do
      table.insert(detP, {x, 9+dy, c_slight})
      table.insert(detP, {x, 13+dy, c_sdark})
    end
    for y=10+dy,12+dy do
      table.insert(detP, {13, y, c_smid})
      table.insert(detP, {18, y, c_smid})
    end
    -- Deep orifice
    for y=10+dy,12+dy do
      for x=14,17 do
        table.insert(detP, {x, y, c_out})
      end
    end
    table.insert(detP, {15, 11+dy, c_ddark})
    table.insert(detP, {16, 11+dy, c_ddark})
  end

  local outP = computeOutline(bodyP)
  return outP, bodyP, detP
end

-- Frames 1..2: Down Idle
buildFrame(1, getDownPixels(0, "normal"))
buildFrame(2, getDownPixels(1, "normal"))

-- Frames 3..6: Down Walk
buildFrame(3, getDownPixels(0, "normal"))
buildFrame(4, getDownPixels(-2, "normal"))
buildFrame(5, getDownPixels(-1, "normal"))
buildFrame(6, getDownPixels(1, "normal"))

-- Frames 7..10: Down Attack
buildFrame(7, getDownPixels(-2, "normal"))
buildFrame(8, getDownPixels(2, "wide"))
do
  local o, b, d = getDownPixels(1, "wide")
  local eff = {
    {13, 16, c_ddark}, {14, 16, c_dlight}, {14, 17, c_ddark},
    {17, 16, c_ddark}, {18, 16, c_dlight}, {18, 17, c_ddark}
  }
  buildFrame(9, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, "normal")
  local eff = {
    {11, 19, c_ddark}, {12, 19, c_dlight},
    {20, 19, c_ddark}, {21, 19, c_dlight}
  }
  buildFrame(10, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- LEFT DIRECTION (Frames 11..20) (Facing Left towards X=0)
-- Creature's LEFT side faces TOP/AWAY (Y=8..12 along spine).
-- Pale stripe runs along TOP edge of body.
--------------------------------------------------------------------------------
local function getLeftPixels(dx, dy, mouthState)
  dx = dx or 0
  dy = dy or 0
  mouthState = mouthState or "normal"

  local bodyP = {}
  local detP = {}

  -- Head at left (X=5+dx..11+dx, Y=11+dy..17+dy)
  for y=11+dy,17+dy do
    for x=6+dx,12+dx do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Main thick body extending right (X=11+dx..24+dx, Y=11+dy..20+dy)
  for y=11+dy,19+dy do
    for x=11+dx,23+dx do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Underbelly shadow (bottom half Y=17+dy..21+dy)
  for y=17+dy,21+dy do
    for x=10+dx,24+dx do
      table.insert(bodyP, {x, y, c_pmid})
    end
  end

  -- Curled rear section at right (X=21+dx..26+dx, Y=12+dy..24+dy)
  for y=13+dy,24+dy do
    for x=22+dx,26+dx do
      table.insert(bodyP, {x, y, c_mdark})
    end
  end

  -- Segment ridges vertical lines across body
  for _, sx in ipairs({12+dx, 16+dx, 20+dx, 23+dx}) do
    for sy=12+dy,19+dy do
      table.insert(bodyP, {sx, sy, c_pdark})
    end
  end

  -- PALE STRIPE along anatomical LEFT half (TOP edge Y=10+dy..12+dy, X=8+dx..22+dx)
  for x=8+dx,22+dx do
    table.insert(detP, {x, 11+dy, c_slight})
    table.insert(detP, {x, 10+dy, c_smid})
    table.insert(detP, {x, 12+dy, c_sdark})
  end

  -- CIRCULAR MOUTH at left tip (X=4+dx..6+dx, Y=12+dy..16+dy)
  if mouthState == "normal" then
    for y=13+dy,15+dy do
      table.insert(detP, {5+dx, y, c_smid})
    end
    table.insert(detP, {6+dx, 12+dy, c_slight})
    table.insert(detP, {6+dx, 16+dy, c_sdark})
    table.insert(detP, {5+dx, 14+dy, c_pdark})
  elseif mouthState == "wide" then
    for y=12+dy,16+dy do
      table.insert(detP, {4+dx, y, c_slight})
      table.insert(detP, {5+dx, y, c_out})
    end
    table.insert(detP, {4+dx, 14+dy, c_dlight})
    table.insert(detP, {5+dx, 14+dy, c_ddark})
  end

  local outP = computeOutline(bodyP)
  return outP, bodyP, detP
end

-- Frames 11..12: Left Idle
buildFrame(11, getLeftPixels(0, 0, "normal"))
buildFrame(12, getLeftPixels(0, 1, "normal"))

-- Frames 13..16: Left Walk
buildFrame(13, getLeftPixels(0, 0, "normal"))
buildFrame(14, getLeftPixels(-2, -1, "normal"))
buildFrame(15, getLeftPixels(-1, 0, "normal"))
buildFrame(16, getLeftPixels(1, 1, "normal"))

-- Frames 17..20: Left Attack
buildFrame(17, getLeftPixels(2, 0, "normal"))
buildFrame(18, getLeftPixels(-3, 0, "wide"))
do
  local o, b, d = getLeftPixels(-2, 0, "wide")
  local eff = {
    {1, 13, c_ddark}, {2, 13, c_dlight}, {2, 14, c_ddark},
    {0, 16, c_ddark}, {1, 16, c_dlight}
  }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 0, "normal")
  local eff = {
    {0, 11, c_ddark}, {1, 11, c_dlight},
    {0, 18, c_ddark}, {1, 18, c_dlight}
  }
  buildFrame(20, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- RIGHT DIRECTION (Frames 21..30) (Facing Right towards X=31)
-- Creature's LEFT side faces VIEWER (Center side of body Y=13..17).
-- Pale stripe runs PROMINENTLY along FRONT/SIDE of body facing viewer!
--------------------------------------------------------------------------------
local function getRightPixels(dx, dy, mouthState)
  dx = dx or 0
  dy = dy or 0
  mouthState = mouthState or "normal"

  local bodyP = {}
  local detP = {}

  -- Head at right (X=19+dx..25+dx, Y=11+dy..17+dy)
  for y=11+dy,17+dy do
    for x=19+dx,25+dx do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Main body extending left (X=7+dx..20+dx, Y=11+dy..20+dy)
  for y=11+dy,19+dy do
    for x=8+dx,20+dx do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Underbelly shadow
  for y=17+dy,21+dy do
    for x=7+dx,21+dx do
      table.insert(bodyP, {x, y, c_pmid})
    end
  end

  -- Curled rear section at left (X=5+dx..9+dx, Y=13+dy..24+dy)
  for y=13+dy,24+dy do
    for x=5+dx,9+dx do
      table.insert(bodyP, {x, y, c_mdark})
    end
  end

  -- Segment ridges
  for _, sx in ipairs({8+dx, 12+dx, 16+dx, 19+dx}) do
    for sy=12+dy,19+dy do
      table.insert(bodyP, {sx, sy, c_pdark})
    end
  end

  -- PALE STRIPE along anatomical LEFT half (FACING VIEWER! Y=13+dy..16+dy, X=9+dx..23+dx)
  for x=9+dx,23+dx do
    table.insert(detP, {x, 14+dy, c_slight})
    table.insert(detP, {x, 13+dy, c_smid})
    table.insert(detP, {x, 15+dy, c_sdark})
  end

  -- CIRCULAR MOUTH at right tip (X=25+dx..27+dx, Y=12+dy..16+dy)
  if mouthState == "normal" then
    for y=13+dy,15+dy do
      table.insert(detP, {26+dx, y, c_smid})
    end
    table.insert(detP, {25+dx, 12+dy, c_slight})
    table.insert(detP, {25+dx, 16+dy, c_sdark})
    table.insert(detP, {26+dx, 14+dy, c_pdark})
  elseif mouthState == "wide" then
    for y=12+dy,16+dy do
      table.insert(detP, {27+dx, y, c_slight})
      table.insert(detP, {26+dx, y, c_out})
    end
    table.insert(detP, {27+dx, 14+dy, c_dlight})
    table.insert(detP, {26+dx, 14+dy, c_ddark})
  end

  local outP = computeOutline(bodyP)
  return outP, bodyP, detP
end

-- Frames 21..22: Right Idle
buildFrame(21, getRightPixels(0, 0, "normal"))
buildFrame(22, getRightPixels(0, 1, "normal"))

-- Frames 23..26: Right Walk
buildFrame(23, getRightPixels(0, 0, "normal"))
buildFrame(24, getRightPixels(2, -1, "normal"))
buildFrame(25, getRightPixels(1, 0, "normal"))
buildFrame(26, getRightPixels(-1, 1, "normal"))

-- Frames 27..30: Right Attack
buildFrame(27, getRightPixels(-2, 0, "normal"))
buildFrame(28, getRightPixels(3, 0, "wide"))
do
  local o, b, d = getRightPixels(2, 0, "wide")
  local eff = {
    {30, 13, c_ddark}, {29, 13, c_dlight}, {29, 14, c_ddark},
    {31, 16, c_ddark}, {30, 16, c_dlight}
  }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 0, "normal")
  local eff = {
    {31, 11, c_ddark}, {30, 11, c_dlight},
    {31, 18, c_ddark}, {30, 18, c_dlight}
  }
  buildFrame(30, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- UP DIRECTION (Frames 31..40) (Facing Up away from viewer)
-- Anatomical LEFT side is on VIEWER'S LEFT (X=11..14).
-- Pale stripe runs along anatomical LEFT side (viewer's left).
--------------------------------------------------------------------------------
local function getUpPixels(dy, mouthState)
  dy = dy or 0
  mouthState = mouthState or "normal"

  local bodyP = {}
  local detP = {}

  -- Head at top (X=11..20, Y=7+dy..13+dy)
  for y=7+dy,13+dy do
    for x=11,20 do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Torso coiling down
  for y=14+dy,22+dy do
    for x=10,21 do
      table.insert(bodyP, {x, y, c_mmid})
    end
  end

  -- Right shadow (viewer's right side X=19..21)
  for y=12+dy,23+dy do
    for x=19,21 do
      table.insert(bodyP, {x, y, c_pmid})
    end
  end

  -- Rear curl at bottom
  for y=23+dy,27+dy do
    for x=14,22 do
      table.insert(bodyP, {x, y, c_mdark})
    end
  end

  -- Segment ridges
  for _, sy in ipairs({13+dy, 16+dy, 19+dy, 22+dy}) do
    for sx=11,19 do
      table.insert(bodyP, {sx, sy, c_pdark})
    end
  end

  -- PALE STRIPE along anatomical LEFT half (Viewer's LEFT, X=11..13, Y=9+dy..21+dy)
  for y=9+dy,21+dy do
    table.insert(detP, {12, y, c_slight})
    table.insert(detP, {11, y, c_smid})
    table.insert(detP, {13, y, c_sdark})
  end

  -- Head back details / top mouth rim
  if mouthState == "wide" then
    for x=14,17 do
      table.insert(detP, {x, 7+dy, c_slight})
      table.insert(detP, {x, 6+dy, c_dlight})
    end
  else
    for x=14,17 do
      table.insert(detP, {x, 7+dy, c_smid})
    end
  end

  local outP = computeOutline(bodyP)
  return outP, bodyP, detP
end

-- Frames 31..32: Up Idle
buildFrame(31, getUpPixels(0, "normal"))
buildFrame(32, getUpPixels(1, "normal"))

-- Frames 33..36: Up Walk
buildFrame(33, getUpPixels(0, "normal"))
buildFrame(34, getUpPixels(-2, "normal"))
buildFrame(35, getUpPixels(-1, "normal"))
buildFrame(36, getUpPixels(1, "normal"))

-- Frames 37..40: Up Attack
buildFrame(37, getUpPixels(2, "normal"))
buildFrame(38, getUpPixels(-3, "wide"))
do
  local o, b, d = getUpPixels(-2, "wide")
  local eff = {
    {14, 4, c_ddark}, {15, 4, c_dlight},
    {17, 3, c_ddark}, {18, 3, c_dlight}
  }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, "normal")
  local eff = {
    {12, 1, c_ddark}, {13, 1, c_dlight},
    {19, 1, c_ddark}, {20, 1, c_dlight}
  }
  buildFrame(40, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs("${stagingDir}/source.aseprite")

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

-- Composite frame 1 layers (outline, body, details)
for l = 1, 3 do
  local cel = spr.layers[l]:cel(1)
  if cel then
    local img = cel.image
    for y=0,31 do
      for x=0,31 do
        local px = img:getPixel(x, y)
        if app.pixelColor.rgbaA(px) > 0 then
          thumbImg:drawPixel(x, y, px)
        end
      end
    end
  end
end

thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("${stagingDir}/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_LEECHCOIL_SLITHERER")
`;

writeFileSync("tools/build-leechcoil-slitherer.lua", luaScript);
console.log("Written tools/build-leechcoil-slitherer.lua");

const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0014-leechcoil-slitherer
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Leechcoil Slitherer".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A draining pursuer that becomes more dangerous at close range.
- Body and silhouette: Long thick body with a circular mouth and curled rear section.
- Signature features: Pale ringed mouth, segmented sides, and floating red-black droplets.
- Palette and materials: Deep maroon, black, muddy purple, and glossy skin.
- Movement personality: Smooth, relentless, and unsettlingly calm.
- Attack concept: Fires slow droplets that orbit the player briefly before collapsing inward.
- Directional details: A pale stripe runs along the left half of its body, ending before the tail.
- Avoid: Gore-heavy design, thin earthworm shape, tentacled sea monster.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-leechcoil-slitherer",
  assetId: "enemy-mob-32-leechcoil-slitherer",
  baseRevisionId: null,
  requestedName: "Leechcoil Slitherer",
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
