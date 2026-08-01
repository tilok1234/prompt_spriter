import { writeFileSync, mkdirSync } from "fs";

const stagingDir = "C:/Users/headc/Documents/prompt_spriter/workspace/staging/enemy-mob-32-thornseed-shepherd";
mkdirSync(stagingDir, { recursive: true });

const luaScript = `
local spr = Sprite(32, 32, ColorMode.RGB)
spr.filename = "${stagingDir}/source.aseprite"

-- Setup palette (11 opaque colors + 1 transparent)
local pal = spr.palettes[1]
pal:resize(12)

local colors = {
  Color{ r=0, g=0, b=0, a=0 },          -- 0: transparent
  Color{ r=24, g=18, b=14, a=255 },      -- 1: c_out (dark sepia/bark outline)
  Color{ r=58, g=40, b=28, a=255 },      -- 2: c_bd (bark dark)
  Color{ r=102, g=70, b=46, a=255 },     -- 3: c_bm (bark mid)
  Color{ r=150, g=108, b=70, a=255 },    -- 4: c_bl (bark light / highlight)
  Color{ r=42, g=68, b=44, a=255 },      -- 5: c_gd (sage green dark)
  Color{ r=76, g=114, b=72, a=255 },     -- 6: c_gm (sage green mid)
  Color{ r=122, g=168, b=108, a=255 },   -- 7: c_gl (sage green light / thorns)
  Color{ r=64, g=42, b=70, a=255 },      -- 8: c_pd (dull purple dark)
  Color{ r=112, g=72, b=120, a=255 },    -- 9: c_pm (dull purple mid / seed pods)
  Color{ r=164, g=118, b=176, a=255 },   -- 10: c_pl (dull purple light / pod highlight)
  Color{ r=210, g=180, b=90, a=255 }     -- 11: c_fg (hollow face magic glow)
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
local c_gd  = colors[6]
local c_gm  = colors[7]
local c_gl  = colors[8]
local c_pd  = colors[9]
local c_pm  = colors[10]
local c_pl  = colors[11]
local c_fg  = colors[12]

local function put(img, x, y, col)
  if x >= 0 and x < 32 and y >= 0 and y < 32 then
    img:drawPixel(x, y, col)
  end
end

local function drawRect(img, x1, y1, w, h, col)
  for y = y1, y1 + h - 1 do
    for x = x1, x1 + w - 1 do
      put(img, x, y, col)
    end
  end
end

local function drawOval(img, cx, cy, rx, ry, col)
  for y = math.max(0, math.floor(cy - ry)), math.min(31, math.floor(cy + ry)) do
    for x = math.max(0, math.floor(cx - rx)), math.min(31, math.floor(cx + rx)) do
      local dx = (x - cx) / rx
      local dy = (y - cy) / ry
      if dx*dx + dy*dy <= 1.0 then
        put(img, x, y, col)
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
  local podSway = 0

  if anim == "idle" then
    if animFrame == 2 then
      offsetY = -1
      podSway = 1
    end
  elseif anim == "walk" then
    if animFrame == 1 then
      offsetX = -1
      podSway = 1
    elseif animFrame == 2 then
      offsetY = 1
      podSway = 0
    elseif animFrame == 3 then
      offsetX = 1
      podSway = -1
    elseif animFrame == 4 then
      offsetY = 0
      podSway = 0
    end
  elseif anim == "attack" then
    if animFrame == 1 then
      offsetY = -1 -- Lean back / raise arms
      podSway = -1
    elseif animFrame == 2 then
      offsetY = 2 -- Slam down staff
      podSway = 2
    elseif animFrame == 3 then
      offsetY = 1 -- Hold ritual stance
      podSway = 1
    elseif animFrame == 4 then
      offsetY = 0 -- Recover pose
      podSway = 0
    end
  end

  local cx = 16 + offsetX
  local cy = 17 + offsetY

  ---------------------------------------------------------
  -- 1. DOWN DIRECTION
  ---------------------------------------------------------
  if dir == "down" then
    -- Outline
    drawOval(imgOutline, cx, cy-7, 3.5, 3.5, c_out) -- Head outline
    drawOval(imgOutline, cx, cy-1, 3.5, 5.5, c_out) -- Trunk outline
    drawOval(imgOutline, cx, cy+6, 4.5, 2.5, c_out) -- Root feet outline

    -- Creature's RIGHT arm (Screen Left) with FORK:
    drawOval(imgOutline, cx-5, cy+2, 2.5, 4.5, c_out)
    -- Creature's LEFT arm (Screen Right) with 3 SEED PODS:
    drawOval(imgOutline, cx+5, cy+2, 3.5, 5.5, c_out)

    -- Body (Trunk, Head, Root feet, Branch arms)
    -- Head top & crown base
    drawOval(imgBody, cx, cy-7, 2.5, 2.5, c_bm)
    put(imgBody, cx-1, cy-8, c_bl) -- Highlight bark
    put(imgBody, cx+1, cy-8, c_bm)

    -- Trunk body
    drawOval(imgBody, cx, cy-1, 2.5, 4.5, c_bm)
    put(imgBody, cx-1, cy-3, c_bl); put(imgBody, cx-1, cy, c_bl); put(imgBody, cx-1, cy+3, c_bl) -- Vertical bark ridge
    put(imgBody, cx+1, cy-2, c_bd); put(imgBody, cx+1, cy+1, c_bd) -- Shadow side

    -- Root feet (sprawled wooden roots at base)
    put(imgBody, cx-3, cy+6, c_bm); put(imgBody, cx-4, cy+7, c_bd) -- Left root
    put(imgBody, cx+3, cy+6, c_bm); put(imgBody, cx+4, cy+7, c_bd) -- Right root
    put(imgBody, cx-1, cy+6, c_bm); put(imgBody, cx+1, cy+6, c_bm) -- Center roots

    -- Creature's RIGHT arm (Screen Left): Crooked branch ending in a FORK
    put(imgBody, cx-3, cy-3, c_bm); put(imgBody, cx-4, cy-2, c_bm); put(imgBody, cx-5, cy-1, c_bm)
    put(imgBody, cx-6, cy, c_bm); put(imgBody, cx-6, cy+1, c_bm); put(imgBody, cx-6, cy+2, c_bm)
    -- FORK at end of right arm:
    put(imgBody, cx-7, cy+3, c_bm); put(imgBody, cx-8, cy+4, c_bl) -- Left prong of fork
    put(imgBody, cx-5, cy+3, c_bm); put(imgBody, cx-5, cy+4, c_bl) -- Right prong of fork

    -- Creature's LEFT arm (Screen Right): Branch holding seed pods
    put(imgBody, cx+3, cy-3, c_bm); put(imgBody, cx+4, cy-2, c_bm); put(imgBody, cx+5, cy-1, c_bm)
    put(imgBody, cx+6, cy, c_bm); put(imgBody, cx+6, cy+1, c_bm)

    -- Details (Crown of thorns, Hollow Face, Seed pods)
    -- Crown of Thorns (on top of head)
    put(imgDetails, cx-2, cy-9, c_gl); put(imgDetails, cx, cy-10, c_gl); put(imgDetails, cx+2, cy-9, c_gl)
    put(imgDetails, cx-1, cy-9, c_gm); put(imgDetails, cx+1, cy-9, c_gm)

    -- Hollow Face & Glowing Magic Eyes
    put(imgDetails, cx-1, cy-6, c_bd); put(imgDetails, cx, cy-6, c_bd); put(imgDetails, cx+1, cy-6, c_bd)
    put(imgDetails, cx-1, cy-5, c_bd); put(imgDetails, cx, cy-5, c_bd); put(imgDetails, cx+1, cy-5, c_bd)
    put(imgDetails, cx-1, cy-5, c_fg) -- Left eye glow
    put(imgDetails, cx+1, cy-5, c_fg) -- Right eye glow

    -- THREE SEED PODS hanging from creature's LEFT arm (Screen Right):
    -- Pod 1 (Top-Left pod):
    local p1x, p1y = cx+4 + podSway, cy+2
    put(imgDetails, p1x, p1y, c_pl); put(imgDetails, p1x, p1y+1, c_pm); put(imgDetails, p1x+1, p1y+1, c_pd)

    -- Pod 2 (Top-Right pod):
    local p2x, p2y = cx+7 + podSway, cy+3
    put(imgDetails, p2x, p2y, c_pl); put(imgDetails, p2x, p2y+1, c_pm); put(imgDetails, p2x-1, p2y+1, c_pd)

    -- Pod 3 (Bottom hanging pod):
    local p3x, p3y = cx+5 + podSway, cy+5
    put(imgDetails, p3x, p3y, c_pl); put(imgDetails, p3x, p3y+1, c_pm); put(imgDetails, p3x, p3y+2, c_pm); put(imgDetails, p3x+1, p3y+1, c_pd)

  ---------------------------------------------------------
  -- 2. LEFT DIRECTION
  ---------------------------------------------------------
  elseif dir == "left" then
    -- Facing Screen Left.
    -- Creature's RIGHT side is FOREGROUND, Creature's LEFT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx-1, cy-7, 3.5, 3.5, c_out) -- Head
    drawOval(imgOutline, cx-1, cy-1, 3.5, 5.5, c_out) -- Trunk
    drawOval(imgOutline, cx-1, cy+6, 4.5, 2.5, c_out) -- Roots
    -- Foreground Right Arm (Fork):
    drawOval(imgOutline, cx-6, cy+2, 3.5, 4.5, c_out)

    -- Body
    drawOval(imgBody, cx-1, cy-7, 2.5, 2.5, c_bm)
    put(imgBody, cx-2, cy-8, c_bl)
    drawOval(imgBody, cx-1, cy-1, 2.5, 4.5, c_bm)
    put(imgBody, cx-2, cy-3, c_bl); put(imgBody, cx-2, cy, c_bl); put(imgBody, cx-2, cy+3, c_bl)

    -- Root feet
    put(imgBody, cx-4, cy+7, c_bl); put(imgBody, cx-2, cy+6, c_bm); put(imgBody, cx+2, cy+7, c_bd)

    -- Creature's RIGHT arm (FOREGROUND, Screen Left): Crooked staff ending in FORK
    put(imgBody, cx-3, cy-3, c_bm); put(imgBody, cx-4, cy-2, c_bm); put(imgBody, cx-5, cy-1, c_bm)
    put(imgBody, cx-6, cy, c_bm); put(imgBody, cx-7, cy+1, c_bm)
    -- FORK extending forward:
    put(imgBody, cx-8, cy, c_bl); put(imgBody, cx-9, cy-1, c_bl) -- Upper fork tip
    put(imgBody, cx-8, cy+2, c_bl); put(imgBody, cx-9, cy+3, c_bl) -- Lower fork tip

    -- Creature's LEFT arm (BACKGROUND, Screen Right): peeking behind trunk
    put(imgBody, cx+2, cy-2, c_bd); put(imgBody, cx+3, cy-1, c_bd); put(imgBody, cx+4, cy, c_bd)

    -- Details
    -- Crown of Thorns
    put(imgDetails, cx-3, cy-9, c_gl); put(imgDetails, cx-1, cy-10, c_gl); put(imgDetails, cx+1, cy-9, c_gl)
    put(imgDetails, cx-2, cy-9, c_gm)

    -- Hollow Face (profile on left)
    put(imgDetails, cx-3, cy-6, c_bd); put(imgDetails, cx-3, cy-5, c_bd)
    put(imgDetails, cx-3, cy-5, c_fg) -- Eye glow profile

    -- THREE SEED PODS (BACKGROUND) peeking behind trunk at cx+3..cx+5:
    local p1x, p1y = cx+3 + podSway, cy+1
    put(imgDetails, p1x, p1y, c_pm); put(imgDetails, p1x, p1y+1, c_pd)

    local p2x, p2y = cx+5 + podSway, cy+2
    put(imgDetails, p2x, p2y, c_pm); put(imgDetails, p2x, p2y+1, c_pd)

    local p3x, p3y = cx+4 + podSway, cy+4
    put(imgDetails, p3x, p3y, c_pm); put(imgDetails, p3x, p3y+1, c_pd)

  ---------------------------------------------------------
  -- 3. RIGHT DIRECTION
  ---------------------------------------------------------
  elseif dir == "right" then
    -- Facing Screen Right.
    -- Creature's LEFT side is FOREGROUND, Creature's RIGHT side is BACKGROUND.
    -- Outline
    drawOval(imgOutline, cx+1, cy-7, 3.5, 3.5, c_out) -- Head
    drawOval(imgOutline, cx+1, cy-1, 3.5, 5.5, c_out) -- Trunk
    drawOval(imgOutline, cx+1, cy+6, 4.5, 2.5, c_out) -- Roots
    -- Foreground Left Arm (Seed Pods):
    drawOval(imgOutline, cx+6, cy+3, 4.5, 5.5, c_out)

    -- Body
    drawOval(imgBody, cx+1, cy-7, 2.5, 2.5, c_bm)
    put(imgBody, cx+2, cy-8, c_bl)
    drawOval(imgBody, cx+1, cy-1, 2.5, 4.5, c_bm)
    put(imgBody, cx+2, cy-3, c_bl); put(imgBody, cx+2, cy, c_bl); put(imgBody, cx+2, cy+3, c_bl)

    -- Root feet
    put(imgBody, cx+4, cy+7, c_bl); put(imgBody, cx+2, cy+6, c_bm); put(imgBody, cx-2, cy+7, c_bd)

    -- Creature's LEFT arm (FOREGROUND, Screen Right): Branch holding seed pods
    put(imgBody, cx+3, cy-3, c_bm); put(imgBody, cx+4, cy-2, c_bm); put(imgBody, cx+5, cy-1, c_bm)
    put(imgBody, cx+6, cy, c_bm); put(imgBody, cx+7, cy+1, c_bm)

    -- Creature's RIGHT arm (BACKGROUND, Screen Left): peeking behind trunk with FORK
    put(imgBody, cx-2, cy-2, c_bd); put(imgBody, cx-3, cy-1, c_bd)
    put(imgBody, cx-4, cy-2, c_bd); put(imgBody, cx-4, cy, c_bd) -- Fork tips peeking behind

    -- Details
    -- Crown of Thorns
    put(imgDetails, cx-1, cy-9, c_gl); put(imgDetails, cx+1, cy-10, c_gl); put(imgDetails, cx+3, cy-9, c_gl)
    put(imgDetails, cx+2, cy-9, c_gm)

    -- Hollow Face (profile on right)
    put(imgDetails, cx+3, cy-6, c_bd); put(imgDetails, cx+3, cy-5, c_bd)
    put(imgDetails, cx+3, cy-5, c_fg) -- Eye glow profile

    -- THREE SEED PODS (FOREGROUND, Screen Right):
    local p1x, p1y = cx+5 + podSway, cy+2
    put(imgDetails, p1x, p1y, c_pl); put(imgDetails, p1x, p1y+1, c_pm); put(imgDetails, p1x+1, p1y+1, c_pd)

    local p2x, p2y = cx+8 + podSway, cy+3
    put(imgDetails, p2x, p2y, c_pl); put(imgDetails, p2x, p2y+1, c_pm); put(imgDetails, p2x-1, p2y+1, c_pd)

    local p3x, p3y = cx+6 + podSway, cy+5
    put(imgDetails, p3x, p3y, c_pl); put(imgDetails, p3x, p3y+1, c_pm); put(imgDetails, p3x, p3y+2, c_pm); put(imgDetails, p3x+1, p3y+1, c_pd)

  ---------------------------------------------------------
  -- 4. UP DIRECTION
  ---------------------------------------------------------
  elseif dir == "up" then
    -- Facing Screen Up (away from viewer).
    -- Creature's LEFT is Screen LEFT, Creature's RIGHT is Screen RIGHT.
    -- Outline
    drawOval(imgOutline, cx, cy-7, 3.5, 3.5, c_out) -- Head
    drawOval(imgOutline, cx, cy-1, 3.5, 5.5, c_out) -- Trunk
    drawOval(imgOutline, cx, cy+6, 4.5, 2.5, c_out) -- Roots

    -- Creature's LEFT arm (Screen Left) with 3 SEED PODS:
    drawOval(imgOutline, cx-5, cy+2, 3.5, 5.5, c_out)
    -- Creature's RIGHT arm (Screen Right) with FORK:
    drawOval(imgOutline, cx+5, cy+2, 2.5, 4.5, c_out)

    -- Body
    drawOval(imgBody, cx, cy-7, 2.5, 2.5, c_bm)
    drawOval(imgBody, cx, cy-1, 2.5, 4.5, c_bm)
    put(imgBody, cx, cy-3, c_bd); put(imgBody, cx, cy, c_bd); put(imgBody, cx, cy+3, c_bd) -- Back bark seam

    -- Root feet
    put(imgBody, cx-3, cy+6, c_bm); put(imgBody, cx-4, cy+7, c_bd)
    put(imgBody, cx+3, cy+6, c_bm); put(imgBody, cx+4, cy+7, c_bd)
    put(imgBody, cx-1, cy+6, c_bm); put(imgBody, cx+1, cy+6, c_bm)

    -- Creature's LEFT arm (Screen Left): Branch holding seed pods
    put(imgBody, cx-3, cy-3, c_bm); put(imgBody, cx-4, cy-2, c_bm); put(imgBody, cx-5, cy-1, c_bm)
    put(imgBody, cx-6, cy, c_bm); put(imgBody, cx-6, cy+1, c_bm)

    -- Creature's RIGHT arm (Screen Right): Branch ending in FORK
    put(imgBody, cx+3, cy-3, c_bm); put(imgBody, cx+4, cy-2, c_bm); put(imgBody, cx+5, cy-1, c_bm)
    put(imgBody, cx+6, cy, c_bm); put(imgBody, cx+6, cy+1, c_bm); put(imgBody, cx+6, cy+2, c_bm)
    -- FORK at end of right arm:
    put(imgBody, cx+5, cy+3, c_bm); put(imgBody, cx+5, cy+4, c_bl) -- Inner prong
    put(imgBody, cx+7, cy+3, c_bm); put(imgBody, cx+8, cy+4, c_bl) -- Outer prong

    -- Details (Crown of Thorns & 3 Seed Pods on Screen Left)
    -- Crown of Thorns (from back)
    put(imgDetails, cx-2, cy-9, c_gl); put(imgDetails, cx, cy-10, c_gl); put(imgDetails, cx+2, cy-9, c_gl)

    -- THREE SEED PODS hanging from creature's LEFT arm (Screen Left):
    local p1x, p1y = cx-5 + podSway, cy+2
    put(imgDetails, p1x, p1y, c_pl); put(imgDetails, p1x, p1y+1, c_pm); put(imgDetails, p1x-1, p1y+1, c_pd)

    local p2x, p2y = cx-7 + podSway, cy+3
    put(imgDetails, p2x, p2y, c_pl); put(imgDetails, p2x, p2y+1, c_pm); put(imgDetails, p2x+1, p2y+1, c_pd)

    local p3x, p3y = cx-6 + podSway, cy+5
    put(imgDetails, p3x, p3y, c_pl); put(imgDetails, p3x, p3y+1, c_pm); put(imgDetails, p3x, p3y+2, c_pm); put(imgDetails, p3x-1, p3y+1, c_pd)
  end

  ---------------------------------------------------------
  -- EFFECTS LAYER (Thornseed Planting & Sprouting Plant Turret)
  ---------------------------------------------------------
  if anim == "attack" then
    if animFrame == 2 then
      -- Thornseed planted in soil near feet
      if dir == "down" then
        put(imgEffects, cx, cy+8, c_pm); put(imgEffects, cx, cy+9, c_pl)
      elseif dir == "left" then
        put(imgEffects, cx-8, cy+6, c_pm); put(imgEffects, cx-8, cy+7, c_pl)
      elseif dir == "right" then
        put(imgEffects, cx+8, cy+6, c_pm); put(imgEffects, cx+8, cy+7, c_pl)
      elseif dir == "up" then
        put(imgEffects, cx, cy-7, c_pm); put(imgEffects, cx, cy-8, c_pl)
      end

    elseif animFrame == 3 then
      -- Plant turret sprouts up with glowing seed bulb & spiky leaves
      if dir == "down" then
        -- Stem & leaves
        put(imgEffects, cx, cy+9, c_gd); put(imgEffects, cx-1, cy+8, c_gl); put(imgEffects, cx+1, cy+8, c_gl)
        -- Turret bulb
        put(imgEffects, cx, cy+7, c_pm); put(imgEffects, cx, cy+6, c_fg)

      elseif dir == "left" then
        put(imgEffects, cx-8, cy+7, c_gd); put(imgEffects, cx-9, cy+6, c_gl); put(imgEffects, cx-7, cy+6, c_gl)
        put(imgEffects, cx-8, cy+5, c_pm); put(imgEffects, cx-9, cy+5, c_fg)

      elseif dir == "right" then
        put(imgEffects, cx+8, cy+7, c_gd); put(imgEffects, cx+7, cy+6, c_gl); put(imgEffects, cx+9, cy+6, c_gl)
        put(imgEffects, cx+8, cy+5, c_pm); put(imgEffects, cx+9, cy+5, c_fg)

      elseif dir == "up" then
        put(imgEffects, cx, cy-8, c_gd); put(imgEffects, cx-1, cy-7, c_gl); put(imgEffects, cx+1, cy-7, c_gl)
        put(imgEffects, cx, cy-9, c_pm); put(imgEffects, cx, cy-10, c_fg)
      end

    elseif animFrame == 4 then
      -- Plant turret fires sharp thorn projectile forward while dissolving
      if dir == "down" then
        -- Dissolving plant
        put(imgEffects, cx-1, cy+9, c_gm); put(imgEffects, cx+1, cy+9, c_gm)
        -- Thorn projectile flying down
        put(imgEffects, cx, cy+11, c_gl); put(imgEffects, cx, cy+12, c_fg); put(imgEffects, cx, cy+13, c_gl)

      elseif dir == "left" then
        put(imgEffects, cx-8, cy+8, c_gm)
        put(imgEffects, cx-11, cy+5, c_gl); put(imgEffects, cx-12, cy+5, c_fg); put(imgEffects, cx-13, cy+5, c_gl)

      elseif dir == "right" then
        put(imgEffects, cx+8, cy+8, c_gm)
        put(imgEffects, cx+11, cy+5, c_gl); put(imgEffects, cx+12, cy+5, c_fg); put(imgEffects, cx+13, cy+5, c_gl)

      elseif dir == "up" then
        put(imgEffects, cx-1, cy-8, c_gm); put(imgEffects, cx+1, cy-8, c_gm)
        put(imgEffects, cx, cy-11, c_gl); put(imgEffects, cx, cy-12, c_fg); put(imgEffects, cx, cy-13, c_gl)
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
print("SUCCESSFULLY_CREATED_THORNSEED_SHEPHERD")
`;

writeFileSync("tools/build-thornseed-shepherd.lua", luaScript);
console.log("Written tools/build-thornseed-shepherd.lua");

// Write submission.json
const promptText = `Read and follow the project documentation.

Promptinator entry ID: prompt-0010-thornseed-shepherd
Prompt formula: structured-v1

Create an enemy-mob-32 sprite named "Thornseed Shepherd".

## Creative brief

- Collection: Thornwood Brood. Woodland creatures shaped by roots, thorns, mushrooms, and ancient forest magic.
- Core concept: A small treant support unit that grows temporary projectile-firing plants.
- Body and silhouette: Thin trunk body, long branch arms, root feet, and a crooked stafflike limb.
- Signature features: Hanging seed pods, crown of thorns, and a hollow face.
- Palette and materials: Weathered brown, sage green, dull purple, and fibrous plant matter.
- Movement personality: Slow, ritualistic, and protective of nearby creatures.
- Attack concept: Plants thornseeds that sprout into temporary turrets firing simple aimed shots.
- Directional details: Three seed pods hang from its left arm, while the right branch ends in a fork.
- Avoid: Giant ancient treant, leafy friendly druid, overly detailed facial features.

## Interpretation rules

- Left and right refer to the creature's own anatomical sides and must remain consistent in every direction.
- Treat gameplay effects as motion intent: make the attack readable through body posing, and use the effects layer only where the category contract allows.
- Hard-alpha and style-contract rules override words such as translucent, glowing, soft, or transparent in the creative brief.`;

const submission = {
  kind: "agent-submission",
  schemaVersion: "1.0.0",
  jobId: "enemy-mob-32-thornseed-shepherd",
  assetId: "enemy-mob-32-thornseed-shepherd",
  baseRevisionId: null,
  requestedName: "Thornseed Shepherd",
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
