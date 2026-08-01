import fs from 'fs';

const luaScript = `
local spr = Sprite(32, 32)
local targetDir = "C:/Users/headc/Documents/AI_training_lab/prompt_spriter/workspace/staging/enemy-mob-32-mossback-tuskling-v2"
spr.filename = targetDir .. "/source.aseprite"

-- Palette setup (12 colors total: 0 transparent + 11 opaque)
local pal = spr.palettes[1]
pal:resize(12)
pal:setColor(0, Color{r=0, g=0, b=0, a=0}) -- transparent
pal:setColor(1, Color{r=0x18, g=0x10, b=0x08, a=255}) -- c_dark (dark outline)
pal:setColor(2, Color{r=0x2a, g=0x1a, b=0x0e, a=255}) -- c_bark_dark
pal:setColor(3, Color{r=0x5a, g=0x3d, b=0x28, a=255}) -- c_bark_mid
pal:setColor(4, Color{r=0x8b, g=0x5a, b=0x36, a=255}) -- c_bark_light
pal:setColor(5, Color{r=0x1e, g=0x3b, b=0x18, a=255}) -- c_moss_dark
pal:setColor(6, Color{r=0x3a, g=0x6b, b=0x28, a=255}) -- c_moss_mid
pal:setColor(7, Color{r=0x68, g=0xa3, b=0x3c, a=255}) -- c_moss_light
pal:setColor(8, Color{r=0x9e, g=0x93, b=0x7d, a=255}) -- c_tusk_shadow
pal:setColor(9, Color{r=0xe3, g=0xda, b=0xbf, a=255}) -- c_tusk_base
pal:setColor(10, Color{r=0xd0, g=0x38, b=0x2b, a=255}) -- c_eye
pal:setColor(11, Color{r=0x86, g=0xc4, b=0x42, a=255}) -- c_leaf

local c_dark = Color{r=0x18, g=0x10, b=0x08, a=255}
local c_bark_dark = Color{r=0x2a, g=0x1a, b=0x0e, a=255}
local c_bark_mid = Color{r=0x5a, g=0x3d, b=0x28, a=255}
local c_bark_light = Color{r=0x8b, g=0x5a, b=0x36, a=255}
local c_moss_dark = Color{r=0x1e, g=0x3b, b=0x18, a=255}
local c_moss_mid = Color{r=0x3a, g=0x6b, b=0x28, a=255}
local c_moss_light = Color{r=0x68, g=0xa3, b=0x3c, a=255}
local c_tusk_shadow = Color{r=0x9e, g=0x93, b=0x7d, a=255}
local c_tusk_base = Color{r=0xe3, g=0xda, b=0xbf, a=255}
local c_eye = Color{r=0xd0, g=0x38, b=0x2b, a=255}
local c_leaf = Color{r=0x86, g=0xc4, b=0x42, a=255}

-- Setup layers in required bottom-to-top order
spr.layers[1].name = "outline"
local layerBody = spr:newLayer()
layerBody.name = "body"
local layerDetails = spr:newLayer()
layerDetails.name = "details"
local layerEffects = spr:newLayer()
layerEffects.name = "effects"

local layOutline = spr.layers[1]

-- Expand to 40 timeline frames
for i = 2, 40 do
  spr:newFrame()
end

-- Define tags and durations
local tags = {
  {1, 2, "down_idle", 400},
  {3, 6, "down_walk", 150},
  {7, 10, "down_attack", 120},
  {11, 12, "left_idle", 400},
  {13, 16, "left_walk", 150},
  {17, 20, "left_attack", 120},
  {21, 22, "right_idle", 400},
  {23, 26, "right_walk", 150},
  {27, 30, "right_attack", 120},
  {31, 32, "up_idle", 400},
  {33, 36, "up_walk", 150},
  {37, 40, "up_attack", 120}
}

for _, t in ipairs(tags) do
  local tag = spr:newTag(t[1], t[2])
  tag.name = t[3]
  for f = t[1], t[2] do
    spr.frames[f].duration = t[4] / 1000.0
  end
end

-- Drawing Helper Functions
local function getImg(lay, frameNum)
  local cel = lay:cel(frameNum)
  if not cel then
    cel = spr:newCel(lay, frameNum)
  end
  return cel.image
end

local function drawRect(img, x1, y1, x2, y2, color)
  for y = y1, y2 do
    for x = x1, x2 do
      if x >= 0 and x < 32 and y >= 0 and y < 32 then
        img:drawPixel(x, y, color)
      end
    end
  end
end

local function p(img, x, y, color)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, color)
  end
end

---------------------------------------------------------
-- DRAWING DIRECTION 0: DOWN (Frames 1..10)
---------------------------------------------------------
local function drawDown(frameNum, dy, poseType, animFrame)
  local imgO = getImg(layOutline, frameNum)
  local imgB = getImg(layerBody, frameNum)
  local imgD = getImg(layerDetails, frameNum)
  local imgE = getImg(layerEffects, frameNum)

  local yOff = dy

  -- Leg positions based on animFrame
  local legL_y1, legL_y2 = 24 + yOff, 26 + yOff
  local legR_y1, legR_y2 = 24 + yOff, 26 + yOff
  if poseType == "walk" then
    if animFrame == 1 then legL_y2 = legL_y2 + 1
    elseif animFrame == 2 then legL_y1 = legL_y1 - 1
    elseif animFrame == 3 then legR_y2 = legR_y2 + 1
    elseif animFrame == 4 then legR_y1 = legR_y1 - 1
    end
  end

  -- Outline (Layer 1)
  drawRect(imgO, 6, 10 + yOff, 25, 25 + yOff, c_dark)
  -- Leg outlines
  drawRect(imgO, 8, legL_y1 - 1, 12, legL_y2 + 1, c_dark)
  drawRect(imgO, 19, legR_y1 - 1, 23, legR_y2 + 1, c_dark)

  -- Body (Layer 2)
  -- Legs
  drawRect(imgB, 9, legL_y1, 11, legL_y2, c_bark_dark)
  drawRect(imgB, 20, legR_y1, 22, legR_y2, c_bark_dark)
  -- Torso & Head
  drawRect(imgB, 7, 11 + yOff, 24, 23 + yOff, c_bark_mid)
  -- Bark shading
  drawRect(imgB, 7, 19 + yOff, 24, 23 + yOff, c_bark_dark)
  drawRect(imgB, 12, 17 + yOff, 19, 23 + yOff, c_bark_mid)
  -- Moss mantle on upper back and LEFT shoulder (viewer's left side x=7..14)
  drawRect(imgB, 7, 11 + yOff, 14, 16 + yOff, c_moss_mid)
  drawRect(imgB, 15, 11 + yOff, 24, 15 + yOff, c_moss_dark)
  drawRect(imgB, 8, 12 + yOff, 12, 14 + yOff, c_moss_light)

  -- Details (Layer 3)
  -- Snout & Nostrils
  drawRect(imgD, 13, 20 + yOff, 18, 23 + yOff, c_bark_light)
  p(imgD, 14, 22 + yOff, c_dark)
  p(imgD, 17, 22 + yOff, c_dark)
  -- Glowing Red Eyes
  p(imgD, 11, 18 + yOff, c_eye)
  p(imgD, 20, 18 + yOff, c_eye)

  -- Tusks: Left tusk longer, Right tusk shorter
  -- Left Tusk (viewer's left x=6..10)
  p(imgD, 10, 21 + yOff, c_tusk_shadow)
  p(imgD, 9, 22 + yOff, c_tusk_base)
  p(imgD, 8, 23 + yOff, c_tusk_base)
  p(imgD, 7, 22 + yOff, c_tusk_base)
  p(imgD, 6, 20 + yOff, c_tusk_base)
  p(imgD, 6, 19 + yOff, c_tusk_base)
  -- Right Tusk (viewer's right x=21..24, shorter)
  p(imgD, 21, 21 + yOff, c_tusk_shadow)
  p(imgD, 22, 22 + yOff, c_tusk_base)
  p(imgD, 23, 22 + yOff, c_tusk_base)
  p(imgD, 24, 21 + yOff, c_tusk_base)

  -- Moss accents
  p(imgD, 9, 13 + yOff, c_leaf)
  p(imgD, 11, 11 + yOff, c_leaf)

  -- Effects (Layer 4) for attack
  if poseType == "attack" then
    if animFrame == 1 then
      -- Dust puff at feet
      p(imgE, 7, 26 + yOff, c_bark_light)
      p(imgE, 24, 26 + yOff, c_bark_light)
    elseif animFrame == 2 then
      -- Charge aura
      p(imgE, 5, 18 + yOff, c_moss_light)
      p(imgE, 26, 18 + yOff, c_moss_light)
    elseif animFrame == 3 then
      -- Seed projectile burst!
      p(imgE, 4, 15 + yOff, c_leaf)
      p(imgE, 3, 22 + yOff, c_moss_light)
      p(imgE, 27, 15 + yOff, c_leaf)
      p(imgE, 28, 22 + yOff, c_moss_light)
      p(imgE, 15, 26 + yOff, c_leaf)
    elseif animFrame == 4 then
      -- Dispersing seeds
      p(imgE, 2, 13 + yOff, c_leaf)
      p(imgE, 29, 13 + yOff, c_leaf)
    end
  end
end

-- Render DOWN frames (1..10)
drawDown(1, 0, "idle", 1)
drawDown(2, -1, "idle", 2)
drawDown(3, 0, "walk", 1)
drawDown(4, -1, "walk", 2)
drawDown(5, 0, "walk", 3)
drawDown(6, 1, "walk", 4)
drawDown(7, -2, "attack", 1)
drawDown(8, 2, "attack", 2)
drawDown(9, 1, "attack", 3)
drawDown(10, 0, "attack", 4)


---------------------------------------------------------
-- DRAWING DIRECTION 1: LEFT (Frames 11..20)
---------------------------------------------------------
local function drawLeft(frameNum, dx, dy, poseType, animFrame)
  local imgO = getImg(layOutline, frameNum)
  local imgB = getImg(layerBody, frameNum)
  local imgD = getImg(layerDetails, frameNum)
  local imgE = getImg(layerEffects, frameNum)

  local xOff = dx
  local yOff = dy

  -- Outline
  drawRect(imgO, 5 + xOff, 10 + yOff, 26 + xOff, 26 + yOff, c_dark)

  -- Body
  -- Torso
  drawRect(imgB, 10 + xOff, 12 + yOff, 24 + xOff, 23 + yOff, c_bark_mid)
  -- Head
  drawRect(imgB, 6 + xOff, 16 + yOff, 12 + xOff, 23 + yOff, c_bark_mid)
  drawRect(imgB, 6 + xOff, 20 + yOff, 12 + xOff, 23 + yOff, c_bark_dark)
  -- Legs
  local l1_y = (poseType == "walk" and animFrame == 1) and 27 or 26
  local l2_y = (poseType == "walk" and animFrame == 3) and 27 or 26
  drawRect(imgB, 9 + xOff, 23 + yOff, 11 + xOff, l1_y + yOff, c_bark_dark)
  drawRect(imgB, 19 + xOff, 23 + yOff, 21 + xOff, l2_y + yOff, c_bark_dark)
  -- Back Moss mantle
  drawRect(imgB, 11 + xOff, 10 + yOff, 23 + xOff, 15 + yOff, c_moss_mid)
  drawRect(imgB, 13 + xOff, 11 + yOff, 20 + xOff, 13 + yOff, c_moss_light)

  -- Details
  -- Snout tip
  drawRect(imgD, 5 + xOff, 20 + yOff, 7 + xOff, 23 + yOff, c_bark_light)
  p(imgD, 5 + xOff, 21 + yOff, c_dark)
  -- Red Eye
  p(imgD, 9 + xOff, 17 + yOff, c_eye)

  -- Prominent Left Tusk
  p(imgD, 8 + xOff, 21 + yOff, c_tusk_shadow)
  p(imgD, 7 + xOff, 22 + yOff, c_tusk_base)
  p(imgD, 5 + xOff, 21 + yOff, c_tusk_base)
  p(imgD, 4 + xOff, 19 + yOff, c_tusk_base)
  -- Shorter Right Tusk peeking behind
  p(imgD, 6 + xOff, 22 + yOff, c_tusk_shadow)

  -- Leaf Tail
  drawRect(imgD, 25 + xOff, 16 + yOff, 26 + xOff, 19 + yOff, c_leaf)
  p(imgD, 26 + xOff, 15 + yOff, c_moss_light)

  -- Effects for attack
  if poseType == "attack" then
    if animFrame == 2 then
      p(imgE, 2 + xOff, 19 + yOff, c_moss_light)
    elseif animFrame == 3 then
      p(imgE, 1 + xOff, 15 + yOff, c_leaf)
      p(imgE, 0 + xOff, 22 + yOff, c_moss_light)
      p(imgE, 12 + xOff, 26 + yOff, c_leaf)
    elseif animFrame == 4 then
      p(imgE, 0 + xOff, 12 + yOff, c_leaf)
    end
  end
end

-- Render LEFT frames (11..20)
drawLeft(11, 0, 0, "idle", 1)
drawLeft(12, 0, -1, "idle", 2)
drawLeft(13, 0, 0, "walk", 1)
drawLeft(14, 0, -1, "walk", 2)
drawLeft(15, 0, 0, "walk", 3)
drawLeft(16, 0, 1, "walk", 4)
drawLeft(17, 2, -1, "attack", 1)
drawLeft(18, -3, 1, "attack", 2)
drawLeft(19, -2, 0, "attack", 3)
drawLeft(20, -1, 0, "attack", 4)


---------------------------------------------------------
-- DRAWING DIRECTION 2: RIGHT (Frames 21..30)
---------------------------------------------------------
local function drawRight(frameNum, dx, dy, poseType, animFrame)
  local imgO = getImg(layOutline, frameNum)
  local imgB = getImg(layerBody, frameNum)
  local imgD = getImg(layerDetails, frameNum)
  local imgE = getImg(layerEffects, frameNum)

  local xOff = dx
  local yOff = dy

  -- Outline
  drawRect(imgO, 5 + xOff, 10 + yOff, 26 + xOff, 26 + yOff, c_dark)

  -- Body
  -- Torso
  drawRect(imgB, 7 + xOff, 12 + yOff, 21 + xOff, 23 + yOff, c_bark_mid)
  -- Head
  drawRect(imgB, 19 + xOff, 16 + yOff, 25 + xOff, 23 + yOff, c_bark_mid)
  drawRect(imgB, 19 + xOff, 20 + yOff, 25 + xOff, 23 + yOff, c_bark_dark)
  -- Legs
  local l1_y = (poseType == "walk" and animFrame == 1) and 27 or 26
  local l2_y = (poseType == "walk" and animFrame == 3) and 27 or 26
  drawRect(imgB, 10 + xOff, 23 + yOff, 12 + xOff, l1_y + yOff, c_bark_dark)
  drawRect(imgB, 20 + xOff, 23 + yOff, 22 + xOff, l2_y + yOff, c_bark_dark)
  -- Back Moss mantle
  drawRect(imgB, 8 + xOff, 10 + yOff, 20 + xOff, 15 + yOff, c_moss_mid)
  drawRect(imgB, 11 + xOff, 11 + yOff, 18 + xOff, 13 + yOff, c_moss_light)

  -- Details
  -- Snout tip
  drawRect(imgD, 24 + xOff, 20 + yOff, 26 + xOff, 23 + yOff, c_bark_light)
  p(imgD, 26 + xOff, 21 + yOff, c_dark)
  -- Red Eye
  p(imgD, 22 + xOff, 17 + yOff, c_eye)

  -- Shorter Right Tusk
  p(imgD, 23 + xOff, 21 + yOff, c_tusk_shadow)
  p(imgD, 24 + xOff, 22 + yOff, c_tusk_base)
  p(imgD, 26 + xOff, 21 + yOff, c_tusk_base)
  p(imgD, 27 + xOff, 20 + yOff, c_tusk_base)
  -- Longer Left Tusk tip peeking behind
  p(imgD, 25 + xOff, 19 + yOff, c_tusk_base)

  -- Leaf Tail
  drawRect(imgD, 5 + xOff, 16 + yOff, 6 + xOff, 19 + yOff, c_leaf)
  p(imgD, 5 + xOff, 15 + yOff, c_moss_light)

  -- Effects for attack
  if poseType == "attack" then
    if animFrame == 2 then
      p(imgE, 29 + xOff, 19 + yOff, c_moss_light)
    elseif animFrame == 3 then
      p(imgE, 30 + xOff, 15 + yOff, c_leaf)
      p(imgE, 31 + xOff, 22 + yOff, c_moss_light)
      p(imgE, 19 + xOff, 26 + yOff, c_leaf)
    elseif animFrame == 4 then
      p(imgE, 31 + xOff, 12 + yOff, c_leaf)
    end
  end
end

-- Render RIGHT frames (21..30)
drawRight(21, 0, 0, "idle", 1)
drawRight(22, 0, -1, "idle", 2)
drawRight(23, 0, 0, "walk", 1)
drawRight(24, 0, -1, "walk", 2)
drawRight(25, 0, 0, "walk", 3)
drawRight(26, 0, 1, "walk", 4)
drawRight(27, -2, -1, "attack", 1)
drawRight(28, 3, 1, "attack", 2)
drawRight(29, 2, 0, "attack", 3)
drawRight(30, 1, 0, "attack", 4)


---------------------------------------------------------
-- DRAWING DIRECTION 3: UP (Frames 31..40)
---------------------------------------------------------
local function drawUp(frameNum, dy, poseType, animFrame)
  local imgO = getImg(layOutline, frameNum)
  local imgB = getImg(layerBody, frameNum)
  local imgD = getImg(layerDetails, frameNum)
  local imgE = getImg(layerEffects, frameNum)

  local yOff = dy

  -- Leg positions
  local legL_y2 = (poseType == "walk" and animFrame == 1) and 27 or 26
  local legR_y2 = (poseType == "walk" and animFrame == 3) and 27 or 26

  -- Outline
  drawRect(imgO, 6, 9 + yOff, 25, 26 + yOff, c_dark)

  -- Body
  -- Rear legs
  drawRect(imgB, 8, 23 + yOff, 11, legL_y2 + yOff, c_bark_dark)
  drawRect(imgB, 20, 23 + yOff, 23, legR_y2 + yOff, c_bark_dark)

  -- Back & Head
  drawRect(imgB, 7, 10 + yOff, 24, 23 + yOff, c_bark_mid)
  -- Full Moss Back Mantle (dominant in rear view)
  drawRect(imgB, 7, 10 + yOff, 24, 19 + yOff, c_moss_mid)
  drawRect(imgB, 9, 11 + yOff, 22, 16 + yOff, c_moss_light)
  drawRect(imgB, 12, 17 + yOff, 19, 19 + yOff, c_moss_dark)

  -- Details
  -- Head top peeking forward
  drawRect(imgD, 11, 9 + yOff, 20, 11 + yOff, c_bark_mid)

  -- Tusks peeking sideways
  p(imgD, 6, 11 + yOff, c_tusk_base)
  p(imgD, 5, 10 + yOff, c_tusk_base)
  p(imgD, 25, 12 + yOff, c_tusk_base)
  p(imgD, 26, 11 + yOff, c_tusk_base)

  -- Centered Leaf Tail
  drawRect(imgD, 14, 20 + yOff, 17, 24 + yOff, c_leaf)
  p(imgD, 15, 25 + yOff, c_moss_dark)

  -- Effects for attack
  if poseType == "attack" then
    if animFrame == 2 then
      p(imgE, 15, 6 + yOff, c_moss_light)
    elseif animFrame == 3 then
      p(imgE, 11, 4 + yOff, c_leaf)
      p(imgE, 20, 4 + yOff, c_leaf)
      p(imgE, 4, 15 + yOff, c_moss_light)
      p(imgE, 27, 15 + yOff, c_moss_light)
    elseif animFrame == 4 then
      p(imgE, 15, 2 + yOff, c_leaf)
    end
  end
end

-- Render UP frames (31..40)
drawUp(31, 0, "idle", 1)
drawUp(32, -1, "idle", 2)
drawUp(33, 0, "walk", 1)
drawUp(34, -1, "walk", 2)
drawUp(35, 0, "walk", 3)
drawUp(36, 1, "walk", 4)
drawUp(37, 2, "attack", 1)
drawUp(38, -3, "attack", 2)
drawUp(39, -2, "attack", 3)
drawUp(40, -1, "attack", 4)

-- Save Aseprite Source File
app.command.SaveFile{ filename = spr.filename, ui = false }
spr:close()

return "SUCCESS"
`;

fs.writeFileSync('scratch/generate_mossback_v2.lua', luaScript, 'utf-8');
console.log('Saved scratch/generate_mossback_v2.lua');
