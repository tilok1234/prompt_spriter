
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-shellmire-crab/source.aseprite"

-- Setup palette (10 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(11)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=28, g=20, b=12, a=255 },     -- 1: c_out (dark mud brown outline)
  Color{ r=58, g=42, b=26, a=255 },     -- 2: c_br_d (dark shell brown)
  Color{ r=95, g=70, b=42, a=255 },     -- 3: c_br_m (mid shell brown)
  Color{ r=140, g=105, b=65, a=255 },   -- 4: c_br_l (light shell brown / mud)
  Color{ r=130, g=45, b=20, a=255 },    -- 5: c_rst_d (rust orange dark)
  Color{ r=195, g=80, b=35, a=255 },    -- 6: c_rst_m (rust orange mid)
  Color{ r=40, g=65, b=25, a=255 },     -- 7: c_grn_d (swamp green dark)
  Color{ r=85, g=130, b=50, a=255 },    -- 8: c_grn_l (swamp green light)
  Color{ r=160, g=120, b=70, a=255 },   -- 9: c_mud_p (mud pellet)
  Color{ r=220, g=180, b=110, a=255 }   -- 10: c_hl (eye/claw tip highlight)
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
local c_br_d  = colors[3]
local c_br_m  = colors[4]
local c_br_l  = colors[5]
local c_rst_d = colors[6]
local c_rst_m = colors[7]
local c_grn_d = colors[8]
local c_grn_l = colors[9]
local c_mud_p = colors[10]
local c_hl    = colors[11]

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
-- Anatomical Right = Viewer Left (ENLARGED RUST CLAW), Anatomical Left = Viewer Right (SMALL CLAW)
--------------------------------------------------------------------------------
local function getDownPixels(legShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ls = legShift or 0

  -- Legs (bottom 23..27)
  table.insert(o, {7+ls, 24+sy, c_out}); table.insert(o, {9-ls, 25+sy, c_out})
  table.insert(o, {22-ls, 24+sy, c_out}); table.insert(o, {24+ls, 25+sy, c_out})
  table.insert(b, {8+ls, 24+sy, c_br_d}); table.insert(b, {23-ls, 24+sy, c_br_d})

  -- Carapace & Body Outline
  table.insert(o, {10, 11+sy, c_out}); table.insert(o, {21, 11+sy, c_out})
  for x=11, 20 do table.insert(o, {x, 10+sy, c_out}) end
  for x=9, 22 do table.insert(o, {x, 21+sy, c_out}) end
  table.insert(o, {8, 16+sy, c_out}); table.insert(o, {23, 16+sy, c_out})

  -- ENLARGED RIGHT CLAW (Viewer Left: x=3..11, y=14..22)
  for x=3, 11 do table.insert(o, {x, 13+sy, c_out}); table.insert(o, {x, 22+sy, c_out}) end
  table.insert(o, {2, 17+sy, c_out})

  -- SMALL LEFT CLAW (Viewer Right: x=20..26, y=16..21)
  for x=20, 26 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 21+sy, c_out}) end
  table.insert(o, {27, 18+sy, c_out})

  -- Body Fill (Main Carapace: brown shell)
  for y=11, 20 do
    for x=10, 21 do
      table.insert(b, {x, y+sy, (y < 15) and c_br_m or c_br_d})
    end
  end

  -- ENLARGED RIGHT CLAW Fill (Rust orange)
  for y=14, 21 do
    for x=3, 10 do
      table.insert(b, {x, y+sy, (x < 7) and c_rst_m or c_rst_d})
    end
  end

  -- SMALL LEFT CLAW Fill (Mid brown)
  for y=16, 20 do
    for x=21, 26 do
      table.insert(b, {x, y+sy, c_br_m})
    end
  end

  -- Details: Stalk Eyes (x=13, x=18, y=11..13)
  table.insert(d, {13, 11+sy, c_hl}); table.insert(d, {18, 11+sy, c_hl})
  table.insert(d, {13, 12+sy, c_out}); table.insert(d, {18, 12+sy, c_out})

  -- Details: Reeds growing from carapace back (x=14..17, y=5..9)
  table.insert(d, {14, 9+sy, c_grn_d}); table.insert(d, {14, 7+sy, c_grn_l}); table.insert(d, {14, 6+sy, c_grn_l})
  table.insert(d, {17, 9+sy, c_grn_d}); table.insert(d, {17, 8+sy, c_grn_l}); table.insert(d, {17, 6+sy, c_grn_l})

  -- Details: Mud patches on shell & Claw highlight
  table.insert(d, {15, 14+sy, c_br_l}); table.insert(d, {16, 14+sy, c_br_l})
  table.insert(d, {5, 15+sy, c_rst_m}); table.insert(d, {5, 16+sy, c_hl}) -- Rust claw highlight

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
  local eff = { {26, 22, c_mud_p}, {27, 23, c_mud_p} }
  buildFrame(8, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, 1, false)
  local eff = { {24, 24, c_mud_p}, {27, 25, c_mud_p}, {29, 24, c_mud_p} }
  buildFrame(9, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, 0, false)
  local eff = { {22, 27, c_mud_p}, {30, 27, c_mud_p} }
  buildFrame(10, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- LEFT DIRECTION (facing left)
-- Anatomical Right = FOREGROUND (ENLARGED RUST CLAW in front)
--------------------------------------------------------------------------------
local function getLeftPixels(legShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ls = legShift or 0

  -- Legs
  table.insert(o, {10+ls, 24+sy, c_out}); table.insert(o, {18-ls, 24+sy, c_out})

  -- Shell Body Outline facing left
  table.insert(o, {7, 14+sy, c_out}); table.insert(o, {24, 13+sy, c_out})
  for x=8, 23 do table.insert(o, {x, 11+sy, c_out}); table.insert(o, {x, 21+sy, c_out}) end

  -- Body Fill (Shell brown)
  for y=12, 20 do
    for x=8, 23 do
      table.insert(b, {x, y+sy, (y < 16) and c_br_m or c_br_d})
    end
  end

  -- FOREGROUND ENLARGED RIGHT CLAW (Viewer front left: x=3..13, y=14..22)
  for x=3, 13 do table.insert(o, {x, 13+sy, c_out}); table.insert(o, {x, 22+sy, c_out}) end
  table.insert(o, {2, 17+sy, c_out})
  for y=14, 21 do
    for x=3, 12 do
      table.insert(b, {x, y+sy, (x < 7) and c_rst_m or c_rst_d})
    end
  end

  -- Details: Stalk Eye facing left (x=8, y=12)
  table.insert(d, {8, 12+sy, c_hl}); table.insert(d, {8, 13+sy, c_out})

  -- Details: Reeds on back shell (x=19..22, y=5..10)
  table.insert(d, {20, 10+sy, c_grn_d}); table.insert(d, {20, 8+sy, c_grn_l}); table.insert(d, {20, 6+sy, c_grn_l})
  table.insert(d, {22, 10+sy, c_grn_d}); table.insert(d, {22, 7+sy, c_grn_l}); table.insert(d, {22, 5+sy, c_grn_l})

  -- Rust claw highlight
  table.insert(d, {5, 15+sy, c_rst_m}); table.insert(d, {5, 16+sy, c_hl})

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
  local eff = { {2, 15, c_mud_p}, {1, 16, c_mud_p} }
  buildFrame(18, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 1, false)
  local eff = { {0, 13, c_mud_p}, {0, 17, c_mud_p} }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 0, false)
  local eff = { {0, 11, c_mud_p} }
  buildFrame(20, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- RIGHT DIRECTION (facing right)
-- Anatomical Left = FOREGROUND (Small claw in front, ENLARGED RIGHT CLAW in background)
--------------------------------------------------------------------------------
local function getRightPixels(legShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ls = legShift or 0

  -- Legs
  table.insert(o, {13+ls, 24+sy, c_out}); table.insert(o, {21-ls, 24+sy, c_out})

  -- BACKGROUND ENLARGED RIGHT CLAW (Peeking behind body at top left: x=7..15, y=10..15)
  for x=8, 14 do table.insert(b, {x, 10+sy, c_rst_d}); table.insert(b, {x, 11+sy, c_rst_d}) end

  -- Shell Body Outline facing right
  table.insert(o, {7, 13+sy, c_out}); table.insert(o, {24, 14+sy, c_out})
  for x=8, 23 do table.insert(o, {x, 11+sy, c_out}); table.insert(o, {x, 21+sy, c_out}) end

  -- Body Fill (Shell brown)
  for y=12, 20 do
    for x=8, 23 do
      table.insert(b, {x, y+sy, (y < 16) and c_br_m or c_br_d})
    end
  end

  -- FOREGROUND SMALL LEFT CLAW (Viewer front right: x=18..27, y=15..21)
  for x=18, 27 do table.insert(o, {x, 14+sy, c_out}); table.insert(o, {x, 21+sy, c_out}) end
  table.insert(o, {28, 17+sy, c_out})
  for y=15, 20 do
    for x=18, 27 do
      table.insert(b, {x, y+sy, c_br_m})
    end
  end

  -- Details: Stalk Eye facing right (x=23, y=12)
  table.insert(d, {23, 12+sy, c_hl}); table.insert(d, {23, 13+sy, c_out})

  -- Details: Reeds on back shell (x=9..12, y=5..10)
  table.insert(d, {9, 10+sy, c_grn_d}); table.insert(d, {9, 7+sy, c_grn_l}); table.insert(d, {9, 5+sy, c_grn_l})
  table.insert(d, {11, 10+sy, c_grn_d}); table.insert(d, {11, 8+sy, c_grn_l}); table.insert(d, {11, 6+sy, c_grn_l})

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
  local eff = { {29, 15, c_mud_p}, {30, 16, c_mud_p} }
  buildFrame(28, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 1, false)
  local eff = { {31, 13, c_mud_p}, {31, 17, c_mud_p} }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 0, false)
  local eff = { {31, 11, c_mud_p} }
  buildFrame(30, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- UP DIRECTION (facing away)
-- Anatomical Right = Viewer Right (ENLARGED RUST CLAW), Anatomical Left = Viewer Left (SMALL CLAW)
--------------------------------------------------------------------------------
local function getUpPixels(legShift, poseShift, attackState)
  local o, b, d = {}, {}, {}
  local sy = poseShift or 0
  local ls = legShift or 0

  -- Legs
  table.insert(o, {7+ls, 24+sy, c_out}); table.insert(o, {9-ls, 25+sy, c_out})
  table.insert(o, {22-ls, 24+sy, c_out}); table.insert(o, {24+ls, 25+sy, c_out})

  -- Carapace Outline
  table.insert(o, {10, 11+sy, c_out}); table.insert(o, {21, 11+sy, c_out})
  for x=11, 20 do table.insert(o, {x, 10+sy, c_out}) end
  for x=9, 22 do table.insert(o, {x, 21+sy, c_out}) end

  -- SMALL LEFT CLAW (Viewer Left: x=4..11, y=16..21)
  for x=4, 11 do table.insert(o, {x, 15+sy, c_out}); table.insert(o, {x, 21+sy, c_out}) end
  table.insert(o, {3, 18+sy, c_out})

  -- ENLARGED RIGHT CLAW (Viewer Right: x=20..28, y=14..22)
  for x=20, 28 do table.insert(o, {x, 13+sy, c_out}); table.insert(o, {x, 22+sy, c_out}) end
  table.insert(o, {29, 17+sy, c_out})

  -- Body Fill (Main Carapace: dark shell back)
  for y=11, 20 do
    for x=10, 21 do
      table.insert(b, {x, y+sy, (y < 15) and c_br_m or c_br_d})
    end
  end

  -- SMALL LEFT CLAW Fill (Viewer Left)
  for y=16, 20 do
    for x=5, 10 do
      table.insert(b, {x, y+sy, c_br_m})
    end
  end

  -- ENLARGED RIGHT CLAW Fill (Viewer Right: Rust orange)
  for y=14, 21 do
    for x=21, 28 do
      table.insert(b, {x, y+sy, (x > 24) and c_rst_m or c_rst_d})
    end
  end

  -- Details: Reeds growing from back carapace (x=14..17, y=4..10)
  table.insert(d, {14, 9+sy, c_grn_d}); table.insert(d, {14, 6+sy, c_grn_l}); table.insert(d, {14, 4+sy, c_grn_l})
  table.insert(d, {17, 9+sy, c_grn_d}); table.insert(d, {17, 7+sy, c_grn_l}); table.insert(d, {17, 5+sy, c_grn_l})

  -- Details: Rust claw highlight (viewer right)
  table.insert(d, {26, 15+sy, c_rst_m}); table.insert(d, {26, 16+sy, c_hl})

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
  local eff = { {4, 14, c_mud_p}, {5, 13, c_mud_p} }
  buildFrame(38, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 1, false)
  local eff = { {2, 11, c_mud_p}, {5, 10, c_mud_p}, {8, 11, c_mud_p} }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 0, false)
  local eff = { {1, 8, c_mud_p}, {9, 8, c_mud_p} }
  buildFrame(40, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-shellmire-crab/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-shellmire-crab/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-shellmire-crab/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_SHELLMIRE_CRAB")
