import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-fenlight-moth";
mkdirSync(stagingDir, { recursive: true });

const luaScript = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette (10 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(11)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=16, g=24, b=28, a=255 },     -- 1: c_out (dark charcoal outline)
  Color{ r=32, g=44, b=48, a=255 },     -- 2: c_ch_d (charcoal body dark)
  Color{ r=56, g=72, b=78, a=255 },     -- 3: c_ch_m (charcoal body mid)
  Color{ r=20, g=80, b=85, a=255 },     -- 4: c_tl_d (teal wings dark)
  Color{ r=35, g=140, b=145, a=255 },   -- 5: c_tl_m (teal wings mid)
  Color{ r=65, g=195, b=190, a=255 },   -- 6: c_tl_l (teal wings light)
  Color{ r=120, g=160, b=40, a=255 },   -- 7: c_lm_d (pale lime lantern dark)
  Color{ r=185, g=225, b=75, a=255 },   -- 8: c_lm_l (pale lime lantern light / eyespot)
  Color{ r=230, g=250, b=180, a=255 },  -- 9: c_pwd (luminous powder highlight)
  Color{ r=100, g=115, b=120, a=255 }   -- 10: c_ch_l (charcoal body light / antennae)
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

local c_out  = colors[2]
local c_ch_d = colors[3]
local c_ch_m = colors[4]
local c_tl_d = colors[5]
local c_tl_m = colors[6]
local c_tl_l = colors[7]
local c_lm_d = colors[8]
local c_lm_l = colors[9]
local c_pwd  = colors[10]
local c_ch_l = colors[11]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawTriangle(img, x1, y1, x2, y2, x3, y3, col)
  local minX = math.max(0, math.floor(math.min(x1, x2, x3)))
  local maxX = math.min(31, math.ceil(math.max(x1, x2, x3)))
  local minY = math.max(0, math.floor(math.min(y1, y2, y3)))
  local maxY = math.min(31, math.ceil(math.max(y1, y2, y3)))

  for y = minY, maxY do
    for x = minX, maxX do
      local d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)
      local d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3)
      local d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1)
      local has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
      local has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
      if not (has_neg and has_pos) then
        img:drawPixel(x, y, col)
      end
    end
  end
end

local function drawCircle(img, cx, cy, r, col)
  for y = math.max(0, math.floor(cy - r)), math.min(31, math.ceil(cy + r)) do
    for x = math.max(0, math.floor(cx - r)), math.min(31, math.ceil(cx + r)) do
      local dx = x - cx
      local dy = y - cy
      if dx*dx + dy*dy <= r*r then
        img:drawPixel(x, y, col)
      end
    end
  end
end

local function buildFrame(f, outlineList, bodyList, detailsList, effectsList)
  local imgOutline = Image(32, 32, ColorMode.RGB)
  local imgBody = Image(32, 32, ColorMode.RGB)
  local imgDetails = Image(32, 32, ColorMode.RGB)
  local imgEffects = Image(32, 32, ColorMode.RGB)

  if outlineList then for _, p in ipairs(outlineList) do put(imgOutline, p[1], p[2], p[3]) end end
  if bodyList then for _, p in ipairs(bodyList) do put(imgBody, p[1], p[2], p[3]) end end
  if detailsList then for _, p in ipairs(detailsList) do put(imgDetails, p[1], p[2], p[3]) end end
  if effectsList then for _, p in ipairs(effectsList) do put(imgEffects, p[1], p[2], p[3]) end end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

--------------------------------------------------------------------------------
-- DOWN DIRECTION (facing forward/downward)
-- Anatomical Left = Viewer Right, Anatomical Right = Viewer Left
--------------------------------------------------------------------------------
local function getDownPixels(wingOffset, poseShift, lanternGlow)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local wo = wingOffset or 0

  -- 1. Outline
  -- Left wing outline (viewer right)
  table.insert(o, {16, 12+sy, c_out}); table.insert(o, {28+wo, 8+sy, c_out}); table.insert(o, {30+wo, 18+sy, c_out})
  for x=16, 28+wo do table.insert(o, {x, 11+math.floor((x-16)*-0.25)+sy, c_out}) end
  for x=16, 30+wo do table.insert(o, {x, 19+sy, c_out}) end
  for y=8, 18 do table.insert(o, {29+wo, y+sy, c_out}) end

  -- Right wing outline (viewer left)
  table.insert(o, {15, 12+sy, c_out}); table.insert(o, {3-wo, 8+sy, c_out}); table.insert(o, {1-wo, 18+sy, c_out})
  for x=3-wo, 15 do table.insert(o, {x, 8+math.floor((15-x)*0.25)+sy, c_out}) end
  for x=1-wo, 15 do table.insert(o, {x, 19+sy, c_out}) end
  for y=8, 18 do table.insert(o, {2-wo, y+sy, c_out}) end

  -- Body & Lantern outline
  table.insert(o, {15, 9+sy, c_out}); table.insert(o, {16, 9+sy, c_out})
  table.insert(o, {14, 18+sy, c_out}); table.insert(o, {17, 18+sy, c_out})
  table.insert(o, {13, 22+sy, c_out}); table.insert(o, {18, 22+sy, c_out})
  table.insert(o, {15, 25+sy, c_out}); table.insert(o, {16, 25+sy, c_out})

  -- 2. Body
  -- Wings Body fill (Teal mid / dark)
  -- Left Wing
  for y=12, 18 do
    for x=16, 28+wo - math.floor(math.abs(y-15)*1.2) do
      table.insert(b, {x, y+sy, (y < 15) and c_tl_m or c_tl_d})
    end
  end
  -- Right Wing
  for y=12, 18 do
    for x=3-wo + math.floor(math.abs(y-15)*1.2), 15 do
      table.insert(b, {x, y+sy, (y < 15) and c_tl_m or c_tl_d})
    end
  end

  -- Central body & thorax (Charcoal)
  for y=10, 17 do
    table.insert(b, {15, y+sy, c_ch_m})
    table.insert(b, {16, y+sy, c_ch_m})
  end

  -- Lantern abdomen (Pale lime bulb)
  local l_col = lanternGlow and c_pwd or c_lm_l
  for y=18, 24 do
    for x=14, 17 do
      table.insert(b, {x, y+sy, (x==15 or x==16) and l_col or c_lm_d})
    end
  end

  -- 3. Details
  -- Head eyes & Antennae
  table.insert(d, {14, 10+sy, c_ch_d}); table.insert(d, {17, 10+sy, c_ch_d}) -- Eyes
  table.insert(d, {13, 8+sy, c_ch_l}); table.insert(d, {12, 6+sy, c_ch_l}); table.insert(d, {11, 4+sy, c_ch_l}) -- Left antennae (viewer left)
  table.insert(d, {18, 8+sy, c_ch_l}); table.insert(d, {19, 6+sy, c_ch_l}); table.insert(d, {20, 4+sy, c_ch_l}) -- Right antennae (viewer right)

  -- Wing Highlights
  table.insert(d, {22+wo, 12+sy, c_tl_l}); table.insert(d, {23+wo, 12+sy, c_tl_l})
  table.insert(d, {9-wo, 12+sy, c_tl_l}); table.insert(d, {8-wo, 12+sy, c_tl_l})

  -- WING EYE-SPOT ASYMMETRY:
  -- Anatomical Left Wing (viewer right, x=23): COMPLETE eye marking (circle of lime with dark center)
  table.insert(d, {22+wo, 15+sy, c_lm_l}); table.insert(d, {23+wo, 15+sy, c_lm_l}); table.insert(d, {24+wo, 15+sy, c_lm_l})
  table.insert(d, {22+wo, 16+sy, c_lm_l}); table.insert(d, {23+wo, 16+sy, c_ch_d}); table.insert(d, {24+wo, 16+sy, c_lm_l})
  table.insert(d, {22+wo, 17+sy, c_lm_l}); table.insert(d, {23+wo, 17+sy, c_lm_l}); table.insert(d, {24+wo, 17+sy, c_lm_l})

  -- Anatomical Right Wing (viewer left, x=8): BROKEN eye marking (missing top half, only bottom arc)
  table.insert(d, {7-wo, 16+sy, c_lm_l}); table.insert(d, {8-wo, 16+sy, c_ch_d}) -- missing top
  table.insert(d, {7-wo, 17+sy, c_lm_l}); table.insert(d, {8-wo, 17+sy, c_lm_l}); table.insert(d, {9-wo, 17+sy, c_lm_l})

  return o, b, d
end

-- Frames 1..10: Down
buildFrame(1, getDownPixels(0, 0, false))
buildFrame(2, getDownPixels(1, 1, false))

buildFrame(3, getDownPixels(0, 0, false))
buildFrame(4, getDownPixels(-1, -1, false))
buildFrame(5, getDownPixels(1, 1, false))
buildFrame(6, getDownPixels(0, 0, false))

buildFrame(7, getDownPixels(-1, -2, true)) -- Attack f1: anticipation flare
do
  local o, b, d = getDownPixels(1, 0, true)
  local eff = {
    {11, 25, c_lm_l}, {12, 26, c_pwd}, {19, 25, c_lm_l}, {20, 26, c_pwd}
  }
  buildFrame(8, o, b, d, eff) -- Attack f2: pair lights release
end
do
  local o, b, d = getDownPixels(0, 1, false)
  local eff = {
    {9, 27, c_lm_l}, {10, 28, c_pwd}, {21, 27, c_lm_l}, {22, 28, c_pwd},
    {11, 26, c_pwd}, {19, 26, c_pwd}
  }
  buildFrame(9, o, b, d, eff) -- Attack f3: pair lights travel down
end
do
  local o, b, d = getDownPixels(0, 0, false)
  local eff = {
    {7, 30, c_lm_l}, {8, 30, c_pwd}, {23, 30, c_lm_l}, {24, 30, c_pwd}
  }
  buildFrame(10, o, b, d, eff) -- Attack f4: lights fade
end

--------------------------------------------------------------------------------
-- LEFT DIRECTION (facing left)
-- Anatomical Right = Foreground (viewer side), Anatomical Left = Background
--------------------------------------------------------------------------------
local function getLeftPixels(wingOffset, poseShift, lanternGlow)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local wo = wingOffset or 0

  -- Outline
  table.insert(o, {8, 12+sy, c_out}); table.insert(o, {7, 13+sy, c_out}) -- Head outline facing left
  for x=12, 24 do table.insert(o, {x, 12+sy, c_out}); table.insert(o, {x, 20+sy, c_out}) end
  table.insert(o, {25, 16+sy, c_out})

  -- Foreground Right Wing Outline (triangular shape)
  table.insert(o, {8, 7+sy-wo, c_out}); table.insert(o, {23, 6+sy-wo, c_out})
  for x=8, 23 do table.insert(o, {x, 15+sy, c_out}) end

  -- Body fill (Charcoal thorax, Pale lime lantern abdomen)
  for x=11, 16 do for y=13, 17 do table.insert(b, {x, y+sy, c_ch_m}) end end
  local l_col = lanternGlow and c_pwd or c_lm_l
  for x=17, 24 do for y=14, 19 do table.insert(b, {x, y+sy, (y==15 or y==16) and l_col or c_lm_d}) end end

  -- Background Left Wing (Peeking above body, showing COMPLETE eye spot tip)
  for x=14, 20 do for y=4-wo, 7-wo do table.insert(b, {x, y+sy, c_tl_d}) end end
  table.insert(d, {17, 5-wo+sy, c_lm_l}); table.insert(d, {18, 5-wo+sy, c_lm_l}) -- Complete spot peek

  -- Foreground Right Wing Body Fill (Teal)
  for y=7-wo, 14 do
    for x=9, 22 - math.floor(math.abs(y-10)*0.8) do
      table.insert(b, {x, y+sy, c_tl_m})
    end
  end

  -- Head & Antennae Details
  table.insert(d, {8, 13+sy, c_ch_d}) -- Eye facing left
  table.insert(d, {7, 10+sy, c_ch_l}); table.insert(d, {6, 8+sy, c_ch_l}); table.insert(d, {5, 6+sy, c_ch_l}) -- Antenna forward-left

  -- Foreground Right Wing Details: BROKEN EYE MARKING (half arc / split)
  table.insert(d, {13, 11+sy-wo, c_lm_l}); table.insert(d, {14, 11+sy-wo, c_ch_d})
  table.insert(d, {13, 12+sy-wo, c_lm_l}); table.insert(d, {14, 12+sy-wo, c_lm_l})

  return o, b, d
end

-- Frames 11..20: Left
buildFrame(11, getLeftPixels(0, 0, false))
buildFrame(12, getLeftPixels(1, 1, false))

buildFrame(13, getLeftPixels(0, 0, false))
buildFrame(14, getLeftPixels(-1, -1, false))
buildFrame(15, getLeftPixels(1, 1, false))
buildFrame(16, getLeftPixels(0, 0, false))

buildFrame(17, getLeftPixels(-1, -2, true))
do
  local o, b, d = getLeftPixels(1, 0, true)
  local eff = { {5, 14, c_lm_l}, {4, 15, c_pwd}, {5, 17, c_lm_l}, {4, 18, c_pwd} }
  buildFrame(18, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 1, false)
  local eff = { {2, 13, c_lm_l}, {1, 14, c_pwd}, {2, 18, c_lm_l}, {1, 19, c_pwd} }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 0, false)
  local eff = { {0, 12, c_pwd}, {0, 20, c_pwd} }
  buildFrame(20, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- RIGHT DIRECTION (facing right)
-- Anatomical Left = Foreground (viewer side), Anatomical Right = Background
--------------------------------------------------------------------------------
local function getRightPixels(wingOffset, poseShift, lanternGlow)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local wo = wingOffset or 0

  -- Outline
  table.insert(o, {23, 12+sy, c_out}); table.insert(o, {24, 13+sy, c_out}) -- Head outline facing right
  for x=7, 19 do table.insert(o, {x, 12+sy, c_out}); table.insert(o, {x, 20+sy, c_out}) end
  table.insert(o, {6, 16+sy, c_out})

  -- Foreground Left Wing Outline (triangular shape)
  table.insert(o, {8, 6+sy-wo, c_out}); table.insert(o, {23, 7+sy-wo, c_out})
  for x=8, 23 do table.insert(o, {x, 15+sy, c_out}) end

  -- Body fill (Charcoal thorax, Pale lime lantern abdomen)
  for x=15, 20 do for y=13, 17 do table.insert(b, {x, y+sy, c_ch_m}) end end
  local l_col = lanternGlow and c_pwd or c_lm_l
  for x=7, 14 do for y=14, 19 do table.insert(b, {x, y+sy, (y==15 or y==16) and l_col or c_lm_d}) end end

  -- Background Right Wing (Peeking above body, showing BROKEN eye spot tip)
  for x=11, 17 do for y=4-wo, 7-wo do table.insert(b, {x, y+sy, c_tl_d}) end end
  table.insert(d, {14, 5-wo+sy, c_lm_l}) -- Broken spot peek

  -- Foreground Left Wing Body Fill (Teal)
  for y=7-wo, 14 do
    for x=9, 22 - math.floor(math.abs(y-10)*0.8) do
      table.insert(b, {x, y+sy, c_tl_m})
    end
  end

  -- Head & Antennae Details
  table.insert(d, {23, 13+sy, c_ch_d}) -- Eye facing right
  table.insert(d, {24, 10+sy, c_ch_l}); table.insert(d, {25, 8+sy, c_ch_l}); table.insert(d, {26, 6+sy, c_ch_l}) -- Antenna forward-right

  -- Foreground Left Wing Details: COMPLETE EYE MARKING (full circle with dark center)
  table.insert(d, {17, 10+sy-wo, c_lm_l}); table.insert(d, {18, 10+sy-wo, c_lm_l}); table.insert(d, {19, 10+sy-wo, c_lm_l})
  table.insert(d, {17, 11+sy-wo, c_lm_l}); table.insert(d, {18, 11+sy-wo, c_ch_d}); table.insert(d, {19, 11+sy-wo, c_lm_l})
  table.insert(d, {17, 12+sy-wo, c_lm_l}); table.insert(d, {18, 12+sy-wo, c_lm_l}); table.insert(d, {19, 12+sy-wo, c_lm_l})

  return o, b, d
end

-- Frames 21..30: Right
buildFrame(21, getRightPixels(0, 0, false))
buildFrame(22, getRightPixels(1, 1, false))

buildFrame(23, getRightPixels(0, 0, false))
buildFrame(24, getRightPixels(-1, -1, false))
buildFrame(25, getRightPixels(1, 1, false))
buildFrame(26, getRightPixels(0, 0, false))

buildFrame(27, getRightPixels(-1, -2, true))
do
  local o, b, d = getRightPixels(1, 0, true)
  local eff = { {26, 14, c_lm_l}, {27, 15, c_pwd}, {26, 17, c_lm_l}, {27, 18, c_pwd} }
  buildFrame(28, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 1, false)
  local eff = { {29, 13, c_lm_l}, {30, 14, c_pwd}, {29, 18, c_lm_l}, {30, 19, c_pwd} }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 0, false)
  local eff = { {31, 12, c_pwd}, {31, 20, c_pwd} }
  buildFrame(30, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- UP DIRECTION (facing away/upward)
-- Anatomical Left = Viewer Left, Anatomical Right = Viewer Right
--------------------------------------------------------------------------------
local function getUpPixels(wingOffset, poseShift, lanternGlow)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local wo = wingOffset or 0

  -- Wings Outline
  -- Left wing outline (viewer left)
  table.insert(o, {15, 12+sy, c_out}); table.insert(o, {3-wo, 8+sy, c_out}); table.insert(o, {1-wo, 18+sy, c_out})
  for x=3-wo, 15 do table.insert(o, {x, 8+math.floor((15-x)*0.25)+sy, c_out}) end
  for x=1-wo, 15 do table.insert(o, {x, 19+sy, c_out}) end
  for y=8, 18 do table.insert(o, {2-wo, y+sy, c_out}) end

  -- Right wing outline (viewer right)
  table.insert(o, {16, 12+sy, c_out}); table.insert(o, {28+wo, 8+sy, c_out}); table.insert(o, {30+wo, 18+sy, c_out})
  for x=16, 28+wo do table.insert(o, {x, 11+math.floor((x-16)*-0.25)+sy, c_out}) end
  for x=16, 30+wo do table.insert(o, {x, 19+sy, c_out}) end
  for y=8, 18 do table.insert(o, {29+wo, y+sy, c_out}) end

  -- Body & Lantern outline
  table.insert(o, {15, 9+sy, c_out}); table.insert(o, {16, 9+sy, c_out})
  table.insert(o, {14, 18+sy, c_out}); table.insert(o, {17, 18+sy, c_out})
  table.insert(o, {13, 22+sy, c_out}); table.insert(o, {18, 22+sy, c_out})

  -- Wings Body fill
  for y=12, 18 do
    for x=3-wo + math.floor(math.abs(y-15)*1.2), 15 do
      table.insert(b, {x, y+sy, (y < 15) and c_tl_m or c_tl_d})
    end
    for x=16, 28+wo - math.floor(math.abs(y-15)*1.2) do
      table.insert(b, {x, y+sy, (y < 15) and c_tl_m or c_tl_d})
    end
  end

  -- Central Body (Charcoal back)
  for y=10, 17 do
    table.insert(b, {15, y+sy, c_ch_d})
    table.insert(b, {16, y+sy, c_ch_d})
  end

  -- Lantern abdomen
  local l_col = lanternGlow and c_pwd or c_lm_l
  for y=18, 24 do
    for x=14, 17 do
      table.insert(b, {x, y+sy, (x==15 or x==16) and l_col or c_lm_d})
    end
  end

  -- Details: Antennae extending up
  table.insert(d, {13, 8+sy, c_ch_l}); table.insert(d, {12, 6+sy, c_ch_l}); table.insert(d, {11, 4+sy, c_ch_l})
  table.insert(d, {18, 8+sy, c_ch_l}); table.insert(d, {19, 6+sy, c_ch_l}); table.insert(d, {20, 4+sy, c_ch_l})

  -- WING EYE-SPOT ASYMMETRY (Facing UP):
  -- Anatomical Left Wing (viewer left, x=8): COMPLETE eye marking
  table.insert(d, {7-wo, 15+sy, c_lm_l}); table.insert(d, {8-wo, 15+sy, c_lm_l}); table.insert(d, {9-wo, 15+sy, c_lm_l})
  table.insert(d, {7-wo, 16+sy, c_lm_l}); table.insert(d, {8-wo, 16+sy, c_ch_d}); table.insert(d, {9-wo, 16+sy, c_lm_l})
  table.insert(d, {7-wo, 17+sy, c_lm_l}); table.insert(d, {8-wo, 17+sy, c_lm_l}); table.insert(d, {9-wo, 17+sy, c_lm_l})

  -- Anatomical Right Wing (viewer right, x=23): BROKEN eye marking
  table.insert(d, {22+wo, 16+sy, c_lm_l}); table.insert(d, {23+wo, 16+sy, c_ch_d})
  table.insert(d, {22+wo, 17+sy, c_lm_l}); table.insert(d, {23+wo, 17+sy, c_lm_l}); table.insert(d, {24+wo, 17+sy, c_lm_l})

  return o, b, d
end

-- Frames 31..40: Up
buildFrame(31, getUpPixels(0, 0, false))
buildFrame(32, getUpPixels(1, 1, false))

buildFrame(33, getUpPixels(0, 0, false))
buildFrame(34, getUpPixels(-1, -1, false))
buildFrame(35, getUpPixels(1, 1, false))
buildFrame(36, getUpPixels(0, 0, false))

buildFrame(37, getUpPixels(-1, -2, true))
do
  local o, b, d = getUpPixels(1, 0, true)
  local eff = { {11, 3, c_lm_l}, {12, 2, c_pwd}, {19, 3, c_lm_l}, {20, 2, c_pwd} }
  buildFrame(38, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 1, false)
  local eff = { {9, 1, c_lm_l}, {10, 0, c_pwd}, {21, 1, c_lm_l}, {22, 0, c_pwd} }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 0, false)
  local eff = { {7, 0, c_pwd}, {23, 0, c_pwd} }
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
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("${stagingDir}/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_FENLIGHT_MOTH")
`;

writeFileSync("tools/build-fenlight-moth.lua", luaScript);
console.log("Written tools/build-fenlight-moth.lua");

const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0015-fenlight-moth
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Fenlight Moth".

## Creative brief

- Collection: Mireborn Swarm. Swamp creatures built around mud, reeds, bubbles, toxins, shallow water, and deceptive movement.
- Core concept: A flying homing-projectile enemy that distracts players from larger threats.
- Body and silhouette: Broad triangular wings, tiny central body, and long trailing antennae.
- Signature features: Lanternlike abdomen, eye-shaped wing marks, and glowing dust.
- Palette and materials: Teal, charcoal, pale lime, and softly luminous powder.
- Movement personality: Drifting, hypnotic, and evasive.
- Attack concept: Releases pairs of slow lights that curve gently toward the player before fading.
- Directional details: The left wing has a complete eye marking while the right marking is broken.
- Avoid: Fairy humanoid, realistic fuzzy moth, extremely bright visual effects.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-fenlight-moth",
  assetId: "enemy-mob-32-fenlight-moth",
  baseRevisionId: null,
  requestedName: "Fenlight Moth",
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
