
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rotbulb-toadstool/source.aseprite"

-- Setup palette (10 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(11)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=30, g=20, b=35, a=255 },     -- 1: c_out (dark purple-brown outline)
  Color{ r=60, g=38, b=65, a=255 },     -- 2: c_prp_d (dark muted purple cap)
  Color{ r=105, g=68, b=110, a=255 },   -- 3: c_prp_m (mid muted purple cap)
  Color{ r=140, g=130, b=35, a=255 },   -- 4: c_ylw_d (sickly yellow dark)
  Color{ r=210, g=200, b=60, a=255 },   -- 5: c_ylw_l (sickly yellow light)
  Color{ r=70, g=50, b=35, a=255 },     -- 6: c_brn_d (stalk brown dark)
  Color{ r=115, g=85, b=55, a=255 },    -- 7: c_brn_m (stalk brown mid)
  Color{ r=185, g=170, b=95, a=255 },   -- 8: c_spore (spore sac / dust)
  Color{ r=240, g=235, b=140, a=255 },  -- 9: c_hl (bright yellow highlight)
  Color{ r=150, g=100, b=155, a=255 }   -- 10: c_prp_l (light purple accent)
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

local c_out   = colors[2]
local c_prp_d = colors[3]
local c_prp_m = colors[4]
local c_ylw_d = colors[5]
local c_ylw_l = colors[6]
local c_brn_d = colors[7]
local c_brn_m = colors[8]
local c_spore = colors[9]
local c_hl    = colors[10]
local c_prp_l = colors[11]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
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
-- DOWN DIRECTION (facing camera)
-- Back-Left Sac = Viewer Upper-Right of Cap (x=20..23, y=9..13)
--------------------------------------------------------------------------------
local function getDownPixels(pulseShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ps = pulseShift or 0

  -- Rootlike legs (bottom y=23..27)
  table.insert(o, {11, 24+sy, c_out}); table.insert(o, {12, 25+sy, c_out})
  table.insert(o, {19, 24+sy, c_out}); table.insert(o, {20, 25+sy, c_out})
  table.insert(b, {12, 24+sy, c_brn_d}); table.insert(b, {19, 24+sy, c_brn_d})

  -- Stalk & Cap Outline
  for x=13, 18 do table.insert(o, {x, 23+sy, c_out}) end
  table.insert(o, {12, 17+sy, c_out}); table.insert(o, {19, 17+sy, c_out})
  for x=7, 24 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 8+sy-ps, c_out}) end
  table.insert(o, {6, 12+sy, c_out}); table.insert(o, {25, 12+sy, c_out})

  -- Stalk Fill (Brown)
  for y=16, 23 do
    for x=13, 18 do
      table.insert(b, {x, y+sy, (x < 16) and c_brn_m or c_brn_d})
    end
  end

  -- Uneven Fungal Cap Fill (Muted purple)
  for y=9-ps, 15 do
    for x=7, 24 do
      table.insert(b, {x, y+sy, (y < 12) and c_prp_m or c_prp_d})
    end
  end

  -- Top Pulsing Bulb (Sickly yellow: x=14..17, y=5-ps..8-ps)
  for y=5-ps, 8-ps do
    for x=14, 17 do
      table.insert(b, {x, y+sy, c_ylw_l})
    end
  end
  table.insert(d, {15, 6-ps+sy, c_hl}); table.insert(d, {16, 6-ps+sy, c_hl})

  -- ASYMMETRY: LARGEST HANGING SPORE SAC ON BACK-LEFT OF CAP (Viewer upper-right x=21..24, y=10..14)
  for y=10, 14 do
    for x=21, 24 do
      table.insert(d, {x, y+sy, c_spore})
    end
  end
  table.insert(d, {22, 12+sy, c_ylw_l}) -- Sac core glow

  -- Cap details (split rim accents & purple highlights)
  table.insert(d, {9, 11+sy, c_prp_l}); table.insert(d, {10, 11+sy, c_prp_l})
  table.insert(d, {15, 11+sy, c_ylw_d}) -- Small front spot

  return o, b, d
end

buildFrame(1, getDownPixels(0, 0, false))
buildFrame(2, getDownPixels(1, 1, false))

buildFrame(3, getDownPixels(0, 0, false))
buildFrame(4, getDownPixels(-1, -1, false))
buildFrame(5, getDownPixels(1, 1, false))
buildFrame(6, getDownPixels(0, 0, false))

buildFrame(7, getDownPixels(-1, -2, true))
do
  local o, b, d = getDownPixels(1, 0, true)
  local eff = { {15, 4, c_spore}, {16, 3, c_hl} }
  buildFrame(8, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, 1, false)
  local eff = { {13, 2, c_spore}, {18, 2, c_spore}, {15, 1, c_hl} }
  buildFrame(9, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, 0, false)
  local eff = { {10, 0, c_spore}, {21, 0, c_spore} }
  buildFrame(10, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- LEFT DIRECTION (facing left)
-- Back-Left Sac = Right/Top of Cap in view (x=19..23, y=10..14)
--------------------------------------------------------------------------------
local function getLeftPixels(pulseShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ps = pulseShift or 0

  -- Root legs
  table.insert(o, {11, 24+sy, c_out}); table.insert(o, {18, 24+sy, c_out})

  -- Stalk & Cap Outline
  for x=13, 18 do table.insert(o, {x, 23+sy, c_out}) end
  for x=7, 24 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 8+sy-ps, c_out}) end
  table.insert(o, {6, 12+sy, c_out}); table.insert(o, {25, 12+sy, c_out})

  -- Stalk Fill
  for y=16, 23 do
    for x=13, 18 do
      table.insert(b, {x, y+sy, (x < 16) and c_brn_m or c_brn_d})
    end
  end

  -- Fungal Cap Fill
  for y=9-ps, 15 do
    for x=7, 24 do
      table.insert(b, {x, y+sy, (y < 12) and c_prp_m or c_prp_d})
    end
  end

  -- Top Pulsing Bulb (tilted left toward facing direction x=12..15, y=5-ps..8-ps)
  for y=5-ps, 8-ps do
    for x=12, 15 do
      table.insert(b, {x, y+sy, c_ylw_l})
    end
  end
  table.insert(d, {13, 6-ps+sy, c_hl})

  -- ASYMMETRY: LARGEST HANGING SPORE SAC ON BACK-LEFT OF CAP (Right/Back side x=20..23, y=10..14)
  for y=10, 14 do
    for x=20, 23 do
      table.insert(d, {x, y+sy, c_spore})
    end
  end
  table.insert(d, {21, 12+sy, c_ylw_l})

  return o, b, d
end

buildFrame(11, getLeftPixels(0, 0, false))
buildFrame(12, getLeftPixels(1, 1, false))

buildFrame(13, getLeftPixels(0, 0, false))
buildFrame(14, getLeftPixels(-1, -1, false))
buildFrame(15, getLeftPixels(1, 1, false))
buildFrame(16, getLeftPixels(0, 0, false))

buildFrame(17, getLeftPixels(-1, -2, true))
do
  local o, b, d = getLeftPixels(1, 0, true)
  local eff = { {13, 4, c_spore}, {12, 3, c_hl} }
  buildFrame(18, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 1, false)
  local eff = { {10, 2, c_spore}, {15, 2, c_spore}, {11, 1, c_hl} }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 0, false)
  local eff = { {7, 0, c_spore}, {18, 0, c_spore} }
  buildFrame(20, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- RIGHT DIRECTION (facing right)
-- Back-Left Sac = Left/Back of Cap in view (x=8..12, y=10..14)
--------------------------------------------------------------------------------
local function getRightPixels(pulseShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ps = pulseShift or 0

  -- Root legs
  table.insert(o, {13, 24+sy, c_out}); table.insert(o, {20, 24+sy, c_out})

  -- Stalk & Cap Outline
  for x=13, 18 do table.insert(o, {x, 23+sy, c_out}) end
  for x=7, 24 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 8+sy-ps, c_out}) end
  table.insert(o, {6, 12+sy, c_out}); table.insert(o, {25, 12+sy, c_out})

  -- Stalk Fill
  for y=16, 23 do
    for x=13, 18 do
      table.insert(b, {x, y+sy, (x < 16) and c_brn_m or c_brn_d})
    end
  end

  -- Fungal Cap Fill
  for y=9-ps, 15 do
    for x=7, 24 do
      table.insert(b, {x, y+sy, (y < 12) and c_prp_m or c_prp_d})
    end
  end

  -- Top Pulsing Bulb (tilted right toward facing direction x=16..19, y=5-ps..8-ps)
  for y=5-ps, 8-ps do
    for x=16, 19 do
      table.insert(b, {x, y+sy, c_ylw_l})
    end
  end
  table.insert(d, {17, 6-ps+sy, c_hl})

  -- ASYMMETRY: LARGEST HANGING SPORE SAC ON BACK-LEFT OF CAP (Left/Back side x=8..11, y=10..14)
  for y=10, 14 do
    for x=8, 11 do
      table.insert(d, {x, y+sy, c_spore})
    end
  end
  table.insert(d, {9, 12+sy, c_ylw_l})

  return o, b, d
end

buildFrame(21, getRightPixels(0, 0, false))
buildFrame(22, getRightPixels(1, 1, false))

buildFrame(23, getRightPixels(0, 0, false))
buildFrame(24, getRightPixels(-1, -1, false))
buildFrame(25, getRightPixels(1, 1, false))
buildFrame(26, getRightPixels(0, 0, false))

buildFrame(27, getRightPixels(-1, -2, true))
do
  local o, b, d = getRightPixels(1, 0, true)
  local eff = { {18, 4, c_spore}, {19, 3, c_hl} }
  buildFrame(28, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 1, false)
  local eff = { {16, 2, c_spore}, {21, 2, c_spore}, {20, 1, c_hl} }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 0, false)
  local eff = { {13, 0, c_spore}, {24, 0, c_spore} }
  buildFrame(30, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- UP DIRECTION (facing away)
-- Back-Left Sac = Viewer Upper-Left of Cap (x=8..11, y=9..13)
--------------------------------------------------------------------------------
local function getUpPixels(pulseShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ps = pulseShift or 0

  -- Root legs
  table.insert(o, {12, 24+sy, c_out}); table.insert(o, {19, 24+sy, c_out})

  -- Stalk & Cap Outline
  for x=13, 18 do table.insert(o, {x, 23+sy, c_out}) end
  for x=7, 24 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 8+sy-ps, c_out}) end
  table.insert(o, {6, 12+sy, c_out}); table.insert(o, {25, 12+sy, c_out})

  -- Stalk Fill
  for y=16, 23 do
    for x=13, 18 do
      table.insert(b, {x, y+sy, c_brn_d})
    end
  end

  -- Fungal Cap Fill (Darker rear view)
  for y=9-ps, 15 do
    for x=7, 24 do
      table.insert(b, {x, y+sy, c_prp_d})
    end
  end

  -- Top Pulsing Bulb (x=14..17, y=5-ps..8-ps)
  for y=5-ps, 8-ps do
    for x=14, 17 do
      table.insert(b, {x, y+sy, c_ylw_l})
    end
  end
  table.insert(d, {15, 6-ps+sy, c_hl})

  -- ASYMMETRY: LARGEST HANGING SPORE SAC ON BACK-LEFT OF CAP (Viewer upper-left x=8..11, y=9..13)
  for y=9, 13 do
    for x=8, 11 do
      table.insert(d, {x, y+sy, c_spore})
    end
  end
  table.insert(d, {9, 11+sy, c_ylw_l})

  return o, b, d
end

buildFrame(31, getUpPixels(0, 0, false))
buildFrame(32, getUpPixels(1, 1, false))

buildFrame(33, getUpPixels(0, 0, false))
buildFrame(34, getUpPixels(-1, -1, false))
buildFrame(35, getUpPixels(1, 1, false))
buildFrame(36, getUpPixels(0, 0, false))

buildFrame(37, getUpPixels(-1, -2, true))
do
  local o, b, d = getUpPixels(1, 0, true)
  local eff = { {15, 4, c_spore}, {16, 3, c_hl} }
  buildFrame(38, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 1, false)
  local eff = { {13, 2, c_spore}, {18, 2, c_spore}, {15, 1, c_hl} }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 0, false)
  local eff = { {10, 0, c_spore}, {21, 0, c_spore} }
  buildFrame(40, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rotbulb-toadstool/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rotbulb-toadstool/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rotbulb-toadstool/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_ROTBULB_TOADSTOOL")
