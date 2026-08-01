
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-vinehorn-stag/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },         -- 0: trans
  Color{ r=36, g=24, b=16, a=255 },    -- 1: outline
  Color{ r=74, g=48, b=30, a=255 },    -- 2: wood_dark
  Color{ r=120, g=80, b=50, a=255 },   -- 3: wood_mid
  Color{ r=170, g=118, b=75, a=255 },  -- 4: wood_light
  Color{ r=41, g=64, b=37, a=255 },    -- 5: leaf_dark
  Color{ r=74, g=110, b=61, a=255 },   -- 6: leaf_mid
  Color{ r=120, g=163, b=89, a=255 },  -- 7: leaf_light
  Color{ r=179, g=91, b=119, a=255 },  -- 8: pink_dark
  Color{ r=247, g=168, b=196, a=255 }, -- 9: pink_light
  Color{ r=184, g=138, b=50, a=255 },  -- 10: gold_dark
  Color{ r=252, g=224, b=104, a=255 }  -- 11: gold_light
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
local c_wd  = colors[3]
local c_wm  = colors[4]
local c_wl  = colors[5]
local c_ld  = colors[6]
local c_lm  = colors[7]
local c_ll  = colors[8]
local c_pd  = colors[9]
local c_pl  = colors[10]
local c_gd  = colors[11]
local c_gl  = colors[12]

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
  local headBow = 0

  if anim == "idle" then
    if animFrame == 2 then offsetY = -1 end
  elseif anim == "walk" then
    if animFrame == 1 then offsetX = -1
    elseif animFrame == 2 then offsetY = 1
    elseif animFrame == 3 then offsetX = 1
    end
  elseif anim == "attack" then
    if animFrame == 1 then headBow = 2; offsetY = 1
    elseif animFrame == 2 then headBow = 3; offsetY = 1
    elseif animFrame == 3 then headBow = 1; offsetY = -1
    elseif animFrame == 4 then offsetY = 0 end
  end

  local cx = 16 + offsetX
  local cy = 16 + offsetY

  ----------------------------------
  -- OUTLINE
  ----------------------------------
  drawOval(imgOutline, cx, cy, 6, 8, c_out)         -- Torso base outline
  drawOval(imgOutline, cx, cy-8+headBow, 4, 4, c_out)-- Head/Neck outline

  ----------------------------------
  -- BODY (Stag Torso, Long Legs, Neck/Head, Antlers)
  ----------------------------------
  -- Slender legs
  put(imgBody, cx-4, cy+7, c_wd); put(imgBody, cx-4, cy+8, c_wd); put(imgBody, cx-4, cy+9, c_wd)
  put(imgBody, cx+4, cy+7, c_wd); put(imgBody, cx+4, cy+8, c_wd); put(imgBody, cx+4, cy+9, c_wd)

  -- Main torso
  drawOval(imgBody, cx, cy, 5, 7, c_wm)

  -- Neck and Head
  drawOval(imgBody, cx, cy-7+headBow, 3, 4, c_wm)

  -- Vine-wrapped Antler Branches
  if dir == "down" then
    -- Right antler (screen left): branches up-left
    put(imgBody, cx-3, cy-10+headBow, c_ld); put(imgBody, cx-4, cy-11+headBow, c_ld)
    put(imgBody, cx-5, cy-12+headBow, c_ld); put(imgBody, cx-6, cy-13+headBow, c_ld)
    -- Left antler (screen right): branches up-right
    put(imgBody, cx+3, cy-10+headBow, c_ld); put(imgBody, cx+4, cy-11+headBow, c_ld)
    put(imgBody, cx+5, cy-12+headBow, c_ld); put(imgBody, cx+6, cy-13+headBow, c_ld)

  elseif dir == "left" then
    -- Head facing left
    put(imgBody, cx-4, cy-7+headBow, c_wm)
    -- Antlers tilting left
    put(imgBody, cx-2, cy-10+headBow, c_ld); put(imgBody, cx-4, cy-12+headBow, c_ld)
    put(imgBody, cx+2, cy-10+headBow, c_ld); put(imgBody, cx+4, cy-12+headBow, c_ld)

  elseif dir == "right" then
    -- Head facing right
    put(imgBody, cx+4, cy-7+headBow, c_wm)
    -- Antlers tilting right
    put(imgBody, cx+2, cy-10+headBow, c_ld); put(imgBody, cx+4, cy-12+headBow, c_ld)
    put(imgBody, cx-2, cy-10+headBow, c_ld); put(imgBody, cx-4, cy-12+headBow, c_ld)

  elseif dir == "up" then
    put(imgBody, cx-3, cy-10+headBow, c_ld); put(imgBody, cx-5, cy-12+headBow, c_ld)
    put(imgBody, cx+3, cy-10+headBow, c_ld); put(imgBody, cx+5, cy-12+headBow, c_ld)
  end

  ----------------------------------
  -- DETAILS (Leaf-fringed chest, vine accents, pale-pink flowers: 2 on creature's LEFT antler, 1 on RIGHT)
  ----------------------------------
  -- Leaf-fringed chest
  drawOval(imgDetails, cx, cy-2, 3, 3, c_lm)
  put(imgDetails, cx, cy-2, c_ll)

  -- PALE PINK FLOWERS ON ANTLERS
  if dir == "down" then
    -- Creature facing down -> Left antler is screen RIGHT (2 flowers), Right antler is screen LEFT (1 flower)
    -- Screen RIGHT (Left antler): 2 flowers
    put(imgDetails, cx+4, cy-11+headBow, c_pl); put(imgDetails, cx+5, cy-11+headBow, c_pd)
    put(imgDetails, cx+6, cy-13+headBow, c_pl); put(imgDetails, cx+7, cy-13+headBow, c_pd)
    -- Screen LEFT (Right antler): 1 flower
    put(imgDetails, cx-5, cy-12+headBow, c_pl); put(imgDetails, cx-6, cy-12+headBow, c_pd)

  elseif dir == "left" then
    -- Creature facing left -> Left antler is FOREGROUND (2 flowers), Right antler is BACKGROUND (1 flower)
    -- Foreground (Left antler): 2 flowers
    put(imgDetails, cx-3, cy-11+headBow, c_pl); put(imgDetails, cx-2, cy-11+headBow, c_pd)
    put(imgDetails, cx-4, cy-13+headBow, c_pl); put(imgDetails, cx-5, cy-13+headBow, c_pd)
    -- Background (Right antler): 1 flower
    put(imgDetails, cx+4, cy-12+headBow, c_pl); put(imgDetails, cx+5, cy-12+headBow, c_pd)

  elseif dir == "right" then
    -- Creature facing right -> Left antler is BACKGROUND (2 flowers), Right antler is FOREGROUND (1 flower)
    -- Background (Left antler): 2 flowers
    put(imgDetails, cx-4, cy-11+headBow, c_pl); put(imgDetails, cx-5, cy-11+headBow, c_pd)
    put(imgDetails, cx-3, cy-13+headBow, c_pl); put(imgDetails, cx-2, cy-13+headBow, c_pd)
    -- Foreground (Right antler): 1 flower
    put(imgDetails, cx+4, cy-12+headBow, c_pl); put(imgDetails, cx+5, cy-12+headBow, c_pd)

  elseif dir == "up" then
    -- Creature facing up -> Left antler is screen LEFT (2 flowers), Right antler is screen RIGHT (1 flower)
    -- Screen LEFT (Left antler): 2 flowers
    put(imgDetails, cx-4, cy-11+headBow, c_pl); put(imgDetails, cx-5, cy-11+headBow, c_pd)
    put(imgDetails, cx-6, cy-13+headBow, c_pl); put(imgDetails, cx-7, cy-13+headBow, c_pd)
    -- Screen RIGHT (Right antler): 1 flower
    put(imgDetails, cx+5, cy-12+headBow, c_pl); put(imgDetails, cx+6, cy-12+headBow, c_pd)
  end

  ----------------------------------
  -- EFFECTS (Targeting line & Pollen lance beam)
  ----------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- Golden targeting ray display
      if dir == "down" then
        for y = cy+4, 31 do put(imgEffects, cx, y, c_gd) end
      elseif dir == "left" then
        for x = 0, cx-4 do put(imgEffects, x, cy, c_gd) end
      elseif dir == "right" then
        for x = cx+4, 31 do put(imgEffects, x, cy, c_gd) end
      elseif dir == "up" then
        for y = 0, cy-4 do put(imgEffects, cx, y, c_gd) end
      end

    elseif animFrame == 3 then
      -- Fast golden pollen lance beam firing
      if dir == "down" then
        for y = cy+2, 31 do
          put(imgEffects, cx, y, c_gl)
          put(imgEffects, cx-1, y, c_gd)
          put(imgEffects, cx+1, y, c_gd)
        end
      elseif dir == "left" then
        for x = 0, cx-2 do
          put(imgEffects, x, cy, c_gl)
          put(imgEffects, x, cy-1, c_gd)
          put(imgEffects, x, cy+1, c_gd)
        end
      elseif dir == "right" then
        for x = cx+2, 31 do
          put(imgEffects, x, cy, c_gl)
          put(imgEffects, x, cy-1, c_gd)
          put(imgEffects, x, cy+1, c_gd)
        end
      elseif dir == "up" then
        for y = 0, cy-2 do
          put(imgEffects, cx, y, c_gl)
          put(imgEffects, cx-1, y, c_gd)
          put(imgEffects, cx+1, y, c_gd)
        end
      end

    elseif animFrame == 4 then
      -- Pollen particles dissipating
      put(imgEffects, cx-3, cy-3, c_gl); put(imgEffects, cx+3, cy-3, c_gl)
      put(imgEffects, cx-4, cy+4, c_gl); put(imgEffects, cx+4, cy+4, c_gl)
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-vinehorn-stag/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-vinehorn-stag/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-vinehorn-stag/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_VINEHORN_STAG")
