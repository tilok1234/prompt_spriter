
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-bogbelly-croaker/source.aseprite"

-- Setup palette (12 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(13)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=24, g=28, b=16, a=255 },     -- 1: c_out (dark muddy olive outline)
  Color{ r=50, g=38, b=24, a=255 },      -- 2: c_dark_mud (muddy dark brown)
  Color{ r=95, g=75, b=48, a=255 },      -- 3: c_mid_mud (muddy mid brown)
  Color{ r=45, g=68, b=30, a=255 },      -- 4: c_dark_olive (dark olive green skin)
  Color{ r=82, g=118, b=48, a=255 },     -- 5: c_mid_olive (mid olive green skin)
  Color{ r=132, g=175, b=75, a=255 },    -- 6: c_light_olive (light olive green skin)
  Color{ r=140, g=125, b=55, a=255 },    -- 7: c_pouch_dark (dark yellow-tan throat pouch)
  Color{ r=215, g=195, b=95, a=255 },    -- 8: c_pouch_light (pale yellow throat pouch)
  Color{ r=245, g=235, b=155, a=255 },   -- 9: c_pouch_hi (bright pale yellow highlight)
  Color{ r=105, g=90, b=40, a=255 },     -- 10: c_reed (reed eyebrow growth)
  Color{ r=35, g=15, b=10, a=255 },      -- 11: c_eye (eye & dark wart cluster above left eye)
  Color{ r=160, g=220, b=60, a=255 }     -- 12: c_toxic_slime (toxic bubble green/yellow)
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
local c_trans = colors[1]
local c_out   = colors[2]
local c_dmud  = colors[3]
local c_mmud  = colors[4]
local c_doliv = colors[5]
local c_moliv = colors[6]
local c_loliv = colors[7]
local c_pdark = colors[8]
local c_plight= colors[9]
local c_phi   = colors[10]
local c_reed  = colors[11]
local c_eye   = colors[12]
local c_slime = colors[13]

local function setPixel(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawRect(img, x1, y1, x2, y2, col)
  for y=y1,y2 do
    for x=x1,x2 do
      setPixel(img, x, y, col)
    end
  end
end

local function drawCircle(img, cx, cy, r, col)
  for y=cy-r,cy+r do
    for x=cx-r,cx+r do
      if (x-cx)*(x-cx) + (y-cy)*(y-cy) <= r*r then
        setPixel(img, x, y, col)
      end
    end
  end
end

-- Function to build a frame
local function buildFrame(f, outlinePixels, bodyPixels, detailPixels, effectPixels)
  local imgOut = Image(32, 32, ColorMode.RGB)
  for _, p in ipairs(outlinePixels) do setPixel(imgOut, p[1], p[2], p[3]) end
  spr:newCel(layerOutline, f, imgOut)

  local imgBody = Image(32, 32, ColorMode.RGB)
  for _, p in ipairs(bodyPixels) do setPixel(imgBody, p[1], p[2], p[3]) end
  spr:newCel(layerBody, f, imgBody)

  local imgDet = Image(32, 32, ColorMode.RGB)
  for _, p in ipairs(detailPixels) do setPixel(imgDet, p[1], p[2], p[3]) end
  spr:newCel(layerDetails, f, imgDet)

  local imgEff = Image(32, 32, ColorMode.RGB)
  if effectPixels then
    for _, p in ipairs(effectPixels) do setPixel(imgEff, p[1], p[2], p[3]) end
  end
  spr:newCel(layerEffects, f, imgEff)
end

--------------------------------------------------------------------------------
-- DOWN DIRECTION (Frames 1..10)
--------------------------------------------------------------------------------
-- Base Down Body Generator
local function getDownPixels(dy, pouchScale, mouthOpen, attackPose)
  dy = dy or 0
  pouchScale = pouchScale or 1
  mouthOpen = mouthOpen or false
  attackPose = attackPose or 0

  local outP = {}
  local bodyP = {}
  local detP = {}

  -- 1. BODY (Round swollen frog body & legs)
  -- Main torso/head blob
  for y=13+dy,26+dy do
    for x=8,23 do
      table.insert(bodyP, {x, y, c_moliv})
    end
  end
  -- Shading on lower body
  for y=24+dy,26+dy do
    for x=9,22 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Highlights on upper body / head
  for y=13+dy,15+dy do
    for x=11,20 do
      table.insert(bodyP, {x, y, c_loliv})
    end
  end

  -- Mud back patches (top shoulders)
  for y=12+dy,14+dy do
    for x=10,21 do
      table.insert(bodyP, {x, y, c_mmud})
    end
  end
  for y=12+dy,13+dy do
    for x=13,18 do
      table.insert(bodyP, {x, y, c_dmud})
    end
  end

  -- Legs: Hind legs on sides
  local legY = 20 + dy
  for y=legY, legY+6 do
    -- Left hind leg
    table.insert(bodyP, {6, y, c_doliv})
    table.insert(bodyP, {7, y, c_moliv})
    -- Right hind leg
    table.insert(bodyP, {24, y, c_moliv})
    table.insert(bodyP, {25, y, c_doliv})
  end
  -- Feet flat on ground
  for x=4,8 do table.insert(bodyP, {x, 27+dy, c_doliv}) end
  for x=23,27 do table.insert(bodyP, {x, 27+dy, c_doliv}) end
  -- Front arms
  for y=21+dy, 26+dy do
    table.insert(bodyP, {9, y, c_doliv})
    table.insert(bodyP, {22, y, c_doliv})
  end
  for x=8,10 do table.insert(bodyP, {x, 27+dy, c_moliv}) end
  for x=21,23 do table.insert(bodyP, {x, 27+dy, c_moliv}) end

  -- 2. OUTLINE
  -- Top contour
  for x=9,22 do table.insert(outP, {x, 11+dy, c_out}) end
  -- Side contours
  for y=12+dy,26+dy do
    table.insert(outP, {5, y, c_out})
    table.insert(outP, {26, y, c_out})
  end
  -- Bottom feet contours
  for x=4,8 do table.insert(outP, {x, 28+dy, c_out}) end
  for x=23,27 do table.insert(outP, {x, 28+dy, c_out}) end
  for x=9,22 do table.insert(outP, {x, 27+dy, c_out}) end

  -- 3. DETAILS
  -- Throat Pouch (Yellow swollen chest)
  local px1, px2 = 12, 19
  local py1, py2 = 18+dy, 24+dy
  if pouchScale == 2 then -- swollen
    px1, px2 = 11, 20
    py1, py2 = 17+dy, 25+dy
  elseif pouchScale == 3 then -- massive inflation
    px1, px2 = 10, 21
    py1, py2 = 16+dy, 26+dy
  end

  for y=py1,py2 do
    for x=px1,px2 do
      table.insert(detP, {x, y, c_plight})
    end
  end
  -- Pouch highlight & shadow
  for x=px1+1,px2-1 do
    table.insert(detP, {x, py1, c_phi})
    table.insert(detP, {x, py2, c_pdark})
  end

  -- Mouth line / Open Mouth
  if mouthOpen then
    -- Dark open maw
    for y=15+dy,17+dy do
      for x=10,21 do
        table.insert(detP, {x, y, c_eye})
      end
    end
    -- Reddish/dark tongue inside
    for x=13,18 do table.insert(detP, {x, 17+dy, c_pdark}) end
  else
    -- Broad mouth line
    for x=9,22 do
      table.insert(detP, {x, 16+dy, c_out})
    end
  end

  -- Eyes: Left Eye (creature's left = viewer's right: X 20..22, Y 12..14)
  -- Right Eye (creature's right = viewer's left: X 9..11, Y 12..14)
  -- Right eye (viewer's left)
  table.insert(detP, {9, 13+dy, c_eye})
  table.insert(detP, {10, 13+dy, c_eye})
  table.insert(detP, {9, 12+dy, c_phi}) -- specular
  -- Left eye (viewer's right)
  table.insert(detP, {21, 13+dy, c_eye})
  table.insert(detP, {22, 13+dy, c_eye})
  table.insert(detP, {21, 12+dy, c_phi}) -- specular

  -- Reed Eyebrow Growths (above both eyes)
  -- Right eye reed (viewer's left)
  table.insert(detP, {9, 10+dy, c_reed})
  table.insert(detP, {10, 11+dy, c_reed})
  -- Left eye reed (viewer's right)
  table.insert(detP, {22, 10+dy, c_reed})
  table.insert(detP, {21, 11+dy, c_reed})

  -- DIRECTIONAL DETAIL: Dark wart cluster above creature's LEFT eye (viewer's RIGHT)
  table.insert(detP, {21, 9+dy, c_eye})
  table.insert(detP, {22, 9+dy, c_eye})
  table.insert(detP, {23, 10+dy, c_eye})

  return outP, bodyP, detP
end

-- Frame 1: Down Idle 1
do
  local o, b, d = getDownPixels(0, 1, false)
  buildFrame(1, o, b, d, nil)
end
-- Frame 2: Down Idle 2 (Breathing expansion)
do
  local o, b, d = getDownPixels(-1, 2, false)
  buildFrame(2, o, b, d, nil)
end

-- Down Walk 1..4 (Frames 3..6)
-- f3: crouch (-1px)
do
  local o, b, d = getDownPixels(1, 1, false)
  buildFrame(3, o, b, d, nil)
end
-- f4: jump up (-3px)
do
  local o, b, d = getDownPixels(-3, 1, false)
  buildFrame(4, o, b, d, nil)
end
-- f5: peak (-2px)
do
  local o, b, d = getDownPixels(-2, 1, false)
  buildFrame(5, o, b, d, nil)
end
-- f6: landing squish (+1px)
do
  local o, b, d = getDownPixels(1, 2, false)
  buildFrame(6, o, b, d, nil)
end

-- Down Attack 1..4 (Frames 7..10)
-- f7: Deep crouch + swelling throat
do
  local o, b, d = getDownPixels(1, 2, false)
  buildFrame(7, o, b, d, nil)
end
-- f8: Max inflation + open mouth
do
  local o, b, d = getDownPixels(-1, 3, true)
  buildFrame(8, o, b, d, nil)
end
-- f9: FIRE! Mouth wide open + 3 bubbling toxic projectiles launching
do
  local o, b, d = getDownPixels(0, 1, true)
  local eff = {
    -- Bubble 1 (left)
    {9, 6, c_slime}, {10, 6, c_slime}, {9, 7, c_slime}, {10, 7, c_phi},
    -- Bubble 2 (center high)
    {15, 3, c_slime}, {16, 3, c_slime}, {17, 3, c_slime}, {16, 4, c_phi},
    -- Bubble 3 (right)
    {22, 6, c_slime}, {23, 6, c_slime}, {22, 7, c_slime}, {23, 7, c_phi}
  }
  buildFrame(9, o, b, d, eff)
end
-- f10: Recovery, mouth closing, bubbles higher
do
  local o, b, d = getDownPixels(0, 1, false)
  local eff = {
    {8, 2, c_slime}, {9, 2, c_phi},
    {16, 0, c_slime}, {17, 0, c_phi},
    {23, 2, c_slime}, {24, 2, c_phi}
  }
  buildFrame(10, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- LEFT DIRECTION (Frames 11..20) (Facing Left towards X=0)
-- Creature's RIGHT side faces viewer; creature's LEFT eye is away/hidden.
--------------------------------------------------------------------------------
local function getLeftPixels(dy, pouchScale, mouthOpen)
  dy = dy or 0
  pouchScale = pouchScale or 1
  mouthOpen = mouthOpen or false

  local outP = {}
  local bodyP = {}
  local detP = {}

  -- Body blob facing left
  for y=13+dy,25+dy do
    for x=6,24 do
      table.insert(bodyP, {x, y, c_moliv})
    end
  end
  -- Back curve (right side of cell)
  for y=12+dy,24+dy do
    for x=15,24 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Mud on back
  for y=12+dy,15+dy do
    for x=14,23 do
      table.insert(bodyP, {x, y, c_mmud})
    end
  end
  for y=12+dy,14+dy do
    for x=16,21 do
      table.insert(bodyP, {x, y, c_dmud})
    end
  end

  -- Hind leg (big right muscle)
  for y=18+dy,27+dy do
    for x=16,25 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Hind foot
  for x=14,25 do table.insert(bodyP, {x, 27+dy, c_doliv}) end

  -- Front leg (left side of cell)
  for y=21+dy,27+dy do
    for x=7,11 do
      table.insert(bodyP, {x, y, c_moliv})
    end
  end

  -- Outline
  for x=6,23 do table.insert(outP, {x, 11+dy, c_out}) end
  for y=12+dy,27+dy do
    table.insert(outP, {5, y, c_out})
    table.insert(outP, {26, y, c_out})
  end
  for x=6,25 do table.insert(outP, {x, 28+dy, c_out}) end

  -- Throat Pouch (under head/chin facing lower-left X: 5..14, Y: 18..24)
  local px1, px2 = 6, 14
  local py1, py2 = 18+dy, 24+dy
  if pouchScale == 2 then
    px1, px2 = 5, 15
    py1, py2 = 17+dy, 25+dy
  elseif pouchScale == 3 then
    px1, px2 = 4, 16
    py1, py2 = 16+dy, 26+dy
  end
  for y=py1,py2 do
    for x=px1,px2 do
      table.insert(detP, {x, y, c_plight})
    end
  end
  for x=px1+1,px2-1 do
    table.insert(detP, {x, py1, c_phi})
    table.insert(detP, {x, py2, c_pdark})
  end

  -- Mouth line / Open Mouth (facing left)
  if mouthOpen then
    for y=15+dy,17+dy do
      for x=5,13 do
        table.insert(detP, {x, y, c_eye})
      end
    end
    for x=7,11 do table.insert(detP, {x, 17+dy, c_pdark}) end
  else
    for x=5,14 do table.insert(detP, {x, 16+dy, c_out}) end
  end

  -- Eye (Right eye visible facing left X: 8..10, Y: 12..14)
  table.insert(detP, {9, 13+dy, c_eye})
  table.insert(detP, {10, 13+dy, c_eye})
  table.insert(detP, {9, 12+dy, c_phi})

  -- Reed Eyebrow Growth (above right eye)
  table.insert(detP, {9, 10+dy, c_reed})
  table.insert(detP, {10, 11+dy, c_reed})

  -- Note: Creature's left eye with wart cluster is away/hidden when facing left.

  return outP, bodyP, detP
end

-- Frames 11..12: Left Idle
buildFrame(11, getLeftPixels(0, 1, false))
buildFrame(12, getLeftPixels(-1, 2, false))

-- Frames 13..16: Left Walk
buildFrame(13, getLeftPixels(1, 1, false))
buildFrame(14, getLeftPixels(-3, 1, false))
buildFrame(15, getLeftPixels(-2, 1, false))
buildFrame(16, getLeftPixels(1, 2, false))

-- Frames 17..20: Left Attack
buildFrame(17, getLeftPixels(1, 2, false))
buildFrame(18, getLeftPixels(-1, 3, true))
do
  local o, b, d = getLeftPixels(0, 1, true)
  local eff = {
    {2, 8, c_slime}, {3, 8, c_phi},
    {6, 3, c_slime}, {7, 3, c_phi},
    {12, 1, c_slime}, {13, 1, c_phi}
  }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 1, false)
  local eff = {
    {1, 3, c_slime}, {2, 3, c_phi},
    {5, 0, c_slime}, {6, 0, c_phi}
  }
  buildFrame(20, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- RIGHT DIRECTION (Frames 21..30) (Facing Right towards X=31)
-- Creature's LEFT side faces viewer!
-- Directional detail: Dark wart cluster above creature's LEFT eye MUST BE VISIBLE!
--------------------------------------------------------------------------------
local function getRightPixels(dy, pouchScale, mouthOpen)
  dy = dy or 0
  pouchScale = pouchScale or 1
  mouthOpen = mouthOpen or false

  local outP = {}
  local bodyP = {}
  local detP = {}

  -- Body blob facing right
  for y=13+dy,25+dy do
    for x=7,25 do
      table.insert(bodyP, {x, y, c_moliv})
    end
  end
  -- Back curve (left side of cell)
  for y=12+dy,24+dy do
    for x=7,16 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Mud on back
  for y=12+dy,15+dy do
    for x=8,17 do
      table.insert(bodyP, {x, y, c_mmud})
    end
  end
  for y=12+dy,14+dy do
    for x=10,15 do
      table.insert(bodyP, {x, y, c_dmud})
    end
  end

  -- Hind leg (big left muscle)
  for y=18+dy,27+dy do
    for x=6,15 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Hind foot
  for x=6,17 do table.insert(bodyP, {x, 27+dy, c_doliv}) end

  -- Front leg (right side of cell)
  for y=21+dy,27+dy do
    for x=20,24 do
      table.insert(bodyP, {x, y, c_moliv})
    end
  end

  -- Outline
  for x=8,25 do table.insert(outP, {x, 11+dy, c_out}) end
  for y=12+dy,27+dy do
    table.insert(outP, {5, y, c_out})
    table.insert(outP, {26, y, c_out})
  end
  for x=6,25 do table.insert(outP, {x, 28+dy, c_out}) end

  -- Throat Pouch (under head/chin facing lower-right X: 17..25, Y: 18..24)
  local px1, px2 = 17, 25
  local py1, py2 = 18+dy, 24+dy
  if pouchScale == 2 then
    px1, px2 = 16, 26
    py1, py2 = 17+dy, 25+dy
  elseif pouchScale == 3 then
    px1, px2 = 15, 27
    py1, py2 = 16+dy, 26+dy
  end
  for y=py1,py2 do
    for x=px1,px2 do
      table.insert(detP, {x, y, c_plight})
    end
  end
  for x=px1+1,px2-1 do
    table.insert(detP, {x, py1, c_phi})
    table.insert(detP, {x, py2, c_pdark})
  end

  -- Mouth line / Open Mouth (facing right)
  if mouthOpen then
    for y=15+dy,17+dy do
      for x=18,26 do
        table.insert(detP, {x, y, c_eye})
      end
    end
    for x=20,24 do table.insert(detP, {x, 17+dy, c_pdark}) end
  else
    for x=17,26 do table.insert(detP, {x, 16+dy, c_out}) end
  end

  -- Creature's LEFT Eye (visible on near side facing right X: 21..23, Y: 12..14)
  table.insert(detP, {22, 13+dy, c_eye})
  table.insert(detP, {23, 13+dy, c_eye})
  table.insert(detP, {22, 12+dy, c_phi})

  -- Reed Eyebrow Growth (above left eye)
  table.insert(detP, {22, 10+dy, c_reed})
  table.insert(detP, {23, 11+dy, c_reed})

  -- DIRECTIONAL DETAIL: Dark wart cluster above creature's LEFT eye
  table.insert(detP, {21, 9+dy, c_eye})
  table.insert(detP, {22, 9+dy, c_eye})
  table.insert(detP, {23, 9+dy, c_eye})

  return outP, bodyP, detP
end

-- Frames 21..22: Right Idle
buildFrame(21, getRightPixels(0, 1, false))
buildFrame(22, getRightPixels(-1, 2, false))

-- Frames 23..26: Right Walk
buildFrame(23, getRightPixels(1, 1, false))
buildFrame(24, getRightPixels(-3, 1, false))
buildFrame(25, getRightPixels(-2, 1, false))
buildFrame(26, getRightPixels(1, 2, false))

-- Frames 27..30: Right Attack
buildFrame(27, getRightPixels(1, 2, false))
buildFrame(28, getRightPixels(-1, 3, true))
do
  local o, b, d = getRightPixels(0, 1, true)
  local eff = {
    {29, 8, c_slime}, {28, 8, c_phi},
    {25, 3, c_slime}, {24, 3, c_phi},
    {19, 1, c_slime}, {18, 1, c_phi}
  }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 1, false)
  local eff = {
    {30, 3, c_slime}, {29, 3, c_phi},
    {26, 0, c_slime}, {25, 0, c_phi}
  }
  buildFrame(30, o, b, d, eff)
end


--------------------------------------------------------------------------------
-- UP DIRECTION (Frames 31..40) (Facing Up / Away)
-- Creature's back is visible.
-- Creature's LEFT side is on viewer's LEFT (X: 9..11)!
-- DIRECTIONAL DETAIL: Dark wart cluster above creature's LEFT eye on viewer's LEFT!
--------------------------------------------------------------------------------
local function getUpPixels(dy, attackPose)
  dy = dy or 0

  local outP = {}
  local bodyP = {}
  local detP = {}

  -- Main back body
  for y=12+dy,26+dy do
    for x=8,23 do
      table.insert(bodyP, {x, y, c_doliv})
    end
  end
  -- Mud covering upper/mid back
  for y=11+dy,22+dy do
    for x=9,22 do
      table.insert(bodyP, {x, y, c_mmud})
    end
  end
  for y=12+dy,19+dy do
    for x=11,20 do
      table.insert(bodyP, {x, y, c_dmud})
    end
  end

  -- Powerful rear legs on sides
  for y=18+dy,27+dy do
    table.insert(bodyP, {5, y, c_doliv})
    table.insert(bodyP, {6, y, c_moliv})
    table.insert(bodyP, {7, y, c_doliv})

    table.insert(bodyP, {24, y, c_doliv})
    table.insert(bodyP, {25, y, c_moliv})
    table.insert(bodyP, {26, y, c_doliv})
  end
  -- Feet
  for x=4,8 do table.insert(bodyP, {x, 27+dy, c_doliv}) end
  for x=23,27 do table.insert(bodyP, {x, 27+dy, c_doliv}) end

  -- Outline
  for x=8,23 do table.insert(outP, {x, 10+dy, c_out}) end
  for y=11+dy,27+dy do
    table.insert(outP, {4, y, c_out})
    table.insert(outP, {27, y, c_out})
  end
  for x=4,8 do table.insert(outP, {x, 28+dy, c_out}) end
  for x=23,27 do table.insert(outP, {x, 28+dy, c_out}) end
  for x=9,22 do table.insert(outP, {x, 27+dy, c_out}) end

  -- Tops of eyes & reed eyebrows visible over top rim
  -- Right eye top (viewer's right X: 20..22, Y: 11)
  table.insert(detP, {20, 11+dy, c_moliv})
  table.insert(detP, {21, 11+dy, c_moliv})
  table.insert(detP, {21, 10+dy, c_reed})

  -- Left eye top (viewer's left X: 9..11, Y: 11)
  table.insert(detP, {10, 11+dy, c_moliv})
  table.insert(detP, {11, 11+dy, c_moliv})
  table.insert(detP, {10, 10+dy, c_reed})

  -- DIRECTIONAL DETAIL: Dark wart cluster above creature's LEFT eye (viewer's LEFT: X 9..11, Y 9..10)
  table.insert(detP, {9, 9+dy, c_eye})
  table.insert(detP, {10, 9+dy, c_eye})
  table.insert(detP, {10, 8+dy, c_eye})

  return outP, bodyP, detP
end

-- Frames 31..32: Up Idle
buildFrame(31, getUpPixels(0, false))
buildFrame(32, getUpPixels(-1, false))

-- Frames 33..36: Up Walk
buildFrame(33, getUpPixels(1, false))
buildFrame(34, getUpPixels(-3, false))
buildFrame(35, getUpPixels(-2, false))
buildFrame(36, getUpPixels(1, false))

-- Frames 37..40: Up Attack
buildFrame(37, getUpPixels(1, false))
buildFrame(38, getUpPixels(-1, true))
do
  local o, b, d = getUpPixels(0, true)
  local eff = {
    {10, 3, c_slime}, {11, 3, c_phi},
    {16, 1, c_slime}, {17, 1, c_phi},
    {22, 3, c_slime}, {23, 3, c_phi}
  }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, false)
  local eff = {
    {9, 0, c_slime}, {10, 0, c_phi},
    {23, 0, c_slime}, {24, 0, c_phi}
  }
  buildFrame(40, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-bogbelly-croaker/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-bogbelly-croaker/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-bogbelly-croaker/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_BOGBELLY_CROAKER")
