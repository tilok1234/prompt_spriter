
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-barkhide-mauler/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(11)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=24, g=16, b=10, a=255 },     -- 1: c_out (dark bark contour)
  Color{ r=58, g=38, b=24, a=255 },     -- 2: c_bd (dark bark)
  Color{ r=96, g=64, b=40, a=255 },     -- 3: c_bm (mid bark)
  Color{ r=144, g=98, b=60, a=255 },    -- 4: c_bl (light bark highlight)
  Color{ r=34, g=54, b=30, a=255 },     -- 5: c_md (dark moss)
  Color{ r=64, g=98, b=52, a=255 },     -- 6: c_mm (mid moss)
  Color{ r=108, g=152, b=84, a=255 },   -- 7: c_ml (light moss highlight)
  Color{ r=180, g=100, b=20, a=255 },   -- 8: c_ad (dark amber)
  Color{ r=245, g=170, b=40, a=255 },   -- 9: c_al (bright amber sap crack)
  Color{ r=190, g=140, b=80, a=255 }    -- 10: c_sd (bark shard accent)
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
local c_md  = colors[6]
local c_mm  = colors[7]
local c_ml  = colors[8]
local c_ad  = colors[9]
local c_al  = colors[10]
local c_sd  = colors[11]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawOval(img, cx, cy, rx, ry, col)
  for y = math.max(0, math.floor(cy - ry)), math.min(31, math.floor(cy + ry)) do
    for x = math.max(0, math.floor(cx - rx)), math.min(31, math.floor(cx + rx)) do
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
  local armSlam = 0

  if anim == "idle" then
    if animFrame == 2 then
      offsetY = -1
    end
  elseif anim == "walk" then
    if animFrame == 1 then
      offsetX = -1; offsetY = 0
    elseif animFrame == 2 then
      offsetX = 0; offsetY = 1
    elseif animFrame == 3 then
      offsetX = 1; offsetY = 0
    elseif animFrame == 4 then
      offsetX = 0; offsetY = 0
    end
  elseif anim == "attack" then
    if animFrame == 1 then
      offsetY = -2; armSlam = -3 -- Raising arms high
    elseif animFrame == 2 then
      offsetY = 2; armSlam = 3  -- Slamming arms down!
    elseif animFrame == 3 then
      offsetY = 1; armSlam = 1  -- Ground impact
    elseif animFrame == 4 then
      offsetY = 0; armSlam = 0  -- Recovery
    end
  end

  local cx = 16 + offsetX
  local cy = 16 + offsetY

  ---------------------------------------------------------
  -- 1. DOWN DIRECTION (Facing Viewer)
  ---------------------------------------------------------
  if dir == "down" then
    -- Outline
    drawOval(imgOutline, cx, cy-1, 8, 7, c_out)  -- Broad bear torso outline
    drawOval(imgOutline, cx-7, cy+2+armSlam, 3, 5, c_out) -- Right forelimb outline (Screen Left)
    drawOval(imgOutline, cx+7, cy+2+armSlam, 3, 5, c_out) -- Left forelimb outline (Screen Right)

    -- Body (Hunched bear torso, short legs, oversized forelimbs)
    drawOval(imgBody, cx, cy-1, 7, 6, c_bm)
    put(imgBody, cx-2, cy-6, c_bd); put(imgBody, cx+2, cy-6, c_bd) -- Hunched shoulders

    -- Short hind legs/feet
    drawOval(imgBody, cx-4, cy+7, 2, 2, c_bd)
    drawOval(imgBody, cx+4, cy+7, 2, 2, c_bd)

    -- Oversized Forelimbs (Screen Left is Creature's Right, Screen Right is Creature's Left)
    drawOval(imgBody, cx-7, cy+2+armSlam, 2, 4, c_bm) -- Right Forelimb
    drawOval(imgBody, cx+7, cy+2+armSlam, 2, 4, c_bm) -- Left Forelimb

    -- Head / Snout (Hunched low between shoulders)
    drawOval(imgBody, cx, cy-3, 3, 3, c_bm)
    put(imgBody, cx-1, cy-3, c_bl); put(imgBody, cx+1, cy-3, c_bl) -- Wooden snout highlight

    -- Details: Bark Armor Plates, Mossy Shoulders, Amber Cracks
    -- Mossy Shoulders (Both shoulders have moss, Left shoulder has larger plate)
    -- Creature's LEFT Shoulder (Screen RIGHT): LARGER moss/bark plate (3x3)
    drawOval(imgDetails, cx+4, cy-5, 2, 2, c_mm)
    put(imgDetails, cx+4, cy-6, c_ml); put(imgDetails, cx+5, cy-4, c_md)

    -- Creature's RIGHT Shoulder (Screen LEFT): Standard moss plate (2x2)
    put(imgDetails, cx-4, cy-5, c_mm); put(imgDetails, cx-5, cy-5, c_mm)
    put(imgDetails, cx-4, cy-6, c_ml)

    -- Creature's RIGHT Forearm (Screen LEFT): AMBER CRACK crossing right forearm!
    put(imgDetails, cx-7, cy+1+armSlam, c_al)
    put(imgDetails, cx-6, cy+2+armSlam, c_ad)
    put(imgDetails, cx-7, cy+3+armSlam, c_al)

    -- Eyes / Face
    put(imgDetails, cx-2, cy-4, c_al)
    put(imgDetails, cx+2, cy-4, c_al)

  ---------------------------------------------------------
  -- 2. LEFT DIRECTION (Facing Screen Left)
  ---------------------------------------------------------
  elseif dir == "left" then
    -- Facing Screen Left.
    -- Creature's RIGHT side is FOREGROUND, Creature's LEFT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx, cy-1, 7, 7, c_out)
    drawOval(imgOutline, cx-6, cy+2+armSlam, 3, 5, c_out) -- Foreground Right Forelimb outline

    -- Body
    drawOval(imgBody, cx, cy-1, 6, 6, c_bm)
    put(imgBody, cx+2, cy-6, c_bd) -- Hunched back

    -- Short hind leg
    drawOval(imgBody, cx+3, cy+7, 2, 2, c_bd)

    -- Head facing left
    drawOval(imgBody, cx-4, cy-3, 3, 3, c_bm)

    -- Foreground Right Forelimb
    drawOval(imgBody, cx-6, cy+2+armSlam, 2, 4, c_bm)

    -- Background Left Forelimb (peeking behind)
    drawOval(imgBody, cx-4, cy+3+armSlam, 1.5, 3, c_bd)

    -- Details
    -- Creature's RIGHT Forearm (FOREGROUND): AMBER CRACK clearly crossing right forearm!
    put(imgDetails, cx-7, cy+1+armSlam, c_al)
    put(imgDetails, cx-6, cy+2+armSlam, c_ad)
    put(imgDetails, cx-7, cy+3+armSlam, c_al)

    -- Creature's LEFT Shoulder (BACKGROUND): Larger shoulder plate peeking at upper back/neck
    drawOval(imgDetails, cx+1, cy-5, 1.5, 1.5, c_mm)

    -- Foreground Right Shoulder moss
    put(imgDetails, cx-3, cy-5, c_ml)

    -- Eye
    put(imgDetails, cx-5, cy-4, c_al)

  ---------------------------------------------------------
  -- 3. RIGHT DIRECTION (Facing Screen Right)
  ---------------------------------------------------------
  elseif dir == "right" then
    -- Facing Screen Right.
    -- Creature's LEFT side is FOREGROUND, Creature's RIGHT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx, cy-1, 7, 7, c_out)
    drawOval(imgOutline, cx+6, cy+2+armSlam, 3, 5, c_out) -- Foreground Left Forelimb outline

    -- Body
    drawOval(imgBody, cx, cy-1, 6, 6, c_bm)
    put(imgBody, cx-2, cy-6, c_bd) -- Hunched back

    -- Short hind leg
    drawOval(imgBody, cx-3, cy+7, 2, 2, c_bd)

    -- Head facing right
    drawOval(imgBody, cx+4, cy-3, 3, 3, c_bm)

    -- Foreground Left Forelimb
    drawOval(imgBody, cx+6, cy+2+armSlam, 2, 4, c_bm)

    -- Background Right Forelimb
    drawOval(imgBody, cx+4, cy+3+armSlam, 1.5, 3, c_bd)

    -- Details
    -- Creature's LEFT Shoulder (FOREGROUND): LARGER mossy bark plate (3x3)
    drawOval(imgDetails, cx+1, cy-5, 2, 2, c_mm)
    put(imgDetails, cx+1, cy-6, c_ml)
    put(imgDetails, cx+2, cy-4, c_md)

    -- Creature's RIGHT Forearm (BACKGROUND): peeking behind
    put(imgDetails, cx+4, cy+2+armSlam, c_ad)

    -- Eye
    put(imgDetails, cx+5, cy-4, c_al)

  ---------------------------------------------------------
  -- 4. UP DIRECTION (Facing Away / Screen Up)
  ---------------------------------------------------------
  elseif dir == "up" then
    -- Facing Away.
    -- Creature's LEFT is Screen LEFT, Creature's RIGHT is Screen RIGHT.
    -- Outline
    drawOval(imgOutline, cx, cy-1, 8, 7, c_out)
    drawOval(imgOutline, cx-7, cy+2+armSlam, 3, 5, c_out) -- Left Forelimb (Screen Left)
    drawOval(imgOutline, cx+7, cy+2+armSlam, 3, 5, c_out) -- Right Forelimb (Screen Right)

    -- Body (Hunched back view)
    drawOval(imgBody, cx, cy-1, 7, 6, c_bm)
    put(imgBody, cx-1, cy-6, c_bl); put(imgBody, cx+1, cy-6, c_bl) -- Spine/bark plate ridge

    -- Short hind feet
    drawOval(imgBody, cx-4, cy+7, 2, 2, c_bd)
    drawOval(imgBody, cx+4, cy+7, 2, 2, c_bd)

    -- Forelimbs
    drawOval(imgBody, cx-7, cy+2+armSlam, 2, 4, c_bm) -- Left Forelimb (Screen Left)
    drawOval(imgBody, cx+7, cy+2+armSlam, 2, 4, c_bm) -- Right Forelimb (Screen Right)

    -- Details
    -- Creature's LEFT Shoulder (Screen LEFT): LARGER moss plate (3x3)
    drawOval(imgDetails, cx-4, cy-5, 2, 2, c_mm)
    put(imgDetails, cx-4, cy-6, c_ml)

    -- Creature's RIGHT Shoulder (Screen RIGHT): Standard moss plate
    put(imgDetails, cx+4, cy-5, c_mm); put(imgDetails, cx+5, cy-5, c_mm)

    -- Creature's RIGHT Forearm (Screen RIGHT): AMBER CRACK
    put(imgDetails, cx+7, cy+1+armSlam, c_al)
    put(imgDetails, cx+6, cy+2+armSlam, c_ad)
    put(imgDetails, cx+7, cy+3+armSlam, c_al)
  end

  ---------------------------------------------------------
  -- EFFECTS LAYER (Forelimb Slam & 3 Widening Rows of Bark Shards)
  ---------------------------------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- Impact point under forelimbs
      if dir == "down" then
        drawOval(imgEffects, cx, cy+7, 4, 1.5, c_al)
      elseif dir == "left" then
        drawOval(imgEffects, cx-8, cy+6, 3, 1.5, c_al)
      elseif dir == "right" then
        drawOval(imgEffects, cx+8, cy+6, 3, 1.5, c_al)
      elseif dir == "up" then
        drawOval(imgEffects, cx, cy-7, 4, 1.5, c_al)
      end

    elseif animFrame == 3 then
      -- 3 widening rows of bark shards erupting forward
      if dir == "down" then
        -- Row 1 (close, narrow): 3 shards
        put(imgEffects, cx-2, cy+8, c_sd); put(imgEffects, cx, cy+8, c_al); put(imgEffects, cx+2, cy+8, c_sd)
        -- Row 2 (mid, wider): 5 shards
        put(imgEffects, cx-5, cy+11, c_sd); put(imgEffects, cx-2, cy+11, c_sd); put(imgEffects, cx, cy+11, c_al)
        put(imgEffects, cx+2, cy+11, c_sd); put(imgEffects, cx+5, cy+11, c_sd)
        -- Row 3 (far, widest): 7 shards
        put(imgEffects, cx-8, cy+14, c_sd); put(imgEffects, cx-5, cy+14, c_sd); put(imgEffects, cx-2, cy+14, c_sd)
        put(imgEffects, cx, cy+14, c_al); put(imgEffects, cx+2, cy+14, c_sd); put(imgEffects, cx+5, cy+14, c_sd)
        put(imgEffects, cx+8, cy+14, c_sd)

      elseif dir == "left" then
        -- Row 1: close
        put(imgEffects, cx-9, cy+4, c_sd); put(imgEffects, cx-9, cy+6, c_al); put(imgEffects, cx-9, cy+8, c_sd)
        -- Row 2: mid
        put(imgEffects, cx-12, cy+1, c_sd); put(imgEffects, cx-12, cy+4, c_sd); put(imgEffects, cx-12, cy+6, c_al)
        put(imgEffects, cx-12, cy+8, c_sd); put(imgEffects, cx-12, cy+11, c_sd)
        -- Row 3: far
        put(imgEffects, cx-15, cy-2, c_sd); put(imgEffects, cx-15, cy+1, c_sd); put(imgEffects, cx-15, cy+4, c_sd)
        put(imgEffects, cx-15, cy+6, c_al); put(imgEffects, cx-15, cy+8, c_sd); put(imgEffects, cx-15, cy+11, c_sd)

      elseif dir == "right" then
        -- Row 1: close
        put(imgEffects, cx+9, cy+4, c_sd); put(imgEffects, cx+9, cy+6, c_al); put(imgEffects, cx+9, cy+8, c_sd)
        -- Row 2: mid
        put(imgEffects, cx+12, cy+1, c_sd); put(imgEffects, cx+12, cy+4, c_sd); put(imgEffects, cx+12, cy+6, c_al)
        put(imgEffects, cx+12, cy+8, c_sd); put(imgEffects, cx+12, cy+11, c_sd)
        -- Row 3: far
        put(imgEffects, cx+15, cy-2, c_sd); put(imgEffects, cx+15, cy+1, c_sd); put(imgEffects, cx+15, cy+4, c_sd)
        put(imgEffects, cx+15, cy+6, c_al); put(imgEffects, cx+15, cy+8, c_sd); put(imgEffects, cx+15, cy+11, c_sd)

      elseif dir == "up" then
        -- Row 1: close
        put(imgEffects, cx-2, cy-8, c_sd); put(imgEffects, cx, cy-8, c_al); put(imgEffects, cx+2, cy-8, c_sd)
        -- Row 2: mid
        put(imgEffects, cx-5, cy-11, c_sd); put(imgEffects, cx-2, cy-11, c_sd); put(imgEffects, cx, cy-11, c_al)
        put(imgEffects, cx+2, cy-11, c_sd); put(imgEffects, cx+5, cy-11, c_sd)
        -- Row 3: far
        put(imgEffects, cx-8, cy-14, c_sd); put(imgEffects, cx-5, cy-14, c_sd); put(imgEffects, cx-2, cy-14, c_sd)
        put(imgEffects, cx, cy-14, c_al); put(imgEffects, cx+2, cy-14, c_sd); put(imgEffects, cx+5, cy-14, c_sd)
        put(imgEffects, cx+8, cy-14, c_sd)
      end

    elseif animFrame == 4 then
      -- Dissipating dust and lingering shards
      if dir == "down" then
        put(imgEffects, cx-7, cy+14, c_sd); put(imgEffects, cx, cy+15, c_al); put(imgEffects, cx+7, cy+14, c_sd)
      elseif dir == "left" then
        put(imgEffects, cx-15, cy-1, c_sd); put(imgEffects, cx-16, cy+6, c_al); put(imgEffects, cx-15, cy+11, c_sd)
      elseif dir == "right" then
        put(imgEffects, cx+15, cy-1, c_sd); put(imgEffects, cx+16, cy+6, c_al); put(imgEffects, cx+15, cy+11, c_sd)
      elseif dir == "up" then
        put(imgEffects, cx-7, cy-14, c_sd); put(imgEffects, cx, cy-15, c_al); put(imgEffects, cx+7, cy-14, c_sd)
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-barkhide-mauler/source.aseprite")

app.command.ExportSpriteSheet{
  ui=false,
  type="rows",
  columns=10,
  rows=4,
  width=320,
  height=128,
  textureFilename="C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-barkhide-mauler/sheet.png",
  exportMode="sprite",
  trim=false
}

local thumbSpr = Sprite(32, 32, ColorMode.RGB)
local thumbImg = Image(32, 32, ColorMode.RGB)
local f1Body = spr.layers[2]:cel(1).image
for y=0,31 do for x=0,31 do thumbImg:drawPixel(x, y, f1Body:getPixel(x, y)) end end
thumbSpr:newCel(thumbSpr.layers[1], 1, thumbImg)
thumbSpr:saveCopyAs("C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-barkhide-mauler/thumbnail.png")
thumbSpr:close()

spr:close()
print("SUCCESSFULLY_CREATED_BARKHIDE_MAULER")
