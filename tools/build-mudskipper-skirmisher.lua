
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-mudskipper-skirmisher/source.aseprite"

-- Palette (13 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(14)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=20, g=28, b=38, a=255 },     -- 1: c_out (dark slate outline)
  Color{ r=45, g=65, b=85, a=255 },     -- 2: c_skin_dark (dark blue-gray skin)
  Color{ r=75, g=105, b=130, a=255 },   -- 3: c_skin_mid (mid blue-gray skin)
  Color{ r=115, g=155, b=185, a=255 },  -- 4: c_skin_light (light blue-gray skin)
  Color{ r=55, g=40, b=28, a=255 },     -- 5: c_mud_dark (dark mud brown)
  Color{ r=95, g=70, b=45, a=255 },     -- 6: c_mud_mid (mid mud brown fin-hands)
  Color{ r=200, g=80, b=20, a=255 },    -- 7: c_orange_dark (deep orange throat)
  Color{ r=250, g=130, b=30, a=255 },   -- 8: c_orange_bright (bright orange throat accent)
  Color{ r=240, g=230, b=140, a=255 },  -- 9: c_eye_yellow (bulging eye yellow)
  Color{ r=15, g=15, b=20, a=255 },     -- 10: c_eye_pupil (dark pupil)
  Color{ r=180, g=190, b=195, a=255 }, -- 11: c_scar (pale eye scar)
  Color{ r=80, g=220, b=255, a=255 },  -- 12: c_water_dart (water dart cyan)
  Color{ r=200, g=245, b=255, a=255 }  -- 13: c_water_hi (water dart white-cyan)
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

-- Helpers for colors
local c_out = colors[2]
local c_sk_d = colors[3]
local c_sk_m = colors[4]
local c_sk_l = colors[5]
local c_mud_d = colors[6]
local c_mud_m = colors[7]
local c_or_d = colors[8]
local c_or_b = colors[9]
local c_eye = colors[10]
local c_pup = colors[11]
local c_scar = colors[12]
local c_w_dart = colors[13]
local c_w_hi = colors[14]

local function drawPixels(layer, frameNum, pixelList)
  local cel = spr:newCel(layer, frameNum)
  local img = Image(32, 32, ColorMode.RGB)
  for _, p in ipairs(pixelList) do
    local x, y, col = p[1], p[2], p[3]
    if x >= 0 and x < 32 and y >= 0 and y < 32 then
      img:drawPixel(x, y, col)
    end
  end
  cel.image = img
end

local function buildFrame(frameNum, outP, bodyP, detP, effP)
  if outP and #outP > 0 then drawPixels(layerOutline, frameNum, outP) end
  if bodyP and #bodyP > 0 then drawPixels(layerBody, frameNum, bodyP) end
  if detP and #detP > 0 then drawPixels(layerDetails, frameNum, detP) end
  if effP and #effP > 0 then drawPixels(layerEffects, frameNum, effP) end
end

--------------------------------------------------------------------------------
-- DOWN DIRECTION (Rows 0, Frames 1..10)
--------------------------------------------------------------------------------

local function getDownPixels(dy, finShift)
  dy = dy or 0
  finShift = finShift or 0
  local outP, bodyP, detP = {}, {}, {}

  local headY = 12 + dy
  local bodyY = 17 + dy

  -- Outline: main body silhouette
  for y = headY, headY + 11 do
    for x = 9, 22 do
      if (y == headY and (x >= 12 and x <= 19)) or
         (y == headY + 11 and (x >= 11 and x <= 20)) or
         (x == 9 or x == 22 and (y >= headY + 3 and y <= headY + 9)) or
         (x == 10 or x == 21 and (y == headY + 1 or y == headY + 2 or y == headY + 10)) then
        table.insert(outP, {x, y, c_out})
      end
    end
  end

  -- Fin-hands outline (left & right fins)
  local lFinX = 5 + finShift
  local rFinX = 22 - finShift
  for y = bodyY, bodyY + 4 do
    table.insert(outP, {lFinX, y, c_out})
    table.insert(outP, {rFinX + 4, y, c_out})
  end
  for x = lFinX, lFinX + 4 do table.insert(outP, {x, bodyY + 5, c_out}) end
  for x = rFinX, rFinX + 4 do table.insert(outP, {x, bodyY + 5, c_out}) end

  -- Dorsal Crest outline
  table.insert(outP, {10, headY - 5, c_out})
  table.insert(outP, {9, headY - 4, c_out})
  table.insert(outP, {8, headY - 3, c_out})
  table.insert(outP, {8, headY - 2, c_out})
  table.insert(outP, {9, headY - 1, c_out})
  table.insert(outP, {13, headY - 1, c_out})
  table.insert(outP, {14, headY - 2, c_out})

  -- Body fill
  for y = headY + 1, headY + 10 do
    for x = 10, 21 do
      local isMid = (x >= 12 and x <= 19 and y <= headY + 7)
      local isLight = (x >= 13 and x <= 18 and y >= headY + 2 and y <= headY + 5)
      if isLight then
        table.insert(bodyP, {x, y, c_sk_l})
      elseif isMid then
        table.insert(bodyP, {x, y, c_sk_m})
      else
        table.insert(bodyP, {x, y, c_sk_d})
      end
    end
  end

  -- Dorsal crest body
  for y = headY - 4, headY do
    for x = 9, 13 do
      if (y == headY - 4 and x >= 10 and x <= 12) or
         (y == headY - 3 and x >= 9 and x <= 13) or
         (y >= headY - 2 and x >= 9 and x <= 13) then
        if y == headY - 4 then
          table.insert(bodyP, {x, y, c_mud_m})
        else
          table.insert(bodyP, {x, y, c_sk_m})
        end
      end
    end
  end

  -- Fin-hands body
  for y = bodyY + 1, bodyY + 4 do
    for x = lFinX + 1, lFinX + 4 do table.insert(bodyP, {x, y, c_mud_m}) end
    for x = rFinX, rFinX + 3 do table.insert(bodyP, {x, y, c_mud_m}) end
  end

  -- Details: Bulging eyes & throat markings & SCAR
  for y = headY + 2, headY + 4 do
    for x = 11, 13 do table.insert(detP, {x, y, c_eye}) end
    for x = 18, 20 do table.insert(detP, {x, y, c_eye}) end
  end
  table.insert(detP, {12, headY + 3, c_pup})
  table.insert(detP, {19, headY + 3, c_pup})

  -- SCAR ON CREATURE'S RIGHT EYE (viewer's LEFT)
  table.insert(detP, {10, headY + 1, c_scar})
  table.insert(detP, {11, headY + 2, c_scar})
  table.insert(detP, {12, headY + 3, c_scar})
  table.insert(detP, {13, headY + 4, c_scar})

  -- Orange throat markings
  for y = headY + 6, headY + 8 do
    for x = 14, 17 do
      if y == headY + 7 then
        table.insert(detP, {x, y, c_or_b})
      else
        table.insert(detP, {x, y, c_or_d})
      end
    end
  end

  return outP, bodyP, detP
end

-- Down Idle (Frames 1..2)
buildFrame(1, getDownPixels(0, 0))
buildFrame(2, getDownPixels(-1, 0))

-- Down Walk (Frames 3..6)
buildFrame(3, getDownPixels(1, 0))
buildFrame(4, getDownPixels(-2, 1))
buildFrame(5, getDownPixels(-1, 0))
buildFrame(6, getDownPixels(0, -1))

-- Down Attack (Frames 7..10)
buildFrame(7, getDownPixels(2, 0))
buildFrame(8, getDownPixels(-1, 0))
do
  local o, b, d = getDownPixels(-1, 0)
  local eff = {
    {13, 24, c_w_dart}, {14, 24, c_w_hi}, {15, 24, c_w_dart},
    {17, 26, c_w_dart}, {18, 26, c_w_hi}, {19, 26, c_w_dart},
    {14, 27, c_w_hi}, {18, 27, c_w_hi}
  }
  buildFrame(9, o, b, d, eff)
end
do
  local o, b, d = getDownPixels(0, 0)
  local eff = {
    {12, 26, c_w_dart}, {13, 26, c_w_hi},
    {19, 26, c_w_dart}, {20, 26, c_w_hi}
  }
  buildFrame(10, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- LEFT DIRECTION (Rows 1, Frames 11..20)
--------------------------------------------------------------------------------

local function getLeftPixels(dx, dy, finFlex)
  dx = dx or 0
  dy = dy or 0
  finFlex = finFlex or 0
  local outP, bodyP, detP = {}, {}, {}

  local headX = 6 + dx
  local headY = 12 + dy

  -- Outline body
  for y = headY, headY + 11 do
    for x = headX, headX + 16 do
      if (y == headY and x >= headX + 3 and x <= headX + 13) or
         (y == headY + 11 and x >= headX + 4 and x <= headX + 14) or
         (x == headX and y >= headY + 3 and y <= headY + 8) or
         (x == headX + 16 and y >= headY + 4 and y <= headY + 9) then
        table.insert(outP, {x, y, c_out})
      end
    end
  end

  -- Front fin-hand outline
  for y = headY + 6, headY + 10 do table.insert(outP, {headX + 2 + finFlex, y, c_out}) end
  for x = headX + 2 + finFlex, headX + 6 + finFlex do table.insert(outP, {x, headY + 11, c_out}) end

  -- Dorsal crest outline
  table.insert(outP, {headX + 12, headY - 5, c_out})
  table.insert(outP, {headX + 13, headY - 4, c_out})
  table.insert(outP, {headX + 14, headY - 3, c_out})

  -- Body fill
  for y = headY + 1, headY + 10 do
    for x = headX + 1, headX + 15 do
      local isLight = (x >= headX + 3 and x <= headX + 9 and y >= headY + 2 and y <= headY + 5)
      local isMid = (x >= headX + 2 and x <= headX + 12 and y <= headY + 7)
      if isLight then table.insert(bodyP, {x, y, c_sk_l})
      elseif isMid then table.insert(bodyP, {x, y, c_sk_m})
      else table.insert(bodyP, {x, y, c_sk_d}) end
    end
  end

  -- Dorsal crest fill
  for y = headY - 4, headY do
    for x = headX + 8, headX + 13 do
      table.insert(bodyP, {x, y, c_sk_m})
    end
  end

  -- Fin-hand fill
  for y = headY + 7, headY + 10 do
    for x = headX + 3 + finFlex, headX + 6 + finFlex do
      table.insert(bodyP, {x, y, c_mud_m})
    end
  end

  -- Tail tip
  for y = headY + 6, headY + 8 do
    table.insert(bodyP, {headX + 16, y, c_mud_d})
  end

  -- Details: LEFT EYE (NO SCAR)
  for y = headY + 2, headY + 4 do
    for x = headX + 2, headX + 4 do
      table.insert(detP, {x, y, c_eye})
    end
  end
  table.insert(detP, {headX + 3, headY + 3, c_pup})

  -- Orange throat marking
  for y = headY + 6, headY + 8 do
    table.insert(detP, {headX + 3, y, c_or_b})
    table.insert(detP, {headX + 4, y, c_or_d})
  end

  return outP, bodyP, detP
end

-- Left Idle (Frames 11..12)
buildFrame(11, getLeftPixels(0, 0, 0))
buildFrame(12, getLeftPixels(0, -1, 0))

-- Left Walk (Frames 13..16)
buildFrame(13, getLeftPixels(1, 1, 0))
buildFrame(14, getLeftPixels(-2, -2, 1))
buildFrame(15, getLeftPixels(-1, -1, 0))
buildFrame(16, getLeftPixels(0, 0, -1))

-- Left Attack (Frames 17..20)
buildFrame(17, getLeftPixels(2, 1, 0))
buildFrame(18, getLeftPixels(-1, -1, 0))
do
  local o, b, d = getLeftPixels(-1, -1, 0)
  local eff = {
    {2, 14, c_w_dart}, {3, 14, c_w_hi}, {4, 14, c_w_dart},
    {1, 16, c_w_dart}, {2, 16, c_w_hi},
    {3, 18, c_w_hi}
  }
  buildFrame(19, o, b, d, eff)
end
do
  local o, b, d = getLeftPixels(0, 0, 0)
  local eff = {
    {2, 15, c_w_dart}, {3, 15, c_w_hi}
  }
  buildFrame(20, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- RIGHT DIRECTION (Rows 2, Frames 21..30)
--------------------------------------------------------------------------------

local function getRightPixels(dx, dy, finFlex)
  dx = dx or 0
  dy = dy or 0
  finFlex = finFlex or 0
  local outP, bodyP, detP = {}, {}, {}

  local headX = 25 + dx
  local headY = 12 + dy

  -- Outline body
  for y = headY, headY + 11 do
    for x = headX - 16, headX do
      if (y == headY and x >= headX - 13 and x <= headX - 3) or
         (y == headY + 11 and x >= headX - 14 and x <= headX - 4) or
         (x == headX and y >= headY + 3 and y <= headY + 8) or
         (x == headX - 16 and y >= headY + 4 and y <= headY + 9) then
        table.insert(outP, {x, y, c_out})
      end
    end
  end

  -- Front fin-hand outline
  for y = headY + 6, headY + 10 do table.insert(outP, {headX - 2 - finFlex, y, c_out}) end
  for x = headX - 6 - finFlex, headX - 2 - finFlex do table.insert(outP, {x, headY + 11, c_out}) end

  -- Dorsal crest outline
  table.insert(outP, {headX - 12, headY - 5, c_out})
  table.insert(outP, {headX - 13, headY - 4, c_out})
  table.insert(outP, {headX - 14, headY - 3, c_out})

  -- Body fill
  for y = headY + 1, headY + 10 do
    for x = headX - 15, headX - 1 do
      local isLight = (x >= headX - 9 and x <= headX - 3 and y >= headY + 2 and y <= headY + 5)
      local isMid = (x >= headX - 12 and x <= headX - 2 and y <= headY + 7)
      if isLight then table.insert(bodyP, {x, y, c_sk_l})
      elseif isMid then table.insert(bodyP, {x, y, c_sk_m})
      else table.insert(bodyP, {x, y, c_sk_d}) end
    end
  end

  -- Dorsal crest fill
  for y = headY - 4, headY do
    for x = headX - 13, headX - 8 do
      table.insert(bodyP, {x, y, c_sk_m})
    end
  end

  -- Fin-hand fill
  for y = headY + 7, headY + 10 do
    for x = headX - 6 - finFlex, headX - 3 - finFlex do
      table.insert(bodyP, {x, y, c_mud_m})
    end
  end

  -- Tail tip
  for y = headY + 6, headY + 8 do
    table.insert(bodyP, {headX - 16, y, c_mud_d})
  end

  -- Details: RIGHT EYE WITH SCAR
  for y = headY + 2, headY + 4 do
    for x = headX - 4, headX - 2 do
      table.insert(detP, {x, y, c_eye})
    end
  end
  table.insert(detP, {headX - 3, headY + 3, c_pup})

  -- SCAR ON CREATURE'S RIGHT EYE
  table.insert(detP, {headX - 5, headY + 1, c_scar})
  table.insert(detP, {headX - 4, headY + 2, c_scar})
  table.insert(detP, {headX - 3, headY + 3, c_scar})
  table.insert(detP, {headX - 2, headY + 4, c_scar})

  -- Orange throat marking
  for y = headY + 6, headY + 8 do
    table.insert(detP, {headX - 3, y, c_or_b})
    table.insert(detP, {headX - 4, y, c_or_d})
  end

  return outP, bodyP, detP
end

-- Right Idle (Frames 21..22)
buildFrame(21, getRightPixels(0, 0, 0))
buildFrame(22, getRightPixels(0, -1, 0))

-- Right Walk (Frames 23..26)
buildFrame(23, getRightPixels(-1, 1, 0))
buildFrame(24, getRightPixels(2, -2, 1))
buildFrame(25, getRightPixels(1, -1, 0))
buildFrame(26, getRightPixels(0, 0, -1))

-- Right Attack (Frames 27..30)
buildFrame(27, getRightPixels(-2, 1, 0))
buildFrame(28, getRightPixels(1, -1, 0))
do
  local o, b, d = getRightPixels(1, -1, 0)
  local eff = {
    {26, 14, c_w_dart}, {27, 14, c_w_hi}, {28, 14, c_w_dart},
    {29, 16, c_w_dart}, {30, 16, c_w_hi},
    {27, 18, c_w_hi}
  }
  buildFrame(29, o, b, d, eff)
end
do
  local o, b, d = getRightPixels(0, 0, 0)
  local eff = {
    {28, 15, c_w_dart}, {29, 15, c_w_hi}
  }
  buildFrame(30, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- UP DIRECTION (Rows 3, Frames 31..40)
--------------------------------------------------------------------------------

local function getUpPixels(dy, crestShift)
  dy = dy or 0
  crestShift = crestShift or 0
  local outP, bodyP, detP = {}, {}, {}

  local headY = 12 + dy

  -- Outline body back
  for y = headY, headY + 11 do
    for x = 9, 22 do
      if (y == headY and x >= 12 and x <= 19) or
         (y == headY + 11 and x >= 11 and x <= 20) or
         (x == 9 or x == 22 and y >= headY + 3 and y <= headY + 9) then
        table.insert(outP, {x, y, c_out})
      end
    end
  end

  -- Fin-hands outline
  for y = headY + 5, headY + 9 do
    table.insert(outP, {6, y, c_out})
    table.insert(outP, {25, y, c_out})
  end

  -- Dorsal crest outline
  local cX = 21 + crestShift
  table.insert(outP, {cX, headY - 5, c_out})
  table.insert(outP, {cX + 1, headY - 4, c_out})
  table.insert(outP, {cX + 2, headY - 3, c_out})

  -- Body fill
  for y = headY + 1, headY + 10 do
    for x = 10, 21 do
      if x >= 13 and x <= 18 and y >= headY + 3 and y <= headY + 7 then
        table.insert(bodyP, {x, y, c_sk_m})
      else
        table.insert(bodyP, {x, y, c_sk_d})
      end
    end
  end

  -- Dorsal crest fill
  for y = headY - 4, headY do
    for x = 18 + crestShift, 22 + crestShift do
      if x <= 30 then table.insert(bodyP, {x, y, c_sk_m}) end
    end
  end

  -- Fin-hands back fill
  for y = headY + 6, headY + 9 do
    for x = 7, 9 do table.insert(bodyP, {x, y, c_mud_d}) end
    for x = 22, 24 do table.insert(bodyP, {x, y, c_mud_d}) end
  end

  -- Details
  for y = headY - 3, headY - 1 do
    table.insert(detP, {19, y, c_mud_m})
    table.insert(detP, {21, y, c_mud_m})
  end

  return outP, bodyP, detP
end

-- Up Idle (Frames 31..32)
buildFrame(31, getUpPixels(0, 0))
buildFrame(32, getUpPixels(-1, 0))

-- Up Walk (Frames 33..36)
buildFrame(33, getUpPixels(1, 0))
buildFrame(34, getUpPixels(-2, 1))
buildFrame(35, getUpPixels(-1, 0))
buildFrame(36, getUpPixels(0, -1))

-- Up Attack (Frames 37..40)
buildFrame(37, getUpPixels(2, 0))
buildFrame(38, getUpPixels(-1, 0))
do
  local o, b, d = getUpPixels(-1, 0)
  local eff = {
    {14, 2, c_w_dart}, {15, 2, c_w_hi}, {16, 2, c_w_dart},
    {17, 1, c_w_dart}, {18, 1, c_w_hi}
  }
  buildFrame(39, o, b, d, eff)
end
do
  local o, b, d = getUpPixels(0, 0)
  local eff = {
    {15, 2, c_w_dart}, {16, 2, c_w_hi}
  }
  buildFrame(40, o, b, d, eff)
end

--------------------------------------------------------------------------------
-- SAVE & EXPORT
--------------------------------------------------------------------------------
spr:saveAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-mudskipper-skirmisher/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-mudskipper-skirmisher/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-mudskipper-skirmisher/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_MUDSKIPPER_SKIRMISHER")
