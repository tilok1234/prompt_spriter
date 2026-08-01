local spr = Sprite(32, 32, ColorMode.RGB)
local stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-marshjaw-snapper"
spr.filename = stagingDir .. "/source.aseprite"

-- Setup palette (11 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=20, g=16, b=12, a=255 },     -- 1: c_out (dark brown/black outline)
  Color{ r=32, g=48, b=28, a=255 },      -- 2: c_odark (dark olive scales)
  Color{ r=52, g=78, b=42, a=255 },      -- 3: c_omid (mid olive scales)
  Color{ r=82, g=118, b=62, a=255 },     -- 4: c_olight (light olive scales)
  Color{ r=46, g=34, b=22, a=255 },      -- 5: c_mdark (mud brown dark)
  Color{ r=78, g=56, b=36, a=255 },      -- 6: c_mmid (mud brown mid)
  Color{ r=112, g=84, b=54, a=255 },     -- 7: c_mlight (mud brown light highlight)
  Color{ r=170, g=160, b=130, a=255 },   -- 8: c_pale_dark (pale exposed patch / teeth dark)
  Color{ r=220, g=210, b=180, a=255 },   -- 9: c_pale_light (pale exposed patch / teeth light)
  Color{ r=130, g=170, b=60, a=255 },    -- 10: c_reed (reed green back tufts)
  Color{ r=240, g=200, b=60, a=255 }     -- 11: c_eye (amber yellow eye)
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

-- Color aliases
local c_out        = colors[2]
local c_odark      = colors[3]
local c_omid       = colors[4]
local c_olight     = colors[5]
local c_mdark      = colors[6]
local c_mmid       = colors[7]
local c_mlight     = colors[8]
local c_pale_dark  = colors[9]
local c_pale_light = colors[10]
local c_reed       = colors[11]
local c_eye        = colors[12]

local function drawPixels(img, pixels)
  for _, p in ipairs(pixels) do
    img:drawPixel(p[1], p[2], p[3])
  end
end

local function buildFrame(fNum, outPx, bodyPx, detPx, effPx)
  if outPx and #outPx > 0 then
    local cel = spr:newCel(layerOutline, fNum)
    drawPixels(cel.image, outPx)
  end
  if bodyPx and #bodyPx > 0 then
    local cel = spr:newCel(layerBody, fNum)
    drawPixels(cel.image, bodyPx)
  end
  if detPx and #detPx > 0 then
    local cel = spr:newCel(layerDetails, fNum)
    drawPixels(cel.image, detPx)
  end
  if effPx and #effPx > 0 then
    local cel = spr:newCel(layerEffects, fNum)
    drawPixels(cel.image, effPx)
  end
end

local function autoOutline(bodyPx, detPx)
  local grid = {}
  for y=0,31 do grid[y] = {} end
  for _, p in ipairs(bodyPx) do grid[p[2]][p[1]] = true end
  if detPx then
    for _, p in ipairs(detPx) do grid[p[2]][p[1]] = true end
  end
  local out = {}
  local dx = {-1, 1, 0, 0}
  local dy = {0, 0, -1, 1}
  for y=0,31 do
    for x=0,31 do
      if not grid[y][x] then
        local isBorder = false
        for i=1,4 do
          local nx, ny = x+dx[i], y+dy[i]
          if nx>=0 and nx<=31 and ny>=0 and ny<=31 and grid[ny][nx] then
            isBorder = true
            break
          end
        end
        if isBorder then
          table.insert(out, {x, y, c_out})
        end
      end
    end
  end
  return out
end

--------------------------------------------------------------------------------
-- DOWN DIRECTION (Frames 1..10)
-- Creature facing down.
-- Broad snout at Y=6..12, heavy torso at Y=13..21, tail at Y=22..28.
-- Right shoulder = creature's right = viewer's LEFT (missing plate -> pale patch at X=11..12, Y=14..15).
--------------------------------------------------------------------------------

local function getDownPixels(shiftY, legState, openJaws, attackCharge, headOffset)
  shiftY = shiftY or 0
  legState = legState or 0
  headOffset = headOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hy = 6 + shiftY + headOffset
  
  -- Broad Crocodilian Head (Y: hy .. hy+6, X: 11..20)
  for y = hy, hy+6 do
    for x = 11, 20 do
      if not ((y == hy or y == hy+6) and (x == 11 or x == 20)) then
        local col = c_omid
        if x == 11 or x == 20 then col = c_odark
        elseif y == hy then col = c_olight
        elseif y >= hy+4 then col = c_mmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end
  
  -- Snout nostrils & ridge
  table.insert(det, {14, hy, c_odark})
  table.insert(det, {17, hy, c_odark})
  
  -- Amber eyes (12, hy+2) and (19, hy+2)
  table.insert(det, {12, hy+2, c_eye})
  table.insert(det, {19, hy+2, c_eye})
  
  if openJaws then
    -- Wide open snapping jaws with pale teeth
    for y = hy+3, hy+6 do
      for x = 13, 18 do
        table.insert(det, {x, y, c_out})
      end
    end
    table.insert(det, {14, hy+3, c_pale_light})
    table.insert(det, {17, hy+3, c_pale_light})
    table.insert(det, {14, hy+6, c_pale_light})
    table.insert(det, {17, hy+6, c_pale_light})
  end

  -- Main Armored Torso (Y: hy+7 .. hy+16, X: 10..21)
  for y = hy+7, hy+16 do
    for x = 10, 21 do
      if not ((y == hy+7 or y == hy+16) and (x == 10 or x == 21)) then
        local col = c_omid
        if x == 10 or x == 21 then col = c_odark
        elseif x >= 13 and x <= 18 then col = c_olight
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Missing plate pale patch near creature's RIGHT shoulder (viewer's LEFT: X=11..12, Y=hy+8..hy+9)
  table.insert(det, {11, hy+8, c_pale_light})
  table.insert(det, {12, hy+8, c_pale_dark})
  table.insert(det, {11, hy+9, c_pale_dark})
  table.insert(det, {12, hy+9, c_pale_light})

  -- Reed tufts & dorsal scutes down spine
  for y = hy+8, hy+15, 2 do
    table.insert(det, {15, y, c_reed})
    table.insert(det, {16, y, c_reed})
    table.insert(det, {15, y+1, c_olight})
    table.insert(det, {16, y+1, c_olight})
  end

  -- Thick Tail (Y: hy+17 .. hy+23, X: 13..18 narrowing to 15..16)
  local tailPts = {
    {hy+17, 14, 5},
    {hy+18, 14, 5},
    {hy+19, 15, 4},
    {hy+20, 15, 4},
    {hy+21, 15, 3},
    {hy+22, 16, 2},
    {hy+23, 16, 2}
  }
  for _, pt in ipairs(tailPts) do
    local py, px, w = pt[1], pt[2], pt[3]
    if py <= 30 then
      for x = px, px+w-1 do
        table.insert(body, {x, py, c_odark})
      end
      table.insert(det, {px, py, c_omid})
    end
  end

  -- Sprawling Legs (Front legs at hy+7..hy+9, Rear legs at hy+14..hy+16)
  local fLegL = (legState == 1) and -1 or 0
  local fLegR = (legState == 2) and -1 or 0
  local rLegL = (legState == 2) and 1 or 0
  local rLegR = (legState == 1) and 1 or 0

  -- Front Left Leg (viewer's left)
  table.insert(body, {8, hy+8+fLegL, c_odark})
  table.insert(body, {9, hy+8+fLegL, c_omid})
  table.insert(body, {8, hy+9+fLegL, c_mdark})
  
  -- Front Right Leg (viewer's right)
  table.insert(body, {22, hy+8+fLegR, c_omid})
  table.insert(body, {23, hy+8+fLegR, c_odark})
  table.insert(body, {23, hy+9+fLegR, c_mdark})

  -- Rear Left Leg (viewer's left)
  table.insert(body, {8, hy+15+rLegL, c_odark})
  table.insert(body, {9, hy+15+rLegL, c_omid})
  table.insert(body, {8, hy+16+rLegL, c_mdark})

  -- Rear Right Leg (viewer's right)
  table.insert(body, {22, hy+15+rLegR, c_omid})
  table.insert(body, {23, hy+15+rLegR, c_odark})
  table.insert(body, {23, hy+16+rLegR, c_mdark})

  if attackCharge then
    -- Mud spray / splash effect lines spreading behind charge
    table.insert(eff, {7, hy+16, c_mmid})
    table.insert(eff, {6, hy+18, c_mdark})
    table.insert(eff, {24, hy+16, c_mmid})
    table.insert(eff, {25, hy+18, c_mdark})
    table.insert(eff, {5, hy+20, c_mmid})
    table.insert(eff, {26, hy+20, c_mmid})
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Down Frames (1..10)
o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(1, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, false, false, 1)
buildFrame(2, o, b, d, e)

-- Walk (3..6)
o, b, d, e = getDownPixels(0, 1, false, false, 0)
buildFrame(3, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(4, o, b, d, e)
o, b, d, e = getDownPixels(0, 2, false, false, 0)
buildFrame(5, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(6, o, b, d, e)

-- Attack (7..10)
o, b, d, e = getDownPixels(0, 0, true, false, -2)
buildFrame(7, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, true, true, 3)
buildFrame(8, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, true, true, 4)
buildFrame(9, o, b, d, e)
o, b, d, e = getDownPixels(0, 0, false, false, 1)
buildFrame(10, o, b, d, e)


--------------------------------------------------------------------------------
-- LEFT DIRECTION (Frames 11..20)
-- Creature facing left.
-- Snout on left X=4..10, torso X=11..21, tail X=22..28.
-- Creature's RIGHT shoulder is on background/upper side (X=13..14, Y=11..12).
--------------------------------------------------------------------------------

local function getLeftPixels(shiftX, legState, openJaws, attackCharge, headOffset)
  shiftX = shiftX or 0
  legState = legState or 0
  headOffset = headOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hx = 5 + shiftX + headOffset
  local hy = 12
  
  -- Broad Head facing left (X: hx .. hx+6, Y: hy .. hy+5)
  for x = hx, hx+6 do
    for y = hy, hy+5 do
      if not ((x == hx or x == hx+6) and (y == hy or y == hy+5)) then
        local col = c_omid
        if y == hy then col = c_olight
        elseif y == hy+5 then col = c_mmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Amber eye (hx+2, hy+1)
  table.insert(det, {hx+2, hy+1, c_eye})

  if openJaws then
    for x = hx, hx+3 do
      table.insert(det, {x, hy+3, c_out})
      table.insert(det, {x, hy+4, c_pale_light})
    end
  end

  -- Armored Torso (X: hx+7 .. hx+17, Y: hy-1 .. hy+6)
  for x = hx+7, hx+17 do
    for y = hy-1, hy+6 do
      if not ((x == hx+7 or x == hx+17) and (y == hy-1 or y == hy+6)) then
        local col = c_omid
        if y == hy-1 then col = c_olight
        elseif y >= hy+4 then col = c_mdark
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Missing plate pale patch on creature's RIGHT shoulder (background/top ridge X=hx+9..hx+10, Y=hy-1)
  table.insert(det, {hx+9, hy-1, c_pale_light})
  table.insert(det, {hx+10, hy-1, c_pale_dark})

  -- Reed tufts along back ridge
  for x = hx+8, hx+15, 3 do
    table.insert(det, {x, hy-2, c_reed})
    table.insert(det, {x+1, hy-2, c_reed})
  end

  -- Thick Tail extending right (X: hx+18 .. hx+24)
  for x = hx+18, hx+24 do
    local w = math.max(1, 5 - (x - (hx+18)))
    for y = hy, hy+w-1 do
      table.insert(body, {x, y, c_odark})
    end
    table.insert(det, {x, hy, c_omid})
  end

  -- Low Sprawling Legs (Foreground legs at hy+6, Background legs at hy-2)
  local fLegL = (legState == 1) and -1 or 0
  local fLegR = (legState == 2) and 1 or 0

  -- Front Foreground Leg (left side of torso)
  table.insert(body, {hx+7+fLegL, hy+6, c_omid})
  table.insert(body, {hx+7+fLegL, hy+7, c_mdark})
  table.insert(body, {hx+6+fLegL, hy+7, c_mdark})

  -- Rear Foreground Leg (right side of torso)
  table.insert(body, {hx+16+fLegR, hy+6, c_omid})
  table.insert(body, {hx+16+fLegR, hy+7, c_mdark})
  table.insert(body, {hx+15+fLegR, hy+7, c_mdark})

  if attackCharge then
    -- Mud spray trailing right
    for x = hx+18, hx+26, 2 do
      table.insert(eff, {x, hy+7, c_mmid})
      table.insert(eff, {x+1, hy+8, c_mdark})
    end
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Left Frames (11..20)
o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(11, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, false, false, 1)
buildFrame(12, o, b, d, e)

o, b, d, e = getLeftPixels(0, 1, false, false, 0)
buildFrame(13, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(14, o, b, d, e)
o, b, d, e = getLeftPixels(0, 2, false, false, 0)
buildFrame(15, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(16, o, b, d, e)

o, b, d, e = getLeftPixels(0, 0, true, false, 2)
buildFrame(17, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, true, true, -3)
buildFrame(18, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, true, true, -4)
buildFrame(19, o, b, d, e)
o, b, d, e = getLeftPixels(0, 0, false, false, -1)
buildFrame(20, o, b, d, e)


--------------------------------------------------------------------------------
-- RIGHT DIRECTION (Frames 21..30)
-- Creature facing right.
-- Snout on right X=21..27, torso X=10..20, tail X=3..9.
-- Creature's RIGHT shoulder is in foreground (X=17..18, Y=15..16).
--------------------------------------------------------------------------------

local function getRightPixels(shiftX, legState, openJaws, attackCharge, headOffset)
  shiftX = shiftX or 0
  legState = legState or 0
  headOffset = headOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hx = 20 + shiftX + headOffset
  local hy = 12
  
  -- Broad Head facing right (X: hx-6 .. hx, Y: hy .. hy+5)
  for x = hx-6, hx do
    for y = hy, hy+5 do
      if not ((x == hx-6 or x == hx) and (y == hy or y == hy+5)) then
        local col = c_omid
        if y == hy then col = c_olight
        elseif y == hy+5 then col = c_mmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Amber eye (hx-2, hy+1)
  table.insert(det, {hx-2, hy+1, c_eye})

  if openJaws then
    for x = hx-3, hx do
      table.insert(det, {x, hy+3, c_out})
      table.insert(det, {x, hy+4, c_pale_light})
    end
  end

  -- Armored Torso (X: hx-17 .. hx-7, Y: hy-1 .. hy+6)
  for x = hx-17, hx-7 do
    for y = hy-1, hy+6 do
      if not ((x == hx-17 or x == hx-7) and (y == hy-1 or y == hy+6)) then
        local col = c_omid
        if y == hy-1 then col = c_olight
        elseif y >= hy+4 then col = c_mdark
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Missing plate pale patch on creature's RIGHT shoulder (foreground side X=hx-10..hx-9, Y=hy+4..hy+5)
  table.insert(det, {hx-10, hy+4, c_pale_light})
  table.insert(det, {hx-9, hy+4, c_pale_dark})
  table.insert(det, {hx-10, hy+5, c_pale_dark})

  -- Reed tufts along back ridge
  for x = hx-15, hx-8, 3 do
    table.insert(det, {x, hy-2, c_reed})
    table.insert(det, {x+1, hy-2, c_reed})
  end

  -- Thick Tail extending left (X: hx-24 .. hx-18)
  for x = hx-24, hx-18 do
    local w = math.max(1, 5 - ((hx-18) - x))
    for y = hy, hy+w-1 do
      table.insert(body, {x, y, c_odark})
    end
    table.insert(det, {x, hy, c_omid})
  end

  -- Low Sprawling Legs
  local fLegL = (legState == 1) and -1 or 0
  local fLegR = (legState == 2) and 1 or 0

  -- Front Foreground Leg
  table.insert(body, {hx-7+fLegL, hy+6, c_omid})
  table.insert(body, {hx-7+fLegL, hy+7, c_mdark})
  table.insert(body, {hx-6+fLegL, hy+7, c_mdark})

  -- Rear Foreground Leg
  table.insert(body, {hx-16+fLegR, hy+6, c_omid})
  table.insert(body, {hx-16+fLegR, hy+7, c_mdark})
  table.insert(body, {hx-15+fLegR, hy+7, c_mdark})

  if attackCharge then
    -- Mud spray trailing left
    for x = hx-26, hx-18, 2 do
      table.insert(eff, {x, hy+7, c_mmid})
      table.insert(eff, {x+1, hy+8, c_mdark})
    end
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Right Frames (21..30)
o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(21, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, false, false, 1)
buildFrame(22, o, b, d, e)

o, b, d, e = getRightPixels(0, 1, false, false, 0)
buildFrame(23, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(24, o, b, d, e)
o, b, d, e = getRightPixels(0, 2, false, false, 0)
buildFrame(25, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(26, o, b, d, e)

o, b, d, e = getRightPixels(0, 0, true, false, -2)
buildFrame(27, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, true, true, 3)
buildFrame(28, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, true, true, 4)
buildFrame(29, o, b, d, e)
o, b, d, e = getRightPixels(0, 0, false, false, 1)
buildFrame(30, o, b, d, e)


--------------------------------------------------------------------------------
-- UP DIRECTION (Frames 31..40)
-- Creature facing up.
-- Back of broad head at Y=6..12, torso at Y=13..21, tail at Y=22..28.
-- Creature's RIGHT shoulder = viewer's RIGHT (X=19..20, Y=14..15).
--------------------------------------------------------------------------------

local function getUpPixels(shiftY, legState, openJaws, attackCharge, headOffset)
  shiftY = shiftY or 0
  legState = legState or 0
  headOffset = headOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hy = 6 + shiftY + headOffset
  
  -- Broad Head back view (Y: hy .. hy+6, X: 11..20)
  for y = hy, hy+6 do
    for x = 11, 20 do
      if not ((y == hy or y == hy+6) and (x == 11 or x == 20)) then
        local col = c_omid
        if x == 11 or x == 20 then col = c_odark
        elseif y == hy then col = c_odark
        elseif y >= hy+4 then col = c_olight
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Main Armored Torso (Y: hy+7 .. hy+16, X: 10..21)
  for y = hy+7, hy+16 do
    for x = 10, 21 do
      if not ((y == hy+7 or y == hy+16) and (x == 10 or x == 21)) then
        local col = c_omid
        if x == 10 or x == 21 then col = c_odark
        elseif x >= 13 and x <= 18 then col = c_olight
        end
        table.insert(body, {x, y, col})
      end
    end
  end

  -- Missing plate pale patch near creature's RIGHT shoulder (viewer's RIGHT: X=19..20, Y=hy+8..hy+9)
  table.insert(det, {19, hy+8, c_pale_light})
  table.insert(det, {20, hy+8, c_pale_dark})
  table.insert(det, {19, hy+9, c_pale_dark})
  table.insert(det, {20, hy+9, c_pale_light})

  -- Reed tufts & dorsal scutes down spine
  for y = hy+7, hy+15, 2 do
    table.insert(det, {15, y, c_reed})
    table.insert(det, {16, y, c_reed})
    table.insert(det, {15, y+1, c_olight})
    table.insert(det, {16, y+1, c_olight})
  end

  -- Thick Tail (Y: hy+17 .. hy+23, X: 13..18 narrowing)
  local tailPts = {
    {hy+17, 14, 5},
    {hy+18, 14, 5},
    {hy+19, 15, 4},
    {hy+20, 15, 4},
    {hy+21, 15, 3},
    {hy+22, 16, 2},
    {hy+23, 16, 2}
  }
  for _, pt in ipairs(tailPts) do
    local py, px, w = pt[1], pt[2], pt[3]
    if py <= 30 then
      for x = px, px+w-1 do
        table.insert(body, {x, py, c_odark})
      end
      table.insert(det, {px, py, c_omid})
    end
  end

  -- Sprawling Legs
  local fLegL = (legState == 1) and -1 or 0
  local fLegR = (legState == 2) and -1 or 0
  local rLegL = (legState == 2) and 1 or 0
  local rLegR = (legState == 1) and 1 or 0

  table.insert(body, {8, hy+8+fLegL, c_odark})
  table.insert(body, {9, hy+8+fLegL, c_omid})
  table.insert(body, {22, hy+8+fLegR, c_omid})
  table.insert(body, {23, hy+8+fLegR, c_odark})

  table.insert(body, {8, hy+15+rLegL, c_odark})
  table.insert(body, {9, hy+15+rLegL, c_omid})
  table.insert(body, {22, hy+15+rLegR, c_omid})
  table.insert(body, {23, hy+15+rLegR, c_odark})

  if attackCharge then
    -- Mud spray trailing downwards
    table.insert(eff, {7, hy+18, c_mmid})
    table.insert(eff, {6, hy+20, c_mdark})
    table.insert(eff, {24, hy+18, c_mmid})
    table.insert(eff, {25, hy+20, c_mdark})
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Up Frames (31..40)
o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(31, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, false, false, 1)
buildFrame(32, o, b, d, e)

o, b, d, e = getUpPixels(0, 1, false, false, 0)
buildFrame(33, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(34, o, b, d, e)
o, b, d, e = getUpPixels(0, 2, false, false, 0)
buildFrame(35, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(36, o, b, d, e)

o, b, d, e = getUpPixels(0, 0, true, false, 2)
buildFrame(37, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, true, true, -3)
buildFrame(38, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, true, true, -5)
buildFrame(39, o, b, d, e)
o, b, d, e = getUpPixels(0, 0, false, false, -1)
buildFrame(40, o, b, d, e)


--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs(stagingDir .. "/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename=stagingDir .. "/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)

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
thumbSpr:saveCopyAs(stagingDir .. "/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_MARSHJAW_SNAPPER")
