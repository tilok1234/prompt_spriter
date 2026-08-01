
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rootjaw-burrower/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },         -- 0: trans
  Color{ r=26, g=18, b=12, a=255 },    -- 1: outline
  Color{ r=56, g=35, b=21, a=255 },    -- 2: bark_dark
  Color{ r=89, g=58, b=34, a=255 },    -- 3: bark_mid
  Color{ r=130, g=87, b=53, a=255 },   -- 4: bark_light
  Color{ r=46, g=30, b=20, a=255 },    -- 5: soil_dark
  Color{ r=74, g=51, b=36, a=255 },    -- 6: soil_mid
  Color{ r=158, g=130, b=98, a=255 },  -- 7: root_dark
  Color{ r=219, g=202, b=169, a=255 }, -- 8: root_light
  Color{ r=74, g=70, b=66, a=255 },    -- 9: stone_dark
  Color{ r=133, g=127, b=120, a=255 }, -- 10: stone_light
  Color{ r=179, g=126, b=66, a=255 }   -- 11: dirt_burst
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

local c_out = colors[2]
local c_bd  = colors[3]
local c_bm  = colors[4]
local c_bl  = colors[5]
local c_sd  = colors[6]
local c_sm  = colors[7]
local c_rd  = colors[8]
local c_rl  = colors[9]
local c_std = colors[10]
local c_stl = colors[11]
local c_db  = colors[12]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawOval(img, cx, cy, rx, ry, col)
  for y = math.max(0, cy - ry), math.min(31, cy + ry) do
    for x = math.max(0, cx - rx), math.min(31, cx + rx) do
      local dx = (x - cx) / rx
      local dy = (y - cy) / ry
      if dx*dx + dy*dy <= 1.0 then
        img:drawPixel(x, y, col)
      end
    end
  end
end

for f = 1, 40 do
  local dir, anim, animFrame
  if f >= 1 and f <= 10 then
    dir = "down"
    if f <= 2 then anim, animFrame = "idle", f
    elseif f <= 6 then anim, animFrame = "walk", f - 2
    else anim, animFrame = "attack", f - 6 end
  elseif f >= 11 and f <= 20 then
    dir = "left"
    if f <= 12 then anim, animFrame = "idle", f - 10
    elseif f <= 16 then anim, animFrame = "walk", f - 12
    else anim, animFrame = "attack", f - 16 end
  elseif f >= 21 and f <= 30 then
    dir = "right"
    if f <= 22 then anim, animFrame = "idle", f - 20
    elseif f <= 26 then anim, animFrame = "walk", f - 22
    else anim, animFrame = "attack", f - 26 end
  else
    dir = "up"
    if f <= 32 then anim, animFrame = "idle", f - 30
    elseif f <= 36 then anim, animFrame = "walk", f - 32
    else anim, animFrame = "attack", f - 36 end
  end

  local imgBody    = Image(32, 32, ColorMode.RGB)
  local imgDetails = Image(32, 32, ColorMode.RGB)
  local imgOutline = Image(32, 32, ColorMode.RGB)
  local imgEffects = Image(32, 32, ColorMode.RGB)

  local offsetY = 0
  local offsetX = 0
  local isSubmerged = false

  if anim == "idle" then
    if animFrame == 2 then offsetY = 1 end
  elseif anim == "walk" then
    if animFrame == 1 then offsetX = -1
    elseif animFrame == 2 then offsetY = 1
    elseif animFrame == 3 then offsetX = 1
    end
  elseif anim == "attack" then
    if animFrame == 1 then offsetY = 4; isSubmerged = true
    elseif animFrame == 2 then offsetY = 8; isSubmerged = true
    elseif animFrame == 3 then offsetY = -3
    elseif animFrame == 4 then offsetY = 0 end
  end

  local cx = 16 + offsetX
  local cy = 16 + offsetY

  ----------------------------------
  -- OUTLINE
  ----------------------------------
  if not isSubmerged or animFrame == 1 then
    drawOval(imgOutline, cx, cy, 9, 7, c_out)
    if dir == "down" then
      drawOval(imgOutline, cx, cy+6, 4, 3, c_out)
    elseif dir == "left" then
      drawOval(imgOutline, cx-7, cy+5, 4, 3, c_out)
    elseif dir == "right" then
      drawOval(imgOutline, cx+7, cy+5, 4, 3, c_out)
    end
  end

  ----------------------------------
  -- BODY (Armored bark torso, wedge head, heavy digging claws)
  ----------------------------------
  if not (isSubmerged and animFrame == 2) then
    if dir == "down" then
      -- Heavy stone digging forelimbs
      put(imgBody, cx-7, cy+5, c_std); put(imgBody, cx-8, cy+6, c_stl)
      put(imgBody, cx+7, cy+5, c_std); put(imgBody, cx+8, cy+6, c_stl)
      -- Torso bark plates
      drawOval(imgBody, cx, cy, 8, 6, c_bm)
      -- Wedge head
      drawOval(imgBody, cx, cy+5, 3, 2, c_bd)

    elseif dir == "left" then
      put(imgBody, cx-7, cy+5, c_stl); put(imgBody, cx-8, cy+6, c_std)
      drawOval(imgBody, cx, cy, 8, 6, c_bm)
      drawOval(imgBody, cx-6, cy+4, 3, 2, c_bd)

    elseif dir == "right" then
      put(imgBody, cx+7, cy+5, c_stl); put(imgBody, cx+8, cy+6, c_std)
      drawOval(imgBody, cx, cy, 8, 6, c_bm)
      drawOval(imgBody, cx+6, cy+4, 3, 2, c_bd)

    elseif dir == "up" then
      put(imgBody, cx-7, cy+5, c_std); put(imgBody, cx+7, cy+5, c_std)
      drawOval(imgBody, cx, cy, 8, 6, c_bm)
    end
  end

  ----------------------------------
  -- DETAILS (Bark plate lines, forked mandible on anatomical right, pale root stripe on anatomical LEFT flank)
  ----------------------------------
  if not (isSubmerged and animFrame == 2) then
    -- Layered bark plate highlights
    put(imgDetails, cx-3, cy-3, c_bl); put(imgDetails, cx+3, cy-3, c_bl)
    put(imgDetails, cx-4, cy, c_bl); put(imgDetails, cx+4, cy, c_bl)

    -- FORKED MANDIBLE ON ANATOMICAL RIGHT & SINGLE MANDIBLE ON LEFT
    if dir == "down" then
      -- Creature facing down -> Right mandible is screen LEFT (FORKED)
      put(imgDetails, cx-2, cy+7, c_rl); put(imgDetails, cx-3, cy+8, c_rl); put(imgDetails, cx-1, cy+8, c_rl)
      -- Left mandible is screen RIGHT (SINGLE)
      put(imgDetails, cx+2, cy+7, c_rl); put(imgDetails, cx+2, cy+8, c_rl)

      -- PALE ROOT STRIPE on creature's anatomical LEFT flank (Screen RIGHT)
      put(imgDetails, cx+5, cy-2, c_rl); put(imgDetails, cx+5, cy, c_rl)
      put(imgDetails, cx+6, cy+2, c_rl); put(imgDetails, cx+5, cy+4, c_rl)

    elseif dir == "left" then
      -- Creature facing left -> Right mandible is BACKGROUND (far side), Left mandible is FOREGROUND
      put(imgDetails, cx-8, cy+5, c_rl); put(imgDetails, cx-9, cy+6, c_rl)

      -- PALE ROOT STRIPE on creature's anatomical LEFT flank (FOREGROUND facing viewer)
      put(imgDetails, cx-3, cy+2, c_rl); put(imgDetails, cx-1, cy+2, c_rl)
      put(imgDetails, cx+1, cy+2, c_rl); put(imgDetails, cx+3, cy+2, c_rl)

    elseif dir == "right" then
      -- Creature facing right -> Right mandible is FOREGROUND (FORKED)
      put(imgDetails, cx+8, cy+5, c_rl); put(imgDetails, cx+9, cy+4, c_rl); put(imgDetails, cx+9, cy+6, c_rl)

      -- PALE ROOT STRIPE on creature's anatomical LEFT flank (BACKGROUND far side)
      put(imgDetails, cx-3, cy-3, c_rl); put(imgDetails, cx-1, cy-3, c_rl)
      put(imgDetails, cx+1, cy-3, c_rl); put(imgDetails, cx+3, cy-3, c_rl)

    elseif dir == "up" then
      -- Creature facing up -> Right mandible is screen RIGHT (FORKED), Left is screen LEFT
      -- PALE ROOT STRIPE on creature's anatomical LEFT flank (Screen LEFT)
      put(imgDetails, cx-5, cy-2, c_rl); put(imgDetails, cx-5, cy, c_rl)
      put(imgDetails, cx-6, cy+2, c_rl); put(imgDetails, cx-5, cy+4, c_rl)
    end
  end

  ----------------------------------
  -- EFFECTS (Ground cracks, burrow soil mound, erupting dirt/root cone)
  ----------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- Submerged soil mound and ground crack lines
      drawOval(imgEffects, cx, cy+4, 7, 3, c_sd)
      put(imgEffects, cx-8, cy+4, c_db); put(imgEffects, cx-9, cy+3, c_db)
      put(imgEffects, cx+8, cy+4, c_db); put(imgEffects, cx+9, cy+5, c_db)
    elseif animFrame == 3 or animFrame == 4 then
      -- Erupting forward dirt-and-root cone particles
      local burstDist = (animFrame == 3) and 8 or 13
      if dir == "down" then
        for i = -3, 3 do
          put(imgEffects, cx+i, cy+burstDist, c_db)
          put(imgEffects, cx+i*2, cy+burstDist+2, c_sd)
        end
      elseif dir == "left" then
        for i = -3, 3 do
          put(imgEffects, cx-burstDist, cy+i, c_db)
          put(imgEffects, cx-burstDist-2, cy+i*2, c_sd)
        end
      elseif dir == "right" then
        for i = -3, 3 do
          put(imgEffects, cx+burstDist, cy+i, c_db)
          put(imgEffects, cx+burstDist+2, cy+i*2, c_sd)
        end
      elseif dir == "up" then
        for i = -3, 3 do
          put(imgEffects, cx+i, cy-burstDist, c_db)
          put(imgEffects, cx+i*2, cy-burstDist-2, c_sd)
        end
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rootjaw-burrower/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rootjaw-burrower/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-rootjaw-burrower/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_ROOTJAW_BURROWER")
