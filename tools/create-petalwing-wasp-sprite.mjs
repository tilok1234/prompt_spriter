import { writeFileSync, mkdirSync, existsSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-petalwing-wasp";
mkdirSync(stagingDir, { recursive: true });

const luaScript = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: trans
  Color{ r=32, g=8, b=20, a=255 },      -- 1: c_out (dark burgundy/black outline)
  Color{ r=90, g=14, b=40, a=255 },     -- 2: c_bd (burgundy dark)
  Color{ r=142, g=27, b=63, a=255 },    -- 3: c_bm (burgundy mid)
  Color{ r=199, g=56, b=102, a=255 },   -- 4: c_bl (burgundy light / highlight)
  Color{ r=184, g=134, b=11, a=255 },   -- 5: c_yd (yellow dark)
  Color{ r=230, g=184, b=0, a=255 },    -- 6: c_ym (yellow mid)
  Color{ r=255, g=234, b=102, a=255 },  -- 7: c_yl (yellow light / pollen)
  Color{ r=192, g=132, b=151, a=255 },  -- 8: c_pd (pale pink dark)
  Color{ r=247, g=202, b=208, a=255 },  -- 9: c_pm (pale pink mid)
  Color{ r=255, g=240, b=245, a=255 },  -- 10: c_pl (pale pink light / tip)
  Color{ r=232, g=216, b=200, a=255 }   -- 11: c_nd (needle stinger tip)
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
local c_yd  = colors[6]
local c_ym  = colors[7]
local c_yl  = colors[8]
local c_pd  = colors[9]
local c_pm  = colors[10]
local c_pl  = colors[11]
local c_nd  = colors[12]

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
  local wingFlap = 0

  if anim == "idle" then
    if animFrame == 2 then
      offsetY = -1
      wingFlap = 1
    end
  elseif anim == "walk" then
    if animFrame == 1 then
      offsetX = -1
      wingFlap = 1
    elseif animFrame == 2 then
      offsetY = 1
      wingFlap = 0
    elseif animFrame == 3 then
      offsetX = 1
      wingFlap = -1
    elseif animFrame == 4 then
      offsetY = 0
      wingFlap = 0
    end
  elseif anim == "attack" then
    if animFrame == 1 then
      offsetY = 1
      wingFlap = 2 -- wide flare
    elseif animFrame == 2 then
      offsetY = -1
      wingFlap = -1 -- thrust forward
    elseif animFrame == 3 then
      offsetY = 0
      wingFlap = 1
    elseif animFrame == 4 then
      offsetY = 0
      wingFlap = 0
    end
  end

  local cx = 16 + offsetX
  local cy = 16 + offsetY

  ---------------------------------------------------------
  -- 1. DOWN DIRECTION
  ---------------------------------------------------------
  if dir == "down" then
    -- Outline
    drawOval(imgOutline, cx, cy-6, 3, 3, c_out) -- Head outline
    drawOval(imgOutline, cx, cy-2, 4, 4, c_out) -- Thorax outline
    drawOval(imgOutline, cx, cy+5, 2, 4, c_out) -- Abdomen outline

    -- Body (Thorax, Head, Abdomen)
    drawOval(imgBody, cx, cy-6, 2, 2, c_bm) -- Head
    put(imgBody, cx-1, cy-7, c_bl) -- Glossy head top
    drawOval(imgBody, cx, cy-2, 3, 3, c_bm) -- Thorax
    put(imgBody, cx-1, cy-3, c_bl) -- Glossy thorax highlight

    -- Needle Abdomen (segmented)
    put(imgBody, cx, cy+2, c_ym)
    put(imgBody, cx, cy+3, c_ym)
    put(imgBody, cx, cy+4, c_bm)
    put(imgBody, cx, cy+5, c_bm)
    put(imgBody, cx, cy+6, c_yl)
    put(imgBody, cx, cy+7, c_yl)
    put(imgBody, cx, cy+8, c_nd) -- needle tip

    -- Wings (4 Petal Wings attached at thorax cy-3)
    -- Creature's LEFT wing is Screen RIGHT. Creature's RIGHT wing is Screen LEFT.
    -- Upper-Left wing (Screen Right): intact tip
    local ulx, uly = cx+3, cy-4-wingFlap
    put(imgBody, ulx, uly, c_pm); put(imgBody, ulx+1, uly-1, c_pm); put(imgBody, ulx+2, uly-2, c_pm)
    put(imgBody, ulx+3, uly-3, c_pm); put(imgBody, ulx+4, uly-4, c_pl) -- Intact tip!
    put(imgBody, ulx+1, uly, c_pd); put(imgBody, ulx+2, uly-1, c_pd) -- Vein accent

    -- Upper-Right wing (Screen Left): TORN EDGE at tip!
    local urx, ury = cx-3, cy-4-wingFlap
    put(imgBody, urx, ury, c_pm); put(imgBody, urx-1, ury-1, c_pm); put(imgBody, urx-2, ury-2, c_pm)
    put(imgBody, urx-3, ury-3, c_pm) -- Missing 4th tip pixel! (Torn edge)
    put(imgBody, urx-1, ury, c_pd); put(imgBody, urx-2, ury-1, c_pd) -- Vein accent

    -- Lower-Left wing (Screen Right):
    local llx, lly = cx+3, cy-1+wingFlap
    put(imgBody, llx, lly, c_pm); put(imgBody, llx+1, lly+1, c_pm); put(imgBody, llx+2, lly+2, c_pl)

    -- Lower-Right wing (Screen Left):
    local lrx, lry = cx-3, cy-1+wingFlap
    put(imgBody, lrx, lry, c_pm); put(imgBody, lrx-1, lry+1, c_pm); put(imgBody, lrx-2, lry+2, c_pl)

    -- Details (Compound eyes & Pollen Sacs)
    -- Eyes
    put(imgDetails, cx-2, cy-6, c_ym)
    put(imgDetails, cx+2, cy-6, c_ym)

    -- Pollen Sacs: Creature's LEFT sac is LARGER (Screen Right), RIGHT sac is SMALLER (Screen Left)
    -- Screen RIGHT (Creature's LEFT sac): 3x3 oval
    drawOval(imgDetails, cx+3, cy+3, 1.5, 1.5, c_ym)
    put(imgDetails, cx+3, cy+2, c_yl) -- Top highlight
    put(imgDetails, cx+4, cy+4, c_yd) -- Bottom shadow

    -- Screen LEFT (Creature's RIGHT sac): 2x2 square
    put(imgDetails, cx-3, cy+3, c_ym); put(imgDetails, cx-4, cy+3, c_ym)
    put(imgDetails, cx-3, cy+4, c_yd); put(imgDetails, cx-4, cy+4, c_yd)

  ---------------------------------------------------------
  -- 2. LEFT DIRECTION
  ---------------------------------------------------------
  elseif dir == "left" then
    -- Facing Screen Left.
    -- Creature's RIGHT side is FOREGROUND, Creature's LEFT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx-5, cy-4, 3, 3, c_out) -- Head
    drawOval(imgOutline, cx-1, cy-2, 4, 4, c_out) -- Thorax
    drawOval(imgOutline, cx+4, cy+4, 2, 4, c_out) -- Abdomen

    -- Body
    drawOval(imgBody, cx-5, cy-4, 2, 2, c_bm) -- Head
    put(imgBody, cx-6, cy-5, c_bl) -- Head highlight
    drawOval(imgBody, cx-1, cy-2, 3, 3, c_bm) -- Thorax
    put(imgBody, cx-2, cy-3, c_bl) -- Thorax highlight

    -- Needle Abdomen slanting back-down
    put(imgBody, cx+2, cy+1, c_ym)
    put(imgBody, cx+3, cy+2, c_ym)
    put(imgBody, cx+4, cy+3, c_bm)
    put(imgBody, cx+5, cy+4, c_bm)
    put(imgBody, cx+6, cy+5, c_yl)
    put(imgBody, cx+7, cy+6, c_nd) -- needle tip

    -- Wings
    -- Upper-Right wing (FOREGROUND): Screen Top-Right, TORN EDGE at tip!
    local urx, ury = cx, cy-4-wingFlap
    put(imgBody, urx, ury, c_pm); put(imgBody, urx+1, ury-1, c_pm); put(imgBody, urx+2, ury-2, c_pm)
    put(imgBody, urx+3, ury-3, c_pm) -- Torn tip!
    put(imgBody, urx+1, ury, c_pd)

    -- Upper-Left wing (BACKGROUND): Screen Top-Left peeking behind
    local ulx, uly = cx-2, cy-4-wingFlap
    put(imgBody, ulx, uly, c_pd); put(imgBody, ulx-1, uly-1, c_pd); put(imgBody, ulx-2, uly-2, c_pd)

    -- Lower-Right wing (FOREGROUND):
    local lrx, lry = cx, cy+wingFlap
    put(imgBody, lrx, lry, c_pm); put(imgBody, lrx+1, lry+1, c_pm); put(imgBody, lrx+2, lry+2, c_pl)

    -- Lower-Left wing (BACKGROUND):
    local llx, lly = cx-2, cy+wingFlap
    put(imgBody, llx, lly, c_pd); put(imgBody, llx-1, lly+1, c_pd)

    -- Details
    -- Eye (Foreground Right Eye)
    put(imgDetails, cx-6, cy-4, c_yl)

    -- Pollen Sacs:
    -- Foreground (Creature's RIGHT sac): smaller (2x2) at cx, cy+2
    put(imgDetails, cx, cy+2, c_ym); put(imgDetails, cx+1, cy+2, c_ym)
    put(imgDetails, cx, cy+3, c_yd); put(imgDetails, cx+1, cy+3, c_yd)

    -- Background (Creature's LEFT sac): larger (3x3) peeking behind abdomen at cx+2, cy+3
    drawOval(imgDetails, cx+3, cy+3, 1.5, 1.5, c_yd)

  ---------------------------------------------------------
  -- 3. RIGHT DIRECTION
  ---------------------------------------------------------
  elseif dir == "right" then
    -- Facing Screen Right.
    -- Creature's LEFT side is FOREGROUND, Creature's RIGHT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx+5, cy-4, 3, 3, c_out) -- Head
    drawOval(imgOutline, cx+1, cy-2, 4, 4, c_out) -- Thorax
    drawOval(imgOutline, cx-4, cy+4, 2, 4, c_out) -- Abdomen

    -- Body
    drawOval(imgBody, cx+5, cy-4, 2, 2, c_bm) -- Head
    put(imgBody, cx+6, cy-5, c_bl) -- Head highlight
    drawOval(imgBody, cx+1, cy-2, 3, 3, c_bm) -- Thorax
    put(imgBody, cx+2, cy-3, c_bl) -- Thorax highlight

    -- Needle Abdomen slanting back-down
    put(imgBody, cx-2, cy+1, c_ym)
    put(imgBody, cx-3, cy+2, c_ym)
    put(imgBody, cx-4, cy+3, c_bm)
    put(imgBody, cx-5, cy+4, c_bm)
    put(imgBody, cx-6, cy+5, c_yl)
    put(imgBody, cx-7, cy+6, c_nd) -- needle tip

    -- Wings
    -- Upper-Left wing (FOREGROUND): Screen Top-Left, INTACT tip!
    local ulx, uly = cx, cy-4-wingFlap
    put(imgBody, ulx, uly, c_pm); put(imgBody, ulx-1, uly-1, c_pm); put(imgBody, ulx-2, uly-2, c_pm)
    put(imgBody, ulx-3, uly-3, c_pm); put(imgBody, ulx-4, uly-4, c_pl) -- Intact tip!
    put(imgBody, ulx-1, uly, c_pd)

    -- Upper-Right wing (BACKGROUND): Screen Top-Right peeking behind, TORN EDGE!
    local urx, ury = cx+2, cy-4-wingFlap
    put(imgBody, urx, ury, c_pd); put(imgBody, urx+1, ury-1, c_pd); put(imgBody, urx+2, ury-2, c_pd)

    -- Lower-Left wing (FOREGROUND):
    local llx, lly = cx, cy+wingFlap
    put(imgBody, llx, lly, c_pm); put(imgBody, llx-1, lly+1, c_pm); put(imgBody, llx-2, lly+2, c_pl)

    -- Lower-Right wing (BACKGROUND):
    local lrx, lry = cx+2, cy+wingFlap
    put(imgBody, lrx, lry, c_pd); put(imgBody, lrx+1, lry+1, c_pd)

    -- Details
    -- Eye (Foreground Left Eye)
    put(imgDetails, cx+6, cy-4, c_yl)

    -- Pollen Sacs:
    -- Foreground (Creature's LEFT sac): larger (3x3) at cx, cy+2
    drawOval(imgDetails, cx, cy+2, 1.5, 1.5, c_ym)
    put(imgDetails, cx, cy+1, c_yl)
    put(imgDetails, cx+1, cy+3, c_yd)

    -- Background (Creature's RIGHT sac): smaller (2x2) peeking behind at cx-3, cy+3
    put(imgDetails, cx-3, cy+3, c_yd); put(imgDetails, cx-2, cy+3, c_yd)

  ---------------------------------------------------------
  -- 4. UP DIRECTION
  ---------------------------------------------------------
  elseif dir == "up" then
    -- Facing Screen Up (away from viewer).
    -- Creature's LEFT is Screen LEFT, Creature's RIGHT is Screen RIGHT.
    -- Outline
    drawOval(imgOutline, cx, cy-6, 3, 3, c_out) -- Head
    drawOval(imgOutline, cx, cy-2, 4, 4, c_out) -- Thorax
    drawOval(imgOutline, cx, cy+5, 2, 4, c_out) -- Abdomen

    -- Body
    drawOval(imgBody, cx, cy-6, 2, 2, c_bm) -- Head
    drawOval(imgBody, cx, cy-2, 3, 3, c_bm) -- Thorax

    -- Abdomen
    put(imgBody, cx, cy+2, c_ym)
    put(imgBody, cx, cy+3, c_ym)
    put(imgBody, cx, cy+4, c_bm)
    put(imgBody, cx, cy+5, c_bm)
    put(imgBody, cx, cy+6, c_yl)
    put(imgBody, cx, cy+7, c_yl)
    put(imgBody, cx, cy+8, c_nd)

    -- Wings
    -- Upper-Left wing (Screen Left): intact tip
    local ulx, uly = cx-3, cy-4-wingFlap
    put(imgBody, ulx, uly, c_pm); put(imgBody, ulx-1, uly-1, c_pm); put(imgBody, ulx-2, uly-2, c_pm)
    put(imgBody, ulx-3, uly-3, c_pm); put(imgBody, ulx-4, uly-4, c_pl)
    put(imgBody, ulx-1, uly, c_pd)

    -- Upper-Right wing (Screen Right): TORN EDGE at tip!
    local urx, ury = cx+3, cy-4-wingFlap
    put(imgBody, urx, ury, c_pm); put(imgBody, urx+1, ury-1, c_pm); put(imgBody, urx+2, ury-2, c_pm)
    put(imgBody, urx+3, ury-3, c_pm) -- Torn tip!
    put(imgBody, urx+1, ury, c_pd)

    -- Lower-Left wing (Screen Left):
    local llx, lly = cx-3, cy-1+wingFlap
    put(imgBody, llx, lly, c_pm); put(imgBody, llx-1, lly+1, c_pm); put(imgBody, llx-2, lly+2, c_pl)

    -- Lower-Right wing (Screen Right):
    local lrx, lry = cx+3, cy-1+wingFlap
    put(imgBody, lrx, lry, c_pm); put(imgBody, lrx+1, lry+1, c_pm); put(imgBody, lrx+2, lry+2, c_pl)

    -- Details (Pollen Sacs: Screen Left is larger LEFT sac, Screen Right is smaller RIGHT sac)
    -- Screen LEFT (Creature's LEFT sac): 3x3 oval
    drawOval(imgDetails, cx-3, cy+3, 1.5, 1.5, c_ym)
    put(imgDetails, cx-3, cy+2, c_yl)
    put(imgDetails, cx-4, cy+4, c_yd)

    -- Screen RIGHT (Creature's RIGHT sac): 2x2 square
    put(imgDetails, cx+3, cy+3, c_ym); put(imgDetails, cx+4, cy+3, c_ym)
    put(imgDetails, cx+3, cy+4, c_yd); put(imgDetails, cx+4, cy+4, c_yd)
  end

  ---------------------------------------------------------
  -- EFFECTS LAYER (3-shot pollen burst attack)
  ---------------------------------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- 1st central pollen burst projectile
      if dir == "down" then
        put(imgEffects, cx, cy+10, c_yl); put(imgEffects, cx, cy+11, c_ym)
      elseif dir == "left" then
        put(imgEffects, cx-8, cy-3, c_yl); put(imgEffects, cx-9, cy-3, c_ym)
      elseif dir == "right" then
        put(imgEffects, cx+8, cy-3, c_yl); put(imgEffects, cx+9, cy-3, c_ym)
      elseif dir == "up" then
        put(imgEffects, cx, cy-8, c_yl); put(imgEffects, cx, cy-9, c_ym)
      end

    elseif animFrame == 3 then
      -- 3-shot pollen burst spread (center, left-diag, right-diag)
      if dir == "down" then
        -- Center
        put(imgEffects, cx, cy+12, c_yl); put(imgEffects, cx, cy+13, c_ym)
        -- Left diag
        put(imgEffects, cx-3, cy+11, c_yl); put(imgEffects, cx-4, cy+12, c_ym)
        -- Right diag
        put(imgEffects, cx+3, cy+11, c_yl); put(imgEffects, cx+4, cy+12, c_ym)

      elseif dir == "left" then
        -- Center
        put(imgEffects, cx-10, cy-3, c_yl); put(imgEffects, cx-12, cy-3, c_ym)
        -- Up diag
        put(imgEffects, cx-9, cy-6, c_yl); put(imgEffects, cx-11, cy-7, c_ym)
        -- Down diag
        put(imgEffects, cx-9, cy, c_yl); put(imgEffects, cx-11, cy+1, c_ym)

      elseif dir == "right" then
        -- Center
        put(imgEffects, cx+10, cy-3, c_yl); put(imgEffects, cx+12, cy-3, c_ym)
        -- Up diag
        put(imgEffects, cx+9, cy-6, c_yl); put(imgEffects, cx+11, cy-7, c_ym)
        -- Down diag
        put(imgEffects, cx+9, cy, c_yl); put(imgEffects, cx+11, cy+1, c_ym)

      elseif dir == "up" then
        -- Center
        put(imgEffects, cx, cy-10, c_yl); put(imgEffects, cx, cy-12, c_ym)
        -- Left diag
        put(imgEffects, cx-3, cy-9, c_yl); put(imgEffects, cx-4, cy-11, c_ym)
        -- Right diag
        put(imgEffects, cx+3, cy-9, c_yl); put(imgEffects, cx+4, cy-11, c_ym)
      end

    elseif animFrame == 4 then
      -- Dissipating pollen dust cloud
      if dir == "down" then
        put(imgEffects, cx-5, cy+13, c_yl); put(imgEffects, cx, cy+14, c_yl); put(imgEffects, cx+5, cy+13, c_yl)
      elseif dir == "left" then
        put(imgEffects, cx-13, cy-7, c_yl); put(imgEffects, cx-14, cy-3, c_yl); put(imgEffects, cx-13, cy+2, c_yl)
      elseif dir == "right" then
        put(imgEffects, cx+13, cy-7, c_yl); put(imgEffects, cx+14, cy-3, c_yl); put(imgEffects, cx+13, cy+2, c_yl)
      elseif dir == "up" then
        put(imgEffects, cx-5, cy-13, c_yl); put(imgEffects, cx, cy-14, c_yl); put(imgEffects, cx+5, cy-13, c_yl)
      end
    end
  end

  spr:newCel(layerOutline, f, imgOutline)
  spr:newCel(layerBody, f, imgBody)
  spr:newCel(layerDetails, f, imgDetails)
  spr:newCel(layerEffects, f, imgEffects)
end

spr:saveCopyAs("${stagingDir}/source.aseprite")

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
print("SUCCESSFULLY_CREATED_PETALWING_WASP")
`;

writeFileSync("tools/build-petalwing-wasp.lua", luaScript);
console.log("Written tools/build-petalwing-wasp.lua");

// Write submission.json
const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0007-petalwing-wasp
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Petalwing Wasp".

## Creative brief

- Collection: Thornwood Brood. Woodland creatures shaped by roots, thorns, mushrooms, and ancient forest magic.
- Core concept: A flying strafing enemy that controls horizontal and vertical lanes.
- Body and silhouette: Thin segmented body with four broad petal-shaped wings.
- Signature features: Flower wings, needle abdomen, and dangling pollen sacs.
- Palette and materials: Yellow, burgundy, pale pink, and glossy insect shell.
- Movement personality: Aggressive, darting, and difficult to pin down.
- Attack concept: Flies across the combat area while firing evenly spaced three-shot pollen bursts.
- Directional details: The upper-right wing has a torn edge, and the larger pollen sac hangs on the left.
- Avoid: Realistic wasp, fairy humanoid, translucent unreadable wings.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-petalwing-wasp",
  assetId: "enemy-mob-32-petalwing-wasp",
  baseRevisionId: null,
  requestedName: "Petalwing Wasp",
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
