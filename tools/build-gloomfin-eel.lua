local spr = Sprite(32, 32, ColorMode.RGB)
local stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-gloomfin-eel"
spr.filename = stagingDir .. "/source.aseprite"

-- Setup palette (11 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=12, g=16, b=26, a=255 },     -- 1: c_out (dark midnight outline)
  Color{ r=20, g=34, b=58, a=255 },      -- 2: c_bdark (midnight blue dark)
  Color{ r=36, g=62, b=98, a=255 },      -- 3: c_bmid (midnight blue mid)
  Color{ r=56, g=94, b=142, a=255 },     -- 4: c_blight (midnight blue highlight)
  Color{ r=24, g=44, b=36, a=255 },      -- 5: c_gdark (muddy green dark)
  Color{ r=44, g=78, b=58, a=255 },      -- 6: c_gmid (muddy green mid)
  Color{ r=72, g=118, b=86, a=255 },     -- 7: c_glight (muddy green light)
  Color{ r=16, g=120, b=130, a=255 },    -- 8: c_cyan_dark (electric cyan dark)
  Color{ r=36, g=200, b=210, a=255 },    -- 9: c_cyan_mid (electric cyan mid)
  Color{ r=160, g=250, b=255, a=255 },   -- 10: c_cyan_bright (electric cyan bright)
  Color{ r=240, g=255, b=255, a=255 }    -- 11: c_eye (glowing eye)
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
local c_out         = colors[2]
local c_bdark       = colors[3]
local c_bmid        = colors[4]
local c_blight      = colors[5]
local c_gdark       = colors[6]
local c_gmid        = colors[7]
local c_glight      = colors[8]
local c_cyan_dark   = colors[9]
local c_cyan_mid    = colors[10]
local c_cyan_bright = colors[11]
local c_eye         = colors[12]

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

--------------------------------------------------------------------------------
-- FRAME DRAWING FUNCTIONS
--------------------------------------------------------------------------------

-- Helper to generate outline from a body+details mask
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
-- Left whisker = creature's left = viewer's RIGHT (shorter, 2px).
-- Right whisker = creature's right = viewer's LEFT (longer, 4px).
-- 3 nodes near tail before forked fin.
--------------------------------------------------------------------------------

local function getDownPixels(shiftY, curveX, openMouth, attackDash, headYOffset)
  shiftY = shiftY or 0
  curveX = curveX or 0
  headYOffset = headYOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hy = 6 + shiftY + headYOffset
  
  -- Broad Eel Head (Y: hy .. hy+5, X: 11..20)
  for y = hy, hy+5 do
    for x = 11, 20 do
      if not ((y == hy or y == hy+5) and (x == 11 or x == 20)) then
        local col = c_bmid
        if x == 11 or x == 20 then col = c_bdark
        elseif y == hy then col = c_blight
        elseif y >= hy+3 then col = c_gmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end
  
  -- Muddy green belly streak down center of head/chin
  for y = hy+3, hy+5 do
    table.insert(det, {14, y, c_glight})
    table.insert(det, {15, y, c_glight})
    table.insert(det, {16, y, c_glight})
    table.insert(det, {17, y, c_glight})
  end
  
  -- Eyes (Cyan glowing eyes at 13, hy+2 and 18, hy+2)
  table.insert(det, {13, hy+2, c_eye})
  table.insert(det, {18, hy+2, c_eye})
  table.insert(det, {12, hy+2, c_cyan_mid})
  table.insert(det, {19, hy+2, c_cyan_mid})

  -- Whiskers at mouth corners (hy+4)
  -- Creature's right whisker (viewer's LEFT) -> longer (4px): (10, hy+4), (9, hy+5), (8, hy+5), (7, hy+6)
  table.insert(det, {10, hy+4, c_cyan_mid})
  table.insert(det, {9, hy+5, c_cyan_mid})
  table.insert(det, {8, hy+5, c_cyan_mid})
  table.insert(det, {7, hy+6, c_cyan_bright})

  -- Creature's left whisker (viewer's RIGHT) -> shorter (2px): (21, hy+4), (22, hy+5)
  table.insert(det, {21, hy+4, c_cyan_mid})
  table.insert(det, {22, hy+5, c_cyan_bright})

  if openMouth then
    -- Open jaws showing dark mouth & sharp cyan fangs
    table.insert(det, {14, hy+4, c_out})
    table.insert(det, {15, hy+4, c_out})
    table.insert(det, {16, hy+4, c_out})
    table.insert(det, {17, hy+4, c_out})
    table.insert(det, {14, hy+5, c_out})
    table.insert(det, {17, hy+5, c_out})
    table.insert(det, {15, hy+5, c_cyan_bright})
    table.insert(det, {16, hy+5, c_cyan_bright})
  end

  -- Serpentine Body extending down from head (hy+6 to hy+21)
  -- S-curve path points for center X:
  local pts = {
    {hy+6, 15+curveX, 6},
    {hy+7, 15+curveX, 6},
    {hy+8, 14+curveX, 6},
    {hy+9, 14+curveX, 5},
    {hy+10, 13+math.floor(curveX*0.5), 5},
    {hy+11, 13+math.floor(curveX*0.5), 5},
    {hy+12, 13, 5},
    {hy+13, 14, 5},
    {hy+14, 15, 4},
    {hy+15, 16-curveX, 4},
    {hy+16, 17-curveX, 4},
    {hy+17, 17-curveX, 4},
    {hy+18, 18-curveX, 3},
    {hy+19, 18-curveX, 3},
    {hy+20, 19-curveX, 3},
    {hy+21, 19-curveX, 2}
  }

  for _, pt in ipairs(pts) do
    local py, px, w = pt[1], pt[2], pt[3]
    if py <= 30 then
      local half = math.floor(w / 2)
      for x = px - half, px - half + w - 1 do
        if x >= 1 and x <= 30 then
          local col = c_bmid
          if x == px - half then col = c_blight
          elseif x == px - half + w - 1 then col = c_bdark
          end
          table.insert(body, {x, py, col})
        end
      end
      -- Dorsal fin along spine (center X)
      if py <= hy+16 then
        table.insert(det, {px, py, c_cyan_mid})
      end
    end
  end

  -- 3 Bright Cyan Tail Nodes near tail (at hy+17, hy+19, hy+21)
  if hy+17 <= 30 then table.insert(det, {17-curveX, hy+17, c_cyan_bright}) end
  if hy+19 <= 30 then table.insert(det, {18-curveX, hy+19, c_cyan_bright}) end
  if hy+21 <= 30 then table.insert(det, {19-curveX, hy+21, c_cyan_bright}) end

  -- Forked Tail Fin at bottom (hy+22 .. hy+24)
  local ty = hy + 22
  local tx = 19 - curveX
  if ty <= 30 then
    table.insert(det, {tx-1, ty, c_cyan_mid})
    table.insert(det, {tx+1, ty, c_cyan_mid})
  end
  if ty+1 <= 31 then
    table.insert(det, {tx-2, ty+1, c_cyan_bright})
    table.insert(det, {tx+2, ty+1, c_cyan_bright})
  end

  if attackDash then
    -- Electric cyan lightning line trailing behind head in effects layer
    for y = hy-4, hy+2 do
      if y >= 1 and y <= 31 then
        table.insert(eff, {15, y, c_cyan_bright})
        table.insert(eff, {16, y, c_cyan_mid})
      end
    end
    table.insert(eff, {14, hy-2, c_cyan_mid})
    table.insert(eff, {17, hy+1, c_cyan_bright})
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Down Frames (1..10)
-- 1..2: Idle
local o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(1, o, b, d, e)

o, b, d, e = getDownPixels(0, 1, false, false, 0)
buildFrame(2, o, b, d, e)

-- 3..6: Walk (serpentine swimming wave)
o, b, d, e = getDownPixels(0, -2, false, false, 0)
buildFrame(3, o, b, d, e)

o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(4, o, b, d, e)

o, b, d, e = getDownPixels(0, 2, false, false, 0)
buildFrame(5, o, b, d, e)

o, b, d, e = getDownPixels(0, 0, false, false, 0)
buildFrame(6, o, b, d, e)

-- 7..10: Attack (Lunge dash + lightning lane)
-- Frame 7: Anticipation (coiled back -2px Y)
o, b, d, e = getDownPixels(0, 0, true, false, -2)
buildFrame(7, o, b, d, e)

-- Frame 8: Dash (head lunges down +3px Y)
o, b, d, e = getDownPixels(0, 0, true, true, 3)
buildFrame(8, o, b, d, e)

-- Frame 9: Impact (max extension +5px Y, lightning line trailing)
o, b, d, e = getDownPixels(0, 0, true, true, 5)
buildFrame(9, o, b, d, e)

-- Frame 10: Recovery (recoil to +1px Y)
o, b, d, e = getDownPixels(0, 0, false, false, 1)
buildFrame(10, o, b, d, e)


--------------------------------------------------------------------------------
-- LEFT DIRECTION (Frames 11..20)
-- Creature facing left.
-- Left whisker = creature's left = foreground side (shorter 2px).
-- Right whisker = creature's right = background/upper side (longer 4px).
-- 3 nodes near tail before forked fin.
--------------------------------------------------------------------------------

local function getLeftPixels(shiftX, curveY, openMouth, attackDash, headXOffset)
  shiftX = shiftX or 0
  curveY = curveY or 0
  headXOffset = headXOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hx = 6 + shiftX + headXOffset
  local hy = 13 + curveY
  
  -- Broad Eel Head facing left (X: hx .. hx+5, Y: hy .. hy+5)
  for x = hx, hx+5 do
    for y = hy, hy+5 do
      if not ((x == hx or x == hx+5) and (y == hy or y == hy+5)) then
        local col = c_bmid
        if y == hy then col = c_blight
        elseif y == hy+5 then col = c_bdark
        elseif x == hx then col = c_gmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end
  
  -- Snout & chin highlights
  table.insert(det, {hx, hy+2, c_glight})
  table.insert(det, {hx, hy+3, c_glight})

  -- Left eye facing viewer (hx+2, hy+1)
  table.insert(det, {hx+2, hy+1, c_eye})
  table.insert(det, {hx+1, hy+1, c_cyan_mid})

  -- Whiskers:
  -- Left whisker (creature's left, foreground, shorter 2px): from (hx+1, hy+4) to (hx-1, hy+5)
  table.insert(det, {hx+1, hy+4, c_cyan_mid})
  table.insert(det, {hx-1, hy+5, c_cyan_bright})

  -- Right whisker (creature's right, background/top, longer 4px): from (hx+2, hy) extending up-left to (hx-2, hy-3)
  table.insert(det, {hx+2, hy, c_cyan_mid})
  table.insert(det, {hx, hy-1, c_cyan_mid})
  table.insert(det, {hx-1, hy-2, c_cyan_mid})
  table.insert(det, {hx-2, hy-3, c_cyan_bright})

  if openMouth then
    -- Open jaws
    table.insert(det, {hx, hy+3, c_out})
    table.insert(det, {hx+1, hy+3, c_out})
    table.insert(det, {hx, hy+4, c_cyan_bright})
    table.insert(det, {hx+1, hy+4, c_cyan_bright})
  end

  -- Serpentine Body extending right from head (hx+6 to hx+21)
  local pts = {
    {hx+6, hy+2, 6},
    {hx+7, hy+2, 6},
    {hx+8, hy+1, 6},
    {hx+9, hy, 5},
    {hx+10, hy-1, 5},
    {hx+11, hy-1, 5},
    {hx+12, hy, 5},
    {hx+13, hy+1, 5},
    {hx+14, hy+2, 4},
    {hx+15, hy+3, 4},
    {hx+16, hy+3, 4},
    {hx+17, hy+2, 4},
    {hx+18, hy+1, 3},
    {hx+19, hy+1, 3},
    {hx+20, hy+2, 3},
    {hx+21, hy+2, 2}
  }

  for _, pt in ipairs(pts) do
    local px, py, w = pt[1], pt[2], pt[3]
    if px <= 30 then
      local half = math.floor(w / 2)
      for y = py - half, py - half + w - 1 do
        if y >= 1 and y <= 30 then
          local col = c_bmid
          if y == py - half then col = c_blight
          elseif y == py - half + w - 1 then col = c_bdark
          end
          table.insert(body, {px, y, col})
        end
      end
      -- Dorsal fin along top edge of spine
      table.insert(det, {px, py - math.floor(w/2), c_cyan_mid})
    end
  end

  -- 3 Bright Cyan Tail Nodes (at hx+17, hx+19, hx+21)
  if hx+17 <= 30 then table.insert(det, {hx+17, hy+2, c_cyan_bright}) end
  if hx+19 <= 30 then table.insert(det, {hx+19, hy+1, c_cyan_bright}) end
  if hx+21 <= 30 then table.insert(det, {hx+21, hy+2, c_cyan_bright}) end

  -- Forked Tail Fin at right end
  local tx = hx + 22
  local ty = hy + 2
  if tx <= 30 then
    table.insert(det, {tx, ty-1, c_cyan_mid})
    table.insert(det, {tx, ty+1, c_cyan_mid})
  end
  if tx+1 <= 31 then
    table.insert(det, {tx+1, ty-2, c_cyan_bright})
    table.insert(det, {tx+1, ty+2, c_cyan_bright})
  end

  if attackDash then
    -- Electric cyan lightning line trailing behind head to the right
    for x = hx+4, hx+16 do
      if x >= 1 and x <= 31 then
        table.insert(eff, {x, hy+2, c_cyan_bright})
        table.insert(eff, {x, hy+3, c_cyan_mid})
      end
    end
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Left Frames (11..20)
-- 11..12: Idle
o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(11, o, b, d, e)

o, b, d, e = getLeftPixels(0, 1, false, false, 0)
buildFrame(12, o, b, d, e)

-- 13..16: Walk
o, b, d, e = getLeftPixels(0, -1, false, false, 0)
buildFrame(13, o, b, d, e)

o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(14, o, b, d, e)

o, b, d, e = getLeftPixels(0, 1, false, false, 0)
buildFrame(15, o, b, d, e)

o, b, d, e = getLeftPixels(0, 0, false, false, 0)
buildFrame(16, o, b, d, e)

-- 17..20: Attack (Lunge dash left)
-- Frame 17: Anticipation (coiled right +2px X)
o, b, d, e = getLeftPixels(0, 0, true, false, 2)
buildFrame(17, o, b, d, e)

-- Frame 18: Dash (head lunges left -3px X)
o, b, d, e = getLeftPixels(0, 0, true, true, -3)
buildFrame(18, o, b, d, e)

-- Frame 19: Impact (max extension -4px X, lightning lane)
o, b, d, e = getLeftPixels(0, 0, true, true, -4)
buildFrame(19, o, b, d, e)

-- Frame 20: Recovery (recoil to -1px X)
o, b, d, e = getLeftPixels(0, 0, false, false, -1)
buildFrame(20, o, b, d, e)


--------------------------------------------------------------------------------
-- RIGHT DIRECTION (Frames 21..30)
-- Creature facing right.
-- Right whisker = creature's right = foreground side (longer 4px).
-- Left whisker = creature's left = background/upper side (shorter 2px).
-- 3 nodes near tail before forked fin.
--------------------------------------------------------------------------------

local function getRightPixels(shiftX, curveY, openMouth, attackDash, headXOffset)
  shiftX = shiftX or 0
  curveY = curveY or 0
  headXOffset = headXOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hx = 20 + shiftX + headXOffset
  local hy = 13 + curveY
  
  -- Broad Eel Head facing right (X: hx-5 .. hx, Y: hy .. hy+5)
  for x = hx-5, hx do
    for y = hy, hy+5 do
      if not ((x == hx-5 or x == hx) and (y == hy or y == hy+5)) then
        local col = c_bmid
        if y == hy then col = c_blight
        elseif y == hy+5 then col = c_bdark
        elseif x == hx then col = c_gmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end
  
  -- Snout & chin highlights
  table.insert(det, {hx, hy+2, c_glight})
  table.insert(det, {hx, hy+3, c_glight})

  -- Right eye facing viewer (hx-2, hy+1)
  table.insert(det, {hx-2, hy+1, c_eye})
  table.insert(det, {hx-1, hy+1, c_cyan_mid})

  -- Whiskers:
  -- Right whisker (creature's right, foreground, longer 4px): from (hx-1, hy+4) extending down-right to (hx+3, hy+6)
  table.insert(det, {hx-1, hy+4, c_cyan_mid})
  table.insert(det, {hx+1, hy+5, c_cyan_mid})
  table.insert(det, {hx+2, hy+5, c_cyan_mid})
  table.insert(det, {hx+3, hy+6, c_cyan_bright})

  -- Left whisker (creature's left, background/top, shorter 2px): from (hx-2, hy) extending up-right to (hx, hy-1)
  table.insert(det, {hx-2, hy, c_cyan_mid})
  table.insert(det, {hx, hy-1, c_cyan_bright})

  if openMouth then
    -- Open jaws
    table.insert(det, {hx, hy+3, c_out})
    table.insert(det, {hx-1, hy+3, c_out})
    table.insert(det, {hx, hy+4, c_cyan_bright})
    table.insert(det, {hx-1, hy+4, c_cyan_bright})
  end

  -- Serpentine Body extending left from head (hx-6 to hx-21)
  local pts = {
    {hx-6, hy+2, 6},
    {hx-7, hy+2, 6},
    {hx-8, hy+1, 6},
    {hx-9, hy, 5},
    {hx-10, hy-1, 5},
    {hx-11, hy-1, 5},
    {hx-12, hy, 5},
    {hx-13, hy+1, 5},
    {hx-14, hy+2, 4},
    {hx-15, hy+3, 4},
    {hx-16, hy+3, 4},
    {hx-17, hy+2, 4},
    {hx-18, hy+1, 3},
    {hx-19, hy+1, 3},
    {hx-20, hy+2, 3},
    {hx-21, hy+2, 2}
  }

  for _, pt in ipairs(pts) do
    local px, py, w = pt[1], pt[2], pt[3]
    if px >= 1 then
      local half = math.floor(w / 2)
      for y = py - half, py - half + w - 1 do
        if y >= 1 and y <= 30 then
          local col = c_bmid
          if y == py - half then col = c_blight
          elseif y == py - half + w - 1 then col = c_bdark
          end
          table.insert(body, {px, y, col})
        end
      end
      -- Dorsal fin along top edge of spine
      table.insert(det, {px, py - math.floor(w/2), c_cyan_mid})
    end
  end

  -- 3 Bright Cyan Tail Nodes (at hx-17, hx-19, hx-21)
  if hx-17 >= 1 then table.insert(det, {hx-17, hy+2, c_cyan_bright}) end
  if hx-19 >= 1 then table.insert(det, {hx-19, hy+1, c_cyan_bright}) end
  if hx-21 >= 1 then table.insert(det, {hx-21, hy+2, c_cyan_bright}) end

  -- Forked Tail Fin at left end
  local tx = hx - 22
  local ty = hy + 2
  if tx >= 1 then
    table.insert(det, {tx, ty-1, c_cyan_mid})
    table.insert(det, {tx, ty+1, c_cyan_mid})
  end
  if tx-1 >= 1 then
    table.insert(det, {tx-1, ty-2, c_cyan_bright})
    table.insert(det, {tx-1, ty+2, c_cyan_bright})
  end

  if attackDash then
    -- Electric cyan lightning line trailing behind head to the left
    for x = hx-16, hx-4 do
      if x >= 1 and x <= 31 then
        table.insert(eff, {x, hy+2, c_cyan_bright})
        table.insert(eff, {x, hy+3, c_cyan_mid})
      end
    end
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Right Frames (21..30)
-- 21..22: Idle
o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(21, o, b, d, e)

o, b, d, e = getRightPixels(0, 1, false, false, 0)
buildFrame(22, o, b, d, e)

-- 23..26: Walk
o, b, d, e = getRightPixels(0, -1, false, false, 0)
buildFrame(23, o, b, d, e)

o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(24, o, b, d, e)

o, b, d, e = getRightPixels(0, 1, false, false, 0)
buildFrame(25, o, b, d, e)

o, b, d, e = getRightPixels(0, 0, false, false, 0)
buildFrame(26, o, b, d, e)

-- 27..30: Attack (Lunge dash right)
-- Frame 27: Anticipation (coiled left -2px X)
o, b, d, e = getRightPixels(0, 0, true, false, -2)
buildFrame(27, o, b, d, e)

-- Frame 28: Dash (head lunges right +3px X)
o, b, d, e = getRightPixels(0, 0, true, true, 3)
buildFrame(28, o, b, d, e)

-- Frame 29: Impact (max extension +4px X, lightning lane)
o, b, d, e = getRightPixels(0, 0, true, true, 4)
buildFrame(29, o, b, d, e)

-- Frame 30: Recovery (recoil to +1px X)
o, b, d, e = getRightPixels(0, 0, false, false, 1)
buildFrame(30, o, b, d, e)


--------------------------------------------------------------------------------
-- UP DIRECTION (Frames 31..40)
-- Creature facing up.
-- Back of head visible at top.
-- Left whisker = creature's left = viewer's LEFT (shorter 2px).
-- Right whisker = creature's right = viewer's RIGHT (longer 4px).
-- Dorsal fin running down center spine.
-- 3 nodes near tail.
--------------------------------------------------------------------------------

local function getUpPixels(shiftY, curveX, openMouth, attackDash, headYOffset)
  shiftY = shiftY or 0
  curveX = curveX or 0
  headYOffset = headYOffset or 0
  
  local body = {}
  local det = {}
  local eff = {}
  
  local hy = 6 + shiftY + headYOffset
  
  -- Broad Eel Head back view (Y: hy .. hy+5, X: 11..20)
  for y = hy, hy+5 do
    for x = 11, 20 do
      if not ((y == hy or y == hy+5) and (x == 11 or x == 20)) then
        local col = c_bmid
        if x == 11 or x == 20 then col = c_bdark
        elseif y == hy then col = c_bdark
        elseif y == hy+5 then col = c_gmid
        end
        table.insert(body, {x, y, col})
      end
    end
  end
  
  -- Dorsal fin starting at top center of head (X=15..16, Y=hy..hy+5)
  table.insert(det, {15, hy, c_cyan_mid})
  table.insert(det, {16, hy, c_cyan_mid})
  table.insert(det, {15, hy+1, c_cyan_bright})
  table.insert(det, {16, hy+1, c_cyan_mid})

  -- Whiskers extending forward/up from mouth sides:
  -- Creature's left whisker (viewer's LEFT, shorter 2px): from (10, hy+2) to (9, hy+1)
  table.insert(det, {10, hy+2, c_cyan_mid})
  table.insert(det, {9, hy+1, c_cyan_bright})

  -- Creature's right whisker (viewer's RIGHT, longer 4px): from (21, hy+2) to (24, hy)
  table.insert(det, {21, hy+2, c_cyan_mid})
  table.insert(det, {22, hy+1, c_cyan_mid})
  table.insert(det, {23, hy+1, c_cyan_mid})
  table.insert(det, {24, hy, c_cyan_bright})

  -- Serpentine Body extending down from head (hy+6 to hy+21)
  local pts = {
    {hy+6, 15+curveX, 6},
    {hy+7, 15+curveX, 6},
    {hy+8, 16+curveX, 6},
    {hy+9, 16+curveX, 5},
    {hy+10, 17+math.floor(curveX*0.5), 5},
    {hy+11, 17+math.floor(curveX*0.5), 5},
    {hy+12, 17, 5},
    {hy+13, 16, 5},
    {hy+14, 15, 4},
    {hy+15, 14-curveX, 4},
    {hy+16, 13-curveX, 4},
    {hy+17, 13-curveX, 4},
    {hy+18, 12-curveX, 3},
    {hy+19, 12-curveX, 3},
    {hy+20, 11-curveX, 3},
    {hy+21, 11-curveX, 2}
  }

  for _, pt in ipairs(pts) do
    local py, px, w = pt[1], pt[2], pt[3]
    if py <= 30 then
      local half = math.floor(w / 2)
      for x = px - half, px - half + w - 1 do
        if x >= 1 and x <= 30 then
          local col = c_bmid
          if x == px - half then col = c_bdark
          elseif x == px - half + w - 1 then col = c_blight
          end
          table.insert(body, {x, py, col})
        end
      end
      -- Dorsal fin along center spine
      if py <= hy+16 then
        table.insert(det, {px, py, c_cyan_mid})
      end
    end
  end

  -- 3 Bright Cyan Tail Nodes near tail (at hy+17, hy+19, hy+21)
  if hy+17 <= 30 then table.insert(det, {13-curveX, hy+17, c_cyan_bright}) end
  if hy+19 <= 30 then table.insert(det, {12-curveX, hy+19, c_cyan_bright}) end
  if hy+21 <= 30 then table.insert(det, {11-curveX, hy+21, c_cyan_bright}) end

  -- Forked Tail Fin at bottom
  local ty = hy + 22
  local tx = 11 - curveX
  if ty <= 30 then
    table.insert(det, {tx-1, ty, c_cyan_mid})
    table.insert(det, {tx+1, ty, c_cyan_mid})
  end
  if ty+1 <= 31 then
    table.insert(det, {tx-2, ty+1, c_cyan_bright})
    table.insert(det, {tx+2, ty+1, c_cyan_bright})
  end

  if attackDash then
    -- Electric cyan lightning line trailing behind head downwards
    for y = hy+4, hy+18 do
      if y >= 1 and y <= 31 then
        table.insert(eff, {15, y, c_cyan_bright})
        table.insert(eff, {16, y, c_cyan_mid})
      end
    end
  end

  local out = autoOutline(body, det)
  return out, body, det, eff
end

-- Generate Up Frames (31..40)
-- 31..32: Idle
o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(31, o, b, d, e)

o, b, d, e = getUpPixels(0, 1, false, false, 0)
buildFrame(32, o, b, d, e)

-- 33..36: Walk
o, b, d, e = getUpPixels(0, -2, false, false, 0)
buildFrame(33, o, b, d, e)

o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(34, o, b, d, e)

o, b, d, e = getUpPixels(0, 2, false, false, 0)
buildFrame(35, o, b, d, e)

o, b, d, e = getUpPixels(0, 0, false, false, 0)
buildFrame(36, o, b, d, e)

-- 37..40: Attack (Lunge dash up)
-- Frame 37: Anticipation (coiled back +2px Y)
o, b, d, e = getUpPixels(0, 0, true, false, 2)
buildFrame(37, o, b, d, e)

-- Frame 38: Dash (head lunges up -3px Y)
o, b, d, e = getUpPixels(0, 0, true, true, -3)
buildFrame(38, o, b, d, e)

-- Frame 39: Impact (max extension -5px Y, lightning line trailing)
o, b, d, e = getUpPixels(0, 0, true, true, -5)
buildFrame(39, o, b, d, e)

-- Frame 40: Recovery (recoil to -1px Y)
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
print("SUCCESSFULLY_CREATED_GLOOMFIN_EEL")
